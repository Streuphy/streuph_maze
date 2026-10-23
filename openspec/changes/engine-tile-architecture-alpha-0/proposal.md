# Proposal

## Why

The engine already has a synchronous resolver, a tile catalogue, and separate UI/rendering and YAML-loading modules, but mechanics are still split between registry metadata, a behavior switch, and many family/name branches in the resolver and presentation code. Alpha 0 should make those boundaries explicit so an expert can follow a tile from definition through resolution and display, and extend the catalogue without turning the core engine into a list of tile-specific cases.

## What Changes

- Perform a focused architecture review of tile-related rule branches, state reads/writes, helper responsibilities, UI/render dependencies, YAML validation, and existing tests; use its inventory to guide a behavior-preserving migration.
- Establish an inline-documented canonical engine-state and turn-phase contract. The engine owns universal state lifecycle and invariants; tile definitions document the canonical tile-facing state attributes and behavior hooks they use.
- Make `tiles.js` the easy-to-scan source of truth for stable tile IDs, defaults, parameters, capabilities, rule behavior registrations, and tile-facing state declarations. Implement tile-specific behaviors through named, registered strategies instead of tile-ID/name dispatch in core rules.
- Keep generic geometry, occupancy, legality, entity movement, snapshot/restore, and event helpers in focused engine/helper modules. Keep the resolver responsible for deterministic orchestration and common invariants, not tile-specific policy.
- Separate gameplay behavior declarations from presentation/rendering and UI descriptions. Tile definitions may expose display metadata; rendering and UI code consume it without influencing rules.
- Preserve the existing YAML schema and shared validation/loading path: levels continue to author tile IDs and supported overrides, never executable behavior.
- Add expert-facing inline comments at state, phase, handler, and event boundaries, and readable per-tile definition/behavior documentation. Update the tile-mechanics and level-pack guides only where the refactor changes implementation-facing guidance.
- Introduce fast, targeted unit-test suites and module-specific npm scripts for routine iteration; profile and reduce redundant setup/solver work in the full test path. Reserve the comprehensive `npm test` command and browser suite for final validation, while preserving their regression coverage.
- Preserve current tile IDs, defaults, gameplay, event order, stroke accounting, undo, solver outcomes, and offline `file://` behavior. No new runtime dependency, dynamic plugin loader, or YAML migration is intended.

## Capabilities

### New Capabilities

None. This change introduces no new externally observable game behavior.

### Modified Capabilities

None. Existing contracts in `tile-mechanics`, `movable-objects`, `world-level-packs`, and `line-of-sight-hazards` remain authoritative and unchanged. This is a pure architecture/documentation refactor; delta specs are intentionally skipped.

## Impact

- Main runtime review/refactor areas: `src/js/tiles.js`, `src/js/sm-rules.js`, `src/js/levels.js`, `src/js/sm-render.js`, and `src/js/sm-ui.js`; helper extraction may add focused modules under `src/js/` and update classic script order in `index.html`.
- Validation and test areas: `tests/verify.js`, `tests/browser-test.js`, focused module-level unit suites, `package.json` scripts, and existing level/world-pack fixtures. Preserve or strengthen coverage of registry metadata, resolver behavior, solver replay, YAML loading, rendering, undo, and browser interactions; use fast targeted suites during iteration and the complete suite at final validation.
- Documentation: inline code contracts plus `README.md` test commands and `docs/level-design/tile-mechanics.md` / `docs/world-level-packs.md` as needed.
- No YAML format or public UI/API compatibility change is intended. The implementation must remain synchronous and DOM/timer/async-free in the rule core; animation remains a renderer concern.
