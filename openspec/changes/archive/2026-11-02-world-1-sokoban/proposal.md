# Proposal

## Why

Streuph's Maze already supports pushing crates, rectangular boards, level-pack YAML loading, and bounded solvability/par checks, but it has no crate-occupancy target mechanic. World 1's legacy registry describes that essential Sokoban rule using obsolete tile IDs and YAML syntax the current loader rejects, so the world cannot be implemented or reliably tested as written.

## What Changes

- Add a crate-occupancy target that activates its linked route gate while occupied by a crate; keep it distinct from World 6's orthogonal crate-adjacency receiver.
- Define safe link representation compatible with the current tile-ID-keyed `overrides` model, and ensure target occupancy and gate state are reflected in resolver state, undo, solver keys, validation, and rendering.
- Author World 1 as its own named `levels` pack with eight levels following the blueprint's tutorial-to-mastery progression, using the current integer-grid format and registered tile IDs.
- Make every level in a loaded world pack directly selectable by its display name, without requiring prior-level clears; retain the built-in Prologue and local `file://` loading workflow.
- Show a level-specific victory image for World 1, using custom `win_picture` art when supplied and a generated solved-board snapshot otherwise.
- Verify every authored level for solvability, exact par, intended gate necessity, crate/target/link consistency, and the tutorial deadlock constraints. Replace the legacy sample layouts and pars where they fail review.
- Preserve Sokoban's push-only rule. Rework the conveyor remix concept if needed so it never implies that crates can be pulled.

## Capabilities

### New Capabilities
- `sokoban-targets`: Crate-occupied targets control linked gates in the Sokoban world, with deterministic turn resolution, undo, solver, validation, and visible state.
- `world-level-packs`: A world is a named YAML level pack whose levels can be loaded directly by name while preserving the Prologue and local-file workflow.

### Modified Capabilities

None. The repository currently has no published OpenSpec capabilities.

## Impact

- Game rules and state: `src/js/sm-rules.js`.
- Tile definitions, parameters, and glyphs: `src/js/tiles.js`.
- Pack validation, solving, input, and level selection: `src/js/levels.js`, `src/js/sm-io.js`, `src/js/sm-ui.js`, and `src/js/sm-store.js` as needed.
- World 1 content: a dedicated YAML pack under `data/worlds/` (exact filename settled in design).
- Tests: headless rules/solver/validation tests and browser UI/loading tests.
- Existing Prologue content, tile IDs, local-first execution, palette, and World 6 receiver semantics must remain compatible.
