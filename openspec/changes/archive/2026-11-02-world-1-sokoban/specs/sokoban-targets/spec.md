# Spec Delta

## Purpose

Defines the Sokoban occupancy-target mechanic used by World 1, where crates are pushed onto floor targets to open linked gates and clear the player's route to an exit.

## ADDED Requirements

### Requirement: Crate occupancy activates a target
The system SHALL activate a target only while a crate occupies its cell; player occupancy and orthogonal crate adjacency SHALL NOT activate it.

#### Scenario: Crate is pushed onto a target
- **WHEN** a crate is pushed onto a target cell
- **THEN** that target becomes active during the resolved turn

#### Scenario: Crate is adjacent to a target
- **WHEN** a crate is next to, but not on, a target
- **THEN** that target remains inactive

#### Scenario: Player stands on a target
- **WHEN** the player stands on a target without a crate occupying it
- **THEN** that target remains inactive

### Requirement: Target activity controls its linked gate
The system SHALL use target activity to satisfy the matching lock link, keeping the linked gate passable while the target is occupied and restoring its locked state when occupancy ends.

#### Scenario: Occupied target opens linked gate
- **WHEN** a crate occupies a target linked to a closed gate
- **THEN** the linked gate becomes passable after the turn resolves

#### Scenario: Crate leaves a momentary target
- **WHEN** a crate is pushed off a target that controls a momentary link
- **THEN** the target becomes inactive and its linked gate returns to its configured locked state

#### Scenario: Unrelated link remains unchanged
- **WHEN** a crate occupies a target on one link
- **THEN** gates on other links do not change state because of that target

#### Scenario: Multiple target and gate links coexist
- **WHEN** a level contains target/gate pairs configured on different supported links
- **THEN** each target changes only the gates assigned to its own link

### Requirement: Sokoban crates can only be pushed
The system SHALL let the player move a crate only by entering its cell while the next cell in that direction is in bounds, unoccupied by another crate, and not solid.

#### Scenario: Successful push
- **WHEN** the player moves toward a crate with a valid destination cell beyond it
- **THEN** the crate moves one cell forward and the player enters the crate's previous cell as one player action

#### Scenario: Crate leaves its starting cell
- **WHEN** a crate is pushed away from its initial grid cell
- **THEN** the vacated cell exposes its underlying walkable floor or feature rather than remaining a solid crate tile

#### Scenario: Blocked push
- **WHEN** a crate's destination is outside the board, occupied by another crate, or solid
- **THEN** neither crate nor player moves and the action costs no stroke

### Requirement: Sokoban state is undoable and solver-visible
The system SHALL include crate positions and derived target/gate activity in turn resolution, state cloning, undo restoration, and solvability search so that displayed play, undo, and computed par agree.

#### Scenario: Undo a crate push onto a target
- **WHEN** the player undoes a push that moved a crate onto or off a target
- **THEN** the player, crate, target activity, gate state, and stroke count return to their exact pre-push values

#### Scenario: Solver evaluates target route
- **WHEN** a World 1 level is checked for solvability or minimum strokes
- **THEN** the solver evaluates crate occupancy and linked-gate state using the same rules as interactive play

### Requirement: World 1 levels follow the Sokoban teaching progression
The World 1 pack SHALL contain eight named levels matching the blueprint's tutorial-to-mastery roles, within the engine's 16-column by 9-row maximum; levels 1–3 SHALL avoid unintended irreversible softlocks.

#### Scenario: Tutorial introduces one safe push
- **WHEN** a player selects World 1 level 1
- **THEN** the level presents a single crate-to-target push in a safe, readable layout

#### Scenario: Early levels avoid unintended deadlocks
- **WHEN** World 1 levels 1–3 are reviewed and solver-checked
- **THEN** each has a valid solution and no intended tutorial action causes an irreversible softlock, except where explicitly disclosed as an educational reset lesson

#### Scenario: Later levels express the progression curve
- **WHEN** World 1 levels 4–8 are authored
- **THEN** their layouts and objectives correspond to the blueprint's combinatory, homage/intermediate, remix, hard, and mastery roles respectively

#### Scenario: Par matches the verified optimum
- **WHEN** a World 1 level declares a golf score and the bounded solver finds an optimum
- **THEN** the declared golf score equals the minimum number of strokes to reach the existing valid exit condition
