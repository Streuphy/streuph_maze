# Event resolution specification delta

## Purpose

Defines the single synchronous V2 action transaction, atomic effect queue, terminal precedence, and rollback/lifecycle guarantees shared by all tiles and objects.

## ADDED Requirements

### Requirement: One initiating action resolves as one synchronous transaction
The resolver SHALL finish a valid initiating movement, push, pull, or ACTION transaction without timers, rendering decisions, or interleaved gameplay input. A blocked direct command SHALL increment attempts only and seed no propagation. Committed direct movement and ACTION SHALL each cost one stroke; automatic work SHALL add none.

#### Scenario: Blocked input does not tick conveyors
- **WHEN** a wall or illegal atomic move blocks the initiating direction
- **THEN** no belt, entry, signal reaction, or hazard work runs and no stroke is charged

#### Scenario: ACTION can advance stationary environmental passengers
- **WHEN** ACTION is accepted on ordinary floor without an action hook
- **THEN** it still opens one propagation round and costs one stroke

### Requirement: Direct multi-actor moves commit atomically
A direct push or pull SHALL validate all participating destinations before committing any position. Derived signals and tile handlers SHALL observe either the complete pre-move or complete post-move board, never a half-push or half-pull. Ordinary queued destination conflicts SHALL block only the conflicting effect, not undo earlier legal commits.

#### Scenario: Target occupancy sees the complete push
- **WHEN** the dot pushes a crate onto a target
- **THEN** signal derivation sees both final positions together and no transient crate/dot overlap

#### Scenario: Later request loses a destination conflict
- **WHEN** two queued actors request a single-capacity destination and the first request commits legally
- **THEN** the second revalidates and blocks without overwriting either actor or rolling back the first request

### Requirement: Priority and source order determine every queued effect
Queued work SHALL run in signal-reaction, transport, then ordinary-effect priority. Within a priority, order SHALL be source runtime y ascending, x ascending, then enqueue sequence. After every atomic commit, derive current signals/closure and insert new work into the same ordering before processing lower-priority work.

#### Scenario: Transport creates a signal edge
- **WHEN** a conveyor hop creates a target or receiver activation edge
- **THEN** the resulting signal reactions run before remaining transport and ordinary effects

#### Scenario: Equal-priority sources compete
- **WHEN** equal-priority effects share a source coordinate
- **THEN** their enqueue sequence deterministically breaks the tie independently of animation timing

### Requirement: Entry and departure records preserve committed trigger identity
Every committed actor hop SHALL capture immutable source/destination, actor identity, and declared trigger payload. Supported entry/departure effects SHALL run once for that event even if the actor later moves. Occupancy activity SHALL instead derive from current positions, and only activity edges SHALL enqueue signal reactions.

#### Scenario: Intermediate prism entry is retained
- **WHEN** the dot enters a prism and transport moves it away before ordinary effects execute
- **THEN** the captured prism effect still addresses that dot once and does not retarget a new occupant

#### Scenario: Continued occupancy does not retrigger an edge
- **WHEN** a receiver remains active through several commits
- **THEN** no duplicate activation edge is queued until it first becomes inactive and then active again

### Requirement: Handler mutation batches are validated atomic effects
A registered synchronous tile handler SHALL be allowed to mutate gameplay state within one atomic invocation. The resolver SHALL validate the complete batch and derive downstream work afterward. Bounds, occupancy, supported values, source references, counters, outcomes, and queued records SHALL remain valid. YAML SHALL NOT define executable handlers.

#### Scenario: Handler changes positions and color together
- **WHEN** a valid registered effect mutates multiple gameplay fields
- **THEN** later effects observe the whole validated batch and ordered events describe every committed change

#### Scenario: Handler leaves invalid occupancy
- **WHEN** a handler creates illegal object overlap or malformed queued work
- **THEN** invariant validation aborts and restores the whole initiating action

