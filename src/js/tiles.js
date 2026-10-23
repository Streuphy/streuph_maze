/* =========================================================================
 * tiles.js  —  STREUPH'S MAZE
 * Tile catalogue, rule strategies, and synchronous behavior handlers.
 *
 * Architectural rules:
 *   * tiles.js is RE-ENTRANT: a setter exists for swapping the catalogue at
 *     runtime. Resolution functions read SM.TILES through a stable indirection
 *     so a hot-reload takes effect for the NEXT resolveTurn (P3, §12.1).
 *   * `family` and `name` are descriptive only; rules use explicit strategy
 *     hooks and stable IDs remain data identities, never dispatch cases.
 *   * `state` is generated from strategy contracts so every registered tile
 *     exposes its canonical reads, writes, events, and lifecycle hooks.
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
  SM.GAME_COLOURS = Object.freeze(['wht', 'red', 'gre', 'blu']);
  SM.W_COLOURS = SM.GAME_COLOURS;
  SM.P_COLOURS = SM.GAME_COLOURS;

  /* ---------------------------------------------------------------------- */
  /* Catalogue                                                              */
  /* ---------------------------------------------------------------------- */

  var TILES = {};

  // Human-facing presentation descriptors are data, never rule callbacks.
  // UI code formats the placeholders from the read-only tile description.
  var PRESENTATION = Object.freeze({
    generic: { inspection: 'No additional effect.', codex: 'Registered tile.' },
    floor: { inspection: 'Walkable floor.', codex: 'Walkable, ordinary floor.' },
    start: { inspection: 'Authored start and respawn location.', codex: 'Start and safe respawn point.' },
    goal: { inspection: 'Goal; win when player and world colours match.', codex: 'Exit; requires matching player/world colours.' },
    wall: { inspection: 'Always solid; blocks movement and rays.', codex: 'Solid wall; blocks movement and line of sight.' },
    void: { inspection: 'Passable unless the master void switch is latched.', codex: 'Passage becomes a wall while master void is active.' },
    ice: { inspection: 'Slides entities in their incoming direction.', codex: 'Slides in the entering direction; belts set their own direction.' },
    phaseWall: { inspection: 'Solid while locked; linked signal {link}.', codex: 'Link {link}; solid while locked.' },
    prism: { inspection: 'Sets player colour to {colour}.', codex: 'Sets the player carrier to {colour} on entry.' },
    auraGate: { inspection: 'Requires {carrierLabel} colour {colour}; currently {lockLabel}.', codex: 'Player-colour gate; requires {colour}.' },
    worldGate: { inspection: 'Requires {carrierLabel} colour {colour}; currently {lockLabel}.', codex: 'World-colour gate; requires {colour}.' },
    plate: { inspection: 'Player-occupancy {mode} signal on {scope} link {link}; currently {activeLabel}.', codex: 'Momentary player-occupancy link {link}.' },
    key: { inspection: 'Toggle {scope} link {link}; currently {latchLabel}.', codex: 'Latches link {link} on entry or ACT.' },
    masterLock: { inspection: 'Global lock override; currently {latchLabel}.', codex: 'When latched, closes every lock-controlled tile.' },
    masterVoid: { inspection: 'Toggles ordinary void tiles; currently {latchLabel}.', codex: 'When latched, ordinary void cells become solid.' },
    polarityRedBarrier: {
      inspection: 'Red polarity barrier; currently {solidLabel} under {polarityLabel}.',
      codex: 'Red barrier class; open only while the global polarity is red-open.',
      polarityClass: 'red'
    },
    polarityBlueBarrier: {
      inspection: 'Blue polarity barrier; currently {solidLabel} under {polarityLabel}.',
      codex: 'Blue barrier class; open only while the global polarity is blue-open.',
      polarityClass: 'blu'
    },
    polaritySwitch: {
      inspection: 'Crystal switch; global polarity is {polarityLabel}. Press ACT to flip it.',
      codex: 'ACT flips the level-wide red-open / blue-open barrier polarity.',
      polaritySwitch: true
    },
    receiver: { inspection: 'Detects adjacent {colour} crates on link {link}; currently {activeLabel}.', codex: 'Lights when a matching crate is orthogonally adjacent.' },
    target: { inspection: 'movable floor target; link {link}; currently {activeLabel}.', codex: 'Momentary link {link}; active only while a crate occupies it.' },
    crateBelt: { inspection: 'Crate belt carries compatible objects {direction}.', codex: 'Crate-force belt directed {direction}.' },
    playerBelt: { inspection: 'Player belt carries the player {direction}.', codex: 'Player belt directed {direction}.' },
    crate: { inspection: 'Movable crate; {mobilityLabel}; colour {colour}.', codex: 'Movable {colour} crate; profile controls movement and ray interaction.' },
    portal: { inspection: 'Player portal; matching link {link}.', codex: 'Teleports the player to a matching portal link.' },
    ray: {
      inspection: 'static ray points {direction}; {rayCount} unobstructed cells. Stops at walls, crates, and closed barriers.',
      codex: 'Static {direction} ray · crates shield it',
      rayEmitter: true,
      tutorial: '<p><strong>Line of sight:</strong> Rays are static and resolve on turns. Push a crate into a ray to shield cells beyond it. If caught after an action, you return to the start for that one stroke; crates and switches remain, and undo restores the turn. There is no timer or sweeping beam.</p>'
    },
    cycleDial: { inspection: 'Advances world colour on entry or ACT.', codex: 'Advances world colour: white → red → green → blue → red.' },
    cycleReset: { inspection: 'Resets world colour to white on entry or ACT.', codex: 'Sets world colour to white.' },
    setDial: { inspection: 'Sets world colour to {colour} while link {link} is active.', codex: 'Sets configured world colour when a signal on its link is active.' }
  });

  function add(def) {
    if (Object.prototype.hasOwnProperty.call(TILES, def.id)) {
      throw new Error('SM.TILES: duplicate stable tile ID ' + def.id);
    }
    if (!def.params) def.params = {};
    if (!def.strategies) def.strategies = {};
    // Presentation metadata is display-only and never participates in rules.
    var presentationKey = def.presentationKey || 'generic';
    def.presentation = Object.assign({}, PRESENTATION.generic,
      PRESENTATION[presentationKey] || {}, { motion: 'static', key: presentationKey },
      def.presentation || {});
    TILES[def.id] = def;
  }

  // The player marker is an animated display entity, not a gameplay tile.
  SM.PLAYER_PRESENTATION = Object.freeze({
    motion: 'animated', animation: 'pulse8', frames: 8, frameMs: 250
  });

  /* ===== TERRAIN ========================================================= */

  add({ id:  0, family: 'terrain', name: 'floor',  glyph: 'floor',  solid: false, walkable: true,
       presentationKey: 'floor' });
  add({ id:  1, family: 'terrain', name: 'start',  glyph: 'start',  solid: false, walkable: true,
       levelRole: 'start', presentationKey: 'start' });
  add({ id:  2, family: 'terrain', name: 'goal',   glyph: 'goal',   solid: false, walkable: true,
       levelRole: 'goal', presentationKey: 'goal', strategies: { onEnter: 'goal', onAct: 'goal' } });
  add({ id:  3, family: 'terrain', name: 'wall',   glyph: 'wall',   solid: true,  walkable: false,
       presentationKey: 'wall', strategies: { passability: 'solidTrait' } });
  add({ id:  4, family: 'terrain', name: 'void',   glyph: 'void',   solid: 'phaseVoid', walkable: 'phaseVoid',
       presentationKey: 'void', strategies: { passability: 'masterVoid' } });
  add({ id:  5, family: 'terrain', name: 'ice',    glyph: 'ice',    solid: false, walkable: true,
       presentationKey: 'ice', strategies: { forcedMovement: 'incomingIce' } });
  // 6,7 retired (V4 one-way arrows)
  // 8,9 reserved

  /* ===== BARRIER (phase_wall) ============================================ */
  // §7.1: solid iff locked. Lock driven by `link`.
  // Ships CLOSED on link 1, which is the link `link_key` drives by default.

   add({ id: 10, family: 'barrier', name: 'phase_wall', glyph: 'phaseWall',
        solid: 'locked', walkable: 'unlocked',
         params: { link: 1, defaultLocked: true }, presentationKey: 'phaseWall', strategies: { passability: 'lockedBarrier' } });
   add({ id: 26, family: 'barrier', name: 'phase_wall_link_2', glyph: 'phaseWall',
        solid: 'locked', walkable: 'unlocked',
         params: { link: 2, defaultLocked: true }, presentationKey: 'phaseWall', strategies: { passability: 'lockedBarrier' } });
   add({ id: 27, family: 'barrier', name: 'phase_wall_link_3', glyph: 'phaseWall',
        solid: 'locked', walkable: 'unlocked',
         params: { link: 3, defaultLocked: true }, presentationKey: 'phaseWall', strategies: { passability: 'lockedBarrier' } });

  /* ===== AURA (prism) ==================================================== */
  // §7.2: sets P on contact. colour ∈ {red,gre,blu}.

  add({ id: 11, family: 'aura', name: 'prism_red', glyph: 'prism',
       solid: false, walkable: true,
       presentationKey: 'prism',
       strategies: { onEnter: 'setPlayerColour', onAct: 'setPlayerColour' },
       params: { colour: 'red' } });
  add({ id: 12, family: 'aura', name: 'prism_gre', glyph: 'prism',
       solid: false, walkable: true,
       presentationKey: 'prism',
       strategies: { onEnter: 'setPlayerColour', onAct: 'setPlayerColour' },
       params: { colour: 'gre' } });
  add({ id: 13, family: 'aura', name: 'prism_blu', glyph: 'prism',
       solid: false, walkable: true,
       presentationKey: 'prism',
       strategies: { onEnter: 'setPlayerColour', onAct: 'setPlayerColour' },
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
        params: { link: 0, carrier: 'P', colour: 'wht', defaultLocked: false },
        presentationKey: 'auraGate', strategies: { passability: 'colourGate' } });
  add({ id: 31, family: 'gate', name: 'aura_gate_red', glyph: 'auraGate',
       solid: 'locked', walkable: 'unlocked',
        params: { link: 0, carrier: 'P', colour: 'red', defaultLocked: false },
        presentationKey: 'auraGate', strategies: { passability: 'colourGate' } });
  add({ id: 32, family: 'gate', name: 'aura_gate_gre', glyph: 'auraGate',
       solid: 'locked', walkable: 'unlocked',
        params: { link: 0, carrier: 'P', colour: 'gre', defaultLocked: false },
        presentationKey: 'auraGate', strategies: { passability: 'colourGate' } });
  add({ id: 33, family: 'gate', name: 'aura_gate_blu', glyph: 'auraGate',
       solid: 'locked', walkable: 'unlocked',
        params: { link: 0, carrier: 'P', colour: 'blu', defaultLocked: false },
        presentationKey: 'auraGate', strategies: { passability: 'colourGate' } });

  add({ id: 34, family: 'gate', name: 'world_gate_red', glyph: 'worldGate',
       solid: 'locked', walkable: 'unlocked',
        params: { link: 0, carrier: 'W', colour: 'red', defaultLocked: false },
        presentationKey: 'worldGate', strategies: { passability: 'colourGate' } });
  add({ id: 35, family: 'gate', name: 'world_gate_gre', glyph: 'worldGate',
       solid: 'locked', walkable: 'unlocked',
        params: { link: 0, carrier: 'W', colour: 'gre', defaultLocked: false },
        presentationKey: 'worldGate', strategies: { passability: 'colourGate' } });
  add({ id: 36, family: 'gate', name: 'world_gate_blu', glyph: 'worldGate',
       solid: 'locked', walkable: 'unlocked',
        params: { link: 0, carrier: 'W', colour: 'blu', defaultLocked: false },
        presentationKey: 'worldGate', strategies: { passability: 'colourGate' } });

  // 37–39 reserved (gate variants)

  /* ===== SWITCHES ======================================================== */
  // §7.4 / §8.  family='switch' is the player-occupancy kind.
  // Sensors (family='sensor') are in the next section.

  add({ id: 40, family: 'switch', name: 'plate', glyph: 'switch',
       solid: false, walkable: true, params: { mode: 'momentary', scope: 'tagged', link: 1 },
       presentationKey: 'plate', strategies: { activation: 'playerOccupancy' } });
  add({ id: 41, family: 'switch', name: 'link_key', glyph: 'switch',
       solid: false, walkable: true,
       presentationKey: 'key',
       params: { mode: 'toggle',    scope: 'tagged', link: 1 },
       strategies: { onEnter: 'toggleLatched', onAct: 'toggleLatched', activation: 'toggleLatch' } });
  add({ id: 42, family: 'switch', name: 'link_plate', glyph: 'switch',
       solid: false, walkable: true,
       params: { mode: 'momentary', scope: 'tagged', link: 1 },
       presentationKey: 'plate', strategies: { activation: 'playerOccupancy' } });
  add({ id: 44, family: 'switch', name: 'master_lock', glyph: 'master',
       solid: false, walkable: true,
       params: { mode: 'toggle',    scope: 'global', key: 'master_lock' },
       presentationKey: 'masterLock', strategies: { onEnter: 'toggleLatched', onAct: 'toggleLatched', activation: 'toggleLatch' } });
  // 43 = receiver (sensor family, see below)
  // A latched global switch flips ordinary void tiles between floor and wall.
  add({ id: 45, family: 'switch', name: 'master_void', glyph: 'master',
       solid: false, walkable: true,
       params: { mode: 'toggle', scope: 'global', key: 'master_void' },
       presentationKey: 'masterVoid', strategies: { onEnter: 'toggleLatched', onAct: 'toggleLatched', activation: 'toggleLatch' } });

   // World 3 polarity barriers use a level-wide state, not color carriers or
   // the existing linked/master switch network. ID 49 remains reserved.
   add({ id: 46, family: 'barrier', name: 'polarity_barrier_red', glyph: 'polarityRed',
        solid: 'polarity', walkable: 'polarity', params: { openWhen: 'red-open' },
        presentationKey: 'polarityRedBarrier', strategies: { passability: 'binaryPolarityBarrier' } });
   add({ id: 47, family: 'barrier', name: 'polarity_barrier_blue', glyph: 'polarityBlue',
        solid: 'polarity', walkable: 'polarity', params: { openWhen: 'blue-open' },
        presentationKey: 'polarityBlueBarrier', strategies: { passability: 'binaryPolarityBarrier' } });
   add({ id: 48, family: 'switch', name: 'polarity_switch', glyph: 'polaritySwitch',
        solid: false, walkable: true, params: {},
        presentationKey: 'polaritySwitch', strategies: { onAct: 'flipPolarity' } });

  /* ===== SENSORS (crate-adjacency) ======================================= */
  // §8.3.  family='sensor' so the resolver knows to query crate adjacency.

  add({ id: 50, family: 'sensor', name: 'receiver', glyph: 'receiver',
       solid: false, walkable: true,
       params: { mode: 'sensor', scope: 'tagged', link: 1, colour: 'red' },
       presentationKey: 'receiver', strategies: { activation: 'crateAdjacencySensor' } });
  // World 6 uses fixed variants because overrides are shared by every cell
  // with an ID. Keep ID 50 as red/link 1; IDs 90–100 complete the finite
  // color/link matrix for links 1–3 without adding per-cell behavior to YAML.
  [
    [90, 'gre', 1], [91, 'blu', 1], [92, 'wht', 1],
    [93, 'red', 2], [94, 'gre', 2], [95, 'blu', 2], [96, 'wht', 2],
    [97, 'red', 3], [98, 'gre', 3], [99, 'blu', 3], [100, 'wht', 3]
  ].forEach(function (variant) {
    add({ id: variant[0], family: 'sensor', name: 'receiver_' + variant[1] + '_link_' + variant[2],
      glyph: 'receiver', solid: false, walkable: true,
      params: { mode: 'sensor', scope: 'tagged', link: variant[2], colour: variant[1] },
      presentationKey: 'receiver', strategies: { activation: 'crateAdjacencySensor' } });
  });

  // 51–59 reserved

  /* ===== TARGETS (crate-occupancy) ======================================= */
  // A target is momentary and uses crate occupancy, unlike ID 50's adjacency.
  add({ id: 23, family: 'target', name: 'target_link_1', glyph: 'target',
        solid: false, walkable: true, entityRole: 'target',
        capabilities: { pushable: false, pullable: false, conveyor: false, portal: false, ray: 'ignore' },
        params: { mode: 'momentary', scope: 'tagged', link: 1 },
        presentationKey: 'target', strategies: { activation: 'targetCrateOccupancy' } });
  add({ id: 24, family: 'target', name: 'target_link_2', glyph: 'target',
        solid: false, walkable: true, entityRole: 'target',
        capabilities: { pushable: false, pullable: false, conveyor: false, portal: false, ray: 'ignore' },
        params: { mode: 'momentary', scope: 'tagged', link: 2 },
        presentationKey: 'target', strategies: { activation: 'targetCrateOccupancy' } });
  add({ id: 25, family: 'target', name: 'target_link_3', glyph: 'target',
        solid: false, walkable: true, entityRole: 'target',
        capabilities: { pushable: false, pullable: false, conveyor: false, portal: false, ray: 'ignore' },
        params: { mode: 'momentary', scope: 'tagged', link: 3 },
        presentationKey: 'target', strategies: { activation: 'targetCrateOccupancy' } });

  /* ===== FLOW (belts) ==================================================== */
  // §7.6.  All belts are one-way; cycles are constructed by chaining.

  // 60..63 — crate belts (push a crate forward as part of §5.2)
  add({ id: 60, family: 'flow', name: 'crate_east',  glyph: 'belt', solid: false, walkable: true,
       presentationKey: 'crateBelt', params: { dir: { x:  1, y:  0 }, kind: 'crate' }, strategies: { forcedMovement: 'directionalFlow' } });
  add({ id: 61, family: 'flow', name: 'crate_west',  glyph: 'belt', solid: false, walkable: true,
       presentationKey: 'crateBelt', params: { dir: { x: -1, y:  0 }, kind: 'crate' }, strategies: { forcedMovement: 'directionalFlow' } });
  add({ id: 62, family: 'flow', name: 'crate_north', glyph: 'belt', solid: false, walkable: true,
       presentationKey: 'crateBelt', params: { dir: { x:  0, y:  1 }, kind: 'crate' }, strategies: { forcedMovement: 'directionalFlow' } });
  add({ id: 63, family: 'flow', name: 'crate_south', glyph: 'belt', solid: false, walkable: true,
       presentationKey: 'crateBelt', params: { dir: { x:  0, y: -1 }, kind: 'crate' }, strategies: { forcedMovement: 'directionalFlow' } });

  // 64..67 — player belts (move the player)
  add({ id: 64, family: 'flow', name: 'player_east',  glyph: 'belt', solid: false, walkable: true,
       presentationKey: 'playerBelt', params: { dir: { x:  1, y:  0 }, kind: 'player' }, strategies: { forcedMovement: 'directionalFlow' } });
  add({ id: 65, family: 'flow', name: 'player_west',  glyph: 'belt', solid: false, walkable: true,
       presentationKey: 'playerBelt', params: { dir: { x: -1, y:  0 }, kind: 'player' }, strategies: { forcedMovement: 'directionalFlow' } });
  add({ id: 66, family: 'flow', name: 'player_north', glyph: 'belt', solid: false, walkable: true,
       presentationKey: 'playerBelt', params: { dir: { x:  0, y:  1 }, kind: 'player' }, strategies: { forcedMovement: 'directionalFlow' } });
  add({ id: 67, family: 'flow', name: 'player_south', glyph: 'belt', solid: false, walkable: true,
       presentationKey: 'playerBelt', params: { dir: { x:  0, y: -1 }, kind: 'player' }, strategies: { forcedMovement: 'directionalFlow' } });

  // 68..69 reserved

  /* ===== CRATES ========================================================== */
  // §7.7.  Colour comes from overrides; default red (50) is a sane default.

  add({ id: 70, family: 'crate', name: 'crate_wht', glyph: 'crate', entityRole: 'crate', presentationKey: 'crate',
       solid: true, walkable: false, pushable: true,
        capabilities: { pushable: true, pullable: false, conveyor: true, portal: false, ray: 'block' },
        params: { colour: 'wht' }, strategies: { rayInteraction: 'rayObjectProfile' } });
  add({ id: 71, family: 'crate', name: 'crate_red', glyph: 'crate', entityRole: 'crate', presentationKey: 'crate',
       solid: true, walkable: false, pushable: true,
        capabilities: { pushable: true, pullable: false, conveyor: true, portal: false, ray: 'block' },
        params: { colour: 'red' }, strategies: { rayInteraction: 'rayObjectProfile' } });
  add({ id: 72, family: 'crate', name: 'crate_gre', glyph: 'crate', entityRole: 'crate', presentationKey: 'crate',
       solid: true, walkable: false, pushable: true,
        capabilities: { pushable: true, pullable: false, conveyor: true, portal: false, ray: 'block' },
        params: { colour: 'gre' }, strategies: { rayInteraction: 'rayObjectProfile' } });
  add({ id: 73, family: 'crate', name: 'crate_blu', glyph: 'crate', entityRole: 'crate', presentationKey: 'crate',
       solid: true, walkable: false, pushable: true,
        capabilities: { pushable: true, pullable: false, conveyor: true, portal: false, ray: 'block' },
        params: { colour: 'blu' }, strategies: { rayInteraction: 'rayObjectProfile' } });

  // 74–79 reserved

  /* ===== PORTALS ========================================================= */
  // §7.8.  Portals come in matching pairs (link id).

  add({ id: 80, family: 'portal', name: 'portal', glyph: 'portal',
       solid: false, walkable: true,
       presentationKey: 'portal',
       params: { link: 0 }, strategies: {
         onEnter: 'teleport', onAct: 'teleport', forcedMovement: 'linkedPortal'
       } });

  // 81–84 — World 2 static cardinal ray emitters. Their immutable direction
  // is tile data; the rules layer traces the ray through the settled board.
  add({ id: 81, family: 'hazard', name: 'ray_north', glyph: 'rayNorth',
       solid: false, walkable: true, params: { dir: { x: 0, y: 1 } },
       presentationKey: 'ray',
       strategies: { rayInteraction: 'cardinalRayEmitter' },
       presentation: { motion: 'static', direction: 'north' } });
  add({ id: 82, family: 'hazard', name: 'ray_east', glyph: 'rayEast',
       solid: false, walkable: true, params: { dir: { x: 1, y: 0 } },
       presentationKey: 'ray',
       strategies: { rayInteraction: 'cardinalRayEmitter' },
       presentation: { motion: 'static', direction: 'east' } });
  add({ id: 83, family: 'hazard', name: 'ray_south', glyph: 'raySouth',
       solid: false, walkable: true, params: { dir: { x: 0, y: -1 } },
       presentationKey: 'ray',
       strategies: { rayInteraction: 'cardinalRayEmitter' },
       presentation: { motion: 'static', direction: 'south' } });
  add({ id: 84, family: 'hazard', name: 'ray_west', glyph: 'rayWest',
       solid: false, walkable: true, params: { dir: { x: -1, y: 0 } },
       presentationKey: 'ray',
       strategies: { rayInteraction: 'cardinalRayEmitter' },
       presentation: { motion: 'static', direction: 'west' } });

  /* ===== ACTUATORS (colour-changing tiles) =============================== */
  // §7.9.  cycle_dial and cycle_reset drive W (T1).
  //         set_dial sets W to a fixed colour if its link is currently
  //         satisfied (T2).  id 11/12/13 (prisms) set P (T3).

  add({ id: 20, family: 'actuator', name: 'cycle_dial', glyph: 'cycleDial',
       solid: false, walkable: true,
       presentationKey: 'cycleDial',
       strategies: { onEnter: 'advanceWorld', onAct: 'advanceWorld' },
       params: {} });
  add({ id: 21, family: 'actuator', name: 'cycle_reset', glyph: 'cycleReset',
       solid: false, walkable: true,
       presentationKey: 'cycleReset',
       strategies: { onEnter: 'resetWorld', onAct: 'resetWorld' },
       params: {} });
  add({ id: 22, family: 'actuator', name: 'set_dial', glyph: 'setDial',
       solid: false, walkable: true,
       presentationKey: 'setDial',
       strategies: { onEnter: 'setWorldIfLinked', onAct: 'setWorldIfLinked' },
       params: { link: 1, colour: 'red' } });

  // 28–29 reserved

  /* ===== ID reservations beyond the catalogue ============================ */
  // (none — gaps above are intentional for future expansion)

  /* ---------------------------------------------------------------------- */
  /* Behaviour handlers (called by sm-rules during onEnter).                */
  /* They mutate the provided state.  No DOM.  No async.                    */
  /* ---------------------------------------------------------------------- */

  /*
   * Canonical behavior contract manifest. `params` on a tile are the
   * parameter schema's defaults: names define the supported keys and each
   * default defines the expected value shape. These descriptors make handler
   * references and state access reviewable before execution; the named
   * strategy registry introduced below this manifest must keep this inventory
   * alongside its implementation.
   *
   * Reads/writes use canonical state paths, not private fields. Event names
   * are the ordered rule-result vocabulary consumed by the renderer.
   */
  var BEHAVIOR_CONTRACTS = Object.freeze({
    goal: Object.freeze({
      phases: Object.freeze(['onEnter', 'onAct']),
      reads: Object.freeze(['player', 'goal', 'P', 'W']),
      writes: Object.freeze(['won']),
      events: Object.freeze(['goal'])
    }),
    setPlayerColour: Object.freeze({
      phases: Object.freeze(['onEnter', 'onAct']),
      reads: Object.freeze(['tile.params.colour', 'P']),
      writes: Object.freeze(['P']),
      events: Object.freeze(['colour'])
    }),
    advanceWorld: Object.freeze({
      phases: Object.freeze(['onEnter', 'onAct']),
      reads: Object.freeze(['W', 'worldColourRing']),
      writes: Object.freeze(['W']),
      events: Object.freeze(['colour'])
    }),
    resetWorld: Object.freeze({
      phases: Object.freeze(['onEnter', 'onAct']),
      reads: Object.freeze([]),
      writes: Object.freeze(['W']),
      events: Object.freeze(['colour'])
    }),
    setWorldIfLinked: Object.freeze({
      phases: Object.freeze(['onEnter', 'onAct']),
      reads: Object.freeze(['switches', 'tile.params.link', 'tile.params.colour', 'W']),
      writes: Object.freeze(['W']),
      events: Object.freeze(['colour'])
    }),
    toggleLatched: Object.freeze({
      phases: Object.freeze(['onEnter', 'onAct']),
      reads: Object.freeze(['switches', 'tile', 'x', 'y']),
      writes: Object.freeze(['switches[].latched']),
      events: Object.freeze(['switch'])
    }),
    flipPolarity: Object.freeze({
      phases: Object.freeze(['onAct']),
      reads: Object.freeze(['polarity']),
      writes: Object.freeze(['polarity']),
      events: Object.freeze(['polarity'])
    }),
    teleport: Object.freeze({
      phases: Object.freeze(['onEnter', 'onAct']),
      reads: Object.freeze(['player', 'portals', 'tile.params.link']),
      writes: Object.freeze(['player']),
      events: Object.freeze(['teleport'])
    })
  });
  SM.TILE_BEHAVIOR_CONTRACTS = BEHAVIOR_CONTRACTS;

  /*
   * Rule-hook contract. The resolver chooses WHEN to invoke a hook; tile
   * strategies choose WHAT tile-specific result/descriptor applies. Every
   * hook is synchronous, deterministic, and DOM-free. Missing hooks return a
   * documented neutral value so ordinary tiles need no boilerplate handlers.
   *
   * context: { state, inst, x, y, phase, direction, crateAt, isLocked,
   *            masterVoidActive, sensorLit, switchAt }
   * Strategies are read-only queries/descriptors; only onEnter/onAct behavior
   * handlers may mutate canonical state through the legacy rules context.
   */
  var HOOK_DEFAULTS = Object.freeze({
    passability: null,       // no tile-specific restriction; use generic traits
    activation: false,       // no active signal
    onEnter: null,            // no entry effect
    onAct: null,              // no ACT effect
    forcedMovement: null,    // no automatic transport
    rayInteraction: null     // not an emitter/object ray rule
  });
  SM.TILE_HOOK_DEFAULTS = HOOK_DEFAULTS;

  var BEHAVIOR_HANDLERS = Object.freeze({
    goal: function (ctx) { return ctx.engine.checkGoal(ctx); },
    setPlayerColour: function (ctx) { ctx.state.P = ctx.inst.params.colour; },
    advanceWorld: function (ctx) {
      var index = SM.RING.indexOf(ctx.state.W);
      var next = index < 0 ? 'red' : SM.RING[(index + 1) % SM.RING.length];
      ctx.engine.setColour('W', next);
    },
    resetWorld: function (ctx) { ctx.engine.setColour('W', 'wht'); },
    setWorldIfLinked: function (ctx) {
      if (!ctx.engine.anyActiveSwitchOnLink(ctx.inst.params.link | 0)) return;
      ctx.engine.setColour('W', ctx.inst.params.colour);
    },
    toggleLatched: function (ctx) { ctx.engine.toggleSwitch(ctx); },
    flipPolarity: function (ctx) { ctx.engine.flipPolarity(ctx); },
    teleport: function (ctx) { ctx.engine.teleportPlayer(ctx); }
  });
  SM.TILE_BEHAVIOR_HANDLERS = BEHAVIOR_HANDLERS;

  // Entity capability schema is catalogue-owned. YAML validation asks this
  // registry for accepted keys and value domains instead of mirroring them.
  var CAPABILITY_SCHEMAS = Object.freeze({
    pushable: Object.freeze({ type: 'boolean' }),
    pullable: Object.freeze({ type: 'boolean' }),
    conveyor: Object.freeze({ type: 'boolean' }),
    portal: Object.freeze({ type: 'boolean' }),
    ray: Object.freeze({ type: 'enum', values: Object.freeze(['block', 'transport', 'ignore']) })
  });
  SM.TILE_CAPABILITY_SCHEMAS = CAPABILITY_SCHEMAS;

  // Entry and ACT are two explicit lifecycle hooks; the current tiles that
  // expose a behavior deliberately bind the same named strategy to both.
  var behaviorStrategies = {};
  Object.keys(BEHAVIOR_HANDLERS).forEach(function (name) {
    behaviorStrategies[name] = name === 'flipPolarity'
      ? Object.freeze({ onAct: BEHAVIOR_HANDLERS[name] })
      : Object.freeze({
        onEnter: BEHAVIOR_HANDLERS[name],
        onAct: BEHAVIOR_HANDLERS[name]
      });
  });

  var TILE_STRATEGIES = Object.freeze(Object.assign({}, behaviorStrategies, {
    solidTrait: Object.freeze({
      passability: function (ctx) { return { solid: ctx.inst.solid }; }
    }),
    lockedBarrier: Object.freeze({
      passability: function (ctx) { return { solid: !!ctx.isLocked(ctx.x, ctx.y) }; }
    }),
    masterVoid: Object.freeze({
      passability: function (ctx) { return { solid: !!ctx.masterVoidActive(ctx.state) }; }
    }),
    binaryPolarityBarrier: Object.freeze({
      passability: function (ctx) {
        return { solid: ctx.state.polarity !== ctx.inst.params.openWhen };
      }
    }),
    colourGate: Object.freeze({
      passability: function (ctx) {
        var carrier = ctx.inst.params.carrier === 'W' ? ctx.state.W : ctx.state.P;
        return { solid: !!ctx.isLocked(ctx.x, ctx.y), carrier: carrier,
          required: ctx.inst.params.colour };
      }
    }),
    playerOccupancy: Object.freeze({
      activation: function (ctx) {
        return ctx.state.player.x === ctx.x && ctx.state.player.y === ctx.y;
      }
    }),
    toggleLatch: Object.freeze({
      activation: function (ctx) {
        var sw = ctx.switchAt(ctx.inst, ctx.x, ctx.y);
        return !!(sw && sw.latched);
      }
    }),
    targetCrateOccupancy: Object.freeze({
      activation: function (ctx) { return !!ctx.crateAt(ctx.x, ctx.y); }
    }),
    crateAdjacencySensor: Object.freeze({
      activation: function (ctx) { return !!ctx.sensorLit(ctx.inst, ctx.x, ctx.y).any; }
    }),
    directionalFlow: Object.freeze({
      forcedMovement: function (ctx) {
        return { type: 'flow', direction: ctx.inst.params.dir,
          kind: ctx.inst.params.kind || 'player' };
      }
    }),
    incomingIce: Object.freeze({
      forcedMovement: function (ctx) {
        return { type: 'ice', direction: ctx.direction || null };
      }
    }),
    linkedPortal: Object.freeze({
      forcedMovement: function (ctx) {
        return { type: 'portal', link: ctx.inst.params.link };
      }
    }),
    cardinalRayEmitter: Object.freeze({
      rayInteraction: function (ctx) {
        return { type: 'emitter', direction: ctx.inst.params.dir };
      }
    }),
    rayObjectProfile: Object.freeze({
      rayInteraction: function (ctx) {
        return { type: 'object', profile: ctx.objectCapabilities || ctx.inst.capabilities || {} };
      }
    })
  }));
  SM.TILE_STRATEGIES = TILE_STRATEGIES;

  var STRATEGY_CONTRACTS = Object.freeze({
    goal: { hooks: ['onEnter', 'onAct'], reads: ['player', 'goal', 'P', 'W'], writes: ['won'], events: ['goal'] },
    setPlayerColour: { hooks: ['onEnter', 'onAct'], reads: ['tile.params.colour', 'P'], writes: ['P'], events: ['colour'] },
    advanceWorld: { hooks: ['onEnter', 'onAct'], reads: ['W', 'worldColourRing'], writes: ['W'], events: ['colour'] },
    resetWorld: { hooks: ['onEnter', 'onAct'], reads: [], writes: ['W'], events: ['colour'] },
    setWorldIfLinked: { hooks: ['onEnter', 'onAct'], reads: ['switches', 'tile.params.link', 'tile.params.colour', 'W'], writes: ['W'], events: ['colour'] },
    toggleLatched: { hooks: ['onEnter', 'onAct'], reads: ['switches', 'tile', 'x', 'y'], writes: ['switches[].latched'], events: ['switch'] },
    teleport: { hooks: ['onEnter', 'onAct'], reads: ['player', 'portals', 'tile.params.link'], writes: ['player'], events: ['teleport'] },
    solidTrait: { hooks: ['passability'], reads: ['tile.solid'], writes: [], events: [] },
    lockedBarrier: { hooks: ['passability'], reads: ['locked'], writes: [], events: [] },
    masterVoid: { hooks: ['passability'], reads: ['master_void latch'], writes: [], events: [] },
    colourGate: { hooks: ['passability'], reads: ['locked', 'P', 'W', 'tile.params'], writes: [], events: [] },
    playerOccupancy: { hooks: ['activation'], reads: ['player'], writes: [], events: [] },
    toggleLatch: { hooks: ['activation'], reads: ['switches[].latched'], writes: [], events: [] },
    flipPolarity: { hooks: ['onAct'], reads: ['polarity'], writes: ['polarity'], events: ['polarity'] },
    binaryPolarityBarrier: {
      hooks: ['passability'], reads: ['polarity', 'tile.params.openWhen'], writes: [], events: []
    },
    targetCrateOccupancy: { hooks: ['activation'], reads: ['crates[][]'], writes: [], events: [] },
    crateAdjacencySensor: { hooks: ['activation'], reads: ['crates[][]', 'tile.params.colour'], writes: [], events: [] },
    directionalFlow: { hooks: ['forcedMovement'], reads: ['tile.params.dir', 'tile.params.kind'], writes: [], events: [] },
    incomingIce: { hooks: ['forcedMovement'], reads: ['incoming direction'], writes: [], events: [] },
    linkedPortal: { hooks: ['forcedMovement'], reads: ['tile.params.link'], writes: [], events: [] },
    cardinalRayEmitter: { hooks: ['rayInteraction'], reads: ['tile.params.dir'], writes: [], events: [] },
    rayObjectProfile: { hooks: ['rayInteraction'], reads: ['object capabilities'], writes: [], events: [] }
  });
  SM.TILE_STRATEGY_CONTRACTS = STRATEGY_CONTRACTS;

  function stateManifestFor(tile) {
    var hooks = [], reads = [], writes = [], events = [];
    function appendUnique(target, values) {
      values.forEach(function (value) {
        if (target.indexOf(value) === -1) target.push(value);
      });
    }
    Object.keys(tile.strategies || {}).forEach(function (hook) {
      var name = tile.strategies[hook];
      var contract = STRATEGY_CONTRACTS[name];
      appendUnique(hooks, [hook]);
      if (!contract) return; // validator below reports the invalid strategy
      appendUnique(reads, contract.reads);
      appendUnique(writes, contract.writes);
      appendUnique(events, contract.events);
    });
    return Object.freeze({
      hooks: Object.freeze(hooks),
      reads: Object.freeze(reads),
      writes: Object.freeze(writes),
      events: Object.freeze(events)
    });
  }

  // Materialize the per-tile read/write/event inventory directly from the
  // strategy references. This avoids a second hand-maintained state list.
  Object.keys(TILES).forEach(function (id) {
    TILES[id].state = stateManifestFor(TILES[id]);
  });

  SM.resolveTileHook = function (inst, hook, context) {
    if (!Object.prototype.hasOwnProperty.call(HOOK_DEFAULTS, hook)) {
      throw new Error('SM.resolveTileHook: unknown hook "' + hook + '"');
    }
    var strategyName = inst && inst.strategies && inst.strategies[hook];
    if (!strategyName) return HOOK_DEFAULTS[hook];
    var strategy = TILE_STRATEGIES[strategyName];
    if (!strategy || typeof strategy[hook] !== 'function') {
      throw new Error('SM.resolveTileHook: invalid ' + hook + ' strategy "' + strategyName + '"');
    }
    return strategy[hook](context);
  };

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function parameterValueIsSupported(value) {
    if (value === null) return true;
    if (typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return isFinite(value);
    if (!isRecord(value)) return false;
    return Object.keys(value).every(function (key) {
      return parameterValueIsSupported(value[key]);
    });
  }

  SM.validateTileCapabilities = function (definition, profile, coordinate) {
    var errors = [];
    if (!definition || !isRecord(definition.capabilities)) {
      return { ok: false, errors: ['tile does not register movement capabilities'] };
    }
    if (!isRecord(profile)) return { ok: false, errors: ['capability profile must be an object'] };
    Object.keys(profile).forEach(function (capability) {
      var prefix = capability === 'ray' ? 'ray capability' : 'capability "' + capability + '"';
      if (!Object.prototype.hasOwnProperty.call(definition.capabilities, capability) ||
          !CAPABILITY_SCHEMAS[capability]) {
        errors.push(definition.name + ' at ' + coordinate + ' does not support capability "' + capability + '"');
        return;
      }
      var schema = CAPABILITY_SCHEMAS[capability];
      var value = profile[capability];
      if (schema.type === 'enum' && schema.values.indexOf(value) === -1) {
        var accepted = schema.values.length > 1
          ? schema.values.slice(0, -1).join(', ') + ', or ' + schema.values[schema.values.length - 1]
          : schema.values.join('');
        errors.push(prefix + ' at ' + coordinate + ' must be ' + accepted);
      } else if (schema.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(prefix + ' at ' + coordinate + ' must be true or false');
      }
    });
    return { ok: errors.length === 0, errors: errors };
  };

  function parameterType(value) {
    if (value === null) return 'null';
    if (isRecord(value)) return 'object';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    return typeof value;
  }

  function validateParameterValue(value, defaultValue, path, errors) {
    var expected = parameterType(defaultValue);
    var actual = parameterType(value);
    if (expected !== actual && !(expected === 'number' && actual === 'integer')) {
      errors.push(path + ' must be ' + expected + ', got ' + actual);
      return;
    }
    if (expected !== 'object') return;
    var expectedKeys = Object.keys(defaultValue).sort();
    var actualKeys = Object.keys(value).sort();
    if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
      errors.push(path + ' must contain exactly ' + expectedKeys.join(', '));
      return;
    }
    expectedKeys.forEach(function (key) {
      validateParameterValue(value[key], defaultValue[key], path + '.' + key, errors);
    });
  }

  /** Validate level overrides against the registered defaults-derived schema. */
  SM.validateTileParameters = function (definition, overrides) {
    var errors = [];
    if (!definition || !isRecord(definition.params)) {
      return { ok: false, errors: ['tile definition has no parameter schema'] };
    }
    if (!isRecord(overrides)) return { ok: false, errors: ['override must be a parameter object'] };
    Object.keys(overrides).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(definition.params, key)) {
        errors.push('unsupported parameter "' + key + '"');
        return;
      }
      validateParameterValue(overrides[key], definition.params[key], key, errors);
    });
    return { ok: errors.length === 0, errors: errors };
  };

  /** Validate registered tile data without executing any tile behavior. */
  SM.validateTileRegistry = function (registry) {
    var errors = [];
    var entries = [];
    var seenIds = {};
    if (Array.isArray(registry)) {
      registry.forEach(function (def, index) { entries.push([String(index), def]); });
    } else if (isRecord(registry)) {
      Object.keys(registry).forEach(function (key) { entries.push([key, registry[key]]); });
    } else {
      return { ok: false, errors: ['registry must be an object or definition array'] };
    }

    entries.forEach(function (entry) {
      var key = entry[0], def = entry[1];
      if (!isRecord(def)) {
        errors.push('entry ' + key + ' must be a tile definition object');
        return;
      }
      if (typeof def.id !== 'number' || !isFinite(def.id) || Math.floor(def.id) !== def.id) {
        errors.push('entry ' + key + ' must have an integer stable id');
      } else {
        if (Object.prototype.hasOwnProperty.call(seenIds, def.id)) {
          errors.push('duplicate stable tile id ' + def.id);
        }
        seenIds[def.id] = true;
        if (!Array.isArray(registry) && key !== String(def.id)) {
          errors.push('registry key ' + key + ' does not match tile id ' + def.id);
        }
      }
      ['family', 'name', 'glyph'].forEach(function (field) {
        if (typeof def[field] !== 'string' || !def[field]) {
          errors.push('tile ' + key + ' requires a non-empty ' + field);
        }
      });
      if (def.solid === undefined || !(typeof def.solid === 'boolean' || typeof def.solid === 'string')) {
        errors.push('tile ' + key + ' requires boolean or named solid metadata');
      }
      if (def.walkable === undefined || !(typeof def.walkable === 'boolean' || typeof def.walkable === 'string')) {
        errors.push('tile ' + key + ' requires boolean or named walkable metadata');
      }
      if (!isRecord(def.params)) {
        errors.push('tile ' + key + ' params must be an object of defaults/schema values');
      } else if (!parameterValueIsSupported(def.params)) {
        errors.push('tile ' + key + ' has an unsupported parameter default value');
      }
      if (def.pushable !== undefined && typeof def.pushable !== 'boolean') {
        errors.push('tile ' + key + ' pushable metadata must be boolean');
      }
      if (def.capabilities !== undefined) {
        var capabilityCheck = SM.validateTileCapabilities(def, def.capabilities,
          def.entityRole || ('tile ' + key));
        errors = errors.concat(capabilityCheck.errors);
      }
      if (def.strategies !== undefined) {
        if (!isRecord(def.strategies)) {
          errors.push('tile ' + key + ' strategies must map hook names to strategy names');
        } else {
          Object.keys(def.strategies).forEach(function (hook) {
            var strategyName = def.strategies[hook];
            var contract = STRATEGY_CONTRACTS[strategyName];
            if (!Object.prototype.hasOwnProperty.call(HOOK_DEFAULTS, hook) || !contract ||
                contract.hooks.indexOf(hook) === -1 || !TILE_STRATEGIES[strategyName] ||
                typeof TILE_STRATEGIES[strategyName][hook] !== 'function') {
              errors.push('tile ' + key + ' has invalid strategy ' + strategyName + ' for hook ' + hook);
            }
          });
        }
      }
      if (!isRecord(def.state) || !Array.isArray(def.state.hooks) ||
          !Array.isArray(def.state.reads) || !Array.isArray(def.state.writes) ||
          !Array.isArray(def.state.events)) {
        errors.push('tile ' + key + ' requires a canonical state access manifest');
      }
    });
    return { ok: errors.length === 0, errors: errors };
  };

  var registryCheck = SM.validateTileRegistry(TILES);
  if (!registryCheck.ok) {
    throw new Error('SM.TILES registry is invalid: ' + registryCheck.errors.join('; '));
  }

  SM.runBehavior = function (name, ctx) {
    // Null behavior is the neutral no-op. Every named behavior is validated
    // against its contract and dispatches to one explicit synchronous handler.
    if (name === null || name === undefined) return;
    var hook = ctx && ctx.press ? 'onAct' : 'onEnter';
    var handler = TILE_STRATEGIES[name] && TILE_STRATEGIES[name][hook];
    if (typeof handler !== 'function') {
      throw new Error('SM.runBehavior: unknown behaviour "' + name + '"');
    }
    return handler(ctx);
  };

  /* Export + hot-reload                                                     */
  /* ---------------------------------------------------------------------- */

  SM.TILES = TILES;
  // Compatibility API: handlers, not tile definitions, live in this map.
  SM.BEHAVIORS = BEHAVIOR_HANDLERS;

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
