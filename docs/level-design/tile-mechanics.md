# Tile Mechanics Reference

This is the level designer's reference for the runtime tile catalogue and the
standard turn rules. Tile IDs and validation behavior are defined by
`src/js/tiles.js`, `src/js/levels.js`, and `src/js/sm-rules.js`. The normative
OpenSpec contracts are `tile-mechanics` and `movable-objects` (currently in the
`document-tile-mechanics` change).

Older design notes can describe retired IDs or superseded mechanics. When they
disagree with this guide and the live catalogue, the live catalogue and these
rules take precedence.

## Board and YAML conventions

- `grid` is a rectangular list of rows written **top row first**. The runtime
  flips it once: coordinate **A1 is the bottom-left cell**, columns increase
  east, and rows increase north.
- Boards are 2–16 columns wide and 1–9 rows high. Declared `width` and `height`
  must agree with the grid. Each level needs exactly one start (ID 1) and one
  goal (ID 2).
- A cell contains one tile ID. Crates and target markers are normalized into
  movable entity/feature layers; their underlying runtime terrain is ordinary
  floor. Targets can coexist with a player or crate during play.
- `overrides` is keyed by tile ID and changes parameters for every occurrence
  of that ID in the level. It is not a per-cell mechanism.
- `object_overrides` is the per-entity movement-profile mapping. Its keys use
  board coordinates such as `C2`, not YAML row indices. Only a movable entity
  may be named.

Example: make just the red crate at C1 transportable by rays and not pullable.

```yaml
name: "Object profile example"
world_id: object-profile-example
num_level: 1
levels:
  level_1:
    name: "Profile example"
    width: 5
    height: 2
    golf_score: 4
    grid:
      - [0, 0, 0, 0, 2] # row 2
      - [1, 0, 71, 0, 0] # row 1: crate_red at C1
    object_overrides:
      C1: { pullable: false, ray: transport }
```

Unknown coordinates, non-object cells, unsupported keys, and invalid values
are validation errors. `pushable`, `pullable`, `conveyor`, and `portal` accept
booleans. `ray` accepts `block`, `transport`, or `ignore`.

## Tile catalogue

All IDs below are registered and implemented in the current runtime. Defaults
shown here apply unless a tile-ID `overrides` mapping supplies a supported
parameter. Object capabilities may additionally be overridden per cell.

| ID | Tile name | Family | Default parameters and behavior |
|---:|---|---|---|
| 0 | `floor` | terrain | Walkable, non-solid, no entry effect. |
| 1 | `start` | terrain | Walkable start marker. Exactly one per level. |
| 2 | `goal` | terrain | Walkable. The level is won only when the player rests here with `P === W`. |
| 3 | `wall` | terrain | Always solid; blocks player entry, object movement, and rays. |
| 4 | `void` | terrain | Walkable while global `master_void` is off; solid while it is latched on. |
| 5 | `ice` | terrain | Carries a moving compatible entity along its incoming direction until it leaves ice or the next cell is blocked. |
| 10 | `phase_wall` | barrier | Link 1, `defaultLocked: true`; solid while locked; no color test. |
| 11 | `prism_red` | aura | On the player's final entry, sets player color `P` to red. |
| 12 | `prism_gre` | aura | On the player's final entry, sets `P` to green. |
| 13 | `prism_blu` | aura | On the player's final entry, sets `P` to blue. |
| 20 | `cycle_dial` | actuator | On entry or ACT, advances world color `W`: white → red → green → blue → red. |
| 21 | `cycle_reset` | actuator | On entry or ACT, sets `W` to white. |
| 22 | `set_dial` | actuator | Link 1, red by default. On entry or ACT, sets `W` to its configured color only if an active signal on that link exists. |
| 23 | `target_link_1` | target | Momentary tagged link 1. Stationary non-blocking floor feature by default; active only while a crate shares its current cell. |
| 24 | `target_link_2` | target | As above, link 2. |
| 25 | `target_link_3` | target | As above, link 3. |
| 26 | `phase_wall_link_2` | barrier | Link 2, `defaultLocked: true`; solid while locked; no color test. |
| 27 | `phase_wall_link_3` | barrier | Link 3, `defaultLocked: true`; solid while locked; no color test. |
| 30 | `aura_gate_wht` | gate | Tests `P === wht`; link 0 (unwired), default open. |
| 31 | `aura_gate_red` | gate | Tests `P === red`; link 0 (unwired), default open. |
| 32 | `aura_gate_gre` | gate | Tests `P === gre`; link 0 (unwired), default open. |
| 33 | `aura_gate_blu` | gate | Tests `P === blu`; link 0 (unwired), default open. |
| 34 | `world_gate_red` | gate | Tests `W === red`; link 0 (unwired), default open. |
| 35 | `world_gate_gre` | gate | Tests `W === gre`; link 0 (unwired), default open. |
| 36 | `world_gate_blu` | gate | Tests `W === blu`; link 0 (unwired), default open. |
| 40 | `plate` | switch | Tagged momentary link 1; active while the player stands on it. |
| 41 | `link_key` | switch | Tagged toggle link 1; entry or ACT toggles and latches its state. |
| 42 | `link_plate` | switch | Tagged momentary link 1; active while the player stands on it. |
| 44 | `master_lock` | switch | Global toggle; when latched, forces every lock-controlled tile closed. |
| 45 | `master_void` | switch | Global toggle; when latched, makes all ID 4 void cells solid. |
| 50 | `receiver` | sensor | Tagged link 1, color red. Active when at least one matching-color crate occupies a cardinally adjacent cell. |
| 60 | `crate_east` | flow | Crate-force belt directed east. |
| 61 | `crate_west` | flow | Crate-force belt directed west. |
| 62 | `crate_north` | flow | Crate-force belt directed north. |
| 63 | `crate_south` | flow | Crate-force belt directed south. |
| 64 | `player_east` | flow | Player belt directed east. |
| 65 | `player_west` | flow | Player belt directed west. |
| 66 | `player_north` | flow | Player belt directed north. |
| 67 | `player_south` | flow | Player belt directed south. |
| 70 | `crate_wht` | crate | White crate; pushable, not pullable by default, conveyor-compatible, ray-blocking; portal transport off by default. |
| 71 | `crate_red` | crate | Red crate; pushable, not pullable by default, conveyor-compatible, ray-blocking; portal transport off by default. |
| 72 | `crate_gre` | crate | Green crate; pushable, not pullable by default, conveyor-compatible, ray-blocking; portal transport off by default. |
| 73 | `crate_blu` | crate | Blue crate; pushable, not pullable by default, conveyor-compatible, ray-blocking; portal transport off by default. |
| 80 | `portal` | portal | Link 0 by default. Same-link portals are paired; player transport is enabled, object transport requires `portal: true`. |
| 81 | `ray_north` | hazard | Static ray emitter directed north. |
| 82 | `ray_east` | hazard | Static ray emitter directed east. |
| 83 | `ray_south` | hazard | Static ray emitter directed south. |
| 84 | `ray_west` | hazard | Static ray emitter directed west. |

