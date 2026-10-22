# Proposal

## Why

The engine already implements and tests orthogonal crate-adjacency receivers, but it lacks a dedicated Goof-inspired world pack that teaches color-matched docking and linked route control. This change turns the existing mechanic into a complete, solver-checked showcase while protecting it from being conflated with World 1's crate-on-target rule.

## What Changes

- Preserve the receiver rule: a receiver is active only while a matching-color crate is immediately north, south, east, or west; diagonal and same-cell crates do not count.
- Provide any additional color/link tile variants needed to express independent receivers within the current tile-ID-keyed override model.
- Author an independent eight-level world pack following the tutorial-to-mastery progression, including multi-crate docking and re-docking puzzles.
- Integrate the pack with world-qualified progress, direct level selection, visible sensor directions, and the common local world-pack workflow.
- Verify each level's receiver/link behavior, solvability, intended route, and exact par; preserve the separate World 1 occupancy-target semantics.

## Capabilities

### New Capabilities
- `crate-proximity-switches`: Color-matched orthogonal crate adjacency activates and deactivates linked receivers in the Goof world.

### Modified Capabilities

None. No main OpenSpec capabilities have been archived yet.

## Impact

- Sensor catalogue and rules, if the pack requires additional variants: `src/js/tiles.js`, `src/js/sm-rules.js`, `src/js/levels.js`.
- Pack content and display: `data/worlds/`, `src/js/sm-render.js`, `src/js/sm-io.js`, `src/js/sm-ui.js`.
- Existing sensor checks and new pack/browser tests: `tests/verify.js`, `tests/browser-test.js`.
- Depends on the shared world-pack/crate-overlay contracts from `world-1-sokoban`; ID 50 adjacency semantics remain unchanged.
