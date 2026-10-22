# Proposal

## Why

The current engine has no history-dependent floor state, so it cannot express Catrap's collapsing-trail puzzles. World 7 needs an undoable, deterministic rule that turns departed floor into impassable void and a bounded solver representation capable of validating small Hamiltonian-style routes.

## What Changes

- Add designated crumble floor that becomes impassable after the player leaves it; define how crates, portals, start, and goal cells interact with this transition.
- Include the crumble map in turn resolution, cloning, undo, solver state identity, and visual descriptions.
- Author an independent eight-level world pack following the tutorial-to-mastery progression, beginning with a small safe trail and scaling to reviewed multi-route challenges.
- Keep all effects turn-based; make no wall-clock timing changes and retain current portal/crate behavior unless a level explicitly relies on the new floor rule.
- Verify solvability, exact pars when provable, state-budget behavior, undo restoration, and no accidental re-entry onto collapsed cells.

## Capabilities

### New Capabilities
- `crumbling-trails`: Player-departed floor cells become persistent voids that constrain subsequent movement and can be restored by undo.

### Modified Capabilities

None. No main OpenSpec capabilities have been archived yet.

## Impact

- Tile definitions, mutable state, and resolver: `src/js/tiles.js`, `src/js/sm-rules.js`.
- State snapshots and bounded solvability/par search: `src/js/levels.js`.
- World pack, visual state, and tests: `data/worlds/`, `src/js/sm-render.js`, `tests/verify.js`, `tests/browser-test.js`.
- Depends on the shared world-pack and crate-overlay contracts from `world-1-sokoban`; no wall-clock timing is added.
