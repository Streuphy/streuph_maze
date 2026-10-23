# binary-gate-polarity Specification

## Purpose

Defines a deterministic level-wide binary polarity switch that exchanges the passability of complementary red and blue barrier classes.

## Requirements

### Requirement: Binary polarity controls complementary barriers
The system SHALL maintain one binary polarity per level, with exactly one of the red and blue barrier classes passable at a time.

#### Scenario: Initial polarity is applied
- **WHEN** a level starts in its configured polarity
- **THEN** every red and blue phase barrier is evaluated using that same initial state

#### Scenario: Polarity is flipped
- **WHEN** the player activates a polarity switch
- **THEN** the global polarity changes once and red/blue barrier passability is exchanged across the whole level

#### Scenario: Ordinary wall is unaffected
- **WHEN** the global polarity changes
- **THEN** ordinary walls and non-polarity gates retain their existing behavior

### Requirement: Closed polarity barriers block entry and crate pushes
The system SHALL treat a closed polarity barrier as solid for both player entry and crate destinations, and an open barrier as traversable under the normal movement rules.

#### Scenario: Player attempts to enter a closed barrier
- **WHEN** the player moves into a barrier closed by the current polarity
- **THEN** movement is blocked and no stroke is charged

#### Scenario: Crate is pushed toward a closed barrier
- **WHEN** a crate's destination is a barrier closed by the current polarity
- **THEN** the push is blocked and neither player nor crate moves

#### Scenario: A polarity flip closes a barrier beneath a crate
- **WHEN** a switch changes polarity while a crate occupies a barrier that becomes closed
- **THEN** the crate remains in place, may be pushed off under normal rules, and cannot be pushed back into the barrier until it opens

#### Scenario: A player is already on a barrier that becomes closed
- **WHEN** a runtime or restored state has the player on a barrier cell that is solid under the current polarity
- **THEN** the player is not ejected, may leave under normal movement rules, and cannot re-enter until the barrier opens

The current switch is a single-cell tile activated only by ACT while occupied, so the player-on-closing-barrier case is a defensive state invariant rather than a state reachable through the ordinary switch interaction. It is verified with a focused state fixture; no remote activation or layered-tile mechanic is implied.

### Requirement: Polarity state is undoable and solver-visible
The system SHALL include polarity in turn snapshots, restoration, state identity, and solvability search so that undo and computed par match interactive play.

#### Scenario: Undo a polarity flip
- **WHEN** the player undoes a switch activation
- **THEN** the prior polarity, barrier passability, and stroke count are restored

#### Scenario: Solver evaluates switch order
- **WHEN** a level's solvability and par are computed
- **THEN** the solver explores the same binary switch transitions and red/blue barrier rules as gameplay

### Requirement: Hyrule Flip-Flop has eight progressive levels
The world pack SHALL contain eight named levels following the blueprint progression, with deterministic switch order puzzles and boards no larger than 16 columns by 9 rows.

#### Scenario: Tutorial flips one route
- **WHEN** the player selects level 1 and activates its crystal switch
- **THEN** one red/blue route pair visibly exchanges passability and exposes the intended path

#### Scenario: Odd corridor uses the stated dimensions
- **WHEN** level 6 is authored as the corridor remix
- **THEN** its grid is 16 columns by 2 rows, resolving the table/prose dimension mismatch

#### Scenario: Mastery coordinates many barriers
- **WHEN** the player selects level 8
- **THEN** one deterministic polarity state governs the full 16×9 barrier arrangement
