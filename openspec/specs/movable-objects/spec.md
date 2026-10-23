# movable-objects Specification

## Purpose

Defines how movable gameplay objects advertise and use movement capabilities, including pushable crates and target features. The rules allow new object types to participate in movement, transport, and hazard interactions without bypassing terrain, occupancy, or tile-mechanic constraints.

## Requirements

### Requirement: Movable entities use declared capabilities
Each movable entity SHALL have a rules-visible capability profile that determines which actors and tile mechanics may move, push, pull, transport, or threaten it.

#### Scenario: An object supports an interaction
- **WHEN** a movement operation addresses an object whose profile permits that operation
- **THEN** the resolver evaluates its destination using the common bounds, terrain, gate, and occupancy rules

#### Scenario: An object does not support an interaction
- **WHEN** a movement operation addresses an object whose profile does not permit that operation
- **THEN** the operation is blocked without changing any entity or tile state

#### Scenario: A new movable type is added
- **WHEN** a designer uses a new movable object type
- **THEN** its supported movement and tile-interaction capabilities are explicitly defined rather than inferred from its glyph or ID range

**Baseline profiles:** the player is self-movable and vulnerable to hostile rays. Crates are pushable, not pullable, conveyor-compatible, ray-blocking, and portal-incompatible by default. Targets are non-blocking, stationary, conveyor/portal-incompatible, and ray-transparent by default. Supported per-cell overrides may enable other registered capabilities. These defaults preserve classic push-only Sokoban while allowing explicit opt-in to additional interactions.

### Requirement: Designers can configure supported object capabilities per cell
The level format SHALL allow a designer to override an entity's supported capability profile at its authored board coordinate, without changing unrelated entities of the same tile ID.

#### Scenario: Designer enables an object capability
- **WHEN** `object_overrides` names a cell containing a configurable movable entity and supplies a capability supported by that entity type
- **THEN** only that entity receives the capability for this level

#### Scenario: Designer configures a non-entity or unknown capability
- **WHEN** `object_overrides` names an empty/non-movable cell, an unknown coordinate, or a capability unsupported by that entity type
- **THEN** level validation rejects the override with a diagnostic

#### Scenario: Level omits object overrides
- **WHEN** a level omits `object_overrides` for an entity
- **THEN** that entity uses its registered default profile

The coordinate uses the existing board labels (`A1` is bottom-left). Capability keys are `pushable`, `pullable`, `conveyor`, `portal`, and `ray`; `ray` is one of `block`, `transport`, or `ignore`. An omitted key uses the object's registered default. Player control is not configurable through this mapping.

### Requirement: Push moves one eligible object into a legal destination
The system SHALL push one adjacent object only when the mover and object profiles permit pushing and the object's next cell is legal and unoccupied.

#### Scenario: Valid crate or target push
- **WHEN** the player moves toward a pushable crate or target and the next cell is within bounds, non-solid, gate-compatible, and not occupied by a blocking object
- **THEN** the object advances one cell and the player enters the object's former cell as part of the same action

#### Scenario: Push destination is blocked
- **WHEN** the next cell is out of bounds, solid, gate-incompatible, or occupied by another blocking object
- **THEN** neither the player nor pushed object moves and no movement stroke is charged

#### Scenario: Push chain is not enabled
- **WHEN** an object would have to push a second object but its profile does not permit chain pushing
- **THEN** the push is blocked without moving either object

### Requirement: Pull moves an eligible trailing object with the mover
The system SHALL provide an explicit pull operation in which an eligible mover advances one cell while an eligible object immediately behind it moves into the mover's vacated cell.

#### Scenario: Valid pull
- **WHEN** the mover issues a pull in a direction, the forward cell is legal, and the trailing object's profile permits pulling
- **THEN** the mover advances and the trailing object enters the mover's former cell in the same resolved turn

#### Scenario: Pull is unavailable or blocked
- **WHEN** there is no eligible object directly behind the mover, the mover cannot pull, or either destination is illegal
- **THEN** neither entity moves and the action costs no movement stroke

#### Scenario: Pulling onto a tile effect
- **WHEN** a pull moves an object onto a conveyor, portal, ray, switch, or target interaction cell
- **THEN** applicable effects resolve in the standard deterministic order and remain part of that one turn

### Requirement: Movable targets preserve identity and link behavior
The system SHALL represent a movable target as a persistent feature object over terrain, carrying its link and target behavior when relocated.

