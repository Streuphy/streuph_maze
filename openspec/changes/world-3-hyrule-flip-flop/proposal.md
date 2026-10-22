# Proposal

## Why

The current global master lock toggles ordinary locks but does not invert two complementary classes of barrier. World 3 needs an explicit binary polarity mechanic so one switch can trade red- and blue-coded routes without introducing real-time timing or new gameplay colors.

## What Changes

- Add a per-level binary polarity and an activatable crystal switch that flips it deterministically.
- Make red and blue phase barriers respond as complementary passable/solid classes to the same polarity; leave ordinary walls, color gates, and the existing master lock semantics unchanged.
- Include polarity in reset, undo, solver state identity, level diagnostics, and visible gate/switch state.
- Author an independent eight-level world pack following the tutorial-to-mastery progression; reinterpret the “2×16 corridor” prose consistently as 16 columns by 2 rows.
- Verify switching order, access routes, pars, and transitions that make a barrier solid beneath the player.

## Capabilities

### New Capabilities
- `binary-gate-polarity`: A level-scoped two-state polarity that swaps passability of red- and blue-coded barriers when activated.

### Modified Capabilities

None. No main OpenSpec capabilities have been archived yet.

## Impact

- Tile catalogue/rendering: `src/js/tiles.js`, `src/js/sm-render.js`.
- Level state, turn resolver, undo, and solver: `src/js/sm-rules.js`, `src/js/levels.js`.
- Independent world pack/UI: `data/worlds/`, `src/js/sm-io.js`, `src/js/sm-ui.js`.
- Regression and browser coverage: `tests/verify.js`, `tests/browser-test.js`.
- Depends on the shared world-pack contract from `world-1-sokoban`; must not repurpose `master_lock` as a polarity switch.
