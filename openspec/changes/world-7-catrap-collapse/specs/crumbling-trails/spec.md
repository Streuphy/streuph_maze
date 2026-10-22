# Spec Delta

## Purpose

Defines persistent player-triggered floor collapse for Catrap-style trail puzzles, including its effects on movement, undo, rendering, and solvability search.

## ADDED Requirements

### Requirement: Crumble floor collapses when the player leaves it
The system SHALL mark a designated crumble cell collapsed after the player successfully leaves that cell during a resolved action.

#### Scenario: Player exits a crumble cell
- **WHEN** the player makes a successful move away from an intact crumble cell
- **THEN** the cell becomes collapsed for the remainder of the run

#### Scenario: Player enters but has not left a crumble cell
- **WHEN** the player enters an intact crumble cell and remains there
- **THEN** the cell remains intact until the player leaves it

#### Scenario: Blocked movement does not collapse floor
- **WHEN** a move is blocked and the player remains on the current cell
- **THEN** no crumble cell changes state

### Requirement: Collapsed cells cannot be entered or crossed
The system SHALL treat a collapsed cell as impassable for players and crate destinations for the rest of the current run.

#### Scenario: Player attempts to re-enter collapsed floor
- **WHEN** the player moves into a collapsed cell
- **THEN** the move is blocked and no stroke is charged

#### Scenario: Crate destination is collapsed
- **WHEN** a player attempts to push a crate into a collapsed cell
- **THEN** the push is blocked and neither player nor crate moves

### Requirement: Crates do not trigger floor collapse
Moving a crate onto, across, or away from a crumble cell SHALL NOT itself collapse that cell; only the player leaving an intact crumble cell triggers collapse.

#### Scenario: Crate moves off intact crumble floor
- **WHEN** a crate is moved away from a crumble cell that the player has not left
- **THEN** that cell remains intact

### Requirement: Crumble state is undoable and solver-visible
The system SHALL include every collapsed-cell state in turn snapshots, undo restoration, state identity, rendering, and solvability/par search.

#### Scenario: Undo collapse
- **WHEN** the player undoes the move that collapsed a cell
- **THEN** the player, collapsed-cell map, and stroke count return to their exact pre-move values

#### Scenario: Solver avoids collapsed cells
- **WHEN** a level's solvability or par is computed
- **THEN** the solver treats all previously collapsed cells as impassable using the same rules as gameplay

### Requirement: Catrap Collapse has eight progressive levels
The world pack SHALL contain eight named levels matching the blueprint roles and board limits, with each level's intended crumble route solvable within the configured search budget or explicitly reported as unknown.

#### Scenario: Tutorial teaches one-way trail movement
- **WHEN** the player selects level 1
- **THEN** the route teaches that departed crumble cells cannot be revisited before the exit

#### Scenario: Portal remix preserves state deterministically
- **WHEN** a level combines crumble cells with paired portals
- **THEN** portal travel uses the same turn rules and does not restore any collapsed cell

#### Scenario: Mastery uses a bounded route search
- **WHEN** level 8 presents a dense collapse route
- **THEN** the solver returns a bounded `solvable`, `unsolvable`, or `unknown` result without hanging gameplay or file loading
