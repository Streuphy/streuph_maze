# Proposal

## Why

The engine already has deterministic conveyor chains, but it does not model ice-like sliding or momentum that carries a player or pushed crate beyond a single forced tile. World 4 will turn the existing conveyor foundation into a complete, testable vector-movement showcase without adding a wall-clock or reflex mechanic.

## What Changes

- Preserve existing conveyor semantics and add deterministic sliding over designated ice/force channels until a stopping condition is reached.
- Define how player and crate movement, direction changes, collisions, loops, bounds, and move caps resolve within one input action.
- Include forced movement in undo, solver state, rendered step records, and par accounting without charging separate strokes for automatic hops.
- Author an independent eight-level world pack following the tutorial-to-mastery progression, adapting “high-speed” and “crushing” descriptions to safe turn-based behavior.
- Test chain termination, crate/player distinctions, collision safety, solver agreement, and exact level pars.

## Capabilities

### New Capabilities
- `vector-momentum`: Deterministic conveyor and sliding movement for players and crates, resolved synchronously as part of a turn.

### Modified Capabilities

None. No main OpenSpec capabilities have been archived yet.

## Impact

- Tile catalogue and glyphs: `src/js/tiles.js`.
- Movement resolution and step playback: `src/js/sm-rules.js`, `src/js/sm-render.js`.
- Solvability/par search and world pack: `src/js/levels.js`, `data/worlds/`.
- Regression and browser coverage: `tests/verify.js`, `tests/browser-test.js`.
- Depends on the shared world-pack contract from `world-1-sokoban`; existing belt rules and their tests must remain compatible.
