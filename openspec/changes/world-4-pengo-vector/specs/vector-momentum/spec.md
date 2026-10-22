# Spec Delta

## Purpose

Defines deterministic vector conveyors and ice-like sliding for players and crates in the Pengo-inspired world, as one resolved turn without real-time input.

## ADDED Requirements

### Requirement: Conveyor movement resolves as part of the initiating turn
The system SHALL resolve all consecutive conveyor movement synchronously as part of the player action that enters a conveyor chain, charging no additional strokes for forced hops.

#### Scenario: Player enters a conveyor chain
- **WHEN** a player action ends on a player-carrying conveyor
- **THEN** the player follows each valid conveyor hop in sequence as part of that action until blocked or no conveyor continues

#### Scenario: Crate conveyor pushes a crate
- **WHEN** a player-carrying crate conveyor has a crate in its force direction and the crate can move
- **THEN** the crate advances according to the conveyor rule and the entire chain remains one player stroke

### Requirement: Ice carries an entity along its incoming direction
The system SHALL continue a player or pushed crate in its current direction across consecutive ice cells until it leaves the ice, meets a blocking destination, or enters a conveyor that redirects its motion.

#### Scenario: Player slides across ice
- **WHEN** the player enters an ice cell with a valid movement direction
- **THEN** the player continues in that direction across ice, enters the first valid non-ice cell and stops there, or stops on the last valid cell before a blocker

#### Scenario: Pushed crate slides across ice
- **WHEN** a valid push sends a crate onto connected ice
- **THEN** the crate slides in the push direction under the same stopping rule while the player advances into the crate's former cell

#### Scenario: Automatic movement is free
- **WHEN** one action causes one or more conveyor or ice hops
- **THEN** those forced hops add no strokes beyond the initiating player action

### Requirement: Forced movement is bounded and collision-safe
The system SHALL terminate forced movement within a finite bound and SHALL stop before any out-of-bounds, solid, or crate-occupied destination without crushing or deleting an entity.

#### Scenario: Forced movement reaches an obstacle
- **WHEN** the next forced destination is outside the board, solid, or occupied by another crate
- **THEN** the moving entity remains on its last valid cell and no entity is destroyed

#### Scenario: Conveyor loop reaches its safety bound
- **WHEN** forced conveyor movement cycles without reaching a natural stop
- **THEN** the chain terminates at the documented hop cap and gameplay remains responsive

### Requirement: Vector movement is undoable and solver-visible
The system SHALL return every forced position change as part of the same turn and include its final state in undo restoration and solvability/par search.

#### Scenario: Undo an ice-and-conveyor chain
- **WHEN** the player undoes a turn containing a push and forced movement
- **THEN** player and crate positions, tile state, and stroke count return to their pre-turn values

#### Scenario: Solver follows vector rules
- **WHEN** a level's solvability or par is computed
- **THEN** the solver resolves the same forced movement and stopping conditions as interactive play

### Requirement: Pengo Vector has eight progressive levels
The world pack SHALL contain eight named levels matching the blueprint roles within 16 columns by 9 rows, using deterministic movement and no wall-clock speed or reflex checks.

#### Scenario: Tutorial teaches one vector
- **WHEN** the player selects level 1
- **THEN** one east-directed force route carries the player to a safe stopping cell

#### Scenario: Mastery uses a finite momentum network
- **WHEN** the player selects level 8
- **THEN** the full 16×9 vector network has finite forced chains and a solver-verifiable route