### Requirement: Cycles and exhausted effect budgets abort the whole action
The transaction SHALL abort on repeated complete gameplay-plus-ordered-queue state, failed invariants, handler exceptions, or more than `64 × board cell count` effect attempts. Blocked/discarded attempts SHALL count. Abort SHALL restore the full pre-action snapshot, discard pending work and tentative counters/progress, and return a non-gameplay diagnostic rather than failure.

#### Scenario: Conveyor cycle repeats
- **WHEN** transport reproduces the same gameplay state and semantically ordered pending work
- **THEN** the initiating action is rolled back, not stopped at an arbitrary loop endpoint

#### Scenario: Blocked requests exhaust the budget
- **WHEN** repeated blocked work reaches the attempt bound
- **THEN** the same full-action rollback occurs and no score or completion is committed

### Requirement: Physical closure is uniform across dynamic surfaces
Linked gates, polarity barriers, and master-controlled void SHALL share one closure policy. A crate SHALL defer effective physical closure while retaining its legal departure; the surface SHALL close immediately after it leaves unless reopened first. Physical closure beneath the dot SHALL cause terminal failure. Carrier-color mismatch alone SHALL NOT be physical closure.

#### Scenario: A pending gate reopens
- **WHEN** signals reopen a surface before its occupying crate leaves
- **THEN** its pending-close condition disappears without relocating the crate

#### Scenario: A crate leaves a pending surface
- **WHEN** the crate departs while closure is still requested
- **THEN** effective closure applies before any later queued request enters

#### Scenario: Phase void solidifies beneath the dot
- **WHEN** a master effect requests and realizes solidity at the dot's phase-void cell
- **THEN** the transaction commits terminal failure before goal evaluation or another effect

### Requirement: Matching goal entry interrupts after signal reactions
After a committed dot-entry hop, the resolver SHALL process that hop's signal reactions and closure consequences before its goal checkpoint. A legal, still-occupied matching goal entry SHALL then win immediately and cancel remaining work/ray sampling. Mismatching entry or stationary matching color SHALL NOT award victory. Closure failure SHALL take precedence.

#### Scenario: Winning entry precedes a later ray sample
- **WHEN** the dot legally enters a matching goal and no closure failure occurs during its signal reactions
- **THEN** victory commits before later transport/ordinary effects and the final hazard sample does not run

#### Scenario: Color changes while already on the goal
- **WHEN** an ordinary effect changes colors to equality without a new goal entry
- **THEN** the level remains uncleared until the dot legally re-enters while matching

### Requirement: Terminal failure is committed and restart-only
Physical closure failure or final settled-ray exposure SHALL freeze the failed board and preserve the normal initiating stroke. Gameplay actions and undo SHALL be blocked in `failed`; restart and UI navigation SHALL remain available. Failure SHALL NOT award completion or best score, and SHALL NOT be treated as a rollback diagnostic.

#### Scenario: Restart clears terminal state
- **WHEN** a failed attempt is restarted
- **THEN** positions, colors, latches, closure queries, counters, and outcome return to authored initial values with no pending work

#### Scenario: Failure cannot be undone into a solution
- **WHEN** the player or solver addresses a failed state
- **THEN** no further gameplay/undo transition is accepted until restart or another level is loaded

### Requirement: All transition-relevant state shares lifecycle and event guarantees
Construction, clone, snapshot/restore, restart, solver identity, and display mirrors SHALL preserve every gameplay field affecting queued outcomes. Pending closure SHALL be derived consistently. Queue identity SHALL include ordered effect semantics and transition-relevant context. Rendering SHALL consume complete committed events and SHALL NOT decide gameplay or persist pending rule work between rounds.

#### Scenario: Undo a successful nonterminal multi-effect action
- **WHEN** an allowed undo restores a completed nonterminal action
- **THEN** positions, latches, colors, requested/effective closure, outcome, and counters match its pre-action state exactly

#### Scenario: Same input uses different playback speed
- **WHEN** equal states receive the same action with different rendering timing
- **THEN** committed state, diagnostic/terminal outcome, event order, and solver transition are identical
