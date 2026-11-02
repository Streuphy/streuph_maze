/* =========================================================================
 * sm-editor.js  —  STREUPH'S MAZE
 * A standalone, local-first level editor that consumes the shared YAML
 * loader/validator, the real resolver, and the live tile catalogue.
 *
 * The editor is a presentation+UI layer. It never reimplements rules: all
 * validation goes through SM.LEVELS.load/validate, all gameplay through
 * SM.RULES.resolveTurn, all tile identity through SM.TILES. The rules core
 * stays DOM-, timer-, and async-free.
 *
 * The core editing logic (this module's headless API) is engine-only and has
 * no DOM dependency, so it can be unit-tested in Node. The browser binding
 * (editor.html) attaches this API to DOM elements; that wiring lives at the
 * bottom of the module behind a `document` guard.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  var GAMECOLOURS = ['wht', 'red', 'gre', 'blu'];
  var DOT_SPAWN_ID = 1;
  var GOAL_ID = 2;
  var MIN_WIDTH = 2, MAX_WIDTH = 16, MIN_HEIGHT = 1, MAX_HEIGHT = 9;

  /* ---------------------------------------------------------------------- */
  /* Tile-summary helpers (quick guide + per-tile help)                     */
  /*                                                                        */
  /* Author-facing documentation is generated ONLY from catalogue display   */
  /* descriptors (id/name/category/layer/colourRole/params/presentation).   */
  /* `strategies` and `state.hooks` are never surfaced as authorable.      */
  /* ---------------------------------------------------------------------- */

  function resolveTemplate(text, tile) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/\{colour\}/g, (tile.params && tile.params.colour) || 'wht')
      .replace(/\{mobilityLabel\}/g, 'movable')
      .replace(/\{link\}/g, (tile.params && tile.params.link) || '')
      .replace(/\{[^}]+\}/g, '');   /* drop any unknown placeholder */
  }

  function behaviorSummary(tile) {
    var parts = [];
    if (tile.presentation) {
      if (tile.presentation.inspection) parts.push(resolveTemplate(tile.presentation.inspection, tile));
      if (tile.presentation.codex) parts.push(resolveTemplate(tile.presentation.codex, tile));
    }
    if (!parts.length && tile.family) parts.push(tile.family + ' tile.');
    return parts.join(' ').trim() || (tile.name + ' tile.');
  }

  function describeTile(tile) {
    if (!tile) return null;
    var attrs = tile.params ? Object.keys(tile.params) : [];
    var visual = SM.VISUALS.describe(tile, { W: 'wht' });
    return {
      id: tile.id,
      /* The rendered SVG may be empty for blank-floor tiles; fall back to the
         stable glyph key so the guide always shows a non-empty identity. */
      glyph: 'glyph:' + tile.glyph,
      visual: visual,
      glyphKey: tile.glyph,
      name: tile.name,
      category: tile.category,
      layer: tile.layer,
      colourRole: tile.colourRole,
      attributes: attrs,
      behavior: behaviorSummary(tile)
    };
  }

  function describeTileById(id) {
    if (id === 'dot') {
      var dot = SM.DOT_DEFINITION;
      var curated = TILE_DESCRIPTIONS['dot'];
      return { id: 'dot', glyph: '', name: 'dot (player)', category: 'special',
        layer: 'object', colourRole: dot && dot.colourRole, attributes: ['colour'],
        behavior: curated ? curated.behavior : 'The player avatar. Its spawn cell is the Start marker (ID 1).',
        interactions: curated ? curated.interactions : '' };
    }
    var t = SM.getTile(id);
    if (!t) return null;
    var d = describeTile(t);
    var curated = TILE_DESCRIPTIONS[t.id];
    if (curated) {
      d.behavior = curated.behavior;
      d.interactions = curated.interactions;
    }
    return d;
  }

  /* ---------------------------------------------------------------------- */
  /* Curated per-tile descriptions (group 7)                                */
  /*                                                                        */
  /* Author-friendly text sourced from the Tile Mechanics Reference.         */
  /* Never exposes `strategies`, hook identifiers, or resolver internals.   */
  /* ---------------------------------------------------------------------- */

  var TILE_DESCRIPTIONS = {
    0: { behavior: 'Walkable floor. The default terrain tile; the dot and crates can occupy it freely.',
         interactions: 'Supports any object placed on top. Use as the base for empty cells.' },
    1: { behavior: 'Start marker. Designates the dot\'s spawn cell; exactly one per level.',
         interactions: 'The dot begins here with the level\'s initial player color. Single-instance: placing a second relocates the first.' },
    2: { behavior: 'Goal (exit) marker. The dot wins by entering this cell while its color matches the goal color.',
         interactions: 'The goal color follows the world color and is not separately editable. Single-instance.' },
    3: { behavior: 'Wall. Blocks all movement — the dot and crates cannot enter or be pushed onto it.',
         interactions: 'Stops rays. Use to bound the board and create corridors.' },
    4: { behavior: 'Void. impassable terrain that is not a wall; distinct from wall in appearance and level theme.',
         interactions: 'Blocks movement like a wall but reads as empty space visually.' },
    5: { behavior: 'Ice. Walkable terrain that preserves the dot\'s entering direction: the dot slides until it hits a non-ice tile or wall.',
         interactions: 'Unlike conveyors, ice does not set a direction — it continues the entering direction. The dot slides automatically without costing strokes.' },
    10: { behavior: 'Phase wall (link 1). A barrier that opens when its linked target (link 1) is crate-occupied.',
          interactions: 'Linked to target IDs 23 and receiver IDs 50/90/91/92 on link 1. Closes when the target is unoccupied.' },
    11: { behavior: 'Red prism. Sets the dot\'s color to red when the dot steps on it.',
          interactions: 'Changes the player color (P). Use to match red aura gates or the red goal.' },
    12: { behavior: 'Green prism. Sets the dot\'s color to green when the dot steps on it.',
          interactions: 'Changes the player color (P). Use to match green aura gates or the green goal.' },
    13: { behavior: 'Blue prism. Sets the dot\'s color to blue when the dot steps on it.',
          interactions: 'Changes the player color (P). Use to match blue aura gates or the blue goal.' },
    20: { behavior: 'Cycle dial. Advances the world color (W) by one step each time the dot steps on it: White → Red → Green → Blue → White.',
          interactions: 'Changes the world color, which also changes the goal color. Steps cost one stroke.' },
    21: { behavior: 'Reset dial. Resets the world color (W) to white each time the dot steps on it.',
          interactions: 'Useful for returning to the initial state without undo.' },
    22: { behavior: 'Set dial (link 1). Sets the world color (W) to red when the dot steps on it.',
          interactions: 'A fixed-color dial; unlike the cycle dial, it always sets the same color.' },
    23: { behavior: 'Crate-occupancy target (link 1). Activates while a crate occupies its cell; opens linked phase walls and gates on link 1.',
          interactions: 'Standing next to it does not activate it — a crate must be on the cell. Linked to phase wall ID 10 and receiver IDs on link 1.' },
    24: { behavior: 'Crate-occupancy target (link 2). Activates while a crate occupies its cell; opens linked phase walls and gates on link 2.',
          interactions: 'Linked to phase wall ID 26 and receiver IDs on link 2.' },
    25: { behavior: 'Crate-occupancy target (link 3). Activates while a crate occupies its cell; opens linked phase walls and gates on link 3.',
          interactions: 'Linked to phase wall ID 27 and receiver IDs on link 3.' },
    26: { behavior: 'Phase walls (link 2). A barrier that opens when its linked target (link 2) is crate-occupied.',
          interactions: 'Linked to target ID 24 and receiver IDs on link 2.' },
    27: { behavior: 'Phase walls (link 3). A barrier that opens when its linked target (link 3) is crate-occupied.',
          interactions: 'Linked to target ID 25 and receiver IDs on link 3.' },
    30: { behavior: 'White aura gate. Opens when the dot\'s color (P) is white; blocks otherwise.',
          interactions: 'Gate color is fixed to white; the dot must be white to pass.' },
    31: { behavior: 'Red aura gate. Opens when the dot\'s color (P) is red; blocks otherwise.',
          interactions: 'Use a red prism (ID 11) to set the dot\'s color before approaching.' },
    32: { behavior: 'Green aura gate. Opens when the dot\'s color (P) is green; blocks otherwise.',
          interactions: 'Use a green prism (ID 12) to set the dot\'s color before approaching.' },
    33: { behavior: 'Blue aura gate. Opens when the dot\'s color (P) is blue; blocks otherwise.',
          interactions: 'Use a blue prism (ID 13) to set the dot\'s color before approaching.' },
    34: { behavior: 'Red world gate. Opens when the world color (W) is red; blocks otherwise.',
          interactions: 'World color is set by dials (IDs 20, 21, 22). The gate reads W, not P.' },
    35: { behavior: 'Green world gate. Opens when the world color (W) is green; blocks otherwise.',
          interactions: 'World color is set by dials (IDs 20, 21, 22). The gate reads W, not P.' },
    36: { behavior: 'Blue world gate. Opens when the world color (W) is blue; blocks otherwise.',
          interactions: 'World color is set by dials (IDs 20, 21, 22). The gate reads W, not P.' },
    40: { behavior: 'Pressure plate (link 1). Momentary switch activated by the dot or a crate standing on it; deactivates when the occupant leaves.',
          interactions: 'Opens linked phase walls and gates on link 1 while occupied.' },
    41: { behavior: 'Link key (link 1). A toggle switch: stepping on it toggles its linked state; ACT also toggles it.',
          interactions: 'Toggle-type: stays in its new state until toggled again, unlike the momentary plate.' },
    42: { behavior: 'Link plate (link 1). A momentary switch activated by the dot or a crate on it.',
          interactions: 'Similar to the pressure plate but on a different link channel.' },
    44: { behavior: 'Master lock. A global toggle that locks or unlocks all gates of its kind.',
          interactions: 'Global scope: affects every gate in the level, not just one link.' },
    45: { behavior: 'Master void. A global toggle that creates or removes void terrain.',
          interactions: 'Global scope: changes terrain passability across the level.' },
    46: { behavior: 'Red-open polarity barrier. Opens when the global polarity is red-open; blocks when blue-open.',
          interactions: 'Polarity is flipped by the polarity switch (ID 48) via ACT.' },
    47: { behavior: 'Blue-open polarity barrier. Opens when the global polarity is blue-open; blocks when red-open.',
          interactions: 'Polarity is flipped by the polarity switch (ID 48) via ACT.' },
    48: { behavior: 'Polarity switch. ACT on this tile flips the global polarity between red-open and blue-open.',
          interactions: 'Walking onto it does not flip polarity — only ACT does. Affects barriers IDs 46 and 47.' },
    50: { behavior: 'Red receiver (link 1). A sensor that detects an orthogonally adjacent red crate on link 1; lights when matched.',
          interactions: 'Detects adjacency (not occupancy). A red crate (ID 71) next to it on the same link activates it.' },
    60: { behavior: 'Conveyor east. Moves eligible passengers (dot, crates) one cell east when triggered.',
          interactions: 'Tint is inert; all IDs share the same passenger policy. Automatic transport costs no stroke.' },
    61: { behavior: 'Conveyor west. Moves eligible passengers one cell west when triggered.',
          interactions: 'Tint is inert; all IDs share the same passenger policy. Automatic transport costs no stroke.' },
    62: { behavior: 'Conveyor north. Moves eligible passengers one cell north when triggered.',
          interactions: 'Tint is inert; all IDs share the same passenger policy. Automatic transport costs no stroke.' },
    63: { behavior: 'Conveyor south. Moves eligible passengers one cell south when triggered.',
          interactions: 'Tint is inert; all IDs share the same passenger policy. Automatic transport costs no stroke.' },
    64: { behavior: 'Conveyor east (alt ID). Same behavior as ID 60; use for a second east conveyor on a different belt.',
          interactions: 'Alternate ID for levels needing multiple east conveyors.' },
    65: { behavior: 'Conveyor west (alt ID). Same behavior as ID 61; use for a second west conveyor on a different belt.',
          interactions: 'Alternate ID for levels needing multiple west conveyors.' },
    66: { behavior: 'Conveyor north (alt ID). Same behavior as ID 62; use for a second north conveyor on a different belt.',
          interactions: 'Alternate ID for levels needing multiple north conveyors.' },
    67: { behavior: 'Conveyor south (alt ID). Same behavior as ID 63; use for a second south conveyor on a different belt.',
          interactions: 'Alternate ID for levels needing multiple south conveyors.' },
    70: { behavior: 'White crate. A pushable movable object; the dot pushes it by walking into it.',
          interactions: 'Can be pulled on green floor. Blocks rays. Crates are independent objects, not terrain.' },
    71: { behavior: 'Red crate. A pushable movable object colored red; the dot pushes it by walking into it.',
          interactions: 'Can be pulled on green floor. Activates red receivers (ID 50) by adjacency. Blocks rays.' },
    72: { behavior: 'Green crate. A pushable movable object colored green; the dot pushes it by walking into it.',
          interactions: 'Can be pulled on green floor. Activates green receivers by adjacency. Blocks rays.' },
    73: { behavior: 'Blue crate. A pushable movable object colored blue; the dot pushes it by walking into it.',
          interactions: 'Can be pulled on green floor. Activates blue receivers by adjacency. Blocks rays.' },
    80: { behavior: 'Portal. Teleports the dot to the paired portal of the same link. Portals must appear in pairs.',
          interactions: 'Stepping onto a portal transports the dot to its partner. Unpaired portals are dead ends.' },
    81: { behavior: 'North ray emitter. Emits a fixed ray northward; exposure beneath the dot causes terminal failure.',
          interactions: 'Crates and walls shield the ray. Static direction — not a sweeping beam or timer.' },
    82: { behavior: 'East ray emitter. Emits a fixed ray eastward; exposure beneath the dot causes terminal failure.',
          interactions: 'Crates and walls shield the ray. Static direction — not a sweeping beam or timer.' },
    83: { behavior: 'South ray emitter. Emits a fixed ray southward; exposure beneath the dot causes terminal failure.',
          interactions: 'Crates and walls shield the ray. Static direction — not a sweeping beam or timer.' },
    84: { behavior: 'West ray emitter. Emits a fixed ray westward; exposure beneath the dot causes terminal failure.',
          interactions: 'Crates and walls shield the ray. Static direction — not a sweeping beam or timer.' },
    90: { behavior: 'Green receiver (link 1). Detects an orthogonally adjacent green crate on link 1.',
          interactions: 'Adjacency-based; a green crate (ID 72) next to it on link 1 activates it.' },
    91: { behavior: 'Blue receiver (link 1). Detects an orthogonally adjacent blue crate on link 1.',
          interactions: 'Adjacency-based; a blue crate (ID 73) next to it on link 1 activates it.' },
    92: { behavior: 'White receiver (link 1). Detects an orthogonally adjacent white crate on link 1.',
          interactions: 'Adjacency-based; a white crate (ID 70) next to it on link 1 activates it.' },
    93: { behavior: 'Red receiver (link 2). Detects an orthogonally adjacent red crate on link 2.',
          interactions: 'Adjacency-based; a red crate (ID 71) next to it on link 2 activates it.' },
    94: { behavior: 'Green receiver (link 2). Detects an orthogonally adjacent green crate on link 2.',
          interactions: 'Adjacency-based; a green crate (ID 72) next to it on link 2 activates it.' },
    95: { behavior: 'Blue receiver (link 2). Detects an orthogonally adjacent blue crate on link 2.',
          interactions: 'Adjacency-based; a blue crate (ID 73) next to it on link 2 activates it.' },
    96: { behavior: 'White receiver (link 2). Detects an orthogonally adjacent white crate on link 2.',
          interactions: 'Adjacency-based; a white crate (ID 70) next to it on link 2 activates it.' },
    97: { behavior: 'Red receiver (link 3). Detects an orthogonally adjacent red crate on link 3.',
          interactions: 'Adjacency-based; a red crate (ID 71) next to it on link 3 activates it.' },
    98: { behavior: 'Green receiver (link 3). Detects an orthogonally adjacent green crate on link 3.',
          interactions: 'Adjacency-based; a green crate (ID 72) next to it on link 3 activates it.' },
    99: { behavior: 'Blue receiver (link 3). Detects an orthogonally adjacent blue crate on link 3.',
          interactions: 'Adjacency-based; a blue crate (ID 73) next to it on link 3 activates it.' },
    100: { behavior: 'White receiver (link 3). Detects an orthogonally adjacent white crate on link 3.',
           interactions: 'Adjacency-based; a white crate (ID 70) next to it on link 3 activates it.' },
    'dot': { behavior: 'The player avatar (dot). Its spawn cell is the Start marker (ID 1). The dot carries a color (P) that must match the goal to win.',
             interactions: 'The dot pushes crates, walks on floor, and is blocked by walls, closed gates, and rays.' }
  };

  /* ---------------------------------------------------------------------- */
  /* Coordinate helpers                                                     */
  /* Grids are stored top-first (YAML order); editor public coords are      */
  /* game coordinates with A1 at the bottom-left.                           */
  /* ---------------------------------------------------------------------- */

  function toRow(y, height) { return height - 1 - y; }

  function cellLabel(x, y) { return SM.BOARD.cellLabel(x, y); }

  function isInt(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }

  /* ---------------------------------------------------------------------- */
  /* Editor factory                                                         */
  /* ---------------------------------------------------------------------- */

  function create() {
    var state = {
      pack: null,            /* authored world-pack document (YAML source of truth) */
      packName: null,        /* display name of the active pack */
      header: SM.YAML_HEADER,
      currentKey: null,      /* which level is being edited */
      primary: 0,             /* Primary slot tile ID */
      secondary: 0,           /* Secondary slot tile ID (base floor / area fill) */
      cursor: { x: 0, y: 0 },
      history: [],            /* edit-history stack of level snapshots */
      redoStack: [],
      savedSnapshot: null,    /* last-saved baseline for reset-to-saved */
      diagnostics: [],
      problems: [],
      resolving: false,       /* true while a resolve is in flight (blocks capture) */
      snapshots: { A: null, B: null }
    };

    var api = {};

    /* ---- Pack load / save (group 2) ---------------------------------- */

    api.loadPackText = function (text) {
      var doc;
      try { doc = SM.parseYAML(text); }
      catch (e) {
        return { ok: false, problems: [{ level: 'pack', line: e.line || 0,
          message: e.reason || e.message }], diagnostics: [] };
      }
      return api.loadPackDoc(doc, text);
    };

    api.loadPackDoc = function (doc, sourceText) {
      var res = SM.LEVELS.validate(doc, { solve: false });
      if (res.problems.length) {
        /* A rejected pack does NOT replace the active valid pack. */
        return { ok: false, problems: res.problems, diagnostics: res.diagnostics };
      }
      state.pack = doc;
      state.packName = doc.name || '(untitled)';
      state.currentKey = doc.levels ? Object.keys(doc.levels)[0] : null;
      state.history = [];
      state.redoStack = [];
      state.savedSnapshot = api.levelSnapshot();
      state.diagnostics = res.diagnostics;
      state.problems = [];
      state.snapshots = { A: null, B: null };
      return { ok: true, problems: [], diagnostics: res.diagnostics };
    };

    api.hasPack = function () { return !!state.pack; };
    api.activePackName = function () { return state.packName; };

    api.exportYaml = function () {
      if (!state.pack) return '';
      return SM.emitYAML(state.pack, state.header);
    };

    api.currentLevelKey = function () { return state.currentKey; };

    api.setLevel = function (key) {
      if (!state.pack || !state.pack.levels || !state.pack.levels[key]) return false;
      state.currentKey = key;
      state.history = []; state.redoStack = [];
      return true;
    };

    api.levelKeys = function () {
      if (!state.pack || !state.pack.levels) return [];
      return Object.keys(state.pack.levels);
    };

    function currentLevel() {
      if (!state.pack || !state.currentKey) return null;
      return state.pack.levels[state.currentKey] || null;
    }

    function gridOf(level) { return level && Array.isArray(level.grid) ? level.grid : null; }
    function heightOf(level) { return level ? (level.height || (level.grid ? level.grid.length : 0)) : 0; }
    function widthOf(level) {
      if (!level) return 0;
      if (level.width) return level.width;
      return level.grid && level.grid[0] ? level.grid[0].length : 0;
    }

    /* ---- Grid access (game coordinates) ------------------------------ */

    api.tileAt = function (x, y) {
      var lv = currentLevel(); if (!lv) return -1;
      var h = heightOf(lv), w = widthOf(lv);
      if (x < 0 || y < 0 || x >= w || y >= h) return -1;
      var row = toRow(y, h);
      return lv.grid[row][x];
    };

    api.setTileAt = function (x, y, id, opts) {
      opts = opts || {};
      var lv = currentLevel(); if (!lv) return false;
      var h = heightOf(lv), w = widthOf(lv);
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      if (!SM.getTile(id) && id !== DOT_SPAWN_ID && id !== GOAL_ID) return false;
      pushHistory();
      var row = toRow(y, h);
      var prev = lv.grid[row][x];
      var placing = id;
      /* Single-instance markers relocate on confirm. */
      if ((id === DOT_SPAWN_ID || id === GOAL_ID) && !opts.confirmed) {
        var existing = findMarker(id);
        if (existing && !(existing.x === x && existing.y === y)) {
          state.pendingMarker = { id: id, x: x, y: y, from: existing };
          /* do not commit yet; pop the history we just pushed */
          state.history.pop();
          return { confirmRequested: true };
        }
      }
      lv.grid[row][x] = placing;
      api.revalidate();
      return true;
    };

    function findMarker(id) {
      var lv = currentLevel(); if (!lv) return null;
      var h = heightOf(lv), w = widthOf(lv);
      for (var r = 0; r < h; r++) {
        for (var c = 0; c < w; c++) {
          if (lv.grid[r][c] === id) return { x: c, y: h - 1 - r };
        }
      }
      return null;
    }

    api.confirmMarkerReplace = function () {
      if (!state.pendingMarker) return false;
      var pm = state.pendingMarker; state.pendingMarker = null;
      pushHistory();
      var lv = currentLevel();
      /* old cell becomes the secondary (base floor) tile */
      lv.grid[toRow(pm.from.y, heightOf(lv))][pm.from.x] = state.secondary;
      lv.grid[toRow(pm.y, heightOf(lv))][pm.x] = pm.id;
      api.revalidate();
      return true;
    };

    api.cancelMarkerReplace = function () { state.pendingMarker = null; return true; };

    api.paintAt = function (x, y) {
      return api.setTileAt(x, y, state.primary);
    };

    /* ---- Cursor + region (group 4) ----------------------------------- */

    api.cursorPos = function () { return { x: state.cursor.x, y: state.cursor.y }; };

    api.moveCursor = function (dir) {
      var lv = currentLevel(); if (!lv) return false;
      var w = widthOf(lv), h = heightOf(lv);
      if (dir === 'east') state.cursor.x = Math.min(state.cursor.x + 1, w - 1);
      else if (dir === 'west') state.cursor.x = Math.max(state.cursor.x - 1, 0);
      else if (dir === 'north') state.cursor.y = Math.min(state.cursor.y + 1, h - 1);
      else if (dir === 'south') state.cursor.y = Math.max(state.cursor.y - 1, 0);
      return true;
    };

    api.setCursor = function (x, y) { state.cursor = { x: x, y: y }; return true; };

    /* ---- Area fill (group 4) ------------------------------------------ */

    api.fillRect = function (x0, y0, x1, y1) {
      var lv = currentLevel(); if (!lv) return false;
      var id = state.secondary;
      if (!SM.getTile(id)) return false;
      pushHistory();
      var h = heightOf(lv);
      var xmin = Math.min(x0, x1), xmax = Math.max(x0, x1);
      var ymin = Math.min(y0, y1), ymax = Math.max(y0, y1);
      for (var y = ymin; y <= ymax; y++) {
        for (var x = xmin; x <= xmax; x++) {
          if (x < 0 || y < 0 || x >= widthOf(lv) || y >= h) continue;
          lv.grid[toRow(y, h)][x] = id;
        }
      }
      api.revalidate();
      return true;
    };

    api.floodFill = function (x, y) {
      var lv = currentLevel(); if (!lv) return false;
      var id = state.secondary;
      if (!SM.getTile(id)) return false;
      var w = widthOf(lv), h = heightOf(lv);
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      var origin = lv.grid[toRow(y, h)][x];
      if (origin === id) return true;
      pushHistory();
      var stack = [[x, y]];
      var seen = {};
      while (stack.length) {
        var p = stack.pop();
        var cx = p[0], cy = p[1];
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        var key = cx + ',' + cy;
        if (seen[key]) continue;
        seen[key] = true;
        if (lv.grid[toRow(cy, h)][cx] !== origin) continue;
        lv.grid[toRow(cy, h)][cx] = id;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      api.revalidate();
      return true;
    };

    /* ---- Palette (group 3) -------------------------------------------- */

    api.paletteTileIds = function () {
      var ids = Object.keys(SM.TILES).map(Number).sort(function (a, b) { return a - b; });
      return ids;
    };

    api.paletteCategories = function () {
      var seen = {}, out = [];
      Object.keys(SM.TILES).forEach(function (k) {
        var cat = SM.TILES[k].category;
        if (!seen[cat]) { seen[cat] = true; out.push(cat); }
      });
      return out;
    };

    api.hasDotInPalette = function () { return true; };   /* ID 1 (start) represents the dot spawn */

    api.registeredUnusedIds = function () {
      var lv = currentLevel();
      var used = {};
      if (lv && lv.grid) {
        lv.grid.forEach(function (row) { row.forEach(function (id) { used[id] = true; }); });
      }
      var out = [];
      Object.keys(SM.TILES).forEach(function (k) {
        var id = Number(k);
        if (!used[id]) out.push(id);
      });
      return out;
    };

    api.isMarkedUnused = function (id) {
      var lv = currentLevel();
      if (!lv || !lv.grid) return true;
      for (var r = 0; r < lv.grid.length; r++) {
        if (lv.grid[r].indexOf(id) >= 0) return false;
      }
      return true;
    };

    /* ---- Dual slots (group 3) ----------------------------------------- */

    api.setPrimary = function (id) {
      if (!SM.getTile(id)) return false;
      state.primary = id; return true;
    };
    api.setSecondary = function (id) {
      if (!SM.getTile(id)) return false;
      state.secondary = id; return true;
    };
    api.primaryTileId = function () { return state.primary; };
    api.secondaryTileId = function () { return state.secondary; };

    /* ---- Quick guide + per-tile help (group 3) ----------------------- */

    api.quickGuide = function () {
      return { primary: describeTileById(state.primary), secondary: describeTileById(state.secondary) };
    };

    api.tileHelp = function (id) {
      var d = describeTileById(id);
      if (!d) return null;
      /* help is identical in shape to the quick-guide summary; the browser
         binding may render help with more detail, but the data is the same. */
      return d;
    };

    /* ---- Inspector + override routing (group 5) ---------------------- */

    api.inspectorColors = function () { return GAMECOLOURS.slice(); };

    api.canEditGoalColor = function () { return false; };   /* goal color follows world color */

    api.setTileParam = function (id, key, value) {
      var lv = currentLevel(); if (!lv) return null;
      var tile = SM.getTile(id); if (!tile) return null;
      pushHistory();
      if (!lv.overrides) lv.overrides = {};
      if (!lv.overrides[id]) lv.overrides[id] = {};
      lv.overrides[id][key] = value;
      /* count affected occurrences in the current grid */
      var affects = 0;
      if (lv.grid) lv.grid.forEach(function (row) {
        row.forEach(function (gid) { if (gid === id) affects++; });
      });
      api.revalidate();
      return { kind: 'overrides', id: id, key: key, value: value, affects: affects };
    };

    api.setEntityCapability = function (x, y, key, value) {
      var lv = currentLevel(); if (!lv) return null;
      var h = heightOf(lv), w = widthOf(lv);
      if (x < 0 || y < 0 || x >= w || y >= h) return null;
      var gridId = lv.grid[toRow(y, h)][x];
      var def = SM.getTile(gridId);
      if (!def || (def.entityRole !== 'crate' && def.entityRole !== 'target')) return null;
      pushHistory();
      if (!lv.object_overrides) lv.object_overrides = {};
      var label = cellLabel(x, y);
      if (!lv.object_overrides[label]) lv.object_overrides[label] = {};
      lv.object_overrides[label][key] = value;
      api.revalidate();
      return { kind: 'object_overrides', coord: label, key: key, value: value };
    };

    api.regionSummary = function (cells) {
      if (!cells || !cells.length) return { tileId: null };
      var ids = {};
      cells.forEach(function (c) { ids[api.tileAt(c.x, c.y)] = true; });
      var keys = Object.keys(ids);
      if (keys.length === 1) return { tileId: Number(keys[0]) };
      return { tileId: '<mixed>' };
    };

    /* ---- Live validation (group 6) ------------------------------------ */

    api.revalidate = function () {
      if (!state.pack) { state.problems = []; state.diagnostics = []; return; }
      var res = SM.LEVELS.validate(state.pack, { solve: false });
      state.problems = res.problems || [];
      state.diagnostics = res.diagnostics || [];
    };

    api.boardValid = function () { return state.pack ? state.problems.length === 0 : false; };
    api.canSave = function () { return api.boardValid(); };
    api.canQuickTest = function () { return api.boardValid(); };
    api.canExport = function () { return api.boardValid(); };
    api.diagnostics = function () { return state.problems.concat(state.diagnostics); };

    /* ---- Edit history: undo / redo / reset (group 7) ------------------ */

    function levelSnapshot() {
      var lv = currentLevel(); if (!lv) return null;
      /* deep copy the raw level object */
      return JSON.parse(JSON.stringify(lv));
    }

    api.levelSnapshot = function () { return levelSnapshot(); };

    function pushHistory() {
      var snap = levelSnapshot();
      if (snap) { state.history.push(snap); state.redoStack = []; }
    }

    api.undo = function () {
      if (!state.history.length) return false;
      var snap = state.history.pop();
      state.redoStack.push(levelSnapshot());
      var lv = currentLevel();
      var fresh = JSON.parse(JSON.stringify(snap));
      Object.keys(lv).forEach(function (k) { delete lv[k]; });
      Object.keys(fresh).forEach(function (k) { lv[k] = fresh[k]; });
      api.revalidate();
      return true;
    };

    api.redo = function () {
      if (!state.redoStack.length) return false;
      var snap = state.redoStack.pop();
      state.history.push(levelSnapshot());
      var lv = currentLevel();
      var fresh = JSON.parse(JSON.stringify(snap));
      Object.keys(lv).forEach(function (k) { delete lv[k]; });
      Object.keys(fresh).forEach(function (k) { lv[k] = fresh[k]; });
      api.revalidate();
      return true;
    };

    api.hasGameplayState = function () { return false; };   /* editor undo never consults gameplay */

    api.markSaved = function () { state.savedSnapshot = levelSnapshot(); };

    api.resetToSaved = function () {
      if (!state.savedSnapshot) return false;
      var lv = currentLevel(); if (!lv) return false;
      var fresh = JSON.parse(JSON.stringify(state.savedSnapshot));
      Object.keys(lv).forEach(function (k) { delete lv[k]; });
      Object.keys(fresh).forEach(function (k) { lv[k] = fresh[k]; });
      state.history = []; state.redoStack = [];
      api.revalidate();
      return true;
    };

    /* ---- Snapshot A/B buffers (group 9) ------------------------------ */

    api.setResolving = function (v) { state.resolving = !!v; };

    function arrangementFromCurrent() {
      var lv = currentLevel(); if (!lv) return null;
      return JSON.parse(JSON.stringify(lv));
    }

    function sigOfArrangement(arr) {
      if (!arr) return null;
      try {
        var level = SM.RULES.buildLevel(arr, 'snapshot');
        var st = SM.RULES.newState(level);
        return SM.RULES.snapshotSig(st);
      } catch (e) { return null; }
    }

    /* The A→B goal compares MUTABLE state (player, crates, colors, latches,
       polarity), not the immutable level identity. `snapshotSig` begins with
       `rulesIdentity|...` where rulesIdentity embeds the grid and key; that
       portion never changes during play, so two arrangements with different
       crate/start positions (different grids) could never match on the full
       signature. The mutable signature strips that leading segment so the
       solver can ask "can the crate reach B's position" across arrangements
       that share terrain but differ in mutable placement. */
    function mutableSig(st) {
      var full = SM.RULES.snapshotSig(st);
      var firstPipe = full.indexOf('|');
      return firstPipe < 0 ? full : full.slice(firstPipe + 1);
    }

    function mutableSigOfArrangement(arr) {
      if (!arr) return null;
      try {
        var level = SM.RULES.buildLevel(arr, 'snapshot');
        var st = SM.RULES.newState(level);
        return mutableSig(st);
      } catch (e) { return null; }
    }

    api.useCurrentBoardAsA = function () {
      if (state.resolving) throw new Error('cannot capture snapshot while a resolve is in flight');
      state.snapshots.A = arrangementFromCurrent();
      return !!state.snapshots.A;
    };

    api.useCurrentBoardAsB = function () {
      if (state.resolving) throw new Error('cannot capture snapshot while a resolve is in flight');
      state.snapshots.B = arrangementFromCurrent();
      return !!state.snapshots.B;
    };

    api.snapshotArrangement = function (slot) {
      return state.snapshots[slot] ? JSON.parse(JSON.stringify(state.snapshots[slot])) : null;
    };

    api.setSnapshotArrangement = function (slot, arrangement) {
      state.snapshots[slot] = arrangement ? JSON.parse(JSON.stringify(arrangement)) : null;
    };

    api.snapshotSig = function (slot) {
      return sigOfArrangement(state.snapshots[slot]);
    };

    api.snapshotValid = function (slot) {
      return sigOfArrangement(state.snapshots[slot]) !== null;
    };

    api.exportScenario = function (name) {
      return { name: name, arrangementA: api.snapshotArrangement('A'),
        arrangementB: api.snapshotArrangement('B') };
    };

    api.loadScenario = function (sc) {
      if (!sc) return false;
      api.setSnapshotArrangement('A', sc.arrangementA);
      api.setSnapshotArrangement('B', sc.arrangementB);
      return true;
    };

    /* ---- A→B solver (group 10) ---------------------------------------- */
    /* Requires the prerequisite `standalone-state-solver` change. Exposed
       here so the browser binding and tests can detect availability. */

    api.canSolveAB = function () { return !!(SM.SOLVER && typeof SM.SOLVER.solve === 'function'); };

    api.solveAB = function (opts) {
      if (!api.canSolveAB()) {
        return { status: 'unavailable',
          reason: 'standalone-state-solver prerequisite not applied' };
      }
      opts = opts || {};
      var a = state.snapshots.A, b = state.snapshots.B;
      if (!a || !b) return { status: 'invalid', reason: 'snapshots A and B must be authored' };
      var sigB = mutableSigOfArrangement(b);
      if (!sigB) return { status: 'invalid', reason: 'snapshot B does not settle to a realizable state' };
      var startLevel, startState;
      try {
        startLevel = SM.RULES.buildLevel(a, 'snapA');
        startState = SM.RULES.newState(startLevel);
      } catch (e) { return { status: 'invalid', reason: 'snapshot A is not buildable: ' + e.message }; }
      var result = SM.SOLVER.solve({
        startState: startState,
        isGoal: function (s) { return !s.failed && mutableSig(s) === sigB; },
        maxStates: opts.maxStates, maxDepth: opts.maxDepth, maxRouteLabels: opts.maxRouteLabels
      });
      return result;
    };

    /* ---- Quick play/test (group 8) ------------------------------------ */
    /* A contained session that reuses the REAL resolver (SM.RULES.resolveTurn)
       and the REAL renderer (SM.Renderer) — no editor-specific simulator.
       It never publishes scores and never touches SM.STORE. Terminal failure
       blocks gameplay/player undo until reset, per the resolver contract. */

    var qt = { state: null, history: [], renderer: null };

    api.attachTestRenderer = function (renderer) { qt.renderer = renderer; };

    api.startQuickTest = function () {
      if (!api.canQuickTest()) return false;
      if (qt.renderer) qt.renderer.cancel();
      var lv = currentLevel(); if (!lv) return false;
      var level;
      try { level = SM.RULES.buildLevel(lv, state.currentKey || 'test'); }
      catch (e) { return false; }
      qt.state = SM.RULES.newState(level);
      qt.history = [];
      if (qt.renderer) qt.renderer.build(qt.state);
      return true;
    };

    api.quickTestAct = function (action) {
      if (qt.renderer) qt.renderer.cancel();
      if (!qt.state) return { outcome: 'none' };
      if (qt.state.won) return { outcome: 'won' };
      if (qt.state.failed) return { outcome: 'failed', blocked: true };
      var before = SM.RULES.snapshot(qt.state);
      var displayBefore = SM.RULES.cloneState(qt.state), session = qt.state;
      var result;
      try { result = SM.RULES.resolveTurn(qt.state, action); }
      catch (e) { return { outcome: 'error', message: e.message }; }
      if (!result.changed && !result.stroke) return { outcome: 'blocked', steps: result.steps };
      qt.history.push(before);
      if (qt.renderer) qt.renderer.play(result.steps, displayBefore, function () {
        if (qt.state === session) qt.renderer.draw(SM.RULES.cloneState(session));
      });
      return { outcome: api.quickTestOutcome(), result: result, strokes: qt.state.strokes };
    };

    api.quickTestUndo = function () {
      if (!qt.state || !qt.history.length) return false;
      if (qt.state.failed) return false;   /* blocked until reset per the contract */
      if (qt.renderer) qt.renderer.cancel();
      SM.RULES.restore(qt.state, qt.history.pop());
      if (qt.renderer) qt.renderer.draw(SM.RULES.cloneState(qt.state));
      return true;
    };

    api.quickTestReset = function () { return api.startQuickTest(); };

    api.quickTestOutcome = function () {
      if (!qt.state) return 'none';
      return qt.state.failed ? 'failed' : qt.state.won ? 'won' : 'playing';
    };

    api.quickTestStrokes = function () { return qt.state ? qt.state.strokes : 0; };
    api.quickTestState = function () { return qt.state; };
    api.quickTestHasSession = function () { return !!qt.state; };

    /* ---- Boot: load the default Prologue (group 1) -------------------- */

    api.bootDefault = function () {
      if (!SM.DEFAULT_LEVELS) return false;
      return api.loadPackDoc(SM.DEFAULT_LEVELS, null);
    };

    /* ---- Authorable grid dimensions (group 3) ------------------------ */

    api.setWidth = function (n) {
      if (!isInt(n) || n < MIN_WIDTH || n > MAX_WIDTH) return false;
      var lv = currentLevel(); if (!lv) return false;
      var oldW = widthOf(lv);
      if (n === oldW) return true;
      pushHistory();
      var h = heightOf(lv);
      for (var r = 0; r < h; r++) {
        var row = lv.grid[r];
        if (n > oldW) {
          for (var x = oldW; x < n; x++) row.push(state.secondary);
        } else {
          row.length = n;
        }
      }
      lv.width = n;
      api.revalidate();
      return true;
    };

    api.setHeight = function (n) {
      if (!isInt(n) || n < MIN_HEIGHT || n > MAX_HEIGHT) return false;
      var lv = currentLevel(); if (!lv) return false;
      var oldH = heightOf(lv);
      if (n === oldH) return true;
      pushHistory();
      var w = widthOf(lv);
      if (n > oldH) {
        for (var r = oldH; r < n; r++) {
          var row = []; for (var x = 0; x < w; x++) row.push(state.secondary);
          // YAML is top-first: add top rows so bottom-left A1 stays anchored.
          lv.grid.unshift(row);
        }
      } else {
        lv.grid.splice(0, oldH - n);
      }
      lv.height = n;
      api.revalidate();
      return true;
    };

    api.GRID_BOUNDS = { minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH,
      minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT };

    /* ---- Default start/goal placement (group 4) ---------------------- */

    api.ensureDefaultMarkers = function (opts) {
      opts = opts || {};
      var lv = currentLevel(); if (!lv) return false;
      var h = heightOf(lv), w = widthOf(lv);
      var hasStart = !!findMarker(DOT_SPAWN_ID);
      var hasGoal = !!findMarker(GOAL_ID);
      if (hasStart && hasGoal) return false;   /* both present, nothing to do */
      if (!opts.confirmed) return { confirmRequested: true };
      pushHistory();
      if (!hasStart) {
        lv.grid[toRow(h - 1, h)][0] = DOT_SPAWN_ID;   /* screen top-left */
      }
      if (!hasGoal) {
        lv.grid[toRow(0, h)][w - 1] = GOAL_ID;   /* screen bottom-right */
      }
      api.revalidate();
      return true;
    };

    /* ---- Keystroke formatting (group 9) ----------------------------- */

    var KEY_GLYPHS = { north: '↑', south: '↓', east: '→', west: '←' };

    api.formatKeystrokes = function (path) {
      if (!path || !path.length) return '';
      return path.map(function (a) {
        if (a.type === 'act') return 'ACT';
        if (a.type === 'move' || a.type === 'pull') return KEY_GLYPHS[a.dir] || '?';
        return '?';
      }).join(' ');
    };

    return api;
  }

  SM.EDITOR = { create: create, describeTile: describeTile, describeTileById: describeTileById };

  /* ---------------------------------------------------------------------- */
  /* Browser binding (editor.html). Guarded so Node tests can load this     */
  /* module without a DOM.                                                   */
  /* ---------------------------------------------------------------------- */
  function el(parent, sel) { return parent.querySelector(sel); }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function renderPalette(root, ed) {
    var host = el(root, '#palette'); if (!host) return;
    clear(host);
    var cats = {};
    var ids = ed.paletteTileIds();
    ids.forEach(function (id) {
      var tile = SM.getTile(id);
      var cat = tile.category;
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(id);
    });
    var unusedSet = {};
    ed.registeredUnusedIds().forEach(function (id) { unusedSet[id] = true; });
    Object.keys(cats).forEach(function (cat) {
      var det = document.createElement('details');
      det.className = 'palette-cat';
      det.open = true;
      var sum = document.createElement('summary');
      sum.appendChild(document.createTextNode(cat));
      var count = document.createElement('span');
      count.className = 'count'; count.textContent = '(' + cats[cat].length + ')';
      sum.appendChild(count);
      det.appendChild(sum);
      var entries = document.createElement('div'); entries.className = 'entries';
      cats[cat].forEach(function (id) {
        var tile = SM.getTile(id);
        var e = document.createElement('div');
        e.className = 'palette-entry' + (unusedSet[id] ? ' unused' : '');
        e.dataset.id = id;
        e.title = id + ' · ' + tile.name;
        e.innerHTML = '<div class="glyph"></div><div class="id">' + id + '</div><div class="name"></div>';
        SM.GRAPHICS.mount(e.querySelector('.glyph'), [SM.VISUALS.describe(tile, { W: 'wht' })], SM.PRESENTATION.settings.theme, 32);
        e.querySelector('.name').textContent = tile.name;
        e.addEventListener('click', function () { ed.setPrimary(id); refreshPaletteSelection(root, ed); renderQuickGuide(root, ed); });
        e.addEventListener('contextmenu', function (ev) { ev.preventDefault(); ed.setSecondary(id); refreshPaletteSelection(root, ed); renderQuickGuide(root, ed); });
        entries.appendChild(e);
      });
      det.appendChild(entries);
      host.appendChild(det);
    });
  }

  function refreshPaletteSelection(root, ed) {
    var prim = ed.primaryTileId(), sec = ed.secondaryTileId();
    var entries = root.querySelectorAll('.palette-entry');
    entries.forEach(function (e) {
      var id = Number(e.dataset.id);
      e.classList.toggle('is-primary', id === prim);
      e.classList.toggle('is-secondary', id === sec);
    });
  }

  function renderQuickGuide(root, ed) {
    var host = el(root, '#quick-guide'); if (!host) return;
    var g = ed.quickGuide();
    clear(host);
    ['primary', 'secondary'].forEach(function (slotKey) {
      var slot = g[slotKey]; if (!slot) return;
      var box = document.createElement('div'); box.className = 'slot';
      box.innerHTML = '<h3>' + slotKey + '</h3><div class="glyph"></div>' +
        '<div class="name"></div><div class="meta"></div><div class="behavior"></div>';
      SM.GRAPHICS.mount(box.querySelector('.glyph'), [slot.visual], SM.PRESENTATION.settings.theme, 48);
      box.querySelector('.name').textContent = slot.id + ' · ' + slot.name;
      box.querySelector('.meta').textContent = slot.category + ' / ' + slot.layer;
      box.querySelector('.behavior').textContent = slot.behavior || '';
      host.appendChild(box);
    });
  }

  function renderGrid(root, ed) {
    var host = el(root, '#grid'); if (!host) return;
    if (!ed.hasPack()) { host.textContent = 'Load a pack to begin editing.'; return; }
    var snap = ed.levelSnapshot();
    var cur = ed.cursorPos();
    if (!host._graphicsSurface) {
      host._graphicsSurface = new SM.Surface(host, { cellSize: 34, static: true,
        onCursor: function (x, y, event) {
          ed.setCursor(x, y);
          var result = event.shiftKey ? ed.paintAt(x, y) : null;
          if (result && result.confirmRequested) {
            if (confirm('Relocate the single-instance marker to this cell?')) ed.confirmMarkerReplace(); else ed.cancelMarkerReplace();
          }
          renderGrid(root, ed); renderDiagnostics(root, ed); refreshBlockState(root, ed);
        }, onCell: function (x, y, event) {
        ed.setCursor(x, y);
        var previous = ed.primaryTileId();
        if (event.type === 'contextmenu') ed.setPrimary(ed.secondaryTileId());
        var result = ed.paintAt(x, y);
        if (event.type === 'contextmenu') ed.setPrimary(previous);
        if (result && result.confirmRequested) {
          if (confirm('Relocate the single-instance marker to this cell?')) ed.confirmMarkerReplace(); else ed.cancelMarkerReplace();
        }
        renderGrid(root, ed); renderDiagnostics(root, ed); refreshBlockState(root, ed);
      } });
    }
    host._graphicsSurface.options.cursor = cur;
    var picture;
    try { picture = SM.VISUALS.board(SM.RULES.newState(SM.RULES.buildLevel(snap, 'editor-preview'))); }
    catch (ignore) { picture = SM.VISUALS.authored(snap); }
    host._graphicsSurface.update(picture);
    Array.from(host._graphicsSurface.grid.children).forEach(function (c) { c.classList.add('ed-cell'); c.classList.toggle('cursor', +c.dataset.x === cur.x && +c.dataset.y === cur.y); });
  }

  function renderDiagnostics(root, ed) {
    var host = el(root, '#diag'); if (!host) return;
    clear(host);
    var list = ed.diagnostics();
    if (!list.length) { host.innerHTML = '<span style="color:var(--mute)">No problems.</span>'; return; }
    list.forEach(function (d) {
      var div = document.createElement('div'); div.className = 'd';
      div.textContent = d.message;
      var where = [];
      if (d.level) where.push(d.level);
      if (d.line) where.push('line ' + d.line);
      var w = document.createElement('div'); w.className = 'where'; w.textContent = where.join(' · ');
      div.appendChild(w);
      host.appendChild(div);
    });
  }

  function refreshBlockState(root, ed) {
    var save = el(root, '#btn-save'), qt = el(root, '#btn-test'), exp = el(root, '#btn-export');
    if (save) save.disabled = !ed.canSave();
    if (qt) qt.disabled = !ed.canQuickTest();
    if (exp) exp.disabled = !ed.canExport();
  }

  /* Bind the editor API to a DOM root. Returns the editor instance. */
  SM.EDITOR.bind = function (root, ed) {
    ed = ed || SM.EDITOR.create();
    SM.PRESENTATION.subscribe(function () { renderPalette(root, ed); renderQuickGuide(root, ed); if (ed.hasPack()) renderGrid(root, ed); });

    renderPalette(root, ed);
    refreshPaletteSelection(root, ed);
    renderQuickGuide(root, ed);

    /* Toolbar: load / save / paste / undo / redo / reset / test / export */
    var picker = el(root, '#file');
    if (picker) picker.addEventListener('change', function () {
      if (picker.files && picker.files[0]) {
        var fr = new FileReader();
        fr.onload = function () { applyText(ed, String(fr.result), root); };
        fr.readAsText(picker.files[0]); picker.value = '';
      }
    });
    var applyBtn = el(root, '#btn-apply');
    if (applyBtn) applyBtn.addEventListener('click', function () {
      var ta = el(root, '#yaml'); if (ta) applyText(ed, ta.value, root);
    });
    var saveBtn = el(root, '#btn-save');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      if (!ed.canSave()) return;
      var text = ed.exportYaml();
      download(text, (ed.activePackName() || 'world') + '.yaml');
      ed.markSaved();
    });
    var undoBtn = el(root, '#btn-undo');
    if (undoBtn) undoBtn.addEventListener('click', function () { ed.undo(); renderGrid(root, ed); renderDiagnostics(root, ed); });
    var redoBtn = el(root, '#btn-redo');
    if (redoBtn) redoBtn.addEventListener('click', function () { ed.redo(); renderGrid(root, ed); renderDiagnostics(root, ed); });
    var resetBtn = el(root, '#btn-reset-saved');
    if (resetBtn) resetBtn.addEventListener('click', function () { ed.resetToSaved(); renderGrid(root, ed); });
    var expBtn = el(root, '#btn-export');
    if (expBtn) expBtn.addEventListener('click', function () {
      if (!ed.canExport()) return;
      var ta = el(root, '#yaml'); var text = ed.exportYaml(); if (ta) ta.value = text;
    });
    var testBtn = el(root, '#btn-test');
    if (testBtn) testBtn.addEventListener('click', function () { startQuickTest(root, ed); });

    var fillRectBtn = el(root, '#btn-fill-rect');
    if (fillRectBtn) fillRectBtn.addEventListener('click', function () {
      var c = ed.cursorPos(); ed.fillRect(0, 0, c.x, c.y); renderGrid(root, ed); renderDiagnostics(root, ed); refreshBlockState(root, ed);
    });
    var floodBtn = el(root, '#btn-flood');
    if (floodBtn) floodBtn.addEventListener('click', function () {
      var c = ed.cursorPos(); ed.floodFill(c.x, c.y); renderGrid(root, ed); renderDiagnostics(root, ed); refreshBlockState(root, ed);
    });

    /* Tile help: clicking a palette entry also refreshes the help panel */
    root.addEventListener('click', function (ev) {
      var entry = ev.target.closest && ev.target.closest('.palette-entry');
      if (!entry) return;
      var id = Number(entry.dataset.id);
      var help = el(root, '#tile-help'); if (!help) return;
      var h = ed.tileHelp(id); if (!h) return;
      clear(help);
      help.innerHTML = '<div class="glyph"></div><div class="name"></div><div class="meta"></div><div class="behavior"></div><div class="attrs"></div>';
      SM.GRAPHICS.mount(help.querySelector('.glyph'), [h.visual], SM.PRESENTATION.settings.theme, 48);
      help.querySelector('.name').textContent = h.id + ' · ' + h.name;
      help.querySelector('.meta').textContent = h.category + ' / ' + h.layer + (h.colourRole ? ' · ' + h.colourRole : '');
      help.querySelector('.behavior').textContent = h.behavior || '';
      help.querySelector('.attrs').textContent = 'Authorable attributes: ' + (h.attributes.length ? h.attributes.join(', ') : '(none)');
    });

    /* Snapshot A/B buttons */
    bindSnap(root, ed);

    /* Keyboard: arrow cursor + paint */
    document.addEventListener('keydown', function (ev) {
      if (!ed.hasPack()) return;
      var map = { ArrowUp: 'north', ArrowDown: 'south', ArrowLeft: 'west', ArrowRight: 'east' };
      if (map[ev.key]) {
        ev.preventDefault();
        if (ev.shiftKey) {
          /* region selection: paint the primary along the move */
          ed.moveCursor(map[ev.key]); ed.paintAt(ed.cursorPos().x, ed.cursorPos().y);
        } else {
          ed.moveCursor(map[ev.key]);
        }
        renderGrid(root, ed); renderDiagnostics(root, ed); refreshBlockState(root, ed);
      } else if (ev.key === ' ') {
        ev.preventDefault(); ed.paintAt(ed.cursorPos().x, ed.cursorPos().y);
        renderGrid(root, ed); renderDiagnostics(root, ed); refreshBlockState(root, ed);
      }
    });

    function applyText(editor, text, r) {
      var res = editor.loadPackText(text);
      renderGrid(r, editor); renderDiagnostics(r, editor); refreshBlockState(r, editor);
      renderPalette(r, editor); refreshPaletteSelection(r, editor); renderQuickGuide(r, editor);
      if (!res.ok && res.problems.length) {
        var ta = el(r, '#yaml'); if (ta) ta.value = text;
      }
    }

    function startQuickTest(r, editor) {
      if (!editor.canQuickTest()) return;
      var region = el(r, '#test-region'); if (region) region.hidden = false;
      var renderer = qtRenderer(r);
      if (r._quickTestRenderer) r._quickTestRenderer.dispose();
      r._quickTestRenderer = renderer;
      editor.attachTestRenderer(renderer);
      editor.startQuickTest();
      updateTestHud(r, editor);
    }

    function qtRenderer(r) {
      var region = el(r, '#test-region'); if (!region) return null;
      var board = el(r, '#test-board');
      if (!board) return null;
      return new SM.Renderer(region);
    }

    function updateTestHud(r, editor) {
      var strokes = el(r, '#test-strokes'), outcome = el(r, '#test-outcome'), banner = el(r, '#test-banner');
      if (strokes) strokes.textContent = String(editor.quickTestStrokes());
      if (outcome) outcome.textContent = editor.quickTestOutcome();
      if (banner) {
        var o = editor.quickTestOutcome();
        banner.textContent = o === 'failed' ? 'Attempt failed. Undo is blocked; press Reset to restart.'
          : o === 'won' ? 'Solved!' : '';
      }
    }

    function bindSnap(r, editor) {
      var aBtn = el(r, '#btn-snap-a'), bBtn = el(r, '#btn-snap-b');
      var solveBtn = el(r, '#btn-solve');
      if (aBtn) aBtn.addEventListener('click', function () {
        editor.useCurrentBoardAsA(); renderSnapSig(r, editor);
      });
      if (bBtn) bBtn.addEventListener('click', function () {
        editor.useCurrentBoardAsB(); renderSnapSig(r, editor);
      });
      if (solveBtn) solveBtn.addEventListener('click', function () {
        var res = editor.solveAB();
        var box = el(r, '#solve-result'); if (!box) return;
        clear(box);
        box.className = 'solve-result ' + (res.status || 'unknown');
        box.textContent = res.status === 'solvable'
          ? 'Solvable in ' + res.optimal + ' strokes.'
          : res.status === 'unsolvable' ? 'Unsolvable (exhaustive).'
          : res.status === 'unknown' ? 'Unknown (budget exhausted).'
          : res.status === 'unavailable' ? 'Solver prerequisite not applied.'
          : 'Invalid: ' + (res.reason || 'snapshots A/B required');
      });
      renderSnapSig(r, editor);
    }

    function renderSnapSig(r, editor) {
      var aSig = el(r, '#snap-a-sig'), bSig = el(r, '#snap-b-sig');
      if (aSig) aSig.textContent = editor.snapshotSig('A') || '(not captured)';
      if (bSig) bSig.textContent = editor.snapshotSig('B') || '(not captured)';
      [['A', aSig], ['B', bSig]].forEach(function (pair) {
        var arrangement = editor.snapshotArrangement(pair[0]), label = pair[1];
        if (!arrangement || !label) return;
        var host = label.parentElement.querySelector('.snapshot-preview');
        if (!host) { host = document.createElement('div'); host.className = 'snapshot-preview'; label.parentElement.appendChild(host); }
        if (!host._graphicsSurface) host._graphicsSurface = new SM.Surface(host, { cellSize: 20, static: true });
        host._graphicsSurface.update(SM.VISUALS.authored(arrangement));
      });
    }

    /* Quick-test input buttons live inside #test-region */
    function bindTestInput(r, editor) {
      var moves = r.querySelectorAll('[data-test-act]');
      moves.forEach(function (b) {
        b.addEventListener('click', function () {
          var a = b.dataset.testAct;
          var action = a === 'act' ? { type: 'act' } : { type: 'move', dir: a };
          editor.quickTestAct(action);
          updateTestHud(r, editor);
        });
      });
      var tUndo = el(r, '#btn-test-undo'), tReset = el(r, '#btn-test-reset');
      if (tUndo) tUndo.addEventListener('click', function () { editor.quickTestUndo(); updateTestHud(r, editor); });
      if (tReset) tReset.addEventListener('click', function () { editor.quickTestReset(); updateTestHud(r, editor); });
    }
    bindTestInput(root, ed);

    return ed;
  };

  function download(text, filename) {
    if (typeof document === 'undefined') return;
    var blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

})(typeof window !== 'undefined' ? window : globalThis);
