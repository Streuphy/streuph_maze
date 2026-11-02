# Tile mechanics specification delta

## MODIFIED Requirements

### Requirement: The tile catalogue is documented by stable ID and behavior
The system SHALL provide level designers an authoritative catalogue of each registered tile ID, its family, default parameters, interaction role, and whether its rules are implemented or newly specified. Ruleset-dependent behavior SHALL be identified explicitly; the baseline catalogue below describes legacy behavior unless a V2 requirement states otherwise.

#### Scenario: Designer looks up an implemented tile
- **WHEN** a designer looks up a registered implemented ID
- **THEN** the reference identifies its name, family, defaults, passability, gameplay effect, and applicable ruleset

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

IDs 6–7 are retired, and unlisted gaps are not usable tiles unless added to the registry with defined behavior. Legacy gameplay colors are exactly `wht`, `red`, `gre`, and `blu`; `blk` is additionally a V2 gameplay color. `mute` remains presentation-only. V2 floor colors add no new integer IDs and do not change legacy definitions.

### Requirement: Tile effects occur at standard resolver boundaries
The system SHALL resolve direct actions, forced movement, ray interactions, respawn, and goal checks in a deterministic order independent of rendering or wall-clock time. V2 SHALL complete every substep in the initiating round; legacy effect boundaries SHALL remain unchanged.

#### Scenario: Movement enters an effect tile
- **WHEN** a successful move and its forced movement chain finish
- **THEN** the final resting tile's entry effect runs once; intermediate force-chain cells do not independently run player entry effects

#### Scenario: Player uses ACT
- **WHEN** ACT is issued in legacy play
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

#### Scenario: V2 input cannot interleave with a round
- **WHEN** a V2 direction or ACTION produces multiple relocations and effects
- **THEN** all those substeps settle before another gameplay action is resolved or a final victory is awarded

#### Scenario: ACTION changes world color while the dot occupies the goal
- **WHEN** V2 ACTION changes `W` and the settled dot is on the goal
- **THEN** the goal displays the resulting `W` and victory is evaluated against that same final color after hazards

## ADDED Requirements

### Requirement: V2 round-boundary gameplay is fully inspectable
For V2, the visible board and its immediately available inspection SHALL expose all information affecting legal actions and outcomes. Identical exposed gameplay configurations SHALL have identical future behavior for identical actions, regardless of previous inputs, counters, animation timing, or codex discovery. Mutable board state SHALL be allowed; hidden history-dependent modes SHALL NOT.

#### Scenario: History does not alter a settled board
- **WHEN** two V2 states have the same exposed terrain, features, objects, colors, latches, links, polarity, and positions but different action histories or stroke counts
- **THEN** the same next action has the same gameplay result

#### Scenario: Occupants do not hide their supporting terrain
- **WHEN** the dot, crate, or movable feature covers a colored floor
- **THEN** the supporting floor color and its movement constraint remain visually or immediately inspectably available

#### Scenario: No remembered ice command
- **WHEN** an ice chain ends at a boundary or blocker
- **THEN** no directional command or momentum obligation survives into the next round

### Requirement: V2 has exactly five controllable round actions
V2 SHALL accept UP, DOWN, LEFT, RIGHT, and ACTION/REST as its complete gameplay action set. A direction SHALL determine legal walk, push, or automatic pull from the current board. No separate pull action or persistent interaction mode SHALL be required or offered. Legacy explicit pull controls SHALL remain available only under legacy rules.

#### Scenario: Direction produces an eligible pull
- **WHEN** the dot steps into an empty legal cell with an eligible trailing crate on green floor
- **THEN** that direction moves the dot and pulls the crate as a single action without a modifier key

#### Scenario: No sixth action enters V2 search
- **WHEN** a V2 solver or gameplay caller enumerates actions
- **THEN** only the five actions are accepted and a separate explicit pull request is rejected without mutation

### Requirement: V2 ACTION activates the current and adjacent participants once
V2 ACTION SHALL activate the dot's current tile and activatable tiles, movable features, and objects in its four orthogonally adjacent cells. Eligible participants SHALL be captured at round start and activated once by identity in current, north, south, east, west order, with tile/feature before object. Inactive participants SHALL be no-ops; diagonal and remote participants SHALL NOT be activated by this command.

#### Scenario: One cell contains a tile and a crate
- **WHEN** an adjacent cell contains an activatable tile and an independently activatable object
- **THEN** each receives one activation in the defined layer order, not one activation for the cell

#### Scenario: Activation moves a participant
- **WHEN** an earlier activation moves the dot or another participant
- **THEN** the original participant set is not expanded or recaptured and no participant is activated a second time

#### Scenario: Activation is not recursive adjacency flooding
- **WHEN** an adjacent switch activates and another switch lies beyond the original four cells
- **THEN** the second switch is not directly activated by ACTION, although ordinary declared link effects still apply

#### Scenario: Remote spatial activation respects occupancy
- **WHEN** an empty adjacent portal is activated while the dot occupies a different cell
- **THEN** that activation does not teleport the remote dot as though it occupied the portal

#### Scenario: Entry does not double-activate an ACTION participant
- **WHEN** ACTION-induced relocation leaves the dot on a tile already activated by that ACTION
- **THEN** its effect is not invoked again through a duplicate entry activation in that round

### Requirement: V2 colors and goal matching use one visible five-color vocabulary
V2 SHALL support White (`wht`), Blue (`blu`), Red (`red`), Green (`gre`), and Black (`blk`) for world and supported entity/tile color fields, defaulting unspecified object colors to White. The goal's color SHALL always derive from `W`; a settled legal goal requires dot color `P === W`. Black SHALL participate in matching without introducing unspecified reversal effects.

#### Scenario: Black goal is attainable
- **WHEN** the settled dot and world are both Black and the dot legally occupies the goal after hazards
- **THEN** the Black goal clears under the same equality rule as the other four colors

#### Scenario: Goal cannot retain an independent color
- **WHEN** a world-color effect changes `W`
- **THEN** the goal color immediately follows `W` without an independent latch or authored fixed goal color

#### Scenario: Black does not imply guessed inversion
- **WHEN** `W` is Black
- **THEN** no wall, control, floor, or victory rule reverses unless a later accepted specification explicitly defines that behavior

#### Scenario: World tint does not silently recolor floors
- **WHEN** `W` changes but an authored floor color does not
- **THEN** floor movement behavior remains determined by that visible floor color; world gates and the goal use the new `W`

### Requirement: V2 blue floors settle directional sliding within the round
Entering a V2 blue floor SHALL continue the moving dot, or a transport-compatible object, in its incoming direction through consecutive blue cells until a legal non-blue destination is reached or the next destination is blocked. Motion SHALL stop on the last legal cell and SHALL NOT create next-round memory. Existing conveyor redirection, portal termination, and finite-chain safety SHALL remain applicable.

#### Scenario: Consecutive blue floors lead to ordinary floor
- **WHEN** the dot enters a blue run followed by a legal ordinary floor
- **THEN** it crosses the blue cells and stops on the ordinary floor within the same round

#### Scenario: A wall ends a blue run
- **WHEN** the next step from a blue cell is solid or outside the board
- **THEN** the dot stops on that blue cell without entering the blocker or requiring a forced next input

#### Scenario: Crate reaches red floor through ice
- **WHEN** an eligible moving crate slides off blue onto red floor
- **THEN** it stops there and cannot be moved again while that supporting floor remains red
