# Proposal

## Why

The engine already supports player auras, world colors, and matching gates, but there is no independent Chip-inspired world that teaches those rules through a complete level pack. World 5 should exercise the existing four-state palette while honoring the explicit decision not to add yellow or color mixing.

## What Changes

- Author an independent eight-level chromatic-routing pack using the existing `wht`, `red`, `gre`, and `blu` states; `wht` represents the theme's yellow role without becoming a new gameplay color.
- Teach player-aura prisms, player-color gates, world-color gates, and the existing goal requirement `P === W` through a deliberate tutorial-to-mastery progression.
- Replace blueprint concepts requiring color mixing, automatic aura reset/shedding, or a fifth color with solvable sequential-routing variants using implemented rules.
- Verify gate carrier/color requirements, valid goal states, grid limits, solver results, and exact pars without changing other worlds' color behavior.

## Capabilities

### New Capabilities
- `chromatic-aura-routing`: World-level puzzles that route the player through existing aura prisms and matching player/world color gates.

### Modified Capabilities

None. No main OpenSpec capabilities have been archived yet.

## Impact

- World pack and authoring data: `data/worlds/`, `src/js/levels.js`.
- Existing aura/gate behavior and presentation may receive narrowly scoped fixes: `src/js/tiles.js`, `src/js/sm-rules.js`, `src/js/sm-render.js`.
- Regression/content/browser coverage: `tests/verify.js`, `tests/browser-test.js`.
- Depends on the shared world-pack contract from `world-1-sokoban`; no new palette states, mixing, or cross-world progression are introduced.
