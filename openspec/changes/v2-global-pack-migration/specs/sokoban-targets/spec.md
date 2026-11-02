# Sokoban targets specification delta

## MODIFIED Requirements

### Requirement: Crate occupancy activates a target
A target SHALL derive activity only from a same-cell crate after every complete atomic commit. Dot occupancy, adjacency, and stale captured entry events SHALL NOT activate it. Activity edges SHALL enqueue signal reactions; unchanged occupancy SHALL NOT retrigger activation.

#### Scenario: Crate is pushed onto a target
- **WHEN** a push atomically places a crate on the target and the dot in its vacated cell
- **THEN** post-commit derivation activates the target before lower-priority work sees the board

#### Scenario: Crate is adjacent to a target
- **WHEN** a crate is next to but not on a target
- **THEN** that target remains inactive

#### Scenario: Player stands on a target
- **WHEN** the dot occupies a target without a same-cell crate
- **THEN** the feature is non-blocking and inactive

### Requirement: Target activity controls its linked gate
Target activity SHALL contribute a momentary signal to its matching link after each atomic commit, combining with other active sources by OR. Release SHALL update the closure request immediately; effective closure SHALL use the common crate-pending/dot-failure policy rather than waiting for the round to finish.

#### Scenario: Occupied target opens linked gate
- **WHEN** a commit places a crate on a target linked to a closed gate
- **THEN** derivation/reactions open its requested route before later queued movement evaluates that gate

#### Scenario: Crate leaves a momentary target
- **WHEN** the last satisfying source on the link becomes inactive
- **THEN** the gate's closure request returns to its combined configured state with pending or terminal consequences applied immediately

#### Scenario: Unrelated link remains unchanged
- **WHEN** a target on one link changes
- **THEN** that signal does not directly alter unrelated links

#### Scenario: Multiple target and gate links coexist
- **WHEN** multiple target/gate pairs and other signal sources coexist
- **THEN** each link uses only its assigned sources and combines simultaneous satisfactions with OR

### Requirement: Sokoban crates can only be pushed
World 1 SHALL retain push-only crates and stationary non-blocking target features. Each push SHALL preflight both actor destinations and commit dot/crate together before deriving targets. World 1 SHALL NOT gain automatic pulling, color/floor mobility tiers, or implicit chain pushing from the global migration.

#### Scenario: Successful push
- **WHEN** the dot faces a crate whose destination and following dot cell are legal
- **THEN** crate and dot move atomically as one stroke

#### Scenario: Crate leaves its starting cell
- **WHEN** a crate is pushed away
- **THEN** its source exposes unchanged supporting terrain/feature state

#### Scenario: Blocked push
- **WHEN** the crate destination is illegal or occupied incompatibly
- **THEN** neither actor moves and no direct stroke is charged

#### Scenario: Pull is not part of World 1 Sokoban
- **WHEN** an explicit pull addresses a default World 1 crate
- **THEN** the request blocks without relocation or a stroke

#### Scenario: World 1 target remains a floor marker
- **WHEN** an unsupported target-relocation request is made
- **THEN** the marker stays stationary; ordinary dot movement onto it remains legal and does not activate it

### Requirement: Sokoban state is undoable and solver-visible
Crates, target positions/identity, signal activity, closure requests/effective state, and outcome SHALL agree in play, clone, snapshots/restoration, and search. Successful nonterminal actions SHALL be exactly undoable; terminal closure SHALL block undo. Minimum routes SHALL use the same V2 atomic effects and signal priority as play.

#### Scenario: Undo a crate push onto a target
- **WHEN** an allowed undo restores a successful nonterminal target push
- **THEN** dot, crate, target activity, closure, and counters match their pre-action values

#### Scenario: Solver evaluates target route
- **WHEN** World 1 solvability and PAR are certified
- **THEN** search and replay use the same immediate occupancy edges and terminal-aware closure behavior as interactive play
