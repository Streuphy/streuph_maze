# chromatic-aura-routing Specification

## Purpose

Defines the Chip-inspired world as a sequence of puzzles using the existing player aura, world color, and matching gate rules without extending the gameplay palette.

## Requirements

### Requirement: Chromatic puzzles use only the existing four gameplay colors
World 5 SHALL use only `wht`, `red`, `gre`, and `blu`; `wht` SHALL serve the theme's yellow role without creating a yellow state or changing its white gameplay identity.

#### Scenario: White serves the yellow theme role
- **WHEN** World 5 describes or displays the yellow-like key role
- **THEN** it uses the existing `wht` state and does not expose a fifth gameplay color

#### Scenario: Unsupported color mixing is requested
- **WHEN** a level concept would require combining two aura colors into a new state
- **THEN** that concept is represented as sequential color routing or omitted, not as a mixed color state

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

### Requirement: Chromatic levels teach the mechanic without mixing or implicit aura reset
The World 5 pack SHALL contain eight named levels following the blueprint progression, and SHALL NOT rely on color mixing or automatic aura loss while backtracking.

#### Scenario: Beginner variant routes through two prisms
- **WHEN** a beginner level requires two colors in sequence
- **THEN** each prism sets one explicit player aura and the route tests the corresponding existing gate rules

#### Scenario: Backtracking preserves the current aura
- **WHEN** the player walks away from a prism without entering another aura-changing tile
- **THEN** the player's aura remains unchanged

#### Scenario: Mastery uses all palette states
- **WHEN** the player selects level 8
- **THEN** the puzzle may use white, red, green, and blue as distinct existing states without adding a fifth state

### Requirement: Every shipped chromatic route reflects queue timing
All eight Chip's Chromatic levels SHALL be certified with the four-color palette, per-hop captured color effects, declared gate carriers, and entry-only goal victory. Route/name/goal text and PAR SHALL agree. Unsupported mixing, Black carrier state, or stationary-goal shortcuts SHALL NOT be used to preserve an incompatible route.

#### Scenario: Previous route waits on the goal for a color change
- **WHEN** a candidate route depends on stationary matching after mismatched entry
- **THEN** the level/route is revised and re-proven under the entry checkpoint rather than adding a special goal exception

#### Scenario: Transport crosses more than one prism
- **WHEN** a route crosses several prisms before ordinary effects execute
- **THEN** certification replays their captured effects in actual queue order and records the resulting carrier at each later gate/goal decision
