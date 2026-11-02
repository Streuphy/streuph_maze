# Movable objects specification delta

## MODIFIED Requirements

### Requirement: Movable entities use declared capabilities
Each movable entity SHALL have a rules-visible capability profile that determines which actors and tile mechanics may move, push, pull, transport, or threaten it. In V2, visible supporting-floor constraints SHALL determine crate push/pull eligibility and veto non-dot movement from red floor; object color alone SHALL NOT confer mobility.

#### Scenario: An object supports an interaction
- **WHEN** a movement operation addresses an object whose effective profile and supporting-floor conditions permit that operation
- **THEN** the resolver evaluates its destination using the common bounds, terrain, gate, and occupancy rules

#### Scenario: An object does not support an interaction
- **WHEN** an object profile or a V2 supporting-floor constraint forbids the operation
- **THEN** the operation is blocked without changing any entity or tile state

#### Scenario: A new movable type is added
- **WHEN** a designer uses a new movable object type
- **THEN** its supported movement and tile-interaction capabilities are explicitly defined rather than inferred from its glyph or ID range

**Legacy baseline profiles:** the player is self-movable and vulnerable to hostile rays. Crates are pushable, not pullable, conveyor-compatible, ray-blocking, and portal-incompatible by default. Targets are non-blocking, stationary, conveyor/portal-incompatible, and ray-transparent by default. Supported per-cell overrides may enable other registered capabilities. These defaults preserve classic push-only Sokoban while allowing explicit opt-in to additional interactions. V2 retains non-push/pull transport profiles, but crate push/pull permissions follow floor rules instead of color tiers or authored push/pull overrides.

### Requirement: Designers can configure supported object capabilities per cell
The level format SHALL allow a designer to override an entity's supported capability profile at its authored board coordinate, without changing unrelated entities of the same tile ID. V2 crate push/pull permissions SHALL be floor-derived and SHALL NOT be overridden through this mapping.

#### Scenario: Designer enables an object capability
- **WHEN** `object_overrides` names a cell containing a configurable movable entity and supplies a capability supported by that entity type and ruleset
- **THEN** only that entity receives the capability for this level

#### Scenario: Designer configures a non-entity or unknown capability
- **WHEN** `object_overrides` names an empty/non-movable cell, an unknown coordinate, or a capability unsupported by that entity type or ruleset
- **THEN** level validation rejects the override with a diagnostic

#### Scenario: Level omits object overrides
- **WHEN** a level omits `object_overrides` for an entity
- **THEN** that entity uses its registered default profile, with V2 floor-derived constraints applied where relevant

#### Scenario: V2 crate override attempts to bypass floor rules
- **WHEN** a V2 crate has an authored `pushable` or `pullable` override
- **THEN** validation rejects it and explains that V2 crate push/pull mobility is floor-controlled

The coordinate uses the existing board labels (`A1` is bottom-left). Capability keys are `pushable`, `pullable`, `conveyor`, `portal`, and `ray`; `ray` is one of `block`, `transport`, or `ignore`. An omitted key uses the object's registered default, subject to V2 floor constraints. Player control is not configurable through this mapping.

### Requirement: Push moves one eligible object into a legal destination
The system SHALL push one adjacent eligible object when its destination is legal and unoccupied. Legacy behavior SHALL remain unchanged. V2 SHALL additionally allow an atomic contiguous crate-chain push only when the dot starts the directional action on red floor and every crate and final destination satisfies the V2 movement rules.

#### Scenario: Valid crate or target push
- **WHEN** the player moves toward a pushable crate or target and the next cell is within bounds, non-solid, gate-compatible, and not occupied by a blocking object
- **THEN** the object advances one cell and the player enters the object's former cell as part of the same action

#### Scenario: Push destination is blocked
- **WHEN** the next cell is out of bounds, solid, gate-incompatible, or occupied by another blocking object and no permitted V2 chain transaction exists
- **THEN** neither the player nor pushed object moves and no movement stroke is charged

#### Scenario: Push chain is not enabled
- **WHEN** an object would have to push a second object but the applicable ruleset and source floor do not permit chain pushing
- **THEN** the push is blocked without moving either object

#### Scenario: Dot on red pushes a legal chain
- **WHEN** the dot starts on red floor facing contiguous crates whose source floors permit movement and whose one-cell destinations are all legal after simultaneous relocation
- **THEN** every crate advances one cell and the dot enters the first vacated cell atomically for one stroke

#### Scenario: An immobilized chain member blocks the transaction
- **WHEN** any crate in a proposed chain rests on red floor or has an illegal destination
- **THEN** no crate or dot relocation commits and no stroke is charged