#### Scenario: Target is pushed or pulled
- **WHEN** a legal push or pull moves a target whose profile permits that operation
- **THEN** the target occupies the destination, its former location reveals the unchanged underlying terrain, and its link/identity are preserved

#### Scenario: Crate occupies a relocated target
- **WHEN** a crate occupies the target's current cell
- **THEN** the target activates its configured momentary link; moving the target away from the crate deactivates it immediately after state derivation

#### Scenario: Player occupies a target
- **WHEN** the player stands on a target without a crate at the same cell
- **THEN** the target remains inactive and does not block the player

#### Scenario: Target cannot be relocated safely
- **WHEN** a target's destination is outside the board, solid, incompatible with the target profile, or occupied by another blocking object or target
- **THEN** the target remains in place and no state is lost

#### Scenario: Target movement is not enabled
- **WHEN** a push or pull addresses a target whose profile does not permit that operation
- **THEN** the action is blocked without moving the target or player and without charging a stroke

### Requirement: Automatic transport is capability- and destination-aware
The system SHALL move an object automatically only when its profile accepts the triggering tile mechanic and each committed destination satisfies ordinary movement constraints.

#### Scenario: Compatible conveyor carries an object
- **WHEN** an eligible object occupies or enters a conveyor that supports its object kind
- **THEN** it advances in the conveyor's configured cardinal direction until a normal stop, blocker, or bounded loop condition, without additional player strokes

#### Scenario: Incompatible conveyor meets an object
- **WHEN** an object reaches a conveyor that does not support its profile
- **THEN** the conveyor does not move that object

#### Scenario: Ice continues a compatible object's motion
- **WHEN** a compatible moving object enters ice with a direction
- **THEN** it continues along that direction until it leaves ice or the next destination is illegal

#### Scenario: Portal transports an eligible object
- **WHEN** an eligible object enters a portal with a valid matching-link partner
- **THEN** it moves to the partner cell under destination constraints and the teleport ends that object's current movement chain

#### Scenario: Transport is blocked
- **WHEN** the next forced or portal destination is outside the board, solid, gate-incompatible, or occupied by a blocking object
- **THEN** the object stops on its last valid cell and no entity is crushed, deleted, or displaced implicitly

### Requirement: Rays can transport compatible objects and threaten exposed players
The system SHALL resolve static cardinal rays as both capability-gated transport paths and hazards, with object interaction configured by each object's profile.

#### Scenario: Transport-capable object enters an active ray
- **WHEN** a non-player object configured for ray transport is on or enters an unobstructed ray cell during the ray phase of turn resolution
- **THEN** it is carried in the emitter's direction through legal cells until blocked or the ray ends, at most once per emitter in that turn; emitters are processed in stable board scan order

#### Scenario: Player is exposed to a hostile ray
- **WHEN** the final ray-transport phase has completed and the resolved player position lies on an unobstructed hostile ray
- **THEN** the player is returned to the authored start as a one-stroke outcome while crates, target positions, colors, and latches remain unchanged

#### Scenario: Ray is shielded
- **WHEN** a ray reaches an opaque wall, closed barrier, or object configured to block rays
- **THEN** cells beyond that first obstruction are neither transported by nor threatened by that ray

#### Scenario: Ray interaction is disabled for an object
- **WHEN** an object profile neither accepts ray transport nor is vulnerable to that ray
- **THEN** it remains in place and may still block the ray if its profile declares opacity

### Requirement: Object movement is finite, undoable, renderable, and solver-visible
The system SHALL include every object position and capability-dependent result in the resolved event sequence, undo snapshots, state identity, rendering, and level solvability search.

#### Scenario: Undo restores a multi-object turn
- **WHEN** a turn pushes, pulls, transports, or relocates one or more entities
- **THEN** undo restores every entity, target link/activity, derived gate state, and stroke counter to its exact prior value

#### Scenario: Solver evaluates object interactions
- **WHEN** the level solver explores a push, pull, conveyor, portal, or ray interaction
- **THEN** it uses the same capability checks, collision outcomes, event ordering, and stroke cost as interactive play

#### Scenario: Forced movement cycles
- **WHEN** an object's forced movement repeats a directed state or reaches the board-derived safety bound
- **THEN** its chain terminates deterministically without deleting, duplicating, or leaving a partially resolved object
