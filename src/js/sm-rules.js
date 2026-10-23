/* =========================================================================
 * sm-rules.js  —  STREUPH'S MAZE
 * The turn resolver. See README.md for the project entry point and checks.
 *
 * HARD CONSTRAINTS (acceptance criterion A2). This file must never contain
 * a timer, a DOM reference, or any asynchronous primitive:
 *   no setTimeout / setInterval / requestAnimationFrame
 *   no Promise / async / await / import / fetch
 *   no document / window / navigator / localStorage
 * tests/verify.js asserts this by stripping comments and grepping.
 *
 * The resolver is synchronous, timer-free and DOM-free by construction.
 * It does not draw. It returns an array of steps that the view layer
 * animates. Nothing outside this file may influence the outcome of a turn.
 *
 * Ordering note (C3/C4): state.grid is indexed [y][x] with y = 0 at the
 * BOTTOM row. The YAML's grid is indexed top-down; levels.js flips it once,
 * here, and nowhere else.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  var RULES = {};

  /*
   * Canonical root-field inventory for runtime state. Keep categories
   * exhaustive and disjoint: when a field is added, update its lifecycle
   * category, clone/snapshot/restore behavior, solver identity if relevant,
   * and the contract test. Nested mutable switch/target data lives under
   * `switches`; it is not an undeclared root-level extension point.
   *
   * fixed: immutable level definition/indexes and authored coordinates.
   * mutable: action/gameplay state cloned per solver branch and undo frame.
   * derived: recomputed from mutable state; never independently authoritative.
   * persistent: player knowledge that intentionally survives undo and is not
   *   part of solver identity.
   */
  RULES.STATE_CONTRACT = Object.freeze({
    fixed: Object.freeze(['level', 'key', 'width', 'height', 'grid', 'portals', 'start', 'goal']),
    mutable: Object.freeze(['crates', 'switches', 'player', 'P', 'W', 'polarity', 'strokes', 'turns', 'won']),
    derived: Object.freeze(['locked']),
    persistent: Object.freeze(['seen']),
    undo: Object.freeze([
      'player', 'P', 'W', 'polarity', 'strokes', 'turns', 'won',
      'switches[].latched', 'switches[target].position', 'crates[][]'
    ]),
    solverIdentity: Object.freeze([
      'player', 'P', 'W', 'polarity', 'switches[].latched', 'targets[].position',
      'crates[][]:id+colour+capabilities'
    ])
  });

  var DIRS = [
    { name: 'north', x: 0,  y:  1 },
    { name: 'east',  x: 1,  y:  0 },
    { name: 'south', x: 0,  y: -1 },
    { name: 'west',  x: -1, y:  0 }
  ];
  RULES.DIRS = DIRS;

  var ACTION_KEYS = ['north', 'east', 'south', 'west'];
  RULES.ACTION_KEYS = ACTION_KEYS;

  var FORCE_CHAIN_STATES_PER_CELL = 4;
  var TELEPORT_HOP_CAP = 1;  // §5.2 step 7.4: a teleport ends the move

  /* ---------------------------------------------------------------------- */
  /* Level construction                                                     */
  /* ---------------------------------------------------------------------- */

  function LevelError(level, message, extra) {
    var e = new Error(level + ': ' + message);
    e.name = 'LevelError';
    e.level = level;
    e.message_ = message;
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  RULES.LevelError = LevelError;

  function mergeParams(base, extra) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    if (extra) for (k in extra) out[k] = extra[k];
    return out;
  }

  /**
   * Build a normalised, immutable level object from a raw level record.
   * levels.js has already validated the raw record (V1-V12); this function
   * only translates. Throws LevelError on anything it still cannot honour.
   */
  RULES.buildLevel = function (raw, key) {
    var w = raw.width, h = raw.height;
    var tiles = [], runtimeTiles = [], crates = [], locked = [], switches = [];
    var portals = {};
    var start = null, goal = null;
    var rx, ry, cx, cy, inst, ov;

    for (ry = 0; ry < h; ry++) {
      tiles[ry] = []; runtimeTiles[ry] = []; crates[ry] = new Array(w); locked[ry] = [];
      for (rx = 0; rx < w; rx++) {
        crates[ry][rx] = null;
        var rowIdx = h - 1 - ry;               // <-- the one and only flip (C4)
        var id = raw.grid[rowIdx][rx];
        var def = SM.getTile(id);
        if (!def) {
          throw LevelError(key, 'unknown tile id ' + id + ' at ' +
            colName(rx) + (ry + 1) + ' (grid row ' + (rowIdx + 1) + ', column ' + (rx + 1) + ')');
        }
        if (def.implemented === false) {
          throw LevelError(key, 'tile id ' + id + ' (' + def.name + ') at ' +
            colName(rx) + (ry + 1) + ' is NOT YET IMPLEMENTED ' +
            '(not implemented; the resolver refuses to guess its behaviour). ' +
            'The resolver refuses to guess its behaviour.');
        }
        ov = (raw.overrides && raw.overrides[id]) || null;
        var objectLabel = colName(rx) + (ry + 1);
        var objectOv = (raw.object_overrides && raw.object_overrides[objectLabel]) || null;
        inst = {
          id: id,
          family: def.family,
          name: def.name,
          glyph: def.glyph,
          presentation: mergeParams(def.presentation, null),
          levelRole: def.levelRole || null,
          entityRole: def.entityRole || null,
          entityId: def.entityRole ? def.entityRole + '@' + objectLabel : null,
          solid: def.solid,
          walkable: def.walkable,
          pushable: !!def.pushable,
          capabilities: mergeParams(def.capabilities, objectOv),
          strategies: mergeParams(def.strategies, null),
          params: mergeParams(def.params, ov)
        };
        var authoredInst = inst;
        // Authoring convenience, stated once: a lock target that a level
        // WIRES INTO THE SWITCH NETWORK (an override supplies `link`) and
        // does not say otherwise defaults to CLOSED. Without this rule a
        // designer who writes overrides: { 30: { link: 2 } } would get a gate
        // that is OPEN until the first key is flipped — the opposite of what
        // "wire this to link 2" means. Colour gates still ship at link 0 /
        // defaultLocked false, i.e. a pure colour test, until they are wired.
        if (inst.solid === 'locked' && ov && ov.link !== undefined &&
            ov.defaultLocked === undefined) {
          inst.params.defaultLocked = true;
        }
        if (inst.entityRole === 'crate') {
          // Crate IDs in authored grids are entity markers, not terrain. Keep
          // the crate instance in its movable layer and expose ordinary floor
          // beneath it so pushing it away never leaves a solid crate tile.
          crates[ry][rx] = inst;
          var floorDef = SM.getTile(0);
          inst = {
            id: floorDef.id,
            family: floorDef.family,
            name: floorDef.name,
            glyph: floorDef.glyph,
            presentation: mergeParams(floorDef.presentation, null),
            solid: floorDef.solid,
            walkable: floorDef.walkable,
            pushable: !!floorDef.pushable,
            strategies: mergeParams(floorDef.strategies, null),
            params: mergeParams(floorDef.params, null)
          };
        }
        if (authoredInst.entityRole === 'target') {
          var targetFloorDef = SM.getTile(0);
          inst = {
            id: targetFloorDef.id,
            family: targetFloorDef.family,
            name: targetFloorDef.name,
            glyph: targetFloorDef.glyph,
            presentation: mergeParams(targetFloorDef.presentation, null),
            solid: targetFloorDef.solid,
            walkable: targetFloorDef.walkable,
            pushable: !!targetFloorDef.pushable,
            strategies: mergeParams(targetFloorDef.strategies, null),
            params: mergeParams(targetFloorDef.params, null)
          };
        }
        // Preserve the catalogue-backed authored view for level inspection;
        // the mutable runtime grid exposes floor beneath both entity types.
        tiles[ry][rx] = authoredInst.entityRole === 'target' ? authoredInst : inst;
        runtimeTiles[ry][rx] = inst;

        if (authoredInst.levelRole === 'start') { if (start) throw LevelError(key, 'more than one start tile'); start = { x: rx, y: ry }; }
        if (authoredInst.levelRole === 'goal')  { if (goal)  throw LevelError(key, 'more than one goal tile');  goal  = { x: rx, y: ry }; }

        if (authoredInst.strategies && authoredInst.strategies.forcedMovement === 'linkedPortal') {
          var pk = String(authoredInst.params.link);
          (portals[pk] || (portals[pk] = [])).push({ x: rx, y: ry });
        }
        if (authoredInst.strategies && authoredInst.strategies.activation) {
          switches.push({ entityId: authoredInst.entityId, x: rx, y: ry,
            inst: authoredInst, latched: false,
            capabilities: mergeParams(authoredInst.capabilities, null) });
        }
      }
    }

    if (!start) throw LevelError(key, 'no start tile (id 1) in the grid');
    if (!goal)  throw LevelError(key, 'no goal tile (id 2) in the grid');
    if (start.x === goal.x && start.y === goal.y) {
      throw LevelError(key, 'the start tile and the goal tile are the same cell');
    }

    return {
      key: key,
      name: raw.name || key,
      goalText: raw.goal || '',
      initialPolarity: raw.initial_polarity || 'red-open',
      winPicture: raw.win_picture || null,
      width: w,
      height: h,
      par: typeof raw.golf_score === 'number' ? raw.golf_score : null,
      tiles: tiles,
      runtimeTiles: runtimeTiles,
      cratesInit: crates,
      switchesInit: switches,
      portals: portals,
      start: start,
      goal: goal,
      raw: raw
    };
  };

  var colName = SM.BOARD.colName;
  RULES.colName = colName;
  RULES.cellLabel = SM.BOARD.cellLabel;

  /* ---------------------------------------------------------------------- */
  /* Mutable play state                                                     */
  /* ---------------------------------------------------------------------- */

  RULES.newState = function (level) {
    // Root fields are governed by STATE_CONTRACT above. `grid`, `portals`,
    // and `level` share immutable normalized level data; mutable entity and
    // latch state is copied; `locked` is derived; `seen` is persistent
    // knowledge rather than reversible gameplay state.
    var s = {
      level: level,
      key: level.key,
      width: level.width,
      height: level.height,
      grid: level.runtimeTiles || level.tiles,
      crates: deepCopyGrid(level.cratesInit),
      locked: newGrid(level.width, level.height, false),
      switches: level.switchesInit.map(function (sw) {
        return { entityId: sw.entityId, x: sw.x, y: sw.y, inst: sw.inst,
          latched: sw.latched, capabilities: mergeParams(sw.capabilities, null) };
      }),
      portals: level.portals,
      player: { x: level.start.x, y: level.start.y },
      start: { x: level.start.x, y: level.start.y },
      goal:  { x: level.goal.x,  y: level.goal.y  },
      P: 'wht',
      W: 'wht',
      strokes: 0,
      turns: 0,
      won: false,
      polarity: level.initialPolarity || 'red-open',
      seen: {}
    };
    rebuildLocks(s);
    var initialTarget = targetAt(s, s.player.x, s.player.y);
    s.seen[(initialTarget ? initialTarget.inst : s.grid[s.player.y][s.player.x]).id] = true;
    return s;
  };

  // Board storage operations are shared helpers; state lifecycle policy stays
  // in this module and explicitly decides which arrays/records are copied.
  var newGrid = SM.BOARD.createGrid;
  var deepCopyGrid = SM.BOARD.copyGrid;

  RULES.cloneState = function (s) {
    // A solver branch needs an independent copy of every mutable gameplay
    // value. Fixed definition data may be shared; derived locks are copied
    // here for speed but are rebuilt after restore and remain non-authoritative.
    return {
      level: s.level,
      key: s.key,
      width: s.width,
      height: s.height,
      grid: s.grid,
      crates: deepCopyGrid(s.crates),
      locked: deepCopyGrid(s.locked),
      switches: s.switches.map(function (sw) {
        return { entityId: sw.entityId, x: sw.x, y: sw.y, inst: sw.inst,
          latched: sw.latched, capabilities: mergeParams(sw.capabilities, null) };
      }),
      portals: s.portals,
      player: { x: s.player.x, y: s.player.y },
      start: { x: s.start.x, y: s.start.y },
      goal: { x: s.goal.x, y: s.goal.y },
      P: s.P, W: s.W,
      polarity: s.polarity,
      strokes: s.strokes, turns: s.turns, won: s.won,
      seen: Object.assign({}, s.seen)
    };
  };

  RULES.snapshot = function (s) {
    // Undo captures reversible gameplay, not `seen` (codex knowledge is
    // monotone) or `locked` (derived). Restore rebuilds the latter from the
    // restored signals and latches.
    return {
      player: { x: s.player.x, y: s.player.y },
      P: s.P, W: s.W, polarity: s.polarity,
      strokes: s.strokes, turns: s.turns, won: s.won,
      latched: s.switches.map(function (sw) { return sw.latched; }),
      targets: s.switches.filter(isTargetEntity)
        .map(function (sw) { return { entityId: sw.entityId, x: sw.x, y: sw.y }; }),
      crates: s.crates.map(function (row) {
        // Crate instances are immutable level data; retaining their reference
        // preserves ID and parameter overrides without putting terrain back.
        return row.slice();
      })
    };
  };

  RULES.restore = function (s, snap) {
    // Keep this list aligned with STATE_CONTRACT.mutable. Entity identity and
    // capability profiles remain attached to immutable instances; positions,
    // colors, counters, latches, and crate occupancy are restored explicitly.
    s.player.x = snap.player.x; s.player.y = snap.player.y;
    s.P = snap.P; s.W = snap.W; s.polarity = snap.polarity || 'red-open';
    s.strokes = snap.strokes; s.turns = snap.turns; s.won = snap.won;
    for (var i = 0; i < s.switches.length; i++) s.switches[i].latched = snap.latched[i];
    if (snap.targets) {
      for (var ti = 0; ti < snap.targets.length; ti++) {
        var target = snap.targets[ti];
        for (var si = 0; si < s.switches.length; si++) {
          if (isTargetEntity(s.switches[si]) &&
              s.switches[si].entityId === target.entityId) {
            s.switches[si].x = target.x; s.switches[si].y = target.y;
            break;
          }
        }
      }
    }
    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) {
        s.crates[y][x] = snap.crates[y][x] || null;
      }
    }
    rebuildLocks(s);
  };

  /* ---------------------------------------------------------------------- */
  /* Geometry helpers                                                       */
  /* ---------------------------------------------------------------------- */

  var inBounds = SM.BOARD.inBounds;
  RULES.inBounds = inBounds;

  var tileAt = SM.BOARD.tileAt;
  RULES.tileAt = tileAt;

  var crateAt = SM.BOARD.crateAt;
  RULES.crateAt = crateAt;

  var targetAt = SM.BOARD.targetAt;
  RULES.targetAt = targetAt;

  var isLocked = SM.BOARD.isLocked;
  RULES.isLocked = isLocked;

  function isSolid(s, x, y) {
    var inst = tileAt(s, x, y);
    if (!inst) return true;
    // A strategy may return { solid } or carrier requirements. Static boolean
    // metadata remains the no-hook fast path; named dynamic strings without a
    // corresponding strategy fail loudly instead of gaining guessed rules.
    var passability = tilePassability(s, inst, x, y);
    if (passability && Object.prototype.hasOwnProperty.call(passability, 'solid')) {
      return !!passability.solid;
    }
    if (inst.solid === true) return true;
    if (inst.solid === false) return false;
    if (inst.solid === 'deferred') {
      throw LevelError(s.key, 'tile ' + inst.id + ' (' + inst.name + ') has no implemented solidity rule');
    }
    if (typeof inst.solid === 'string') {
      throw LevelError(s.key, 'tile ' + inst.id + ' (' + inst.name +
        ') requires a registered passability strategy for "' + inst.solid + '"');
    }
    return false;
  }
  RULES.isSolid = isSolid;

  function tilePassability(s, inst, x, y) {
    // Read-only tile query. The engine retains bounds/occupancy and interprets
    // generic solidity/carrier data; the strategy supplies only local policy.
    return SM.resolveTileHook(inst, 'passability', {
      state: s, inst: inst, x: x, y: y, phase: 'passability',
      isLocked: function (cellX, cellY) { return isLocked(s, cellX, cellY); },
      masterVoidActive: masterVoidActive
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Static line-of-sight hazards                                           */
  /* ---------------------------------------------------------------------- */

  // Return visible cells in one emitter's cardinal ray. Terrain solidity and
  // each movable object's ray profile independently determine opacity.
  function traceRay(s, x, y) {
    if (!inBounds(s, x, y)) return [];
    var emitter = tileAt(s, x, y);
    var rayRule = emitter && rayInteraction(s, emitter, x, y, null);
    if (!rayRule || rayRule.type !== 'emitter') return [];
    var dir = rayRule.direction || {};
    var dx = dir.x, dy = dir.y;
    if (!((dx === 0 && (dy === 1 || dy === -1)) ||
          (dy === 0 && (dx === 1 || dx === -1)))) return [];

    var cells = [], cx = x + dx, cy = y + dy;
    // Cardinal validation guarantees termination at the edge. The explicit
    // bound also protects this pure query if malformed state is supplied.
    var remaining = s.width + s.height;
    while (remaining-- > 0 && inBounds(s, cx, cy)) {
      if (isSolid(s, cx, cy) || rayObjectBlocks(s, cx, cy)) break;
      cells.push({ x: cx, y: cy });
      cx += dx;
      cy += dy;
    }
    return cells;
  }
  RULES.traceRay = traceRay;

  function traceRays(s) {
    var rays = [];
    // Deterministic y/x scan is the emitter order for both ray events and
    // sequential object transport. The tile hook supplies emitter direction.
    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) {
        var inst = tileAt(s, x, y);
        if (!inst) continue;
        var rule = rayInteraction(s, inst, x, y, null);
        if (!rule || rule.type !== 'emitter') continue;
        rays.push({ x: x, y: y, dir: rule.direction,
          cells: traceRay(s, x, y) });
      }
    }
    return rays;
  }
  RULES.traceRays = traceRays;

  function rayObjectBlocks(s, x, y) {
    // Ray opacity is an entity strategy/capability, not a crate/target tile ID
    // special case. A missing object strategy falls back to declared profile.
    var crate = crateAt(s, x, y);
    if (crate && rayProfile(s, crate, x, y).ray === 'block') return true;
    var target = targetAt(s, x, y);
    return !!target && rayProfile(s, target, x, y).ray === 'block';
  }

  function rayInteraction(s, inst, x, y, object) {
    return SM.resolveTileHook(inst, 'rayInteraction', {
      state: s, inst: inst, x: x, y: y, phase: 'rayInteraction',
      object: object || null,
      objectCapabilities: object ? objectCapabilities(object) : null
    });
  }

  function rayProfile(s, object, x, y) {
    var inst = object.inst || object;
    var rule = rayInteraction(s, inst, x, y, object);
    return rule && rule.type === 'object' ? rule.profile : objectCapabilities(object);
  }

  function rayTransportKey(object) {
    return object.entityId || (isTargetEntity(object)
      ? 'target:' + object.inst.id + '@' + object.x + ',' + object.y
      : 'crate:' + object.id);
  }

  function transportObjectsOnRay(s, ray, steps) {
    var processed = {};
    var entityCount = 0;
    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) if (crateAt(s, x, y)) entityCount++;
    }
    for (var i = 0; i < s.switches.length; i++) {
      if (isTargetEntity(s.switches[i])) entityCount++;
    }

    for (var attempt = 0; attempt < entityCount; attempt++) {
      var cells = traceRay(s, ray.x, ray.y);
      var candidate = null;
      var distance = -1;
      for (var ci = 0; ci < cells.length; ci++) {
        var cell = cells[ci];
        var occupants = [crateAt(s, cell.x, cell.y), targetAt(s, cell.x, cell.y)];
        for (var oi = 0; oi < occupants.length; oi++) {
          var object = occupants[oi];
          if (!object || rayProfile(s, object, cell.x, cell.y).ray !== 'transport') continue;
          var key = rayTransportKey(object);
          if (processed[key]) continue;
          if (ci > distance) { candidate = { object: object, x: cell.x, y: cell.y, key: key }; distance = ci; }
        }
      }
      if (!candidate) break;

      processed[candidate.key] = true;
      var xPos = candidate.x, yPos = candidate.y;
      var nextX = xPos + ray.dir.x, nextY = yPos + ray.dir.y;
      while (isLegalObjectDestination(s, candidate.object, nextX, nextY)) {
        moveObjectEntity(s, candidate.object, xPos, yPos, nextX, nextY, steps, 'move');
        xPos = nextX; yPos = nextY;
        nextX += ray.dir.x; nextY += ray.dir.y;
      }
    }
  }

  function transportObjectsAlongRays(s, steps) {
    // Each ray sees the settled board left by previous emitters; ordering is
    // intentionally stable and transport is completed before player exposure.
    var emitters = traceRays(s);
    for (var i = 0; i < emitters.length; i++) {
      transportObjectsOnRay(s, emitters[i], steps);
    }
  }

  function isCaught(s, player) {
    var target = player || s.player;
    var rays = traceRays(s);
    for (var i = 0; i < rays.length; i++) {
      for (var j = 0; j < rays[i].cells.length; j++) {
        var cell = rays[i].cells[j];
        if (cell.x === target.x && cell.y === target.y) return true;
      }
    }
    return false;
  }
  RULES.isCaught = isCaught;

  /** Can the player stand on this cell right now? */
  function canEnter(s, x, y) {
    if (!inBounds(s, x, y)) return false;
    if (crateAt(s, x, y)) return false;
    if (isSolid(s, x, y)) return false;
    var inst = tileAt(s, x, y);
    var passability = inst && tilePassability(s, inst, x, y);
    if (passability && passability.required && passability.carrier !== passability.required) {
      return false;
    }
    return true;
  }
  RULES.canEnter = canEnter;

  /* ---------------------------------------------------------------------- */
  /* Sensors — crate adjacency (B11, §8.3)                                 */
  /* ---------------------------------------------------------------------- */

  var SENSOR_SPOTS = [
    { name: 'n', x: 0,  y:  1 },
    { name: 'e', x: 1,  y:  0 },
    { name: 's', x: 0,  y: -1 },
    { name: 'w', x: -1, y:  0 }
  ];

  function sensorLit(s, sw) {
    var want = sw.inst.params.colour;
    var lit = {};
    var any = false;
    // Every one of the four neighbours is reported, so the view can light the
    // whole hexagon's edges rather than only the first hit.
    for (var i = 0; i < SENSOR_SPOTS.length; i++) {
      var d = SENSOR_SPOTS[i];
      var c = crateAt(s, sw.x + d.x, sw.y + d.y);
      var yes = !!c && c.params.colour === want;
      lit[d.name] = yes;
      if (yes) any = true;
    }
    return { lit: lit, any: any };
  }
  RULES.sensorLit = sensorLit;

  /* ---------------------------------------------------------------------- */
  /* Switch activity (T4, §8.2)                                            */
  /* ---------------------------------------------------------------------- */

  function switchActive(s, sw) {
    return !!SM.resolveTileHook(sw.inst, 'activation', {
      state: s, inst: sw.inst, x: sw.x, y: sw.y, phase: 'activation',
      crateAt: function (x, y) { return crateAt(s, x, y); },
      switchAt: function (inst, x, y) { return findSwitch(s, inst, x, y); },
      sensorLit: function (inst, x, y) {
        return sensorLit(s, { inst: inst, x: x, y: y });
      }
    });
  }
  RULES.switchActive = switchActive;

  function masterVoidActive(s) {
    return globalToggleActive(s, 'master_void');
  }
  RULES.masterVoidActive = masterVoidActive;

  function globalToggleActive(s, key) {
    for (var i = 0; i < s.switches.length; i++) {
      var sw = s.switches[i];
      if (sw.inst.params.scope === 'global' && sw.inst.params.mode === 'toggle' &&
          sw.inst.params.key === key && sw.latched) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------------- */
  /* Lock resolution (R11, §5.4)                                            */
  /* One pure pass per turn. Order is fixed and documented:                 */
  /*   1. start at the tile's own defaultLocked                            */
  /*   2. every LATCHED tagged toggle whose link matches flips it          */
  /*   3. any ACTIVE momentary or sensor strategy on the link clears it    */
  /*   4. a latched global master_lock forces it locked (always wins)      */
  /* ---------------------------------------------------------------------- */

  function rebuildLocks(s) {
    var masterOn = globalToggleActive(s, 'master_lock');

    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) {
        var inst = s.grid[y][x];
        if (inst.solid !== 'locked') { s.locked[y][x] = false; continue; }
        var link = inst.params.link | 0;
        var locked = inst.params.defaultLocked !== false;

        // Step 2 — parity of latched tagged toggle-mode signals on this link.
        // Scope/mode/link are data; activity comes from each tile strategy.
        var flips = 0;
        for (var j = 0; j < s.switches.length; j++) {
          var t = s.switches[j];
          if (t.inst.params.mode !== 'toggle') continue;
          if (t.inst.params.scope !== 'tagged') continue;
          if (!t.latched) continue;
          if ((t.inst.params.link | 0) !== link) continue;
          flips++;
        }
        if (flips % 2 === 1) locked = !locked;

        // Step 3 — any active momentary/sensor signal on this link clears it.
        for (var k = 0; k < s.switches.length; k++) {
          var a = s.switches[k];
          if (a.inst.params.mode !== 'momentary' && a.inst.params.mode !== 'sensor') continue;
          if ((a.inst.params.link | 0) !== link) continue;
          if (switchActive(s, a)) { locked = false; break; }
        }

        // Step 4 — a latched global master_lock always wins.
        if (masterOn) locked = true;

        s.locked[y][x] = locked;
      }
    }
  }
  RULES.rebuildLocks = rebuildLocks;

  /* ---------------------------------------------------------------------- */
  /* Generic state/event operations injected into tile strategy contexts.   */
  /* ---------------------------------------------------------------------- */

  function makeEngine(s, steps) {
    return {
      checkGoal: function (ctx) {
        if (s.player.x === s.goal.x && s.player.y === s.goal.y && s.P === s.W) {
          s.won = true;
          steps.push({ type: 'goal', x: s.player.x, y: s.player.y, won: true });
        }
      },
      setColour: function (which, to) {
        var from = s[which];
        s[which] = to;
        steps.push({ type: 'colour', which: which, from: from, to: to });
      },
      anyActiveSwitchOnLink: function (link) {
        return anyActiveSwitchOnLink(s, link);
      },
      toggleSwitch: function (ctx) {
        var sw = findSwitch(s, ctx.inst, ctx.x, ctx.y);
        if (!sw) return;
        sw.latched = !sw.latched;
        steps.push({ type: 'switch', x: sw.x, y: sw.y, latched: sw.latched });
      },
      flipPolarity: function (ctx) {
        var from = s.polarity;
        s.polarity = from === 'red-open' ? 'blue-open' : 'red-open';
        steps.push({ type: 'polarity', x: ctx.x, y: ctx.y, from: from, to: s.polarity });
      },
      teleportPlayer: function (ctx) {
        var dest = partnerPortal(s, ctx.x, ctx.y, ctx.inst.params.link);
        if (!dest) return;
        steps.push({ type: 'teleport', from: { x: ctx.x, y: ctx.y }, to: dest });
        s.player.x = dest.x; s.player.y = dest.y;
      }
    };
  }
  RULES.makeEngine = makeEngine;

  function findSwitch(s, inst, x, y) {
    for (var i = 0; i < s.switches.length; i++) {
      if (s.switches[i].x === x && s.switches[i].y === y && s.switches[i].inst === inst) {
        return s.switches[i];
      }
    }
    return null;
  }

  function anyActiveSwitchOnLink(s, link) {
    for (var i = 0; i < s.switches.length; i++) {
      if ((s.switches[i].inst.params.link | 0) !== link) continue;
      if (switchActive(s, s.switches[i])) return true;
    }
    return false;
  }
  RULES.anyActiveSwitchOnLink = anyActiveSwitchOnLink;

  function partnerPortal(s, x, y, link) {
    var list = s.portals[String(link)];
    if (!list || list.length < 2) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].x !== x || list[i].y !== y) return { x: list[i].x, y: list[i].y };
    }
    return null;
  }
  RULES.partnerPortal = partnerPortal;

  function isTargetEntity(object) {
    return SM.ENTITIES.isTarget(object);
  }

  function objectCapabilities(object) {
    return SM.ENTITIES.capabilities(object);
  }

  function moveObjectEntity(s, object, fromX, fromY, toX, toY, steps, eventType) {
    // Destination preflight is a separate pure query; the entity helper owns
    // only one-position commit and the corresponding stable display event.
    SM.ENTITIES.move(s, object, fromX, fromY, toX, toY, steps, eventType);
  }

  function forcedMovementFor(s, inst, x, y, direction, object) {
    // Tile policy is a descriptor; this layer owns capability checks,
    // destinations, loop bounds, commits, and event order.
    return SM.resolveTileHook(inst, 'forcedMovement', {
      state: s, inst: inst, x: x, y: y, phase: 'forcedMovement',
      direction: direction || null,
      object: object || null,
      objectCapabilities: object ? objectCapabilities(object) : null
    });
  }

  function runObjectForceChain(s, object, startX, startY, incoming, steps) {
    // Preconditions: the initiating move already committed this object's
    // first position. Each subsequent hop is capability- and destination-
    // checked; a directed-state set and board-derived cap guarantee termination.
    var capabilities = objectCapabilities(object);
    var x = startX, y = startY, d = incoming;
    var hops = 0;
    var cap = s.width * s.height * FORCE_CHAIN_STATES_PER_CELL;
    var seen = {};

    while (hops < cap) {
      var inst = tileAt(s, x, y);
      if (!inst) break;
      var force = forcedMovementFor(s, inst, x, y, d, object);

      if (force && force.type === 'portal' && capabilities.portal) {
        var partner = partnerPortal(s, x, y, force.link);
        if (!partner || !isLegalObjectDestination(s, object, partner.x, partner.y)) break;
        moveObjectEntity(s, object, x, y, partner.x, partner.y, steps, 'teleport');
        break; // teleport ends this entity's chain; the destination is not re-entered
      }

      if (force && force.type === 'flow' && capabilities.conveyor) {
        d = force.direction || { x: 1, y: 0 };
      } else if (force && force.type === 'ice' && capabilities.conveyor && d) {
        d = force.direction || d;
      } else {
        break;
      }

      var stateKey = (object.entityId || object.id) + ':' + x + ',' + y + ',' + d.x + ',' + d.y;
      if (seen[stateKey]) {
        steps.push({ type: 'force-loop', entityId: object.entityId, x: x, y: y,
          dir: { x: d.x, y: d.y } });
        break;
      }
      seen[stateKey] = true;

      var tx = x + d.x, ty = y + d.y;
      if (!isLegalObjectDestination(s, object, tx, ty)) break;
      moveObjectEntity(s, object, x, y, tx, ty, steps, 'move');
      x = tx; y = ty;
      hops++;
    }

    if (hops >= cap) {
      steps.push({ type: 'object-force-cap', entityId: object.entityId,
        cap: cap, x: x, y: y });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Player force chains (conveyors and ice)                               */
  /*                                                                        */
  /*  Player belts carry in their declared direction. Ice carries the      */
  /*  incoming direction. Crate belts retain their explicit one-cell shove. */
  /*  Repeated directed positions stop loops; a board-derived cap is a      */
  /*  final guard for malformed or dynamically changing chains.             */
  /* ---------------------------------------------------------------------- */

  function runPlayerForceChain(s, incoming, steps) {
    // Player force uses the same tile hook protocol as objects, but the engine
    // retains player occupancy, gate legality, crate-belt eligibility, and
    // bounded iteration as shared movement invariants.
    var hops = 0;
    var cap = s.width * s.height * FORCE_CHAIN_STATES_PER_CELL;
    var seen = {};
    var d = incoming;
    while (hops < cap) {
      var inst = tileAt(s, s.player.x, s.player.y);
      if (!inst) break;
      var force = forcedMovementFor(s, inst, s.player.x, s.player.y, d, null);
      if (force && force.type === 'flow') d = force.direction || { x: 1, y: 0 };
      else if (force && force.type === 'ice') d = force.direction || d;
      else break;

      var stateKey = s.player.x + ',' + s.player.y + ',' + d.x + ',' + d.y;
      if (seen[stateKey]) {
        steps.push({ type: 'force-loop', x: s.player.x, y: s.player.y,
                     dir: { x: d.x, y: d.y } });
        break;
      }
      seen[stateKey] = true;

      var tx = s.player.x + d.x, ty = s.player.y + d.y;
      if (!inBounds(s, tx, ty) || isSolid(s, tx, ty)) break;

      var c = crateAt(s, tx, ty);
      var feature = targetAt(s, tx, ty);
      var object = c || feature;
      if (object) {
        if (!force || force.type !== 'flow' || force.kind !== 'crate' ||
            !objectCapabilities(object).conveyor) break;
        var bx = tx + d.x, by = ty + d.y;
        if (!isLegalObjectDestination(s, object, bx, by)) break;
        moveObjectEntity(s, object, tx, ty, bx, by, steps, 'move');
        runObjectForceChain(s, object, bx, by, d, steps);
      } else {
        var target = tileAt(s, tx, ty);
        var passability = tilePassability(s, target, tx, ty);
        if (passability && passability.required && passability.carrier !== passability.required) break;
      }

      var from = { x: s.player.x, y: s.player.y };
      s.player.x = tx; s.player.y = ty;
      steps.push({ type: 'move', from: from, to: { x: tx, y: ty } });
      hops++;
    }
    if (hops >= cap) {
      steps.push({ type: 'belt-cap', cap: cap, x: s.player.x, y: s.player.y });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* The resolver (R1-R21, §5.2)                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * Apply exactly one turn. Mutates `s`. Returns { steps, changed, stroke }.
   * `steps` is the ONLY channel to the view; the view must never feed back.
   */
  RULES.resolveTurn = function (s, action) {
    if (!action || typeof action.type !== 'string') {
      throw LevelError(s.key, 'resolveTurn: action.type is required');
    }
    var steps = [];
    var engine = makeEngine(s, steps);
    var before = snapshotSig(s);
    var wasWon = s.won;

    if (action.type === 'move') {
      var d = null, i;
      for (i = 0; i < DIRS.length; i++) if (DIRS[i].name === action.dir) d = DIRS[i];
      if (!d) throw LevelError(s.key, 'resolveTurn: unknown direction "' + action.dir + '"');
      moveOne(s, d, steps, engine);
    } else if (action.type === 'pull') {
      var pullDir = null, pi;
      for (pi = 0; pi < DIRS.length; pi++) if (DIRS[pi].name === action.dir) pullDir = DIRS[pi];
      if (!pullDir) throw LevelError(s.key, 'resolveTurn: unknown pull direction "' + action.dir + '"');
      pullOne(s, pullDir, steps, engine);
    } else if (action.type === 'act') {
      var here = tileAt(s, s.player.x, s.player.y);
      steps.push({ type: 'press', x: s.player.x, y: s.player.y });
      if (here) runBehaviour(s, steps, engine, here, s.player.x, s.player.y, true);
    } else {
      throw LevelError(s.key, 'resolveTurn: unknown action "' + action.type + '"');
    }

    // Canonical turn phases (event order is observable by renderer and tests):
    // 1. Commit the direct move/push/pull or ACT.
    // 2. Settle object force, then player force, then the player's final entry.
    // 3. Derive signal/lock state from the settled board.
    // 4. Transport ray-compatible objects in stable emitter scan order.
    // 5. Re-derive locks and final rays; catch/respawn an exposed player.
    // 6. Account for turn/stroke, update persistent discovery, then test goal.
    // No rendering or wall-clock action participates in these phases.
    rebuildLocks(s);
    var actionChanged = before !== snapshotSig(s);
    var movementAction = action.type === 'move' || action.type === 'pull';
    var resolvedAction = action.type === 'act' || (movementAction && actionChanged);
    var rayRecords = [];
    if (resolvedAction) {
      transportObjectsAlongRays(s, steps);
      rebuildLocks(s);
      rayRecords = traceRays(s);
    }
    for (var ri = 0; ri < rayRecords.length; ri++) {
      steps.push({ type: 'ray', emitter: { x: rayRecords[ri].x, y: rayRecords[ri].y },
        dir: rayRecords[ri].dir, cells: rayRecords[ri].cells });
    }
    var caught = resolvedAction && isCaught(s);
    if (caught) {
      var caughtAt = { x: s.player.x, y: s.player.y };
      var respawnAt = { x: s.start.x, y: s.start.y };

      // Goal entry effects run synchronously as part of movement. If the same
      // settled position is exposed to a ray, retract that provisional win so
      // the catch takes precedence over the final goal test below.
      s.won = wasWon;
      for (var si = steps.length - 1; si >= 0; si--) {
        if (steps[si].type === 'goal') steps.splice(si, 1);
      }
      steps.push({ type: 'caught', at: caughtAt });
      s.player.x = respawnAt.x;
      s.player.y = respawnAt.y;
      steps.push({ type: 'respawn', from: caughtAt, to: respawnAt });
      rebuildLocks(s);
    }

    s.turns++;
    var inst = tileAt(s, s.player.x, s.player.y);
    var seenTarget = targetAt(s, s.player.x, s.player.y);
    if (seenTarget) inst = seenTarget.inst;
    if (inst) s.seen[inst.id] = true;

    var moved = before !== snapshotSig(s) || caught;
    var stroke = (movementAction && (actionChanged || caught)) || action.type === 'act';
    if (stroke) s.strokes++;

    // Goal is re-tested every turn; it is cheap and it means a colour change
    // anywhere in the resolver can complete the level.
    if (!s.won && s.player.x === s.goal.x && s.player.y === s.goal.y && s.P === s.W) {
      s.won = true;
      steps.push({ type: 'goal', x: s.player.x, y: s.player.y, won: true });
    }

    return { steps: steps, changed: moved, stroke: stroke };
  };

  function moveOne(s, d, steps, engine) {
    var tx = s.player.x + d.x, ty = s.player.y + d.y;

    if (!inBounds(s, tx, ty)) {
      steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'off-board' });
      return;
    }

    var target = tileAt(s, tx, ty);
    var c = crateAt(s, tx, ty);
    var feature = targetAt(s, tx, ty);
    var forcedObject = null, forcedObjectX = -1, forcedObjectY = -1;

    if (c) {
      var bx = tx + d.x, by = ty + d.y;
      if (!c.capabilities.pushable || !isLegalObjectDestination(s, c, bx, by)) {
        steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'crate' });
        return;
      }
      s.crates[ty][tx] = null;
      s.crates[by][bx] = c;
      steps.push({ type: 'push', crate: { x: tx, y: ty }, to: { x: bx, y: by } });
      forcedObject = c; forcedObjectX = bx; forcedObjectY = by;
      var from = { x: s.player.x, y: s.player.y };
      s.player.x = tx; s.player.y = ty;
      steps.push({ type: 'move', from: from, to: { x: tx, y: ty } });
    } else if (feature) {
      var targetX = tx + d.x, targetY = ty + d.y;
      var targetCapabilities = feature.capabilities || feature.inst.capabilities || {};
      if (!targetCapabilities.pushable || !isLegalObjectDestination(s, feature, targetX, targetY)) {
        steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'target' });
        return;
      }
      var targetFrom = { x: feature.x, y: feature.y };
      feature.x = targetX; feature.y = targetY;
      steps.push({ type: 'target-move', objectType: 'target',
        entityId: feature.entityId, id: feature.inst.id,
        from: targetFrom, to: { x: targetX, y: targetY } });
      forcedObject = feature; forcedObjectX = targetX; forcedObjectY = targetY;
      var targetStepFrom = { x: s.player.x, y: s.player.y };
      s.player.x = tx; s.player.y = ty;
      steps.push({ type: 'move', from: targetStepFrom, to: { x: tx, y: ty } });
    } else if (isSolid(s, tx, ty)) {
      steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'wall' });
      return;
    } else {
      var passability = tilePassability(s, target, tx, ty);
      if (passability && passability.required && passability.carrier !== passability.required) {
        steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'colour',
                     need: passability.required, have: passability.carrier });
        return;
      }
    }

    if (!c && !feature) {
      var f2 = { x: s.player.x, y: s.player.y };
      s.player.x = tx; s.player.y = ty;
      steps.push({ type: 'move', from: f2, to: { x: tx, y: ty } });
    }

    finishPlayerMove(s, d, steps, engine, forcedObject, forcedObjectX, forcedObjectY);
  }

  function pullOne(s, d, steps, engine) {
    var tx = s.player.x + d.x, ty = s.player.y + d.y;
    if (!canEnter(s, tx, ty)) {
      steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'pull' });
      return;
    }

    var bx = s.player.x - d.x, by = s.player.y - d.y;
    var object = crateAt(s, bx, by) || targetAt(s, bx, by);
    if (!object || !(object.capabilities || object.inst.capabilities).pullable ||
        !isLegalObjectDestination(s, object, s.player.x, s.player.y, true)) {
      steps.push({ type: 'blocked', x: bx, y: by, dir: d.name, reason: 'pull' });
      return;
    }

    var fromObject = { x: bx, y: by };
    var forcedObjectX = s.player.x, forcedObjectY = s.player.y;
    if (isTargetEntity(object)) {
      object.x = s.player.x; object.y = s.player.y;
      steps.push({ type: 'target-move', objectType: 'target',
        entityId: object.entityId, id: object.inst.id,
        from: fromObject, to: { x: s.player.x, y: s.player.y } });
    } else {
      s.crates[by][bx] = null;
      s.crates[s.player.y][s.player.x] = object;
      steps.push({ type: 'pull', crate: fromObject,
        to: { x: s.player.x, y: s.player.y } });
    }

    var fromPlayer = { x: s.player.x, y: s.player.y };
    s.player.x = tx; s.player.y = ty;
    steps.push({ type: 'move', from: fromPlayer, to: { x: tx, y: ty } });
    finishPlayerMove(s, d, steps, engine, object, forcedObjectX, forcedObjectY);
  }

  function isLegalObjectDestination(s, object, x, y, allowCurrentPlayerCell) {
    // Pure destination predicate shared by push/pull, conveyors, ice, and
    // portals. It never moves the entity; commit only after this returns true.
    return SM.ENTITIES.canOccupy(s, object, x, y, {
      inBounds: function (cellX, cellY) { return inBounds(s, cellX, cellY); },
      isSolid: function (cellX, cellY) { return isSolid(s, cellX, cellY); },
      crateAt: function (cellX, cellY) { return crateAt(s, cellX, cellY); },
      playerAt: function (cellX, cellY) {
        return s.player.x === cellX && s.player.y === cellY;
      },
      targetAt: function (cellX, cellY) { return targetAt(s, cellX, cellY); },
      passability: function (cellX, cellY) {
        var tile = tileAt(s, cellX, cellY);
        return tile ? tilePassability(s, tile, cellX, cellY) : null;
      }
    }, !!allowCurrentPlayerCell);
  }

  function finishPlayerMove(s, d, steps, engine, forcedObject, forcedObjectX, forcedObjectY) {
    // Forced movement, then the single on_enter pass of the FINAL resting tile.
    if (forcedObject) {
      runObjectForceChain(s, forcedObject, forcedObjectX, forcedObjectY, d, steps);
    }
    runPlayerForceChain(s, d, steps);

    var rest = tileAt(s, s.player.x, s.player.y);
    if (rest) runBehaviour(s, steps, engine, rest, s.player.x, s.player.y, false);
  }

  function runBehaviour(s, steps, engine, inst, x, y, isPress) {
    // No guard is needed against re-firing a portal on arrival: on_enter runs
    // exactly once per turn, for the tile the player FINALLY rests on after the
    // move and any belt chain. A teleport destination is never re-entered.
    // Legacy handler context contract: `state` is the live mutable rules
    // state; `engine` exposes documented synchronous rule operations; `inst`
    // and x/y identify the current tile; `press` distinguishes ACT from entry.
    // This is an internal boundary, not permission to access DOM or timing.
    var hook = isPress ? 'onAct' : 'onEnter';
    SM.resolveTileHook(inst, hook, {
      state: s, engine: engine, inst: inst, x: x, y: y,
      press: isPress, phase: hook
    });
  }

  /** Cheap identity of the mutable parts of the state. */
  function snapshotSig(s) {
    var sig = s.player.x + ',' + s.player.y + '|' + s.P + '|' + s.W + '|' + s.polarity;
    for (var i = 0; i < s.switches.length; i++) {
      var sw = s.switches[i];
      sig += '|' + (sw.latched ? 1 : 0);
      if (isTargetEntity(sw)) sig += '@' + sw.entityId + ':' + sw.x + ',' + sw.y +
        ':' + capabilitySignature(sw.capabilities || sw.inst.capabilities);
    }
    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) {
        var crate = s.crates[y][x];
        sig += crate ? '[' + crate.entityId + ':' + crate.id + ':' +
          (crate.params.colour || '') + ':' + capabilitySignature(crate.capabilities) + ']' : '[]';
      }
    }
    return sig;
  }
  RULES.snapshotSig = snapshotSig;

  function capabilitySignature(capabilities) {
    if (!capabilities) return '';
    return ['pushable', 'pullable', 'conveyor', 'portal', 'ray'].map(function (key) {
      return key + '=' + String(capabilities[key]);
    }).join(',');
  }

  /* ---------------------------------------------------------------------- */
  /* Read-only views for the renderer / UI                                  */
  /* ---------------------------------------------------------------------- */

  RULES.describeTile = function (s, x, y) {
    var inst = tileAt(s, x, y);
    if (!inst) return null;
    var target = targetAt(s, x, y);
    if (target) inst = target.inst;
    var sw = findSwitch(s, inst, x, y);
    var view = {
      inst: inst,
      terrain: tileAt(s, x, y),
      target: target,
      crate: crateAt(s, x, y),
      locked: isLocked(s, x, y),
      solid: isSolid(s, x, y),
      active: sw ? switchActive(s, sw) : false,
      latched: sw ? sw.latched : false,
      W: s.W,
      polarity: s.polarity,
      lit: {}
    };
    if (sw && sw.inst.strategies && sw.inst.strategies.activation === 'crateAdjacencySensor') {
      view.lit = sensorLit(s, sw).lit;
    }
    return view;
  };

  SM.RULES = RULES;

})(globalThis);