Targets are stationary by default (`pushable: false`, `pullable: false`) and do
not ride conveyors or portals; they are transparent to rays (`ray: ignore`). A
designer can explicitly enable supported capabilities at the target's
coordinate. When enabled and moved, target identity and link move with the
feature; its vacated terrain remains unchanged.

IDs 6–7 are retired. IDs 8–9, 14, 28–29, 37–39, 43, 51–59, 68–69, and 74–79
are not registered for gameplay. Any other absent ID is also unavailable until
it is added to the catalogue and given implemented rules. The level loader
rejects unknown and explicitly unimplemented IDs rather than guessing.

## Movement capability profiles

| Entity | `pushable` | `pullable` | `conveyor` | `portal` | `ray` |
|---|---:|---:|---:|---:|---|
| Player | Self-moves | Can pull eligible trailing objects | Player belts and ice | Yes | Always vulnerable to hostile rays |
| Crates 70–73 | true | false | true | false | `block` |
| Targets 23–25 | false | false | false | false | `ignore` |

- A normal directional move into a movable object pushes one object if both its
  profile and the destination permit it. Push chains are not enabled.
- Shift+direction is a pull action: the player advances one cell and an
  eligible object directly behind the player enters the player's vacated cell.
- Pushes and pulls are atomic. An out-of-bounds cell, wall, locked barrier,
  wrong-color gate, occupied blocking-object cell, or unsupported capability
  stops the entire direct interaction. A failed move/pull costs no stroke.
- A crate can share a target cell; the crate activates the target. The player
  can also stand on a target. A target cannot be moved onto a crate or another
  target, and it never destroys underlying terrain when it moves.
- A crate-force belt can shove an eligible crate or other conveyor-compatible
  object in the belt's direction when the player force chain traverses it.
  Player belts carry the player. A compatible object entering a flow tile or
  ice follows the bounded movement chain; per-cell `conveyor: false` opts that
  object out.
- An eligible object entering a matching-link portal moves to its partner if
  the destination is legal. Teleport ends that entity's current force chain.
  Object portal compatibility is opt-in, independently of the player's portal
  behavior.

## Color, gates, switches, and targets

- Gameplay colors are exactly `wht`, `red`, `gre`, and `blu`. `blk` and `mute`
  are presentation colors, not gameplay states. Both `P` (player) and `W`
  (world) start white.
- Prisms set `P`; cycle/reset/set dials change `W`. Walking away from a prism
  does not clear `P`. The goal checks for a match when the player is on ID 2.
