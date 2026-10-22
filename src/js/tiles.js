/* =========================================================================
 * tiles.js  —  STREUPH'S MAZE
 * Tile catalogue (SM.TILES), behaviour handlers (SM.BEHAVIORS), and the
 * glyph renderer (SM.glyph).
 *
 * Tile catalogue, behavior handlers, and SVG glyph renderer.
 *
 * Architectural rules:
 *   * tiles.js is RE-ENTRANT: a setter exists for swapping the catalogue at
 *     runtime. Resolution functions read SM.TILES through a stable indirection
 *     so a hot-reload takes effect for the NEXT resolveTurn (P3, §12.1).
 *   * The glyph renderer branches on inst.family, NEVER on tile id
 *     directly (S7, §9.1).
 *   * Every catalogue entry includes a `family` string from the closed set:
 *       terrain | barrier | aura | gate | switch | sensor | flow | crate | portal | actuator
 *     plus an `implemented` boolean. ID 45 (`master_void`) is `implemented:false`
 *     so the loader raises a clear error if encountered (V5, §12.2).
 *   * Colours are restricted to the gameplay palette: wht red gre blu.
 *     `blk` is chrome only (B1, §3.1).
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  /* ---------------------------------------------------------------------- */
  /* Palette (B1, B2, B3)                                                   */
  /* ---------------------------------------------------------------------- */

  SM.PALETTE = Object.freeze({
    wht: '#EDEAE3',  // white  — neutral
    red: '#E23D28',  // red    — ring slot 1
    gre: '#2FA84F',  // green  — ring slot 2
    blu: '#2D5BE3',  // blue   — ring slot 3
    blk: '#0B0B0C',  // chrome only — backgrounds, idle strokes
    mute: '#6B6B72'  // chrome only — dimmed ink, never a gameplay state
  });

  SM.RING = ['red', 'gre', 'blu'];   // cycle_dial advance order (T1)
  SM.W_COLOURS = ['wht', 'red', 'gre', 'blu'];
  SM.P_COLOURS = ['wht', 'red', 'gre', 'blu'];

  /* ---------------------------------------------------------------------- */
  /* Catalogue                                                              */
  /* ---------------------------------------------------------------------- */

  var TILES = {};
  var BEHAVIORS = {};

  function add(def) {
    // Presentation metadata is display-only and never participates in rules.
    if (!def.presentation) def.presentation = { motion: 'static' };
    TILES[def.id] = def;
    if (def.behavior) BEHAVIORS[def.behavior] = def;
  }

  // The player marker is an animated display entity, not a gameplay tile.
  SM.PLAYER_PRESENTATION = Object.freeze({
    motion: 'animated', animation: 'pulse8', frames: 8, frameMs: 250
  });

  /* ===== TERRAIN ========================================================= */

  add({ id:  0, family: 'terrain', name: 'floor',  glyph: 'floor',  solid: false, walkable: true });
  add({ id:  1, family: 'terrain', name: 'start',  glyph: 'start',  solid: false, walkable: true });
  add({ id:  2, family: 'terrain', name: 'goal',   glyph: 'goal',   solid: false, walkable: true,
       behavior: 'goal' });
  add({ id:  3, family: 'terrain', name: 'wall',   glyph: 'wall',   solid: true,  walkable: false });
  add({ id:  4, family: 'terrain', name: 'void',   glyph: 'void',   solid: false, walkable: true });
  // 5 reserved (terrain variants)
  // 6,7 retired (V4 one-way arrows)
  // 8,9 reserved

  /* ===== BARRIER (phase_wall) ============================================ */
  // §7.1: solid iff locked. Lock driven by `link`.
  // Ships CLOSED on link 1, which is the link `link_key` drives by default.

  add({ id: 10, family: 'barrier', name: 'phase_wall', glyph: 'phaseWall',
       solid: 'locked', walkable: 'unlocked',
       params: { link: 1, defaultLocked: true } });

  /* ===== AURA (prism) ==================================================== */
  // §7.2: sets P on contact. colour ∈ {red,gre,blu}.

  add({ id: 11, family: 'aura', name: 'prism_red', glyph: 'prism',
       solid: false, walkable: true, behavior: 'setPlayerColour',
       params: { colour: 'red' } });
  add({ id: 12, family: 'aura', name: 'prism_gre', glyph: 'prism',
       solid: false, walkable: true, behavior: 'setPlayerColour',
       params: { colour: 'gre' } });
  add({ id: 13, family: 'aura', name: 'prism_blu', glyph: 'prism',
       solid: false, walkable: true, behavior: 'setPlayerColour',
       params: { colour: 'blu' } });
  // 14 reserved (prism variant)

  /* ===== GATES =========================================================== */
  // §7.3: solid iff locked; unlocked requires the named carrier === colour.
  //
  // link: 0 means "not wired into the switch network". Colour gates ship with
  // link 0 / defaultLocked false, so out of the box they are a PURE COLOUR
  // TEST — open, but refusing the wrong carrier. Wiring a gate to a link is an
  // authoring decision made in the level's overrides, and buildLevel then
  // makes it default to CLOSED (see sm-rules.js buildLevel).

  add({ id: 30, family: 'gate', name: 'aura_gate_wht', glyph: 'auraGate',
       solid: 'locked', walkable: 'unlocked',
       params: { link: 0, carrier: 'P', colour: 'wht', defaultLocked: false } });
  add({ id: 31, family: 'gate', name: 'aura_gate_red', glyph: 'auraGate',
       solid: 'locked', walkable: 'unlocked',
       params: { link: 0, carrier: 'P', colour: 'red', defaultLocked: false } });
  add({ id: 32, family: 'gate', name: 'aura_gate_gre', glyph: 'auraGate',
       solid: 'locked', walkable: 'unlocked',
       params: { link: 0, carrier: 'P', colour: 'gre', defaultLocked: false } });
  add({ id: 33, family: 'gate', name: 'aura_gate_blu', glyph: 'auraGate',
       solid: 'locked', walkable: 'unlocked',
       params: { link: 0, carrier: 'P', colour: 'blu', defaultLocked: false } });

  add({ id: 34, family: 'gate', name: 'world_gate_red', glyph: 'worldGate',
       solid: 'locked', walkable: 'unlocked',
       params: { link: 0, carrier: 'W', colour: 'red', defaultLocked: false } });
  add({ id: 35, family: 'gate', name: 'world_gate_gre', glyph: 'worldGate',
       solid: 'locked', walkable: 'unlocked',
       params: { link: 0, carrier: 'W', colour: 'gre', defaultLocked: false } });
  add({ id: 36, family: 'gate', name: 'world_gate_blu', glyph: 'worldGate',
       solid: 'locked', walkable: 'unlocked',
       params: { link: 0, carrier: 'W', colour: 'blu', defaultLocked: false } });

  // 37–39 reserved (gate variants)

  /* ===== SWITCHES ======================================================== */
  // §7.4 / §8.  family='switch' is the player-occupancy kind.
  // Sensors (family='sensor') are in the next section.

  add({ id: 40, family: 'switch', name: 'plate', glyph: 'switch',
       solid: false, walkable: true, params: { mode: 'momentary', scope: 'tagged', link: 1 } });
  add({ id: 41, family: 'switch', name: 'link_key', glyph: 'switch',
       solid: false, walkable: true, behavior: 'toggleLatched',
       params: { mode: 'toggle',    scope: 'tagged', link: 1 } });
  add({ id: 42, family: 'switch', name: 'link_plate', glyph: 'switch',
       solid: false, walkable: true,
       params: { mode: 'momentary', scope: 'tagged', link: 1 } });
  add({ id: 44, family: 'switch', name: 'master_lock', glyph: 'master',
       solid: false, walkable: true, behavior: 'toggleLatched',
       params: { mode: 'toggle',    scope: 'global', key: 'master_lock' } });
  // 43 = receiver (sensor family, see below)
  // 45 = master_void — DEFERRED
  add({ id: 45, family: 'barrier', name: 'master_void', glyph: 'master',
       solid: 'deferred', walkable: 'deferred',
       params: { scope: 'global', key: 'master_void' }, implemented: false });

  /* ===== SENSORS (crate-adjacency) ======================================= */
  // §8.3.  family='sensor' so the resolver knows to query crate adjacency.

  add({ id: 50, family: 'sensor', name: 'receiver', glyph: 'receiver',
       solid: false, walkable: true,
       params: { mode: 'sensor', scope: 'tagged', link: 1, colour: 'red' } });
  // (Coloured sensor variants are produced by overrides; the default ID 50
  //  is the canonical "sensor" with colour:red so the level-specific colour
  //  is driven by overrides.colour. See §10.2 and the loader V1.)

  // 51–59 reserved

  /* ===== FLOW (belts) ==================================================== */
  // §7.6.  All belts are one-way; cycles are constructed by chaining.

  // 60..63 — crate belts (push a crate forward as part of §5.2)
  add({ id: 60, family: 'flow', name: 'crate_east',  glyph: 'belt', solid: false, walkable: true,
       params: { dir: { x:  1, y:  0 }, kind: 'crate' } });
  add({ id: 61, family: 'flow', name: 'crate_west',  glyph: 'belt', solid: false, walkable: true,
       params: { dir: { x: -1, y:  0 }, kind: 'crate' } });
  add({ id: 62, family: 'flow', name: 'crate_north', glyph: 'belt', solid: false, walkable: true,
       params: { dir: { x:  0, y:  1 }, kind: 'crate' } });
  add({ id: 63, family: 'flow', name: 'crate_south', glyph: 'belt', solid: false, walkable: true,
       params: { dir: { x:  0, y: -1 }, kind: 'crate' } });

  // 64..67 — player belts (move the player)
  add({ id: 64, family: 'flow', name: 'player_east',  glyph: 'belt', solid: false, walkable: true,
       params: { dir: { x:  1, y:  0 }, kind: 'player' } });
  add({ id: 65, family: 'flow', name: 'player_west',  glyph: 'belt', solid: false, walkable: true,
       params: { dir: { x: -1, y:  0 }, kind: 'player' } });
  add({ id: 66, family: 'flow', name: 'player_north', glyph: 'belt', solid: false, walkable: true,
       params: { dir: { x:  0, y:  1 }, kind: 'player' } });
  add({ id: 67, family: 'flow', name: 'player_south', glyph: 'belt', solid: false, walkable: true,
       params: { dir: { x:  0, y: -1 }, kind: 'player' } });

  // 68..69 reserved

  /* ===== CRATES ========================================================== */
  // §7.7.  Colour comes from overrides; default red (50) is a sane default.

  add({ id: 70, family: 'crate', name: 'crate_wht', glyph: 'crate',
       solid: true, walkable: false, pushable: true,
       params: { colour: 'wht' } });
  add({ id: 71, family: 'crate', name: 'crate_red', glyph: 'crate',
       solid: true, walkable: false, pushable: true,
       params: { colour: 'red' } });
  add({ id: 72, family: 'crate', name: 'crate_gre', glyph: 'crate',
       solid: true, walkable: false, pushable: true,
       params: { colour: 'gre' } });
  add({ id: 73, family: 'crate', name: 'crate_blu', glyph: 'crate',
       solid: true, walkable: false, pushable: true,
       params: { colour: 'blu' } });

  // 74–79 reserved

  /* ===== PORTALS ========================================================= */
  // §7.8.  Portals come in matching pairs (link id).

  add({ id: 80, family: 'portal', name: 'portal', glyph: 'portal',
       solid: false, walkable: true, behavior: 'teleport',
       params: { link: 0 } });

  // 81–89 reserved

  /* ===== ACTUATORS (colour-changing tiles) =============================== */
  // §7.9.  cycle_dial and cycle_reset drive W (T1).
  //         set_dial sets W to a fixed colour if its link is currently
  //         satisfied (T2).  id 11/12/13 (prisms) set P (T3).

  add({ id: 20, family: 'actuator', name: 'cycle_dial', glyph: 'cycleDial',
       solid: false, walkable: true, behavior: 'advanceWorld',
       params: {} });
  add({ id: 21, family: 'actuator', name: 'cycle_reset', glyph: 'cycleReset',
       solid: false, walkable: true, behavior: 'resetWorld',
       params: {} });
  add({ id: 22, family: 'actuator', name: 'set_dial', glyph: 'setDial',
       solid: false, walkable: true, behavior: 'setWorldIfLinked',
       params: { link: 1, colour: 'red' } });

  // 23–29 reserved

  /* ===== ID reservations beyond the catalogue ============================ */
  // (none — gaps above are intentional for future expansion)

  /* ---------------------------------------------------------------------- */
  /* Behaviour handlers (called by sm-rules during onEnter).                */
  /* They mutate the provided state.  No DOM.  No async.                    */
  /* ---------------------------------------------------------------------- */

  SM.runBehavior = function (name, ctx) {
    switch (name) {
      case 'goal':              return ctx.engine.checkGoal(ctx);
      case 'setPlayerColour':   ctx.state.P = ctx.inst.params.colour; return;
      case 'advanceWorld':      ctx.engine.advanceWorld(ctx);          return;
      case 'resetWorld':        ctx.state.W = 'wht';                   return;
      case 'setWorldIfLinked':  ctx.engine.setWorldIfLinked(ctx);      return;
      case 'toggleLatched':     ctx.engine.toggleLatched(ctx);         return;
      case 'teleport':          ctx.engine.teleport(ctx);              return;
      // null behaviour (e.g. default floor) is a no-op
      case null: case undefined: return;
      default:
        throw new Error('SM.runBehavior: unknown behaviour "' + name + '"');
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Glyphs                                                                  */
  /* ---------------------------------------------------------------------- */
  // All glyphs are returned as an SVG string. 24x24 viewBox.
  // Branches on inst.family, not on tile id (S7).

  function hexPath(size, flat) {
    // Pointy-top (size=0) or flat-top (size=1) regular hexagon, inscribed in 24x24.
    var pts;
    if (flat) {
      pts = [[2, 12], [7, 3], [17, 3], [22, 12], [17, 21], [7, 21]];
    } else {
      pts = [[12, 2], [21, 7], [21, 17], [12, 22], [3, 17], [3, 7]];
    }
    return 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L') + ' Z';
  }

  function pips(n, col) {
    // §19: count ceiling 4, link ≥5 encoded as ring-with-centre-dot.
    if (n === undefined || n === null) {
      return '<circle cx="12" cy="12" r="1.6" fill="' + col + '"/>';
    }
    if (n >= 5) {
      return '<circle cx="12" cy="12" r="6" fill="none" stroke="' + col + '" stroke-width="2"/>' +
             '<circle cx="12" cy="12" r="1.6" fill="' + col + '"/>';
    }
    if (n <= 0) {
      return '<circle cx="12" cy="12" r="1.8" fill="' + col + '"/>';
    }
    var gap = 5;
    var startX = 12 - (n - 1) * gap / 2;
    var s = '';
    for (var i = 0; i < n; i++) {
      s += '<circle cx="' + (startX + i * gap) + '" cy="12" r="1.7" fill="' + col + '"/>';
    }
    return s;
  }

  function beltGlyph(dir) {
    // Three chevrons along the axis. Hardcoded for the 4 cardinal directions
    // so the path data is unambiguous and pre-tested.
    if (dir.x > 0) {
      return '<path d="M6 7 L11 12 L6 17" stroke-width="2" fill="none"/>' +
             '<path d="M11 7 L16 12 L11 17" stroke-width="2" fill="none"/>' +
             '<path d="M16 7 L21 12 L16 17" stroke-width="2" fill="none"/>';
    }
    if (dir.x < 0) {
      return '<path d="M18 7 L13 12 L18 17" stroke-width="2" fill="none"/>' +
             '<path d="M13 7 L8  12 L13 17" stroke-width="2" fill="none"/>' +
             '<path d="M8  7 L3  12 L8  17" stroke-width="2" fill="none"/>';
    }
    if (dir.y > 0) {
      return '<path d="M7 18 L12 13 L17 18" stroke-width="2" fill="none"/>' +
             '<path d="M7 13 L12 8  L17 13" stroke-width="2" fill="none"/>' +
             '<path d="M7 8  L12 3  L17 8"  stroke-width="2" fill="none"/>';
    }
    return '<path d="M7 6  L12 11 L17 6"  stroke-width="2" fill="none"/>' +
           '<path d="M7 11 L12 16 L17 11" stroke-width="2" fill="none"/>' +
           '<path d="M7 16 L12 21 L17 16" stroke-width="2" fill="none"/>';
  }

  function squareBacking(col, locked) {
    if (locked) {
      return '<rect x="2" y="2" width="20" height="20" fill="' + col + '" fill-opacity="0.22" ' +
             'stroke="' + col + '" stroke-width="2" stroke-opacity="1"/>';
    }
    return '<rect x="2" y="2" width="20" height="20" fill="none" ' +
           'stroke="' + col + '" stroke-width="2" stroke-opacity="0.35"/>';
  }

  function chevronMark(dx, dy) {
    return 'M' + (12 - 2.5 * dy - 1.5 * dx) + ' ' + (12 + 2.5 * dx - 1.5 * dy) +
           ' L12 12 L' + (12 - 2.5 * dy + 1.5 * dx) + ' ' + (12 + 2.5 * dx + 1.5 * dy);
  }

  SM.glyph = function (inst, state) {
    var family = inst.family;
    var params = inst.params || {};
    var colour = params.colour || (state && state.W) || 'wht';
    var colHex = SM.PALETTE[colour] || SM.PALETTE.wht;
    var s = state || {};

    switch (family) {

      case 'terrain':
        switch (inst.name) {
          case 'wall':
            return '<rect x="1" y="1" width="22" height="22" fill="' + SM.PALETTE.blk + '" ' +
                   'stroke="' + SM.PALETTE.mute + '" stroke-width="1"/>';
          case 'goal':
            return '<circle cx="12" cy="12" r="9" fill="none" stroke="' + colHex + '" stroke-width="2"/>' +
                   '<circle cx="12" cy="12" r="4" fill="' + colHex + '"/>';
          case 'start':
            return '<rect x="9.5" y="9.5" width="5" height="5" fill="none" ' +
                   'stroke="' + SM.PALETTE.mute + '" stroke-width="1" stroke-opacity="0.6"/>';
          case 'void':
            return '';  // transparent — only the player avatar is drawn
          case 'floor':
          default:
            return '';
        }

      case 'barrier': {
        // 10 phase_wall — solid square, filled while locked
        if (inst.name === 'master_void') {
          return '<rect x="2" y="2" width="20" height="20" fill="none" ' +
                 'stroke="' + SM.PALETTE.mute + '" stroke-width="1" stroke-dasharray="3 3"/>' +
                 '<text x="12" y="16" text-anchor="middle" font-size="10" ' +
                 'fill="' + SM.PALETTE.mute + '">v2</text>';
        }
        var locked = !!s.locked;
        return squareBacking(SM.PALETTE.wht, locked);
      }

      case 'aura':
        return '<circle cx="12" cy="12" r="8" fill="' + colHex + '"/>';

      case 'gate': {
        // Disc / ring inner mark distinguishes aura- vs world- gates (S4).
        var innerMark;
        if (/^aura_/.test(inst.name)) {
          innerMark = '<circle cx="12" cy="12" r="5" fill="' + colHex + '"/>';
        } else {
          innerMark = '<circle cx="12" cy="12" r="5" fill="none" ' +
                      'stroke="' + colHex + '" stroke-width="2"/>';
        }
        return squareBacking(colHex, !!s.locked) + innerMark;
      }

      case 'switch': {
        if (inst.name === 'master_lock') {
          // Master lock: ring with keyhole notch
          return '<path d="' + hexPath(0) + '" fill="none" stroke="' + SM.PALETTE.wht +
                 '" stroke-width="2" stroke-opacity="' + (s.latched ? 1 : 0.4) + '"/>' +
                 '<circle cx="12" cy="10" r="2" fill="' + SM.PALETTE.wht +
                 '" fill-opacity="' + (s.latched ? 1 : 0.4) + '"/>' +
                 '<rect x="11" y="11" width="2" height="5" fill="' + SM.PALETTE.wht +
                 '" fill-opacity="' + (s.latched ? 1 : 0.4) + '"/>';
        }
        var on = !!s.active;
        var opacity = on ? 1 : 0.4;
        var dot = pips((params.link | 0) || 0, SM.PALETTE.wht);
        return '<path d="' + hexPath(0) + '" fill="' + SM.PALETTE.wht +
               '" fill-opacity="' + (on ? 0.25 : 0) + '" stroke="' + SM.PALETTE.wht +
               '" stroke-width="2" stroke-opacity="' + opacity + '"/>' + dot;
      }

      case 'sensor': {
        // 50 receiver — flat-top hexagon with 4 cardinal dots, lit per
        // crate-adjacency (B11 / §8.3).
        var lit = s.lit || {};
        var dotR = 1.8;
        return '<path d="' + hexPath(1) + '" fill="none" stroke="' + colHex +
               '" stroke-width="2" stroke-opacity="' + (s.active ? 1 : 0.4) + '"/>' +
               '<circle cx="12"  cy="2"  r="' + dotR + '" fill="' +
               (lit.n ? colHex : SM.PALETTE.mute) + '"/>' +
               '<circle cx="22"  cy="12" r="' + dotR + '" fill="' +
               (lit.e ? colHex : SM.PALETTE.mute) + '"/>' +
               '<circle cx="12"  cy="22" r="' + dotR + '" fill="' +
               (lit.s ? colHex : SM.PALETTE.mute) + '"/>' +
               '<circle cx="2"   cy="12" r="' + dotR + '" fill="' +
               (lit.w ? colHex : SM.PALETTE.mute) + '"/>';
      }

      case 'flow': {
        return beltGlyph(params.dir || { x: 1, y: 0 });
      }

      case 'crate':
        return '<rect x="2" y="2" width="20" height="20" fill="' + colHex +
               '" fill-opacity="0.18" stroke="' + colHex + '" stroke-width="2"/>' +
               '<path d="M2 2 L22 22 M22 2 L2 22" stroke="' + colHex + '" stroke-width="2"/>';

      case 'portal':
        return '<circle cx="12" cy="12" r="9" fill="none" stroke="' + colHex + '" stroke-width="2"/>' +
               '<circle cx="12" cy="12" r="4" fill="none" stroke="' + colHex + '" stroke-width="2"/>';

      case 'actuator':
        if (inst.name === 'cycle_dial') {
          // Triangle + 3 ring dots, current W highlighted.
          var w = s.W || 'wht';
          var slots = ['red', 'gre', 'blu'];
          return '<path d="M12 4 L21 19 L3 19 Z" fill="none" stroke="' +
                 SM.PALETTE.wht + '" stroke-width="2"/>' +
                 '<circle cx="12" cy="2.5" r="1.8" fill="' + SM.PALETTE.red +
                 '" fill-opacity="' + (w === 'red' ? 1 : 0.25) + '"/>' +
                 '<circle cx="21" cy="20"  r="1.8" fill="' + SM.PALETTE.gre +
                 '" fill-opacity="' + (w === 'gre' ? 1 : 0.25) + '"/>' +
                 '<circle cx="3"  cy="20"  r="1.8" fill="' + SM.PALETTE.blu +
                 '" fill-opacity="' + (w === 'blu' ? 1 : 0.25) + '"/>';
        }
        if (inst.name === 'cycle_reset') {
          return '<rect x="4" y="4" width="16" height="16" fill="none" stroke="' +
                 SM.PALETTE.wht + '" stroke-width="2" stroke-opacity="0.5"/>' +
                 '<circle cx="12" cy="12" r="1.6" fill="none" stroke="' +
                 SM.PALETTE.wht + '" stroke-width="1.5" stroke-opacity="0.7"/>';
        }
        if (inst.name === 'set_dial') {
          return '<path d="M12 4 L21 19 L3 19 Z" fill="none" stroke="' +
                 SM.PALETTE.wht + '" stroke-width="2"/>' +
                 '<circle cx="12" cy="12" r="1.8" fill="' + colHex + '"/>';
        }
        return '';

      default:
        return '<rect x="1" y="1" width="22" height="22" fill="none" stroke="' +
               SM.PALETTE.mute + '" stroke-width="1" stroke-dasharray="2 2"/>';
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Export + hot-reload                                                     */
  /* ---------------------------------------------------------------------- */

  SM.TILES = TILES;
  SM.BEHAVIORS = BEHAVIORS;

  // P3 — hot-reloadable registry. The resolver always reads through this
  // indirection so a swap takes effect for the NEXT resolveTurn.
  var ACTIVE = TILES;
  SM.getTile = function (id) { return ACTIVE[id]; };
  SM.setTileRegistry = function (next) {
    if (!next) throw new Error('SM.setTileRegistry: registry is required');
    ACTIVE = next;
  };

  // Default reference for tests / external readers
  SM.getActiveRegistry = function () { return ACTIVE; };

})(typeof window !== 'undefined' ? window : globalThis);
