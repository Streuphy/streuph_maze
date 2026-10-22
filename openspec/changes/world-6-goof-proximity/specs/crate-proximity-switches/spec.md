# Spec Delta

## Purpose

Defines crate-adjacency receivers as the central Goof-inspired puzzle mechanic, preserving color matching and orthogonal contact while adding a complete independent world pack.

## ADDED Requirements

### Requirement: A receiver detects matching crates in cardinally adjacent cells
The system SHALL activate a receiver when at least one crate of its configured color occupies an immediately adjacent north, south, east, or west cell.

#### Scenario: Matching crate touches receiver orthogonally
- **WHEN** a matching-color crate is directly north, south, east, or west of a receiver
- **THEN** the receiver is active and reports the occupied direction

#### Scenario: Crate is diagonal or on the receiver
- **WHEN** a crate is diagonal to or occupies the receiver's own cell
- **THEN** that crate does not activate the receiver

#### Scenario: Crate has the wrong color
- **WHEN** only an orthogonally adjacent crate has a different color from the receiver
- **THEN** the receiver remains inactive

### Requirement: Receiver activity follows crate movement
The system SHALL recalculate receiver activity from the current crate positions after each resolved action and deactivate a receiver when no matching crate remains adjacent.

#### Scenario: Crate is pushed next to a receiver
- **WHEN** a push places a matching crate next to a receiver
- **THEN** the receiver activates and its linked lock is reevaluated in the same resolved turn

#### Scenario: Last matching crate moves away
- **WHEN** the last matching adjacent crate is pushed away
- **THEN** the receiver deactivates and its linked lock returns to its configured state

### Requirement: Receiver colors and links are independently authorable
Each receiver instance used by a level SHALL have a determinable color and lock link, and a receiver SHALL affect only consumers assigned to its link.

#### Scenario: Two receiver colors coexist
- **WHEN** a level contains receivers configured for different crate colors
- **THEN** each receiver responds only to crates of its own configured color

#### Scenario: Two receiver links coexist
- **WHEN** a level contains receivers and gates on distinct links
- **THEN** activity on one receiver's link does not change gates on another link

### Requirement: Receiver state is visible, undoable, and solver-visible
The system SHALL expose active state and cardinal contact directions to the view and SHALL derive the same linked-gate result in play, undo restoration, and solvability/par search.

#### Scenario: Undo crate docking
- **WHEN** the player undoes a move that activated or deactivated a receiver
- **THEN** crate positions, receiver activity, gate state, and stroke count return to their prior values

#### Scenario: Solver evaluates docking route
- **WHEN** a level is checked for solvability or minimum strokes
- **THEN** the solver uses the same color, adjacency, link, and deactivation rules as gameplay

### Requirement: Goof Proximity has eight progressive levels
The world pack SHALL contain eight named levels matching the blueprint progression and board limits, with no level requiring crate-on-target occupancy as a substitute for adjacency.

#### Scenario: Tutorial opens a route by docking
- **WHEN** the player selects level 1 and pushes a crate beside its receiver
- **THEN** the linked route gate opens without requiring the crate to stand on the receiver

#### Scenario: Mastery coordinates dependent docks
- **WHEN** the player selects level 8
- **THEN** the level combines multiple color/link docks whose individual activity and route consequences remain inspectable