- Aura gates check `P`; world gates check `W`. A gate must both be unlocked and
  have its required carrier color. An unwired gate (link 0) defaults open. If
  an override assigns a link, it defaults closed unless
  `defaultLocked: false` is specified.
- Linked lock resolution is deterministic: begin with `defaultLocked`; each
  matching latched tagged toggle flips that state (odd parity flips, even
  parity cancels); any active matching momentary plate, receiver, or target
  clears the lock; finally a latched global `master_lock` forces it closed.
- Targets are momentary and use **crate occupancy**, not player occupancy or
  adjacency. Receivers use **matching-color crate adjacency** in the four
  cardinal cells; a crate sitting on the receiver does not count.
- A target's link follows it when pushed, pulled, conveyed, teleported, or
  transported by a ray. The linked signal is derived from the crate and target
  sharing a cell after the resolved movement.

## Rays: transport and hazard behavior

Ray emitters 81–84 are static and point in their named cardinal direction. They
are resolved as part of a player action, not by a timer or animation.

- A wall or currently solid tile stops a ray. An entity with `ray: block`
  stops the beam before its cell; crates use this by default. Open gates and
  `ray: ignore` objects are transparent.
- A non-player entity configured with `ray: transport` is carried along the
  emitter's direction through legal cells, at most once per emitter per turn.
  Walls, gates the entity cannot enter, and blocking entities stop it safely.
- The player remains vulnerable to hostile rays. After movement, forced
  effects, and object transport settle, an exposed player returns to the
  authored start. Crates, targets, colors, and latches are preserved; locks are
  recalculated for the respawned player. The action costs one stroke total and
  can be undone.
- Make every authored start safe from active rays. A catch is not a game-over
  state and does not reset the level.

## Turn and stroke rules

The synchronous resolver, not the renderer, is the source of truth. It returns
ordered movement/effect events; the renderer only plays them back. The standard
order is:

1. Validate and commit a direct move, push, or pull atomically.
2. Settle forced movement for an object moved by the action, then the player.
   Conveyors set direction; ice preserves the incoming direction. Repeated
   directed states and a board-derived cap stop loops.
3. Run the player's final resting tile entry effect once. Intermediate forced
   cells do not independently fire player entry effects.
4. Derive plate, receiver, target, and linked-lock state.
5. Transport eligible objects along static rays, then recompute signals/locks.
6. Catch an exposed player and recompute player-position-dependent locks.
7. Test the goal and return the final event list.

Each accepted action advances the turn/attempt counter, including blocked
directional attempts. A blocked move/pull costs zero strokes. A successful
movement or pull costs one stroke no matter how many forced hops occur; ACT
always costs one stroke, even on a tile without an effect. Outcomes and solver
results do not depend on animation timing.

## Runtime catalogue and presentation boundary

`src/js/tiles.js` is the code catalogue: each tile definition names its
capabilities, parameter defaults, rule strategies, and generated state-access
manifest (`hooks`, `reads`, `writes`, and `events`). Rule strategy names refer
to synchronous implementations in that file; the resolver invokes them at the
documented phase and owns shared bounds, occupancy, ordering, and event
invariants. `family` is useful descriptive metadata, not a gameplay dispatch
contract. YAML continues to contain only stable tile IDs and supported data
overrides.

Display data is separate from rule behavior. Tile definitions provide a
presentation key and human-readable inspection/codex copy; `src/js/sm-glyphs.js`
turns the visual key and read-only view state into SVG. `sm-ui.js` formats the
tile-authored descriptors and `sm-render.js` plays resolver events. Neither
presentation module decides gameplay. When extending a tile, keep its rule
strategy/state contract and display descriptor aligned, then run the relevant
fast Node suite (`npm run test:unit:registry`, `test:unit:rules`, or
`test:unit:levels`) before final validation.

## Authoring checks

- Use only registered IDs and supported override parameters. Tile ID overrides
  affect all cells with that ID; use `object_overrides` for per-entity movement
  capabilities.
- Pair portals by link and prefer exactly two endpoints. A link with an odd or
  unpaired portal count produces a validation warning.
- Test wall/gate collisions for both the player and moved objects. A pushed
  object cannot cross a wall or a gate that rejects the player's/world carrier.
- Keep conveyors, ice, portals, and ray-transport combinations finite and
  inspect the settled state, not just the animation. The bounded BFS solver
  uses the same resolver; it reports `unknown` rather than claiming a result
  when its state/depth budget is exceeded.
- Check the solver's minimum-stroke result against `golf_score`; re-review
  levels after changing object profiles because a new pull/transport route may
  alter both solvability and par.
- See `docs/level-design/world-authoring-checklist.md` for world progression,
  tutorial softlock, route-review, and real-browser pack checks.
