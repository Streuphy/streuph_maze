# Crate proximity switches specification delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Every shipped docking level is migrated and certified
All eight Goof Proximity levels SHALL retain identity/progression and receive replay-proven V2 minima with matching teaching text. Belt-driven docking and re-docking SHALL follow the common conveyor contract, per-hop receiver edges, and common occupied-surface closure. Decorative receivers or route bypasses SHALL be disclosed or corrected.

#### Scenario: Belt-driven docking changes the shortest route
- **WHEN** universal queue-opening transport changes a dock's timing or essential use
- **THEN** the board/lesson/PAR are revised together rather than retaining a passenger-kind exception

#### Scenario: A receiver is claimed essential
- **WHEN** certification states that a receiver/gate is necessary
- **THEN** route review or a controlled disabled-mechanic probe supports that claim under V2
