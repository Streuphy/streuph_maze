# Proposal

## Why

World-level design notes record solver-proven pars and routes, but the solver currently returns the first shortest path in its fixed action order, not a representative route chosen for directional balance. A deterministic balanced-route report would make PAR examples easier to compare and publish without changing the minimum-stroke definition of par.

## What Changes

- Keep PAR equal to the solver-proven minimum number of strokes; use directional balance only to select a representative path among equally short winning routes.
- Select the route minimizing the squared deviation of its up, down, left, and right command counts from an equal split. Count solver-issued `move` and `pull` commands; exclude `act` and automatic movement. If balance scores tie, retain the first route found in the solver's existing breadth-first action order.
- Add an optional route-reporting mode that prints the selected optimal route, PAR, directional counts, balance score, and whether the tie-break search was complete.
- Add a concrete, replay-verified PAR route example to the World 1–7 design references, using the shared route format. Do not invent examples for worlds whose packs have not yet been authored; record them when the corresponding pack is solved.
- Preserve bounded search behavior and distinguish a proven minimum PAR from an incomplete search for the best-balanced representative route.

## Capabilities

### New Capabilities

- `solver-par-routes`: Deterministic selection and reporting of a directionally balanced representative among minimum-stroke solver routes, with explicit completeness when bounded search cannot compare all candidates.

### Modified Capabilities

None. The existing `world-level-packs` requirements define pack identity and loading but do not specify route tie-breaking or PAR-example reporting.

## Impact

- Solver and route reporting: `src/js/levels.js`, `tests/verify.js`, and possibly `package.json` for an opt-in command.
- Shared authoring guidance: `docs/world-level-packs.md` and `docs/level-design/world-authoring-checklist.md`.
- World route examples: World 1's `openspec/changes/world-1-sokoban/design.md`; archived World 2's `openspec/changes/archive/2026-10-23-world-2-lolos-castle/design.md`; and the World 3–7 design references under their respective `openspec/changes/world-*` directories. World 3–7 packs are not present yet, so their route examples depend on authoring and solving those packs.
- Tests must confirm route replay, unchanged minimum PAR, balance ranking, deterministic tie fallback, and honest reporting when the route-selection search reaches its budget.
