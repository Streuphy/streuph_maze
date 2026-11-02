# movable-objects Specification

## Purpose

Defines the dot, crates and movable target features through explicit capability profiles, stable identity and independent terrain layers. All operations share the [event-resolution](../event-resolution/spec.md) state/event contract and current destination legality; profiles do not bypass transaction or terminal guarantees.

## Requirements

### Requirement: Movable entities use declared capabilities
Each movable entity, including the dot and movable floor features, SHALL have an explicit rules-visible profile for movement, push/pull, transport, and hazards. The same transaction/queue legality contract SHALL govern every actor. Object color or an old conveyor-kind label SHALL NOT substitute for declared eligibility.

#### Scenario: An object supports an interaction
- **WHEN** a profile permits a requested operation
- **THEN** source identity, bounds, effective closure, carrier filters, and occupancy are revalidated before atomic commit

#### Scenario: An object does not support an interaction
- **WHEN** a profile does not permit the addressed operation
- **THEN** that effect blocks without partial mutation

#### Scenario: A new movable type is added
- **WHEN** a registered movable feature/object is introduced
- **THEN** its capabilities, queue triggers, terminal behavior, visibility, and lifecycle are defined rather than inferred from glyph or ID range

**Default profiles:** the dot is self-movable, conveyor/portal compatible, and
vulnerable to rays. Crates are pushable, not pullable, conveyor-compatible,
ray-blocking, and portal-incompatible. Targets are non-blocking stationary
features, conveyor/portal-incompatible and ray-transparent. Supported per-cell
overrides explicitly enable registered interactions. Crate color does not
control mobility; plain floor tint does not add push/pull or chain strength.

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
The system SHALL atomically push one adjacent permitted object only when its destination and the dot's following cell satisfy common V2 legality. Signals, closure, and trigger capture SHALL observe the complete transaction. No default chain push or conveyor-front shove SHALL be implied.

#### Scenario: Valid crate or target push
- **WHEN** the dot faces a pushable object and both destinations are legal
- **THEN** both actors move in one commit and post-commit derivation follows once for the complete board

#### Scenario: Push destination is blocked
- **WHEN** a destination is out of bounds, solid, carrier-incompatible, or occupied by a blocking actor
- **THEN** neither actor moves and no direct movement stroke is charged

#### Scenario: Push chain is not enabled
- **WHEN** a push would have to move a second blocking object
- **THEN** it blocks without mutating either object or inventing chain strength

### Requirement: Pull moves an eligible trailing object with the mover
The system SHALL provide an explicit pull operation: the dot advances into a legal cell while an eligible immediately trailing object moves into its vacated cell in one atomic transaction. Pullability SHALL use declared profiles, not floor tint, hidden mode, or automatic trailing-crate inference.

#### Scenario: Valid pull
- **WHEN** an explicit pull has a permitted trailing object and both destinations are legal
- **THEN** both relocations commit together as one stroke before signal derivation

#### Scenario: Pull is unavailable or blocked
- **WHEN** no permitted trailing object exists or either destination is illegal
- **THEN** neither actor moves and the blocked command is free

#### Scenario: Pulling onto a tile effect
- **WHEN** a pull relocates an actor onto transport, a switch, or another supported interaction
- **THEN** each committed entry/departure is captured and subsequent work follows queue priority within the same action

### Requirement: Movable targets preserve identity and link behavior
A movable target SHALL remain a non-blocking persistent feature over terrain with stable identity/link when relocated. Its movement SHALL use common legality, queued effects, and closure rules. Ordinary dot movement onto a stationary target SHALL be legal and SHALL NOT be interpreted as a failed relocation attempt.

#### Scenario: Target is pushed or pulled
- **WHEN** an enabled target relocation commits
- **THEN** identity/link move with the feature and its source exposes unchanged terrain

#### Scenario: Crate occupies a relocated target
- **WHEN** crate and target share a cell after an atomic effect
- **THEN** target activity and its link are derived immediately, including release if a later relocation separates them

#### Scenario: Player occupies a target
- **WHEN** the dot stands on a target without a crate there
- **THEN** the target stays inactive and does not block the dot

