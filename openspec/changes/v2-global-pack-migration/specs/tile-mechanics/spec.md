# Tile mechanics specification delta

## MODIFIED Requirements

### Requirement: The tile catalogue is documented by stable ID and behavior
The system SHALL document every registered tile and the dot using a uniform V2 definition covering identity/layer, defaults, color meaning, triggers/queue, legality, commits/events, blocked/terminal behavior, presentation, and lifecycle. Usage SHALL distinguish shipped IDs from supported unused entries. Reserved/unsupported IDs SHALL NOT acquire guessed behavior.

#### Scenario: Designer looks up an implemented tile
- **WHEN** a designer looks up a supported ID
- **THEN** the maintained reference supplies its complete definition, effective authoring parameters, and shipped pack usage

#### Scenario: Designer encounters a reserved or unsupported ID
- **WHEN** a grid uses an unknown, reserved, retired, or explicitly unimplemented ID
- **THEN** the level is rejected with a diagnostic rather than assigning the ID guessed behavior

**Complete supported-ID index (full definitions and usage are maintained in the tile reference):**

| ID(s) | Definition | V2 attributes and behavior |
|---|---|---|
| 0 | Ordinary floor | Passable terrain; no intrinsic entry/ACTION effect. |
| 1 | Start | Unique dot-origin floor marker; restart origin, not a recovery teleport. |
| 2 | Goal | Unique passable marker; color follows `W`; matching entry checkpoint commits immediate victory. |
| 3 | Wall | Solid; blocks movement and rays. |
| 4 | Phase void | Normally passable; `master_void` requests solidity; common occupied-surface closure applies. |
| 5 | Ice | Incoming-direction queued transport, per-hop effects, no next-round memory. |
| 10,26,27 | Linked barriers | Links 1/2/3; requested closed by default; common pending/failure closure. |
| 11,12,13 | Prisms | Default Red/Green/Blue; captured dot-entry or current ACTION sets `P`. |
| 20 | Cycle dial | Sets `W` through White→Red→Green→Blue→Red on captured entry/current ACTION. |
| 21 | Reset dial | Sets `W` to White on captured entry/current ACTION. |
| 22 | Linked set dial | Default link 1/Red; sets `W` when the configured source link is active at execution. |
| 23,24,25 | Target features | Links 1/2/3; crate occupancy only; stationary, non-blocking, ray-transparent defaults. |
| 30,31,32,33 | Dot-carrier gates | Require `P` White/Red/Green/Blue; unwired link 0/open lock default. |
| 34,35,36 | World-carrier gates | Require `W` Red/Green/Blue; unwired link 0/open lock default. |
| 40,42 | Player plates | Dot occupancy; tagged momentary link 1 default. |
| 41 | Tagged toggle | Link 1; each captured entry/current ACTION flips one latch. |
| 44 | Master lock | Global latch forces physical closure requests for lock-controlled gates. |
| 45 | Master void | Global latch requests solidity for phase void. |
| 46,47 | Polarity barriers | Open in `red-open`/`blue-open`; common occupied-surface closure applies. |
| 48 | Polarity crystal | Current-tile ACTION flips the independent binary polarity once. |
| 50 | Receiver | Red/link 1; matching cardinal crate contacts with OR activity. |
| 60,61,62,63 | Conveyors | East/West/North/South exits; White/inert tint; common eligible-passenger transport. |
| 64,65,66,67 | Conveyors | East/West/North/South exits; same transport semantics as 60–63. |
| 70,71,72,73 | Crate objects | White/Red/Green/Blue; pushable/not-pullable, conveyor-compatible, ray-blocking, portal-incompatible defaults. |
| 80 | Portal floor | Link 0 default; paired legal transport; arrival provenance prevents automatic bounce-back. |
| 81,82,83,84 | Emitters | North/East/South/West; queued object transport, final non-winning exposure causes failure. |
| 90,91,92 | Receivers | Green/Blue/White, link 1. |
| 93,94,95,96 | Receivers | Red/Green/Blue/White, link 2. |
| 97,98,99,100 | Receivers | Red/Green/Blue/White, link 3. |

The dot is a separate movable object, not ID 1. Its cardinal movement, explicit
eligible pull, ACTION, color, transport/hazard profile, terminal state, events,
and lifecycle SHALL be documented like other objects. Crate/target markers
normalize over independent terrain. Capability overrides remain explicit.

