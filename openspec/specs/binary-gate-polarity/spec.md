# binary-gate-polarity Specification

## Purpose

Defines a deterministic level-wide binary polarity switch that exchanges the passability of complementary red and blue barrier classes.

## Interpretation

Class openness is the requested binary state, not a second cell-level lock.
Effective solidity also applies the common [occupied-surface closure contract](../event-resolution/spec.md):
a crate can defer closure while a dot cannot. Such pending cells do not change
which class the polarity requests open. The crystal remains ACTION-only.

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
Polarity barriers SHALL use their requested binary class state and the common V2 closure contract. Effectively closed barriers SHALL block dot/object destinations. A crate SHALL defer physical closure while occupying the cell; closure beneath the dot SHALL immediately fail the attempt. No ejection, crushing, or silent departure exception SHALL occur.

#### Scenario: Player attempts to enter a closed barrier
- **WHEN** a directional destination is effectively closed by polarity
- **THEN** direct movement blocks without a stroke or propagation

#### Scenario: Crate is pushed toward a closed barrier
- **WHEN** a crate destination is an effectively closed polarity barrier
- **THEN** the atomic push blocks without moving crate or dot

#### Scenario: A polarity flip closes a barrier beneath a crate
- **WHEN** a flip requests closure while a crate occupies that barrier
- **THEN** the crate remains, pending-close is visible, and it can leave legally; effective closure follows its departure unless the request has reopened

#### Scenario: A player is already on a barrier that becomes closed
- **WHEN** derived polarity makes a surface beneath the dot effectively closed
- **THEN** terminal failure commits before a goal checkpoint or later queued effect, without ejection or allowed continued movement

The crystal remains current-tile ACTION-only. Defensive state fixtures SHALL
test occupied closing barriers even where current shipped layouts do not make
that state reachable; no remote crystal activation is implied.

### Requirement: Polarity state is undoable and solver-visible
Polarity, requested/effective barrier state, pending closure, and terminal outcome SHALL agree across atomic effects, derived rebuilding, snapshots/restoration, and search. Successful nonterminal flips SHALL support undo; closure failure SHALL instead require restart and be a terminal non-winning solver successor.

#### Scenario: Undo a polarity flip
- **WHEN** a successful nonterminal flip is undone
- **THEN** prior polarity, requested/effective barrier state, and counters are restored

#### Scenario: Solver evaluates switch order
- **WHEN** search evaluates a crystal activation
- **THEN** it uses the same queued flip and occupied-surface closure outcomes as play and never routes through a failed closure

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

### Requirement: Every shipped polarity level is recertified under V2
All eight Hyrule Flip-Flop levels SHALL preserve their world/key identity and progression while being re-proven under V2. Their boards, text, displayed barrier classes, and PARs SHALL match actual switch/closure behavior, including the complete mastery level rather than a sampled subset.

#### Scenario: Mastery proof is budget-limited
- **WHEN** the larger polarity puzzle returns `unknown`
- **THEN** its declared score is not accepted as a proven V2 PAR and migration remains incomplete until proof or redesign
