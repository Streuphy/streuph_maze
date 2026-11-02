# Chromatic aura routing specification delta

## MODIFIED Requirements

### Requirement: Prisms set one player aura and matching gates test the correct carrier
Prisms SHALL queue the captured dot's configured color replacement for every supported committed entry, including intermediate transport cells, or occupied ACTION. Gates SHALL test their declared global `P` or `W` carrier and effective lock state when a destination is evaluated. Ordinary tint SHALL NOT create color mixing or object mobility.

#### Scenario: Player passes a matching aura gate
- **WHEN** a destination's action-time `P` equals its required aura color and its effective lock is open
- **THEN** it permits the dot under ordinary occupancy rules

#### Scenario: Wrong player aura is rejected
- **WHEN** the relevant `P` does not match at direct preflight or queued dequeue
- **THEN** that move blocks without implicitly applying a pending lower-priority prism effect early

#### Scenario: World gate checks world color
- **WHEN** a world-color gate is evaluated
- **THEN** it tests current `W`, not `P` or the mover's own crate color

#### Scenario: Dot leaves a prism before its effect executes
- **WHEN** transport moves the dot away after a captured entry
- **THEN** the queued prism effect still sets that dot's aura once and emits a color event

### Requirement: World 5 exits retain the existing matching-goal rule
A chromatic level SHALL clear only at a legal dot-goal entry checkpoint with `P === W`, after that hop's signal/closure reactions. Victory SHALL then cancel remaining ordinary/transport work and final ray sampling. Matching colors reached while stationary on the goal SHALL NOT clear without re-entry.

#### Scenario: Matching colors clear the goal
- **WHEN** a legal goal entry reaches its checkpoint with equal colors and no closure failure
- **THEN** victory commits immediately before remaining work

#### Scenario: Mismatched colors do not clear the goal
- **WHEN** the dot enters the goal while mismatched
- **THEN** it remains uncleared and must legally re-enter while matching even if a later stationary effect makes colors equal

## ADDED Requirements

### Requirement: Every shipped chromatic route reflects queue timing
All eight Chip's Chromatic levels SHALL be certified with the four-color palette, per-hop captured color effects, declared gate carriers, and entry-only goal victory. Route/name/goal text and PAR SHALL agree. Unsupported mixing, Black carrier state, or stationary-goal shortcuts SHALL NOT be used to preserve an incompatible route.

#### Scenario: Previous route waits on the goal for a color change
- **WHEN** a candidate route depends on stationary matching after mismatched entry
- **THEN** the level/route is revised and re-proven under the entry checkpoint rather than adding a special goal exception

#### Scenario: Transport crosses more than one prism
- **WHEN** a route crosses several prisms before ordinary effects execute
- **THEN** certification replays their captured effects in actual queue order and records the resulting carrier at each later gate/goal decision
