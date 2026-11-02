# Conveyor transport specification delta

## Purpose

Defines neutral-tint directional floor conveyors and their deterministic queued transport of eligible objects, including the dot and explicitly movable features.

## ADDED Requirements

### Requirement: A conveyor is floor with an explicit exit direction and inert tint
A conveyor SHALL be a passable floor tile with one North, East, South, or West exit direction and White tint by default. Supported four-color tint values SHALL be behaviorally inert and reserved for later use. The direction SHALL designate the adjacent exit destination, not an entry side. Invalid or diagonal vectors SHALL be rejected.

#### Scenario: Passenger arrives from any side
- **WHEN** an eligible actor enters a North conveyor from East or West
- **THEN** its proposed exit is the adjacent North cell, irrespective of its incoming vector

#### Scenario: Tint changes without other configuration changes
- **WHEN** a conveyor's tint changes among supported colors
- **THEN** passenger eligibility, destination, queue priority, collisions, events, and stroke result remain identical

### Requirement: Initial queue seeding checks all conveyor occupants
After a committed direct direction/push/pull or accepted ACTION, the round SHALL check all conveyors in stable board order and seed transport for eligible occupants, including actors not moved by the direct action. These checks SHALL NOT run before the direct action or on a blocked direct command. Signal work SHALL retain priority over transport.

#### Scenario: A stationary crate rides on rest
- **WHEN** ACTION is issued elsewhere and a conveyor has an eligible stationary crate
- **THEN** that crate receives a queued transport request during the same round

#### Scenario: Direct movement leaves a conveyor
- **WHEN** the dot legally leaves a belt in the initiating direct action
- **THEN** initial occupant checking uses the post-direct board and does not transport the dot as a stale source occupant

### Requirement: Every eligible passenger uses shared current-state legality
The dot, conveyor-compatible crates, and transport-enabled features SHALL use the same conveyor trigger and destination legality path. At dequeue, each request SHALL revalidate actor identity/source, bounds, effective closure, carrier filters, layer capacity, and declared capability. A legal effect SHALL move one passenger one cell atomically before deriving new work.

#### Scenario: Dot and crate use the same exit rule
- **WHEN** separate fixtures place an eligible dot or crate on the same configured conveyor with equivalent legal destinations
- **THEN** both move to its adjacent exit cell without a dot-only/crate-only belt branch

#### Scenario: Target movement is explicitly enabled
- **WHEN** a movable target's profile enables conveyor transport
- **THEN** queued relocation preserves its identity/link and supporting terrain; default stationary targets are not transported

### Requirement: Blocked conveyors do not invent pushing
An occupied, incompatible, out-of-bounds, or closed exit SHALL block that transport request without relocating another actor, changing the belt, or adding a stroke. A conveyor SHALL NOT push objects merely standing in front, confer crate-chain strength, or override layer capacity. A discarded attempt SHALL still count toward the action budget.

#### Scenario: Another crate occupies the exit
- **WHEN** a passenger's requested exit is occupied by a blocking crate
- **THEN** neither crate is implicitly shoved or deleted; the blocked passenger remains at its source

#### Scenario: A prior request moves the captured passenger
- **WHEN** the queued request no longer finds its actor at the captured source
- **THEN** it is discarded as stale and does not move the source's replacement occupant

### Requirement: Conveyor arrivals generate ordered subsequent work
Every committed conveyor hop SHALL derive signals/closure and capture entry/departure events. Arrival at another belt SHALL enqueue a continuation for that actor/source without duplicating equivalent pending work. Subsequent effects SHALL obey common priority and conflict rules. Repeated queue state or exhausted budget SHALL roll back the whole action.

#### Scenario: A belt carries a crate onto a target
- **WHEN** a queued conveyor hop places a crate on a target
- **THEN** the resulting signal reactions precede lower-priority remaining work

#### Scenario: A belt loop cannot settle arbitrarily
- **WHEN** a closed conveyor cycle repeats complete gameplay/queue state
- **THEN** a deterministic action-abort diagnostic and complete rollback occur

### Requirement: Every conveyor asset communicates the same unique exit direction
The registry, authored pack parameters, runtime glyph, inspector, codex, and gallery SHALL agree on one cardinal exit arrow for every conveyor. IDs 60–67 SHALL retain stable data identity while sharing the same passenger behavior. Obsolete passenger-kind labels and branching SHALL NOT remain authoritative.

#### Scenario: All directional variants are inspected
- **WHEN** each conveyor ID and supported direction override is shown in game and gallery
- **THEN** one clear arrowhead and accessible direction label identify the actual exit

#### Scenario: Same-direction IDs are compared
- **WHEN** two conveyor IDs have the same direction and tint
- **THEN** they have equivalent transport semantics for the dot, crates, and eligible features
