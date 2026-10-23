# tile-mechanics Specification

## Purpose

Defines the authoritative level-designer contract for tile identity, parameters, passability, state, and the standard deterministic turn rules. It distinguishes behavior present in the runtime from registered or in-flight mechanics whose behavior is introduced or completed by this change.

## Requirements

### Requirement: The tile catalogue is documented by stable ID and behavior
The system SHALL provide level designers an authoritative catalogue of each registered tile ID, its family, default parameters, interaction role, and whether its rules are implemented or newly specified.

#### Scenario: Designer looks up an implemented tile
- **WHEN** a designer looks up a registered implemented ID
- **THEN** the reference identifies its name, family, defaults, passability, and gameplay effect

#### Scenario: Designer encounters a reserved or unsupported ID
- **WHEN** a grid uses an unknown, reserved, retired, or explicitly unimplemented ID
- **THEN** the level is rejected with a diagnostic rather than assigning the ID guessed behavior

**Catalogue reference (IDs not listed as available are gaps, not aliases):**

| ID(s) | Tile(s) | Family | Standard behavior and authoring notes | Status |
|---|---|---|---|---|
| 0 | `floor` | terrain | Walkable, non-solid, no entry effect. | Runtime |
| 1 | `start` | terrain | Walkable start marker; exactly one per level. | Runtime |
| 2 | `goal` | terrain | Walkable; wins only when the player is on it and player color `P` equals world color `W`. | Runtime |
| 3 | `wall` | terrain | Always solid; blocks player entry and object destinations. | Runtime |
| 4 | `void` | terrain | Walkable by default; becomes solid while the global `master_void` latch is on. | Runtime |
| 5 | `ice` | terrain | Walkable; carries the player and conveyor-compatible objects in their incoming direction. | Runtime |
| 10, 26, 27 | `phase_wall`, `_link_2`, `_link_3` | barrier | Solid while locked, with defaults on links 1, 2, and 3 respectively; no color test. | Runtime |
| 11–13 | `prism_red`, `_gre`, `_blu` | aura | Walkable; on final entry sets `P` to the named color. | Runtime |
| 20 | `cycle_dial` | actuator | On entry or ACT, advances `W` through red → green → blue → red; white advances to red. | Runtime |
| 21 | `cycle_reset` | actuator | On entry or ACT, sets `W` to white. | Runtime |
| 22 | `set_dial` | actuator | On entry or ACT, sets `W` to its configured color only while any active switch/sensor/target shares its configured link; defaults to link 1 and red. | Runtime |
| 23–25 | `target_link_1`–`_3` | target | Non-blocking floor features, stationary by default; momentary link signals active only while a crate shares their cell. Movement can be explicitly enabled per entity, in which case link and identity move with the target. | Runtime |
| 30–33 | `aura_gate_wht/red/gre/blu` | gate | Requires `P` to match its color and its lock to be open. Unwired link 0 defaults open; assigning a link defaults it closed unless `defaultLocked` is explicit. | Runtime |
| 34–36 | `world_gate_red/gre/blu` | gate | As above, but checks `W` instead of `P`; defaults to unwired link 0. | Runtime |
| 40, 42 | `plate`, `link_plate` | switch | Walkable, tagged momentary link (default 1); active while the player stands on the cell. | Runtime |
| 41 | `link_key` | switch | Walkable, tagged toggle link (default 1); each entry or ACT toggles its latch. | Runtime |
| 44 | `master_lock` | switch | Walkable global toggle; when latched, forces every lock-controlled tile closed. | Runtime |
| 45 | `master_void` | switch | Walkable global toggle; when latched, makes all ordinary void (ID 4) cells solid. | Runtime |
| 50 | `receiver` | sensor | Walkable; active if at least one orthogonally adjacent crate matches its configured color (default red); defaults to link 1. A crate on the receiver is not adjacent. | Runtime |
| 60–63 | `crate_east/west/north/south` | flow | Walkable crate-force belts. When the player's force chain traverses one, it shoves a compatible crate or object one cell in the belt direction; eligible objects can continue along their bounded force chain. | Runtime |
| 64–67 | `player_east/west/north/south` | flow | Walkable player belt; carries the player in its direction during the same turn. Compatible objects can also receive flow movement. | Runtime |
| 70–73 | `crate_wht/red/gre/blu` | crate | Movable solid objects over ordinary floor; pushable but not pullable by default, conveyor-compatible, ray-blocking, and not portal-compatible unless overridden. | Runtime |
| 80 | `portal` | portal | Walkable; matching-link portals form a pair and transport the player; compatible objects can also use them. Link defaults to 0. | Runtime |
| 81–84 | `ray_north/east/south/west` | hazard | Static cardinal emitters. Capability-compatible objects can be transported along the ray; exposed players are caught and respawned. | Runtime |

IDs 6–7 are retired, and unlisted gaps are not usable tiles unless added to the registry with defined behavior. Gameplay colors are exactly `wht`, `red`, `gre`, and `blu`; `blk` and `mute` are presentation colors only.

### Requirement: Level grids and tile overrides have consistent coordinates
The system SHALL interpret authored grids top row first, convert them once to a bottom-left-origin runtime board, and merge each used tile ID's override values over that tile's defaults.

Authored boards SHALL be 2–16 columns wide and 1–9 rows high. Declared width and height, when present, SHALL match the grid dimensions.

#### Scenario: Designer labels a cell
- **WHEN** a designer identifies a cell in a YAML grid
- **THEN** column A and row 1 are the bottom-left cell, and the first YAML row is the top row