#### Scenario: Target cannot be relocated safely
- **WHEN** a target destination violates bounds, passability, profile, blocking occupancy, or another target's feature capacity
- **THEN** the relocation blocks without losing its state or identity

#### Scenario: Target movement is not enabled
- **WHEN** an explicit target-relocation request addresses a stationary target
- **THEN** it blocks without moving either participant, while normal walking onto that target remains legal

### Requirement: Automatic transport is capability- and destination-aware
Automatic actor relocation SHALL use declared transport eligibility and common current-state legality at every queued hop. Conveyors SHALL follow `conveyor-transport`; ice and portals SHALL capture their committed transitions and respect V2 priority, invariants, and rollback. Ordinary blocked work SHALL retain the last legal position without crushing or implicit displacement.

#### Scenario: Compatible conveyor carries an object
- **WHEN** a conveyor checks an eligible occupant at queue opening or arrival
- **THEN** it requests one legal exit step using the same behavior for the dot, crates, and enabled features

#### Scenario: Incompatible conveyor meets an object
- **WHEN** an occupant's profile disables conveyor transport
- **THEN** that conveyor does not move it

#### Scenario: Ice continues a compatible object's motion
- **WHEN** an eligible actor enters ice with an incoming direction
- **THEN** queued steps continue that direction until a non-ice landing or blocker, deriving/capturing each hop

#### Scenario: Portal transports an eligible object
- **WHEN** an eligible actor enters a portal with a legal partner destination
- **THEN** one portal hop commits, captures transitions, and uses arrival provenance to end that automatic portal chain without a bounce-back

#### Scenario: Transport is blocked
- **WHEN** a queued destination is out of bounds, closed, carrier-incompatible, or occupied incompatibly
- **THEN** that effect blocks at the source without deleting actors or undoing unrelated earlier commits

### Requirement: Rays can transport compatible objects and threaten exposed players
Static cardinal rays SHALL queue capability-enabled non-dot transport under V2 ordering and common hop legality. Final exposure SHALL threaten the dot only after a non-winning queue drains. Immediate matching goal entry SHALL precede final sampling; exposure SHALL produce terminal failure rather than a transport to the start.

#### Scenario: Transport-capable object enters an active ray
- **WHEN** a permitted object is selected for emitter transport
- **THEN** legal hops are queued and revalidated with stable source order and per-emitter actor provenance, not duplicated as new whole-ray sessions

#### Scenario: Player is exposed to a hostile ray
- **WHEN** the non-winning queue drains and the dot is exposed
- **THEN** the attempt becomes failed with the settled board preserved and normal initiating stroke only

#### Scenario: Ray is shielded
- **WHEN** a ray reaches a wall, effectively closed surface, or ray-blocking object
- **THEN** cells beyond it are neither transported by nor exposed to that ray

#### Scenario: Ray interaction is disabled for an object
- **WHEN** an object's profile neither transports nor makes it vulnerable
- **THEN** it stays in place and retains its declared opacity

### Requirement: Object movement is finite, undoable, renderable, and solver-visible
Every actor position, profile-dependent result, terminal outcome, and queue-relevant transition SHALL have consistent cloning, snapshots/restoration, solver identity, and ordered display events. Successful nonterminal actions SHALL be undoable; failed attempts SHALL require restart. Cycle/budget/invariant aborts SHALL restore the whole initiating action.

#### Scenario: Undo restores a multi-object turn
- **WHEN** an allowed undo addresses a completed nonterminal action
- **THEN** every actor, target/link state, derived closure, color, and counter returns to its pre-action value

#### Scenario: Solver evaluates object interactions
- **WHEN** search evaluates push, pull, conveyor, ice, portal, or ray transitions
- **THEN** it calls the same V2 resolver, excludes failed successors, and cannot route through failure as recovery

#### Scenario: Forced movement cycles
- **WHEN** complete gameplay and ordered pending work repeat or the action budget is exhausted
- **THEN** all action mutations and tentative counters are restored and a non-gameplay diagnostic is returned
