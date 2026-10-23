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
    var tiles = [], crates = [], locked = [], switches = [];
    var portals = {};
    var start = null, goal = null;
    var rx, ry, cx, cy, inst, ov;

    for (ry = 0; ry < h; ry++) {
      tiles[ry] = []; crates[ry] = new Array(w); locked[ry] = [];
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
        inst = {
          id: id,
          family: def.family,
          name: def.name,
          glyph: def.glyph,
          solid: def.solid,
          walkable: def.walkable,
          pushable: !!def.pushable,
          behavior: def.behavior,
          params: mergeParams(def.params, ov)
        };
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
        if (inst.family === 'crate') {
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
            solid: floorDef.solid,
            walkable: floorDef.walkable,
            pushable: !!floorDef.pushable,
            behavior: floorDef.behavior,
            params: mergeParams(floorDef.params, null)
          };
        }
        tiles[ry][rx] = inst;

        if (inst.name === 'start') { if (start) throw LevelError(key, 'more than one start tile'); start = { x: rx, y: ry }; }
        if (inst.name === 'goal')  { if (goal)  throw LevelError(key, 'more than one goal tile');  goal  = { x: rx, y: ry }; }

        if (inst.family === 'portal') {
          var pk = String(inst.params.link);
          (portals[pk] || (portals[pk] = [])).push({ x: rx, y: ry });
        }
        if (inst.family === 'switch' || inst.family === 'sensor' || inst.family === 'target') {
          switches.push({ x: rx, y: ry, inst: inst, latched: false });
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
      winPicture: raw.win_picture || null,
      width: w,
      height: h,
      par: typeof raw.golf_score === 'number' ? raw.golf_score : null,
      tiles: tiles,
      cratesInit: crates,
      switchesInit: switches,
      portals: portals,
      start: start,
      goal: goal,
      raw: raw
    };
  };

  function colName(x) { return String.fromCharCode(65 + x); }
  RULES.colName = colName;
  RULES.cellLabel = function (x, y) { return colName(x) + (y + 1); };

  /* ---------------------------------------------------------------------- */
  /* Mutable play state                                                     */
  /* ---------------------------------------------------------------------- */

  RULES.newState = function (level) {
    var s = {
      level: level,
      key: level.key,
      width: level.width,
      height: level.height,
      grid: level.tiles,
      crates: deepCopyGrid(level.cratesInit),
      locked: newGrid(level.width, level.height, false),
      switches: level.switchesInit.map(function (sw) {
        return { x: sw.x, y: sw.y, inst: sw.inst, latched: sw.latched };
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
      seen: {}
    };
    rebuildLocks(s);
    s.seen[s.grid[s.player.y][s.player.x].id] = true;
    return s;
  };

  function newGrid(w, h, fill) {
    var g = new Array(h), y;
    for (y = 0; y < h; y++) { g[y] = new Array(w); for (var x = 0; x < w; x++) g[y][x] = fill; }
    return g;
  }

  function deepCopyGrid(src) {
    var out = [], y, x;
    for (y = 0; y < src.length; y++) {
      out[y] = new Array(src[y].length);
      for (x = 0; x < src[y].length; x++) out[y][x] = src[y][x];
    }
    return out;
  }

  RULES.cloneState = function (s) {
    return {
      level: s.level,
      key: s.key,
      width: s.width,
      height: s.height,
      grid: s.grid,
      crates: deepCopyGrid(s.crates),
      locked: deepCopyGrid(s.locked),
      switches: s.switches.map(function (sw) {
        return { x: sw.x, y: sw.y, inst: sw.inst, latched: sw.latched };
      }),
      portals: s.portals,
      player: { x: s.player.x, y: s.player.y },
      start: { x: s.start.x, y: s.start.y },
      goal: { x: s.goal.x, y: s.goal.y },
      P: s.P, W: s.W,
      strokes: s.strokes, turns: s.turns, won: s.won,
      seen: Object.assign({}, s.seen)
    };
  };

  RULES.snapshot = function (s) {
    return {
      player: { x: s.player.x, y: s.player.y },
      P: s.P, W: s.W,
      strokes: s.strokes, turns: s.turns, won: s.won,
      latched: s.switches.map(function (sw) { return sw.latched; }),
      crates: s.crates.map(function (row) {
        // Crate instances are immutable level data; retaining their reference
        // preserves ID and parameter overrides without putting terrain back.
        return row.slice();
      })
    };
  };

  RULES.restore = function (s, snap) {
    s.player.x = snap.player.x; s.player.y = snap.player.y;
    s.P = snap.P; s.W = snap.W;
    s.strokes = snap.strokes; s.turns = snap.turns; s.won = snap.won;
    for (var i = 0; i < s.switches.length; i++) s.switches[i].latched = snap.latched[i];
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

  function inBounds(s, x, y) { return x >= 0 && y >= 0 && x < s.width && y < s.height; }
  RULES.inBounds = inBounds;

  function tileAt(s, x, y) { return inBounds(s, x, y) ? s.grid[y][x] : null; }
  RULES.tileAt = tileAt;

  function crateAt(s, x, y) { return inBounds(s, x, y) ? s.crates[y][x] : null; }
  RULES.crateAt = crateAt;

  function isLocked(s, x, y) { return inBounds(s, x, y) ? !!s.locked[y][x] : true; }
  RULES.isLocked = isLocked;

  function isSolid(s, x, y) {
    var inst = tileAt(s, x, y);
    if (!inst) return true;
    if (inst.solid === true) return true;
    if (inst.solid === 'locked') return isLocked(s, x, y);
    if (inst.solid === 'phaseVoid') return masterVoidActive(s);
    if (inst.solid === 'deferred') {
      throw LevelError(s.key, 'tile ' + inst.id + ' (' + inst.name + ') has no implemented solidity rule');
    }
    return false;
  }
  RULES.isSolid = isSolid;

  /** Can the player stand on this cell right now? */
  function canEnter(s, x, y) {
    if (!inBounds(s, x, y)) return false;
    if (crateAt(s, x, y)) return false;
    if (isSolid(s, x, y)) return false;
    var inst = s.grid[y][x];
    if (inst.family === 'gate') {
      var carrier = inst.params.carrier === 'W' ? s.W : s.P;
      if (carrier !== inst.params.colour) return false;
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
    var p = sw.inst.params;
    if (p.scope === 'global') return !!sw.latched;
    if (sw.inst.family === 'target') return !!crateAt(s, sw.x, sw.y);
    if (sw.inst.family === 'sensor') return sensorLit(s, sw).any;
    if (p.mode === 'momentary') return s.player.x === sw.x && s.player.y === sw.y;
    return !!sw.latched;
  }
  RULES.switchActive = switchActive;

  function masterVoidActive(s) {
    for (var i = 0; i < s.switches.length; i++) {
      var sw = s.switches[i];
      if (sw.inst.params.scope === 'global' &&
          sw.inst.params.key === 'master_void' && sw.latched) return true;
    }
    return false;
  }
  RULES.masterVoidActive = masterVoidActive;

  /* ---------------------------------------------------------------------- */
  /* Lock resolution (R11, §5.4)                                            */
  /* One pure pass per turn. Order is fixed and documented:                 */
  /*   1. start at the tile's own defaultLocked                            */
  /*   2. every LATCHED tagged toggle whose link matches flips it          */
  /*   3. any ACTIVE momentary or sensor switch whose link matches clears it*/
  /*   4. a latched global master_lock forces it locked (always wins)      */
  /* ---------------------------------------------------------------------- */

  function rebuildLocks(s) {
    var masters = [];
    for (var i = 0; i < s.switches.length; i++) {
      var sw = s.switches[i];
      if (sw.inst.params.scope === 'global' && sw.inst.params.mode === 'toggle' &&
          sw.inst.params.key === 'master_lock' && sw.latched) {
        masters.push(sw);
      }
    }
    var masterOn = masters.length > 0;

    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) {
        var inst = s.grid[y][x];
        if (inst.solid !== 'locked') { s.locked[y][x] = false; continue; }
        var link = inst.params.link | 0;
        var locked = inst.params.defaultLocked !== false;

        // Step 2 — parity of LATCHED tagged toggles on this link.
        var flips = 0;
        for (var j = 0; j < s.switches.length; j++) {
          var t = s.switches[j];
          if (t.inst.family !== 'switch') continue;
          if (t.inst.params.mode !== 'toggle') continue;
          if (t.inst.params.scope !== 'tagged') continue;
          if (!t.latched) continue;
          if ((t.inst.params.link | 0) !== link) continue;
          flips++;
        }
        if (flips % 2 === 1) locked = !locked;

        // Step 3 — any ACTIVE momentary / sensor switch on this link clears it.
        for (var k = 0; k < s.switches.length; k++) {
          var a = s.switches[k];
          if (a.inst.params.mode !== 'momentary' && a.inst.family !== 'sensor') continue;
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
  /* Engine API used by SM.runBehavior (src/js/tiles.js)                   */
  /* ---------------------------------------------------------------------- */

  function makeEngine(s, steps) {
    return {
      checkGoal: function (ctx) {
        if (s.player.x === s.goal.x && s.player.y === s.goal.y && s.P === s.W) {
          s.won = true;
          steps.push({ type: 'goal', x: s.player.x, y: s.player.y, won: true });
        }
      },
      setPlayerColour: function (colour) {
        steps.push({ type: 'colour', which: 'P', from: s.P, to: colour });
        s.P = colour;
      },
      advanceWorld: function () {
        var i = SM.RING.indexOf(s.W);
        var to = (i < 0) ? 'red' : SM.RING[(i + 1) % 3];
        steps.push({ type: 'colour', which: 'W', from: s.W, to: to });
        s.W = to;
      },
      resetWorld: function () {
        steps.push({ type: 'colour', which: 'W', from: s.W, to: 'wht' });
        s.W = 'wht';
      },
      setWorldIfLinked: function (ctx) {
        if (!anyActiveSwitchOnLink(s, ctx.inst.params.link | 0)) return;
        var to = ctx.inst.params.colour;
        steps.push({ type: 'colour', which: 'W', from: s.W, to: to });
        s.W = to;
      },
      toggleLatched: function (ctx) {
        var sw = findSwitch(s, ctx.inst, ctx.x, ctx.y);
        if (!sw) return;
        sw.latched = !sw.latched;
        steps.push({ type: 'switch', x: sw.x, y: sw.y, latched: sw.latched });
      },
      teleport: function (ctx) {
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

  /* ---------------------------------------------------------------------- */
  /* Player force chains (conveyors and ice)                               */
  /*                                                                        */
  /*  Player belts carry in their declared direction. Ice carries the      */
  /*  incoming direction. Crate belts retain their explicit one-cell shove. */
  /*  Repeated directed positions stop loops; a board-derived cap is a      */
  /*  final guard for malformed or dynamically changing chains.             */
  /* ---------------------------------------------------------------------- */

  function runPlayerForceChain(s, incoming, steps) {
    var hops = 0;
    var cap = s.width * s.height * FORCE_CHAIN_STATES_PER_CELL;
    var seen = {};
    var d = incoming;
    while (hops < cap) {
      var inst = tileAt(s, s.player.x, s.player.y);
      if (!inst) break;
      if (inst.family === 'flow') d = inst.params.dir || { x: 1, y: 0 };
      else if (inst.name !== 'ice') break;

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
      if (c) {
        if (inst.family !== 'flow' || (inst.params.kind || 'player') !== 'crate') break;
        var bx = tx + d.x, by = ty + d.y;
        if (!inBounds(s, bx, by)) break;
        if (crateAt(s, bx, by)) break;
        if (isSolid(s, bx, by)) break;
        s.crates[ty][tx] = null;
        s.crates[by][bx] = c;
        steps.push({ type: 'push', crate: { x: tx, y: ty }, to: { x: bx, y: by } });
      } else {
        var target = tileAt(s, tx, ty);
        if (target.family === 'gate') {
          var carrier = target.params.carrier === 'W' ? s.W : s.P;
          if (carrier !== target.params.colour) break;
        }
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

    if (action.type === 'move') {
      var d = null, i;
      for (i = 0; i < DIRS.length; i++) if (DIRS[i].name === action.dir) d = DIRS[i];
      if (!d) throw LevelError(s.key, 'resolveTurn: unknown direction "' + action.dir + '"');
      moveOne(s, d, steps, engine);
    } else if (action.type === 'act') {
      var here = tileAt(s, s.player.x, s.player.y);
      steps.push({ type: 'press', x: s.player.x, y: s.player.y });
      if (here && here.behavior) {
        runBehaviour(s, steps, engine, here, s.player.x, s.player.y, true);
      }
    } else {
      throw LevelError(s.key, 'resolveTurn: unknown action "' + action.type + '"');
    }

    rebuildLocks(s);
    s.turns++;
    var inst = tileAt(s, s.player.x, s.player.y);
    if (inst) s.seen[inst.id] = true;

    var after = snapshotSig(s);
    var moved = before !== after;
    var stroke = (action.type === 'move' && moved) || action.type === 'act';
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

    var target = s.grid[ty][tx];
    var c = crateAt(s, tx, ty);

    if (c) {
      var bx = tx + d.x, by = ty + d.y;
      if (!inBounds(s, bx, by) || crateAt(s, bx, by) || isSolid(s, bx, by)) {
        steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'crate' });
        return;
      }
      s.crates[ty][tx] = null;
      s.crates[by][bx] = c;
      steps.push({ type: 'push', crate: { x: tx, y: ty }, to: { x: bx, y: by } });
      var from = { x: s.player.x, y: s.player.y };
      s.player.x = tx; s.player.y = ty;
      steps.push({ type: 'move', from: from, to: { x: tx, y: ty } });
    } else if (isSolid(s, tx, ty)) {
      steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'wall' });
      return;
    } else if (target.family === 'gate') {
      var carrier = target.params.carrier === 'W' ? s.W : s.P;
      if (carrier !== target.params.colour) {
        steps.push({ type: 'blocked', x: tx, y: ty, dir: d.name, reason: 'colour',
                     need: target.params.colour, have: carrier });
        return;
      }
    }

    if (c) { /* already moved above */ }
    else {
      var f2 = { x: s.player.x, y: s.player.y };
      s.player.x = tx; s.player.y = ty;
      steps.push({ type: 'move', from: f2, to: { x: tx, y: ty } });
    }

    // Forced movement, then the single on_enter pass of the FINAL resting tile.
    runPlayerForceChain(s, d, steps);

    var rest = tileAt(s, s.player.x, s.player.y);
    if (rest && rest.behavior) {
      runBehaviour(s, steps, engine, rest, s.player.x, s.player.y, false);
    }
  }

  function runBehaviour(s, steps, engine, inst, x, y, isPress) {
    // No guard is needed against re-firing a portal on arrival: on_enter runs
    // exactly once per turn, for the tile the player FINALLY rests on after the
    // move and any belt chain. A teleport destination is never re-entered.
    SM.runBehavior(inst.behavior, {
      state: s, engine: engine, inst: inst, x: x, y: y, press: isPress
    });
  }

  /** Cheap identity of the mutable parts of the state. */
  function snapshotSig(s) {
    var sig = s.player.x + ',' + s.player.y + '|' + s.P + '|' + s.W;
    for (var i = 0; i < s.switches.length; i++) sig += '|' + (s.switches[i].latched ? 1 : 0);
    for (var y = 0; y < s.height; y++) {
      for (var x = 0; x < s.width; x++) {
        var crate = s.crates[y][x];
        sig += crate ? '[' + crate.id + ':' + (crate.params.colour || '') + ']' : '[]';
      }
    }
    return sig;
  }
  RULES.snapshotSig = snapshotSig;

  /* ---------------------------------------------------------------------- */
  /* Read-only views for the renderer / UI                                  */
  /* ---------------------------------------------------------------------- */

  RULES.describeTile = function (s, x, y) {
    var inst = tileAt(s, x, y);
    if (!inst) return null;
    var sw = findSwitch(s, inst, x, y);
    var view = {
      inst: inst,
      crate: crateAt(s, x, y),
      locked: isLocked(s, x, y),
      solid: isSolid(s, x, y),
      active: sw ? switchActive(s, sw) : false,
      latched: sw ? sw.latched : false,
      W: s.W,
      lit: {}
    };
    if (sw && sw.inst.family === 'sensor') view.lit = sensorLit(s, sw).lit;
    return view;
  };

  SM.RULES = RULES;

})(globalThis);