#### Scenario: Designer overrides a tile parameter
- **WHEN** an override names a parameter supported by a tile ID present in the grid
- **THEN** that instance uses the override while unspecified parameters retain catalogue defaults

#### Scenario: Override is unknown or unused
- **WHEN** an override names an unsupported parameter or a tile ID absent from the level grid
- **THEN** validation rejects the level and identifies the invalid override

#### Scenario: Board dimensions exceed supported bounds
- **WHEN** a grid is narrower than 2 or wider than 16 columns, taller than 9 rows, or has inconsistent row dimensions
- **THEN** level validation rejects it before play

### Requirement: Passability is evaluated from the current resolved state
The system SHALL block movement into out-of-bounds, solid, or crate-occupied cells and SHALL apply both lock state and carrier-color requirements when evaluating gates.

#### Scenario: Player enters ordinary terrain
- **WHEN** the next cell is in bounds, non-solid, unoccupied by a blocking object, and not color-restricted
- **THEN** the player may enter it

#### Scenario: Player or object meets a solid destination
- **WHEN** a movement destination is outside the board or is solid under current tile state
- **THEN** that movement is rejected without destroying or relocating the moving object

#### Scenario: Gate lock is open but carrier color is wrong
- **WHEN** the gate's link is satisfied but its configured carrier does not match its required color
- **THEN** entry remains blocked

#### Scenario: Gate carrier matches
- **WHEN** the gate's lock is open and its configured carrier (`P` or `W`) matches its required color
- **THEN** the gate is passable under ordinary movement and destination rules

### Requirement: Linked locks use a fixed precedence
The system SHALL derive each lock-controlled tile's state from its default, matching latched tagged toggles, active momentary or sensor signals, and the global master lock in that order.

#### Scenario: Tagged keys change a link
- **WHEN** an odd number of matching tagged toggle switches are latched
- **THEN** the tile's default lock state is inverted; an even number leaves it unchanged

#### Scenario: Active momentary signal opens a link
- **WHEN** any matching momentary plate, occupied target, or active receiver satisfies a lock link
- **THEN** that link is unlocked for the resolved state

#### Scenario: Global master lock is latched
- **WHEN** the global `master_lock` switch is latched
- **THEN** it overrides all defaults, keys, plates, targets, and receivers and locks every lock-controlled tile

### Requirement: Switches and sensors expose distinct activation conditions
The system SHALL calculate each switch or sensor from its declared activation model, without conflating player occupancy, crate occupancy, crate adjacency, or a persistent latch.

#### Scenario: Player occupies a momentary plate
- **WHEN** the player stands on a tagged momentary plate
- **THEN** its link is active until the player leaves

#### Scenario: Toggle switch is activated
- **WHEN** the player enters or presses ACT on a tagged/global toggle switch
- **THEN** its latch changes once and remains changed until activated again or undone

#### Scenario: Receiver detects a crate
- **WHEN** a matching-color crate occupies any one of the four orthogonal neighboring cells
- **THEN** the receiver is active; diagonal crates and crates on the receiver cell do not count

#### Scenario: Target detects a crate
- **WHEN** a crate occupies a target's cell
- **THEN** the target activates its link; player occupancy, adjacency, or a crate on a different cell does not activate it

### Requirement: Tile effects occur at standard resolver boundaries
The system SHALL resolve direct actions, forced movement, ray interactions, respawn, and goal checks in a deterministic order independent of rendering or wall-clock time.

#### Scenario: Movement enters an effect tile
- **WHEN** a successful move and its forced movement chain finish
- **THEN** the final resting tile's entry effect runs once; intermediate force-chain cells do not independently run player entry effects

#### Scenario: Player uses ACT
- **WHEN** ACT is issued
- **THEN** the effect on the player's current tile is invoked once, followed by link/ray resolution and goal evaluation

#### Scenario: Ray transport and catch order
- **WHEN** a successful move/pull or ACT reaches ray resolution
- **THEN** derive locks, transport ray-compatible objects in stable emitter scan order, derive locks again, evaluate player exposure on the post-transport board, respawn and re-derive locks if caught, then test the final goal state

#### Scenario: Ray transport precedes player exposure
- **WHEN** a resolved action transports one or more ray-compatible objects and leaves the player on an exposed ray cell
- **THEN** the player is caught and respawned before the final goal test, with no extra stroke for transport or respawn

#### Scenario: Goal is reached with unequal colors
- **WHEN** the player rests on the goal with `P` different from `W`
- **THEN** the level remains uncleared; it clears once both colors match while the player is on the goal

### Requirement: Turns, strokes, and view playback share one deterministic result
The system SHALL make the synchronous rule result authoritative and return ordered state-change events for display, undo, and solver use.

#### Scenario: Successful movement has forced hops
- **WHEN** one movement action causes one or more automatic hops or interactions
- **THEN** all effects resolve as one turn and cost at most the single initiating movement stroke

#### Scenario: Blocked move
- **WHEN** movement cannot commit any change because of a blocker
- **THEN** it costs no stroke and leaves the board unchanged

#### Scenario: Blocked action advances the turn counter
- **WHEN** a well-formed directional move is blocked
- **THEN** the attempt increments the turn counter but not the stroke counter

#### Scenario: ACT is used
- **WHEN** ACT is issued, including when the current tile has no effect
- **THEN** it consumes one stroke and one turn

#### Scenario: Playback timing changes
- **WHEN** identical states receive identical actions with different display timing
- **THEN** the final rules state, turn events, and solver result are identical
