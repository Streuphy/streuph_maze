# crate-proximity-switches Specification

## Purpose

Defines matching-color cardinal crate-adjacency receivers, their derived contacts and signal edges, and Goof Proximity's eight-level progression. Linked consumers and actor lifecycle use the common V2 state/event and occupied-surface closure contracts.

## Requirements

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
Receiver activity and all matching cardinal contacts SHALL derive from the current board after every atomic commit, including automatic hops. Inactive/active edges SHALL enqueue signal reactions; unchanged activity SHALL NOT repeatedly fire. Multiple matching contacts SHALL combine with OR rather than toggling the receiver per contact.

#### Scenario: Crate is pushed next to a receiver
- **WHEN** an atomic push creates a matching cardinal contact
- **THEN** derivation and resulting signal reactions precede remaining lower-priority work

#### Scenario: Last matching crate moves away
- **WHEN** the final matching contact is lost
- **THEN** release is derived immediately and the link's combined closure request is reevaluated

#### Scenario: One of several matching contacts leaves
- **WHEN** a receiver still has another matching adjacent crate
- **THEN** it remains active and emits no release edge

#### Scenario: Crate crosses adjacency during transport
- **WHEN** two distinct committed hops first create and then remove contact
- **THEN** each activity edge is captured once even though both occur in one initiating round

### Requirement: Receiver colors and links are independently authorable
Each receiver instance used by a level SHALL have a determinable color and lock link, and a receiver SHALL affect only consumers assigned to its link.

#### Scenario: Two receiver colors coexist
- **WHEN** a level contains receivers configured for different crate colors
- **THEN** each receiver responds only to crates of its own configured color

#### Scenario: Two receiver links coexist
- **WHEN** a level contains receivers and gates on distinct links
- **THEN** activity on one receiver's link does not change gates on another link

### Requirement: Receiver state is visible, undoable, and solver-visible
Receiver contacts/activity, combined links, pending/effective closure, and terminal outcome SHALL agree in play, snapshots/restoration, inspection, and search. Successful nonterminal docking actions SHALL be undoable; failed closure attempts SHALL require restart. Same-link receiver/target/plate activity SHALL combine with OR before applying closure.

#### Scenario: Undo crate docking
- **WHEN** an allowed undo restores successful nonterminal docking
- **THEN** all positions, contacts, activity, closure queries, and counters match the pre-action state

#### Scenario: Solver evaluates docking route
- **WHEN** a receiver puzzle is searched and replayed
- **THEN** it uses the same per-hop edges, color/link matching, and terminal-aware closure outcomes as gameplay

#### Scenario: Another source keeps the link open
- **WHEN** one receiver deactivates but another same-link receiver, target, or plate remains active
- **THEN** that release does not close the shared route merely because its own source became inactive

### Requirement: Goof Proximity has eight progressive levels
The world pack SHALL contain eight named levels matching the blueprint progression and board limits, with no level requiring crate-on-target occupancy as a substitute for adjacency.

#### Scenario: Tutorial opens a route by docking
- **WHEN** the player selects level 1 and pushes a crate beside its receiver
- **THEN** the linked route gate opens without requiring the crate to stand on the receiver

#### Scenario: Mastery coordinates dependent docks
- **WHEN** the player selects level 8
- **THEN** the level combines multiple color/link docks whose individual activity and route consequences remain inspectable

### Requirement: Every shipped docking level is migrated and certified
All eight Goof Proximity levels SHALL retain identity/progression and receive replay-proven V2 minima with matching teaching text. Belt-driven docking and re-docking SHALL follow the common conveyor contract, per-hop receiver edges, and common occupied-surface closure. Decorative receivers or route bypasses SHALL be disclosed or corrected.

#### Scenario: Belt-driven docking changes the shortest route
- **WHEN** universal queue-opening transport changes a dock's timing or essential use
- **THEN** the board/lesson/PAR are revised together rather than retaining a passenger-kind exception

#### Scenario: A receiver is claimed essential
- **WHEN** certification states that a receiver/gate is necessary
- **THEN** route review or a controlled disabled-mechanic probe supports that claim under V2