#### Scenario: Chain strength belongs to the initiating dot action
- **WHEN** a V2 conveyor or other automatic movement meets multiple crates
- **THEN** it does not inherit red-floor chain strength merely because the dot started its action on red

### Requirement: Pull moves an eligible trailing object with the mover
Legacy play SHALL provide the existing explicit pull operation. V2 SHALL instead derive a pull from a directional move into a legal empty cell when the immediately trailing crate rests on green floor, or a trailing movable target declares pullability. Both destinations SHALL be legal before either relocation commits. A V2 forward push SHALL NOT also pull a trailing object.

#### Scenario: Valid pull
- **WHEN** the mover issues a legacy pull, or a V2 direction with an eligible trailing object, and both destinations are legal
- **THEN** the mover advances and the trailing object enters the mover's former cell in the same resolved turn

#### Scenario: Pull is unavailable or blocked
- **WHEN** a legacy pull lacks an eligible trailing object or either destination is illegal
- **THEN** neither entity moves and the action costs no movement stroke

#### Scenario: Pulling onto a tile effect
- **WHEN** a pull moves an object onto a conveyor, portal, ray, switch, or target interaction cell
- **THEN** applicable effects resolve in the standard deterministic order and remain part of that one turn

#### Scenario: V2 crate floor determines pull eligibility
- **WHEN** a directional step has a trailing crate on ordinary, blue, red, or Black floor rather than green
- **THEN** it does not pull that crate; an otherwise legal empty-cell step proceeds normally

#### Scenario: Dot floor does not substitute for green beneath the crate
- **WHEN** the dot starts on green but the trailing crate does not
- **THEN** the crate is not made pullable by the dot's floor

#### Scenario: An eligible V2 pull cannot partially commit
- **WHEN** a trailing green-floor crate is eligible but cannot legally occupy the dot's vacated cell
- **THEN** the whole direction is blocked rather than moving the dot alone

#### Scenario: Forward push takes precedence over rear pulling
- **WHEN** a direction faces a pushable object and also has an eligible trailing object
- **THEN** only the forward push transaction is attempted and the trailing object stays in place

### Requirement: Movable targets preserve identity and link behavior
The system SHALL represent a movable target as a persistent feature object over terrain, carrying its link and target behavior when relocated. In V2, ordinary entry onto a stationary non-blocking target SHALL NOT be treated as a failed push; relocating a target SHALL require its supported capabilities and floor legality.

#### Scenario: Target is pushed or pulled
- **WHEN** a legal push or pull moves a target whose effective profile permits that operation
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
- **WHEN** a legacy push or pull addresses a target whose profile does not permit that operation
- **THEN** the action is blocked without moving the target or player and without charging a stroke

#### Scenario: V2 walks over a stationary target
- **WHEN** the V2 dot moves toward a non-pushable target on otherwise legal terrain
- **THEN** the dot enters its cell without relocating or activating the target merely through dot occupancy

## ADDED Requirements

### Requirement: V2 red floor prevents non-dot relocation at every movement boundary
A non-dot object or movable feature resting on V2 red floor SHALL NOT leave that cell through push, pull, conveyor, ice, portal, ray transport, or ACTION-induced relocation. The dot SHALL remain freely movable under ordinary collision rules. Immobilization SHALL derive from current supporting terrain, not a permanent attachment or remembered flag.

#### Scenario: Transport profile cannot override red floor
- **WHEN** an object on red floor is otherwise configured for conveyor, portal, or ray transport
- **THEN** the floor vetoes relocation without deleting the object or making it ray-transparent

#### Scenario: Dot can leave red floor
- **WHEN** the dot stands on red and its chosen destination is legal
- **THEN** it moves normally, with red-floor chain strength available only for its initiating push

#### Scenario: Red crate color does not immobilize
- **WHEN** a red-colored crate rests on non-red floor
- **THEN** its movement permissions are the same as an otherwise identical white-colored crate on that floor

### Requirement: V2 movement preserves independent terrain feature and object layers
V2 SHALL retain a supporting terrain layer, movable target-feature identity/position, and blocking-object occupancy separately. Vacating a cell SHALL reveal its unchanged supporting terrain; relocating a feature SHALL NOT carry or overwrite the source floor color. Empty terrain cells SHALL be representable without an object.

#### Scenario: Crate vacates green floor
- **WHEN** a crate is pulled from green floor
- **THEN** the source cell remains green and the crate's new permissions derive from its destination floor

#### Scenario: Movable tile feature changes position
- **WHEN** a supported movable target is legally relocated from blue floor onto ordinary floor
- **THEN** its identity and link move while the original blue terrain remains at its authored cell

#### Scenario: Target and crate share a cell
- **WHEN** a crate legally enters a target's cell
- **THEN** both identities remain present above the supporting terrain and target occupancy is derived from their shared position