IDs 6–7 are retired; gaps are not aliases. Gameplay colors are exactly `wht`,
`red`, `gre`, and `blu`; `blk`/`mute` are presentation colors. Conveyor tint is
White by default and mechanically inert. Supported per-ID parameters override
defaults for their level; links assigned to unwired carrier gates default their
lock closed unless explicitly configured otherwise.

### Requirement: Tile effects occur at standard resolver boundaries
The system SHALL use the V2 event-resolution contract: commit direct actions atomically, capture every entered/departed cell, derive signals/closure after each effect, and process signal, transport, then ordinary work. Matching goal-entry checkpoints SHALL interrupt before later work; only a non-winning drained queue SHALL receive final ray exposure testing.

#### Scenario: Movement enters an effect tile
- **WHEN** a successful movement crosses intermediate forced-movement cells
- **THEN** each supported entry effect is captured once and remains queued even if the actor moves again before execution

#### Scenario: Player uses ACT
- **WHEN** ACTION is issued
- **THEN** the current tile's action hook is invoked through the queue and initial conveyor occupants receive transport work; no entry record is fabricated by stationary ACTION

#### Scenario: Ray transport and catch order
- **WHEN** a committed action has not already won or failed and the queue finishes its transport and other work
- **THEN** final rays are traced and exposure causes terminal failure without recovery teleport

#### Scenario: Ray transport precedes player exposure
- **WHEN** queued ray transport has completed in a non-winning action whose queue drains
- **THEN** exposure uses that settled board and commits failure without an extra stroke

#### Scenario: Winning entry precedes ray exposure
- **WHEN** a matching goal entry passes its signal/closure checkpoint
- **THEN** victory cancels remaining work and no later ray sample can replace it

#### Scenario: Goal is reached with unequal colors
- **WHEN** the dot enters a goal with `P` different from `W` at its checkpoint
- **THEN** it does not clear, and a later stationary color match still requires legal matching re-entry

### Requirement: Turns, strokes, and view playback share one deterministic result
The synchronous V2 result SHALL own gameplay outcomes and ordered committed events for display, undo, and solver use. A normal accepted action SHALL have one initiating stroke at most. Invariant/cycle/budget aborts SHALL restore all pre-action gameplay and counters; terminal failures SHALL retain the normal initiating stroke and SHALL NOT permit undo.

#### Scenario: Successful movement has forced hops
- **WHEN** one movement action causes automatic hops or interactions
- **THEN** all substeps belong to one turn and cost only its initiating movement stroke

#### Scenario: Blocked move
- **WHEN** direct movement cannot commit because of a blocker
- **THEN** it costs no stroke and leaves the board unchanged with no environmental propagation

#### Scenario: Blocked action advances the turn counter
- **WHEN** a well-formed directional command is blocked before any direct commit
- **THEN** the attempt increments the turn counter but not the stroke counter

#### Scenario: ACT is used
- **WHEN** ACTION is accepted, including on a tile with no action hook
- **THEN** it costs one stroke and one turn unless the whole transaction aborts diagnostically

#### Scenario: Playback timing changes
- **WHEN** identical states receive identical actions with different display timing
- **THEN** final state, committed events, solver result, and diagnostic/terminal outcome are identical

## ADDED Requirements

### Requirement: Maintained gameplay assets describe only the sole V2 contract
Maintained runtime, packs, tests, help, registry/gallery, and documentation SHALL contain no alternate playable ruleset, obsolete-only compatibility code, or authoritative obsolete-rule instructions. Historical archives and explicitly superseded design records SHALL remain preserved and clearly non-authoritative; Git history and dependency/harness internals SHALL NOT be rewritten.

#### Scenario: Obsolete code has a still-useful generic helper
- **WHEN** cleanup reviews shared parsing, geometry, rendering, or proof helpers
- **THEN** useful V2 behavior is retained without retaining an alternate resolver or deleting code solely because of its age

#### Scenario: Maintained asset audit finds a conflicting recovery tutorial
- **WHEN** active help, a level goal, an accepted specification, or the gallery still teaches recoverable exposure
- **THEN** migration cannot be declared complete until that maintained asset describes the terminal V2 outcome
