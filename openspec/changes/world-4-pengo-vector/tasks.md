# Tasks

## 1. Ice and forced-movement rules

- [x] 1.1 Register walkable ice terrain ID 5 and its glyph; add a registry test for non-solid behavior and verify the combined world tile-ID plan has no duplicate ID.
- [x] 1.2 Implement deterministic ice sliding and the documented push/event ordering; add headless tests for player/crate slide endpoints, first non-ice stopping cell, and push-follow behavior.
- [x] 1.3 Preserve current player/crate conveyor semantics while chaining conveyor-to-ice and ice-to-conveyor movement; run existing belt tests unchanged and add combined-chain regression tests.
- [x] 1.4 Add directed-state loop detection and the `width × height × 4` hop bound; verify cycles stop, bounds/solid/crate collisions stop safely, and no entity is destroyed.
- [x] 1.5 Verify all forced substeps are stroke-free after the initiating action and undo restores the full state; document vector order, cap, and safe no-crushing behavior with the tests.

## 2. Renderer and solver integration

- [x] 2.1 Emit complete forced-movement step records and animate them without view-driven rules; add a browser test comparing the final rendered player/crate positions with resolver state.
- [x] 2.2 Verify BFS uses the real forced-movement resolver and still computes optimum strokes; add a small solvable ice/conveyor fixture plus an explicit bounded-loop fixture.
- [x] 2.3 Add visual/codex documentation distinguishing directional belts from direction-preserving ice; verify the glyph direction and forced stop state are understandable.

## 3. World 4 pack

- [x] 3.1 Confirm the shared world-pack and crate-overlay contracts from `world-1-sokoban` are available; use its file format and local loading path.
- [x] 3.2 Author eight named levels in the blueprint roles, adapting the high-speed alley to turn-based chains and the crushing chamber to safe block compression; verify all grids fit 16×9.
- [x] 3.3 Solve each level and set verified pars; manually review force direction, safe stopping cells, loops, wall/crate interactions, and that no solution depends on crushing or frame timing.
- [x] 3.4 Add content tests for all eight pack levels, dimensions, solver outcomes, and pars; document any deliberate deviations from the source blueprint.

## 4. Integration

- [x] 4.1 Run `npm test` and verify old conveyor tests, new ice/force tests, solver, renderer, and content tests pass.
- [x] 4.2 Load World 4 in Chromium `file://`, execute a player and crate force chain, undo it, and verify the Prologue still behaves identically.
