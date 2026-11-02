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
    // Authored configuration under `level` and terrain under `grid` are fixed.
    fixed: Object.freeze(['level', 'key', 'width', 'height', 'grid', 'portals', 'start', 'goal']),
    mutable: Object.freeze(['crates', 'switches', 'player', 'P', 'W', 'polarity', 'strokes', 'turns', 'won', 'failed', 'failureReason']),
    derived: Object.freeze(['locked']),
    persistent: Object.freeze(['seen']),
    undo: Object.freeze([
      'player', 'P', 'W', 'polarity', 'strokes', 'turns', 'won', 'failed', 'failureReason',
      'switches[]:identity+position+latch+capabilities', 'crates[][]'
    ]),
    solverIdentity: Object.freeze([
      'player', 'P', 'W', 'polarity', 'won', 'failed', 'failureReason', 'switches[].latched', 'targets[].position',
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

  var EFFECT_PRIORITIES = Object.freeze({ signal: 0, checkpoint: 0.5, transport: 1, ordinary: 2 });
  RULES.createQueue = function (width, height) {
    var pending = [], sequence = 0;
    var operations = { signal: ['onActivate', 'onRelease'], checkpoint: ['goal'],
      transport: ['flow', 'ice', 'portal', 'ray'], ordinary: ['onEnter', 'onExit', 'onAct'] };
    function dataOnly(value) {
      if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return;
      if (typeof value === 'number' && isFinite(value)) return;
      if (typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
        throw new Error('non-declarative effect payload');
      }
      Object.keys(value).forEach(function (key) { dataOnly(value[key]); });
    }
    function ordered() {
      pending.sort(function (a, b) {
        return EFFECT_PRIORITIES[a.kind] - EFFECT_PRIORITIES[b.kind] || a.y - b.y || a.x - b.x || a.sequence - b.sequence;
      });
    }
    function semantic(record) {
      return [record.kind, record.op, record.x, record.y, record.actorId,
        record.inst && [record.inst.id, record.inst.params, record.inst.strategies], record.payload || null];
    }
    var queue = {
      add: function (record) {
        if (!record || !Object.prototype.hasOwnProperty.call(EFFECT_PRIORITIES, record.kind) ||
            !Number.isInteger(record.x) || !Number.isInteger(record.y) ||
            record.x < 0 || record.y < 0 || record.x >= width || record.y >= height ||
            typeof record.op !== 'string' || operations[record.kind].indexOf(record.op) < 0 ||
            (record.kind !== 'signal' && typeof record.actorId !== 'string') ||
            Object.keys(record).some(function (key) { return ['kind', 'op', 'x', 'y', 'actorId', 'inst', 'payload'].indexOf(key) < 0; })) {
          throw new Error('malformed queued effect');
        }
        dataOnly(record.payload);
        var encoded = JSON.stringify(semantic(record), function (key, value) {
          if (typeof value === 'function' || typeof value === 'symbol' ||
              (typeof value === 'number' && !isFinite(value))) throw new Error('non-declarative effect payload');
          return value;
        });
        if (record.kind === 'transport' && pending.some(function (other) { return other.transportKey === encoded; })) return false;
        var capturedPayload = record.payload === undefined ? undefined : JSON.parse(JSON.stringify(record.payload));
        pending.push(immutableConfiguration(Object.assign({}, record, { payload: capturedPayload, sequence: sequence++,
          transportKey: record.kind === 'transport' ? encoded : null })));
        return true;
      },
      shift: function () { ordered(); return pending.shift() || null; },
      signature: function () { ordered(); return JSON.stringify(pending.map(semantic)); }
    };
    Object.defineProperty(queue, 'length', { get: function () { return pending.length; } });
    return Object.freeze(queue);
  };

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

  function immutableConfiguration(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    var copy = Array.isArray(value) ? [] : {};
    Object.keys(value).forEach(function (key) { copy[key] = immutableConfiguration(value[key]); });
    return Object.freeze(copy);
  }

  function protectFixed(state) {
    RULES.STATE_CONTRACT.fixed.forEach(function (key) {
      Object.defineProperty(state, key, { enumerable: true, configurable: false, writable: false,
        value: key === 'level' ? state[key] : immutableConfiguration(state[key]) });
    });
    return Object.seal(state);
  }

  /**
   * Build a normalised, immutable level object from a raw level record.
   * levels.js has already validated the raw record against the shared schema; this function
   * only translates. Throws LevelError on anything it still cannot honour.
   */
  RULES.buildLevel = function (raw, key) {
    var w = raw.width === undefined ? raw.grid[0].length : raw.width;
    var h = raw.height === undefined ? raw.grid.length : raw.height;
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
          closingSurface: def.closingSurface,
          category: def.category,
          layer: def.layer,
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
        inst = immutableConfiguration(inst);
        authoredInst = inst;
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
        inst = immutableConfiguration(inst);
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

    var level = {
      key: key,
      rulesIdentity: JSON.stringify([key, raw.grid,
        raw.overrides, raw.object_overrides, raw.initial_polarity,
        raw.initial_player_colour, raw.initial_world_colour]),
      initialPlayerColour: raw.initial_player_colour || 'wht',
      initialWorldColour: raw.initial_world_colour || 'wht',
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
    Object.keys(level).forEach(function (field) {
      Object.defineProperty(level, field, { enumerable: true, configurable: false, writable: false,
        value: immutableConfiguration(level[field]) });
    });
    return level;
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
      P: level.initialPlayerColour || 'wht',
      W: level.initialWorldColour || 'wht',
      strokes: 0,
      turns: 0,
      won: false,
      failed: false,
      failureReason: null,
      polarity: level.initialPolarity || 'red-open',
      seen: {}
    };
    protectFixed(s);
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
    return protectFixed({
      level: s.level,
      key: s.key,
      width: s.width,
      height: s.height,
      grid: s.grid,
      crates: deepCopyGrid(s.crates),
      locked: deepCopyGrid(s.locked),
      switches: copySwitches(s.switches),
      portals: s.portals,
      player: { x: s.player.x, y: s.player.y },
      start: { x: s.start.x, y: s.start.y },
      goal: { x: s.goal.x, y: s.goal.y },
      P: s.P, W: s.W,
      polarity: s.polarity,
      strokes: s.strokes, turns: s.turns, won: s.won,
      failed: s.failed, failureReason: s.failureReason,
      seen: Object.assign({}, s.seen)
    });
  };

  RULES.snapshot = function (s) {
    // Undo captures reversible gameplay, not `seen` (codex knowledge is
    // monotone) or `locked` (derived). Restore rebuilds the latter from the
    // restored signals and latches.
    return {
      player: { x: s.player.x, y: s.player.y },
      P: s.P, W: s.W, polarity: s.polarity,
      strokes: s.strokes, turns: s.turns, won: s.won,
      failed: s.failed, failureReason: s.failureReason,
      switches: copySwitches(s.switches),
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
    s.player = { x: snap.player.x, y: snap.player.y };
    s.P = snap.P; s.W = snap.W; s.polarity = snap.polarity || 'red-open';
    s.strokes = snap.strokes; s.turns = snap.turns; s.won = snap.won;
    s.failed = snap.failed; s.failureReason = snap.failureReason;
    s.switches = copySwitches(snap.switches);
    s.crates = deepCopyGrid(snap.crates);
    s.locked = newGrid(s.width, s.height, false);
    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) {
        s.crates[y][x] = snap.crates[y][x] || null;
      }
    }
    rebuildLocks(s);
    enforceDotClosure(s);
  };

  function copySwitches(switches) {
    return switches.map(function (sw) {
      return { entityId: sw.entityId, x: sw.x, y: sw.y, inst: sw.inst,
        latched: sw.latched, capabilities: mergeParams(sw.capabilities, null) };
    });
  }

  RULES.outcome = function (s) { return s.failed ? 'failed' : s.won ? 'won' : 'playing'; };

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

  function requestedSolidAt(s, x, y) {
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
  function closureAt(s, x, y) {
    var inst = tileAt(s, x, y);
    var requested = requestedSolidAt(s, x, y);
    var pending = !!(inst && inst.closingSurface && requested && crateAt(s, x, y));
    return { requestedSolid: requested, pendingClose: pending, effectiveSolid: requested && !pending };
  }
  function isSolid(s, x, y) { return closureAt(s, x, y).effectiveSolid; }
  function enforceDotClosure(s) {
    var inst = tileAt(s, s.player.x, s.player.y);
    if (!s.won && !s.failed && inst && inst.closingSurface && isSolid(s, s.player.x, s.player.y)) {
      s.failed = true; s.failureReason = 'closure'; return true;
    }
    return false;
  }
  RULES.closureAt = closureAt;
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

  function makeEngine(s, steps, round) {
    return Object.freeze({
      checkGoal: function (ctx) {
        if (round && !round.goalCheckpoint) return;
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
        if (ctx.trigger && (ctx.trigger.portalArrival || ctx.trigger.transportHandled)) return;
        if (s.player.x !== ctx.x || s.player.y !== ctx.y) return;
        var dest = partnerPortal(s, ctx.x, ctx.y, ctx.inst.params.link);
        if (!dest) return;
        if (!canEnter(s, dest.x, dest.y)) return;
        steps.push({ type: 'teleport', from: { x: ctx.x, y: ctx.y }, to: dest });
        s.player.x = dest.x; s.player.y = dest.y;
      }
    });
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

  function effectiveCapabilities(s, object) {
    return objectCapabilities(object);
  }
  RULES.effectiveCapabilities = effectiveCapabilities;

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

  /* ---------------------------------------------------------------------- */
  /* The resolver (R1-R21, §5.2)                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * Apply exactly one turn. Mutates `s`. Returns { steps, changed, stroke }.
   * `steps` is the ONLY channel to the view; the view must never feed back.
   */
  RULES.resolveTurn = function (s, action) {
    if (!action || ['move', 'pull', 'act'].indexOf(action.type) === -1) throw LevelError(s.key, 'invalid action');
    if (action.type !== 'act' && ACTION_KEYS.indexOf(action.dir) === -1) throw LevelError(s.key, 'invalid direction');
    if (s.won || s.failed) return { steps: [{ type: 'blocked', reason: 'terminal', outcome: RULES.outcome(s) }],
      changed: false, stroke: false };
    rebuildLocks(s);
    if (enforceDotClosure(s)) return { steps: [{ type: 'failed', reason: 'closure', at: { x: s.player.x, y: s.player.y } },
      { type: 'state', snapshot: RULES.snapshot(s) }], changed: true, stroke: false };
    var before = RULES.snapshot(s), seenBefore = Object.assign({}, s.seen);
    try { return resolveAction(s, action); }
    catch (error) {
      RULES.restore(s, before);
      s.seen = seenBefore;
      return { steps: [{ type: 'effect-abort', reason: error.effectReason || 'exception', message: String(error.message || error) }],
        aborted: true, changed: false, stroke: false };
    }
  };

  function resolveAction(s, action) {
    var round = { queue: RULES.createQueue(s.width, s.height), steps: [], initial: RULES.snapshot(s),
      signals: signalState(s), raySessions: Object.create(null), seenIds: Object.create(null),
      attempts: 0, commitId: 0, direct: true, goalCheckpoint: false };
    round.engine = makeEngine(s, round.steps, round);
    var direction = DIRS.filter(function (d) { return d.name === action.dir; })[0];
    var initialPositions = positions(s);
    atomicEffect(s, round, function () {
      if (action.type === 'move') moveOne(s, direction, round.steps);
      else if (action.type === 'pull') pullOne(s, direction, round.steps);
    }, action.type);
    var committed = action.type === 'act' || !samePositions(initialPositions, positions(s));
    if (!committed) { s.turns++; return { steps: round.steps, changed: false, stroke: false }; }
    if (action.type === 'act') {
      round.steps.push({ type: 'press', x: s.player.x, y: s.player.y });
      enqueueBehavior(round, tileAt(s, s.player.x, s.player.y), 'onAct', 'dot', s.player.x, s.player.y, {});
    }
    seedBelts(s, round);
    seedRays(s, round);
    round.direct = false;
    var visited = Object.create(null), budget = 64 * s.width * s.height;
    while (round.queue.length && !s.won && !s.failed) {
      var signature = snapshotSig(s) + '|' + s.strokes + ',' + s.turns + '|' + round.queue.signature() +
        '|' + JSON.stringify(Object.keys(round.raySessions).sort()) + '|' + JSON.stringify(round.signals);
      if (visited[signature]) abortEffect('cycle', 'repeated gameplay and ordered queue');
      if (round.attempts >= budget) abortEffect('budget', 'effect attempt budget exhausted');
      visited[signature] = true;
      var effect = round.queue.shift();
      round.attempts++;
      round.goalCheckpoint = effect.kind === 'checkpoint';
      atomicEffect(s, round, function () { dispatchEffect(s, round, effect); }, effect.op);
      round.goalCheckpoint = false;
    }
    if (!s.won && !s.failed) {
      traceRays(s).forEach(function (ray) {
        round.steps.push({ type: 'ray', emitter: { x: ray.x, y: ray.y }, dir: ray.dir, cells: ray.cells });
      });
      if (isCaught(s)) failAttempt(s, round, 'ray');
    }
    s.turns++; s.strokes++;
    Object.keys(round.seenIds).forEach(function (id) { s.seen[id] = true; });
    validateState(s);
    round.steps.push({ type: 'state', snapshot: RULES.snapshot(s), seen: Object.assign({}, s.seen) });
    return { steps: round.steps, changed: true, stroke: true, effects: round.attempts };
  }

  function abortEffect(reason, message) {
    var error = new Error(message); error.effectReason = reason; throw error;
  }

  function positions(s) {
    var result = [{ actorId: 'dot', type: 'dot', x: s.player.x, y: s.player.y, object: null }];
    for (var y = 0; y < s.height; y++) for (var x = 0; x < s.width; x++) {
      var object = crateAt(s, x, y);
      if (object) result.push({ actorId: object.entityId, type: 'crate', x: x, y: y, object: object });
    }
    s.switches.filter(isTargetEntity).forEach(function (target) {
      result.push({ actorId: target.entityId, type: 'target', x: target.x, y: target.y, object: target });
    });
    return result;
  }
  function samePositions(a, b) {
    return a.length === b.length && a.every(function (actor) {
      return b.some(function (other) { return actor.actorId === other.actorId && actor.x === other.x && actor.y === other.y; });
    });
  }
  function actorAt(s, identity) {
    return positions(s).filter(function (actor) { return actor.actorId === identity; })[0] || null;
  }
  function profileFor(actor) { return actor.type === 'dot' ? SM.DOT_DEFINITION.capabilities : objectCapabilities(actor.object); }
  function signalState(s) {
    var result = {};
    s.switches.forEach(function (sw) { result[sw.entityId || sw.inst.id + '@' + sw.x + ',' + sw.y] = switchActive(s, sw); });
    return result;
  }

  function validateState(s) {
    var allowed = RULES.STATE_CONTRACT.fixed.concat(RULES.STATE_CONTRACT.mutable,
      RULES.STATE_CONTRACT.derived, RULES.STATE_CONTRACT.persistent);
    if (Object.keys(s).length !== allowed.length || Object.keys(s).some(function (key) { return allowed.indexOf(key) < 0; })) abortEffect('invariant', 'untracked state field');
    if (SM.GAME_COLOURS.indexOf(s.P) < 0 || SM.GAME_COLOURS.indexOf(s.W) < 0 ||
        ['red-open', 'blue-open'].indexOf(s.polarity) < 0 ||
        typeof s.won !== 'boolean' || typeof s.failed !== 'boolean' || (s.won && s.failed) ||
        (s.failed ? typeof s.failureReason !== 'string' || !s.failureReason : s.failureReason !== null) ||
        !Number.isInteger(s.turns) || s.turns < 0 || !Number.isInteger(s.strokes) || s.strokes < 0) abortEffect('invariant', 'invalid carrier, outcome, or counter');
    function validPosition(actor) { return actor && Number.isInteger(actor.x) && Number.isInteger(actor.y) && inBounds(s, actor.x, actor.y); }
    if (!validPosition(s.player) || Object.keys(s.player).sort().join(',') !== 'x,y') abortEffect('invariant', 'invalid dot position');
    if (requestedSolidAt(s, s.player.x, s.player.y) && !tileAt(s, s.player.x, s.player.y).closingSurface) abortEffect('invariant', 'dot in solid terrain');
    function canonicalArray(array, length) {
      return Array.isArray(array) && array.length === length && Object.keys(array).length === length &&
        Object.keys(array).every(function (key, index) { return key === String(index); });
    }
    if (!canonicalArray(s.crates, s.height) || s.crates.some(function (row) { return !canonicalArray(row, s.width); })) abortEffect('invariant', 'invalid object grid');
    if (!s.seen || typeof s.seen !== 'object' || Array.isArray(s.seen) || Object.keys(s.seen).some(function (id) {
      return !/^\d+$/.test(id) || !SM.getTile(Number(id)) || s.seen[id] !== true;
    })) abortEffect('invariant', 'invalid observation state');
    var expected = {}, identities = {}, featureCells = {};
    s.level.cratesInit.forEach(function (row) { row.forEach(function (crate) { if (crate) expected[crate.entityId] = crate; }); });
    for (var y = 0; y < s.height; y++) for (var x = 0; x < s.width; x++) {
      var crate = crateAt(s, x, y);
      if (!crate) continue;
      if (identities[crate.entityId] || expected[crate.entityId] !== crate) abortEffect('invariant', 'invalid crate identity/configuration');
      identities[crate.entityId] = true;
      if (s.player.x === x && s.player.y === y) abortEffect('invariant', 'dot/crate overlap');
      if (requestedSolidAt(s, x, y) && !tileAt(s, x, y).closingSurface) abortEffect('invariant', 'crate in solid terrain');
    }
    if (Object.keys(expected).length !== Object.keys(identities).length) abortEffect('invariant', 'lost crate');
    if (!canonicalArray(s.switches, s.level.switchesInit.length)) abortEffect('invariant', 'invalid feature/switch inventory');
    s.switches.forEach(function (sw, index) {
      var original = s.level.switchesInit[index];
      if (!validPosition(sw) || Object.keys(sw).sort().join(',') !== 'capabilities,entityId,inst,latched,x,y' ||
          sw.inst !== original.inst || sw.entityId !== original.entityId || typeof sw.latched !== 'boolean') abortEffect('invariant', 'invalid switch identity/state');
      if (isTargetEntity(sw)) {
        if (requestedSolidAt(s, sw.x, sw.y) && !tileAt(s, sw.x, sw.y).closingSurface) abortEffect('invariant', 'target in solid terrain');
        var key = sw.x + ',' + sw.y;
        if (featureCells[key] || !SM.validateTileCapabilities(sw.inst, sw.capabilities, key).ok ||
            Object.keys(sw.capabilities).sort().join(',') !== Object.keys(original.capabilities).sort().join(',')) abortEffect('invariant', 'invalid target profile/overlap');
        featureCells[key] = true;
      } else if (sw.x !== original.x || sw.y !== original.y || !sw.capabilities || Object.keys(sw.capabilities).length) abortEffect('invariant', 'invalid fixed switch configuration');
    });
  }
  RULES.validateState = validateState;

  function enqueueBehavior(round, inst, hook, actorId, x, y, payload) {
    if (!inst || !inst.strategies || !inst.strategies[hook]) return;
    round.queue.add({ kind: hook === 'onActivate' || hook === 'onRelease' ? 'signal' : 'ordinary',
      op: hook, inst: inst, actorId: actorId, x: x, y: y, payload: payload });
  }

  function failAttempt(s, round, reason) {
    if (s.failed) return;
    s.failed = true; s.won = false; s.failureReason = reason;
    round.steps.push({ type: 'failed', reason: reason, at: { x: s.player.x, y: s.player.y } });
  }

  function atomicEffect(s, round, operation, cause) {
    var before = RULES.snapshot(s), oldActors = positions(s), start = round.steps.length, knowledge = JSON.stringify(s.seen);
    operation();
    var hints = round.steps.splice(start);
    validateState(s);
    if (knowledge !== JSON.stringify(s.seen)) abortEffect('invariant', 'handler changed core-owned observation state');
    if (s.turns !== before.turns || s.strokes !== before.strokes) abortEffect('invariant', 'handler changed action counters');
    if (s.won && !before.won && !round.goalCheckpoint) abortEffect('invariant', 'victory outside entry checkpoint');
    rebuildLocks(s);
    var here = tileAt(s, s.player.x, s.player.y);
    if (!s.failed && here.closingSurface && isSolid(s, s.player.x, s.player.y)) failAttempt(s, round, 'closure');
    if (s.failed && !before.failed && !round.steps.slice(start).some(function (step) { return step.type === 'failed'; })) {
      round.steps.push({ type: 'failed', reason: s.failureReason, at: { x: s.player.x, y: s.player.y } });
    }
    var actors = positions(s), commit = ++round.commitId;
    round.steps.slice(start).forEach(function (step) { if (step.commit === undefined) step.commit = commit; });
    // Readable movement events remain flat; commit IDs and the authoritative
    // snapshot describe the complete atomic mutation to passive renderers.
    actors.slice().sort(function (a, b) { return (a.type === 'dot') - (b.type === 'dot') || a.y - b.y || a.x - b.x; }).forEach(function (actor) {
      var prior = oldActors.filter(function (old) { return old.actorId === actor.actorId; })[0];
      if (!prior || (prior.x === actor.x && prior.y === actor.y)) return;
      var from = { x: prior.x, y: prior.y }, to = { x: actor.x, y: actor.y };
      var portal = cause === 'portal' || hints.some(function (hint) { return (hint.type === 'teleport' || hint.type === 'object-teleport') && hint.to.x === actor.x && hint.to.y === actor.y; });
      var step = actor.type === 'dot' ? { type: portal ? 'teleport' : 'move', from: from, to: to } :
        actor.type === 'target' ? { type: portal ? 'object-teleport' : 'target-move', objectType: 'target',
          entityId: actor.actorId, id: actor.object.inst.id, from: from, to: to } :
        portal ? { type: 'object-teleport', objectType: 'crate', entityId: actor.actorId,
          id: actor.object.id, from: from, to: to } : { type: cause === 'pull' ? 'pull' : 'push',
          entityId: actor.actorId, crate: from, to: to };
      round.steps.push(Object.assign(step, { commit: commit, cause: cause }));
      var direction = Math.abs(actor.x - prior.x) + Math.abs(actor.y - prior.y) === 1 ? { x: actor.x - prior.x, y: actor.y - prior.y } : null;
      enqueueBehavior(round, tileAt(s, prior.x, prior.y), 'onExit', actor.actorId, prior.x, prior.y, { from: from, to: to });
      enqueueBehavior(round, tileAt(s, actor.x, actor.y), 'onEnter', actor.actorId, actor.x, actor.y,
        { from: from, to: to, portalArrival: portal, transportHandled: !!forcedMovementFor(s, tileAt(s, actor.x, actor.y), actor.x, actor.y, direction, actor.object) });
      if (actor.type === 'dot') {
        round.seenIds[tileAt(s, actor.x, actor.y).id] = true;
        if (tileAt(s, actor.x, actor.y).levelRole === 'goal') round.queue.add({ kind: 'checkpoint', op: 'goal',
          actorId: 'dot', inst: tileAt(s, actor.x, actor.y), x: actor.x, y: actor.y, payload: {} });
      }
      queueForce(s, round, actor, direction, portal);
    });
    ['P', 'W'].forEach(function (carrier) {
      if (before[carrier] !== s[carrier]) round.steps.push({ type: 'colour', which: carrier, from: before[carrier], to: s[carrier], commit: commit });
    });
    if (before.polarity !== s.polarity) round.steps.push({ type: 'polarity', from: before.polarity, to: s.polarity, commit: commit });
    s.switches.forEach(function (sw, index) {
      if (before.switches[index].latched !== sw.latched) round.steps.push({ type: 'switch', entityId: sw.entityId, x: sw.x, y: sw.y, latched: sw.latched, commit: commit });
    });
    if (s.won && !before.won) round.steps.push({ type: 'goal', x: s.player.x, y: s.player.y, won: true, commit: commit });
    hints.filter(function (hint) { return hint.type === 'blocked' || hint.type === 'press'; }).forEach(function (hint) { round.steps.push(hint); });
    var currentSignals = signalState(s);
    s.switches.forEach(function (sw) {
      var identity = sw.entityId || sw.inst.id + '@' + sw.x + ',' + sw.y;
      if (round.signals[identity] === currentSignals[identity]) return;
      round.steps.push({ type: 'signal-edge', entityId: identity, x: sw.x, y: sw.y, active: currentSignals[identity], commit: commit });
      enqueueBehavior(round, sw.inst, currentSignals[identity] ? 'onActivate' : 'onRelease', null, sw.x, sw.y,
        { wasActive: round.signals[identity], active: currentSignals[identity] });
    });
    round.signals = currentSignals;
    if (!samePositions(oldActors, actors) || JSON.stringify(before) !== JSON.stringify(RULES.snapshot(s))) {
      round.steps.push({ type: 'state', snapshot: RULES.snapshot(s), commit: commit });
    }
    if (!round.direct) seedRays(s, round);
  }

  function queueForce(s, round, actor, direction, portalArrival) {
    var force = forcedMovementFor(s, tileAt(s, actor.x, actor.y), actor.x, actor.y, direction, actor.object);
    if (!force) return;
    var profile = profileFor(actor);
    if ((force.type === 'flow' && (!profile.conveyor || round.direct)) ||
        (force.type === 'ice' && (!profile.conveyor || !direction)) ||
        (force.type === 'portal' && (!profile.portal || portalArrival))) return;
    round.queue.add({ kind: 'transport', op: force.type, actorId: actor.actorId, x: actor.x, y: actor.y,
      inst: tileAt(s, actor.x, actor.y), payload: { direction: force.direction || direction, link: force.link } });
  }
  function seedBelts(s, round) {
    positions(s).sort(function (a, b) { return a.y - b.y || a.x - b.x || (a.type === 'target') - (b.type === 'target'); }).forEach(function (actor) {
      var inst = tileAt(s, actor.x, actor.y), force = forcedMovementFor(s, inst, actor.x, actor.y, null, actor.object);
      if (force && force.type === 'flow' && profileFor(actor).conveyor) round.queue.add({ kind: 'transport', op: 'flow',
        actorId: actor.actorId, x: actor.x, y: actor.y, inst: inst, payload: { direction: force.direction, link: undefined } });
    });
  }
  function seedRays(s, round) {
    if (s.failed || s.won) return;
    traceRays(s).forEach(function (ray) {
      ray.cells.slice().reverse().forEach(function (cell) {
        [crateAt(s, cell.x, cell.y), targetAt(s, cell.x, cell.y)].forEach(function (object) {
          if (!object || rayProfile(s, object, cell.x, cell.y).ray !== 'transport') return;
          var session = ray.x + ',' + ray.y + ':' + object.entityId;
          if (round.raySessions[session]) return;
          round.raySessions[session] = true;
          round.queue.add({ kind: 'transport', op: 'ray', actorId: object.entityId, x: ray.x, y: ray.y,
            inst: tileAt(s, ray.x, ray.y), payload: { source: { x: cell.x, y: cell.y }, direction: ray.dir, emitter: { x: ray.x, y: ray.y } } });
        });
      });
    });
  }

  function dispatchEffect(s, round, effect) {
    if (!effect.inst || !SM.getTile(effect.inst.id) ||
        (effect.inst !== tileAt(s, effect.x, effect.y) && !s.level.switchesInit.some(function (sw) { return sw.inst === effect.inst; }))) {
      abortEffect('invariant', 'invalid queued tile/source reference');
    }
    var actor = effect.actorId ? actorAt(s, effect.actorId) : null;
    if (effect.actorId && !actor) abortEffect('invariant', 'queued actor reference is missing');
    if (effect.kind === 'transport') {
      var source = effect.op === 'ray' ? effect.payload.source : effect;
      if (!actor || actor.x !== source.x || actor.y !== source.y) return;
      var profile = profileFor(actor), destination, direction = effect.payload.direction;
      var force = forcedMovementFor(s, tileAt(s, actor.x, actor.y), actor.x, actor.y, direction, actor.object);
      if (effect.op !== 'ray' && (!force || force.type !== effect.op)) abortEffect('invariant', 'invalid transport source policy');
      if (effect.op === 'portal') {
        if (effect.payload.link !== force.link) abortEffect('invariant', 'invalid portal link');
        if (!profile.portal) return;
        destination = partnerPortal(s, actor.x, actor.y, effect.payload.link);
      } else {
        if (effect.op === 'ray') {
          var emitter = rayInteraction(s, effect.inst, effect.x, effect.y, null);
          if (!emitter || emitter.type !== 'emitter' || !direction || emitter.direction.x !== direction.x || emitter.direction.y !== direction.y ||
              effect.payload.emitter.x !== effect.x || effect.payload.emitter.y !== effect.y) abortEffect('invariant', 'invalid emitter transport source');
          if (actor.type === 'dot' || rayProfile(s, actor.object, actor.x, actor.y).ray !== 'transport' ||
              !traceRay(s, effect.payload.emitter.x, effect.payload.emitter.y).some(function (cell) { return cell.x === actor.x && cell.y === actor.y; })) return;
        } else if (!profile.conveyor) return;
        if (!direction || Math.abs(direction.x) + Math.abs(direction.y) !== 1) abortEffect('invariant', 'invalid transport direction');
        if (effect.op === 'flow' && (direction.x !== force.direction.x || direction.y !== force.direction.y)) abortEffect('invariant', 'invalid conveyor exit');
        destination = { x: actor.x + direction.x, y: actor.y + direction.y };
      }
      if (!destination || !(actor.type === 'dot' ? canEnter(s, destination.x, destination.y) : isLegalObjectDestination(s, actor.object, destination.x, destination.y))) return;
      if (actor.type === 'dot') { s.player.x = destination.x; s.player.y = destination.y; }
      else moveObjectEntity(s, actor.object, actor.x, actor.y, destination.x, destination.y, round.steps, effect.op === 'portal' ? 'teleport' : 'move');
      if (effect.op === 'ray') round.queue.add({ kind: 'transport', op: 'ray', actorId: effect.actorId,
        inst: effect.inst, x: effect.x, y: effect.y, payload: Object.assign({}, effect.payload, { source: destination }) });
      return;
    }
    if (effect.kind === 'checkpoint') {
      if (!actor || actor.type !== 'dot' || actor.x !== effect.x || actor.y !== effect.y ||
          effect.inst.levelRole !== 'goal' || !canEnter(s, actor.x, actor.y)) return;
    } else if (effect.kind === 'ordinary' && actor && actor.type !== 'dot' &&
        !(effect.inst.triggerActors && effect.inst.triggerActors.indexOf(actor.type) >= 0)) return;
    if (effect.kind === 'signal') {
      var sourceSwitch = s.switches.filter(function (sw) { return sw.inst === effect.inst; })[0];
      if (!sourceSwitch || switchActive(s, sourceSwitch) !== effect.payload.active) return;
    }
    var hook = effect.kind === 'checkpoint' ? 'onEnter' : effect.op;
    var result = SM.resolveTileHook(effect.inst, hook, { state: s, engine: round.engine, inst: effect.inst,
      x: effect.x, y: effect.y, phase: hook, press: hook === 'onAct', trigger: effect.payload,
      actor: { entityId: effect.actorId, type: actor && actor.type },
      enqueue: function (record) { return round.queue.add(record); } });
    if (result && typeof result.then === 'function') abortEffect('invariant', 'asynchronous effect is unsupported');
  }

  function moveOne(s, d, steps) {
    var tx = s.player.x + d.x, ty = s.player.y + d.y;

    if (!inBounds(s, tx, ty)) {
      steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'off-board' });
      return;
    }

    var target = tileAt(s, tx, ty);
    var entryRule = tilePassability(s, target, tx, ty);
    if (isSolid(s, tx, ty) || (entryRule && entryRule.required && entryRule.carrier !== entryRule.required)) {
      steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: isSolid(s, tx, ty) ? 'wall' : 'colour',
        need: entryRule && entryRule.required, have: entryRule && entryRule.carrier });
      return;
    }
    var c = crateAt(s, tx, ty);
    var feature = targetAt(s, tx, ty);
    if (feature && !objectCapabilities(feature).pushable) feature = null;

    if (c) {
      var bx = tx + d.x, by = ty + d.y;
      if (!effectiveCapabilities(s, c, tx, ty).pushable || !isLegalObjectDestination(s, c, bx, by)) {
        steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'crate' });
        return;
      }
      s.crates[ty][tx] = null;
      s.crates[by][bx] = c;
      steps.push({ type: 'push', crate: { x: tx, y: ty }, to: { x: bx, y: by } });
      var from = { x: s.player.x, y: s.player.y };
      s.player.x = tx; s.player.y = ty;
      steps.push({ type: 'move', from: from, to: { x: tx, y: ty } });
    } else if (feature) {
      var targetX = tx + d.x, targetY = ty + d.y;
      var targetCapabilities = effectiveCapabilities(s, feature, tx, ty);
      if (!targetCapabilities.pushable || !isLegalObjectDestination(s, feature, targetX, targetY)) {
        steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'target' });
        return;
      }
      var targetFrom = { x: feature.x, y: feature.y };
      feature.x = targetX; feature.y = targetY;
      steps.push({ type: 'target-move', objectType: 'target',
        entityId: feature.entityId, id: feature.inst.id,
        from: targetFrom, to: { x: targetX, y: targetY } });
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

  }

  function pullOne(s, d, steps) {
    var tx = s.player.x + d.x, ty = s.player.y + d.y;
    if (!canEnter(s, tx, ty)) {
      steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'pull' });
      return;
    }

    var bx = s.player.x - d.x, by = s.player.y - d.y;
    var object = crateAt(s, bx, by) || targetAt(s, bx, by);
    if (!object || !effectiveCapabilities(s, object, bx, by).pullable ||
        !isLegalObjectDestination(s, object, s.player.x, s.player.y, true)) {
      steps.push({ type: 'blocked', x: bx, y: by, dir: d.name, reason: 'pull' });
      return;
    }

    var fromObject = { x: bx, y: by };
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
  }

  function isLegalObjectDestination(s, object, x, y, allowCurrentPlayerCell, vacating) {
    // Pure destination predicate shared by push/pull, conveyors, ice, and
    // portals. It never moves the entity; commit only after this returns true.
    return SM.ENTITIES.canOccupy(s, object, x, y, {
      inBounds: function (cellX, cellY) { return inBounds(s, cellX, cellY); },
      isSolid: function (cellX, cellY) { return isSolid(s, cellX, cellY); },
      crateAt: function (cellX, cellY) {
        var occupant = crateAt(s, cellX, cellY);
        return vacating && vacating.indexOf(occupant) !== -1 ? null : occupant;
      },
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
  RULES.isLegalObjectDestination = isLegalObjectDestination;

  /** Cheap identity of the mutable parts of the state. */
  function snapshotSig(s) {
    var sig = (s.level.rulesIdentity || s.key) + '|' + s.player.x + ',' + s.player.y + '|' + s.P + '|' + s.W + '|' + s.polarity +
      '|' + s.won + '|' + s.failed + '|' + s.failureReason;
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
      crateCapabilities: crateAt(s, x, y) ? effectiveCapabilities(s, crateAt(s, x, y), x, y) : null,
      capabilities: target ? effectiveCapabilities(s, target, x, y) : null,
      dotHere: s.player.x === x && s.player.y === y,
      P: s.P,
      target: target,
      crate: crateAt(s, x, y),
      locked: isLocked(s, x, y),
      solid: isSolid(s, x, y),
      requestedSolid: closureAt(s, x, y).requestedSolid,
      pendingClose: closureAt(s, x, y).pendingClose,
      outcome: RULES.outcome(s),
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
