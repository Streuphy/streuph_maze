# Proposal

## Why

The engine has no line-of-sight hazard, block-shielding rule, or caught-player response, so it cannot host the Lolo-inspired second world. The world needs deterministic ray puzzles that preserve the game's no-game-over rule and make strategic respawning an intentional, undoable action.

## What Changes

- Add static cardinal ray emitters whose paths are blocked by opaque walls and movable crates.
- When an unobstructed ray catches the player after a resolved action, return the player to the start without resetting strokes or other level state; count the caught action once and allow undo.
- Author an independent eight-level world pack following the tutorial-to-mastery progression, using the common pack format and current board limits.
- Rework “timed” and “sweeping” blueprint descriptions into turn-based deterministic puzzles; add no wall-clock behavior.
- Verify ray occlusion, respawn, solver behavior, pars, and safe-start conditions in rules and browser tests.

## Capabilities

### New Capabilities
- `line-of-sight-hazards`: Deterministic cardinal ray threats that movable crates can shield, with strategic player respawn when caught.

### Modified Capabilities

None. No main OpenSpec capabilities have been archived yet.

## Impact

- Rules/state/resolver/search: `src/js/sm-rules.js`, `src/js/levels.js`.
- Tile registry and visuals: `src/js/tiles.js`, `src/js/sm-render.js`.
- Independent world pack and UI: `data/worlds/`, `src/js/sm-io.js`, `src/js/sm-ui.js`.
- Regression and browser coverage: `tests/verify.js`, `tests/browser-test.js`.
- Depends on the shared world-pack contract being introduced by `world-1-sokoban`; the Prologue and no-game-over behavior remain compatible.
