# Repository guide for coding agents

Use this file as the project entry point. Preserve existing user changes, keep
implementation, tests, and documentation consistent, and follow relevant local
references rather than duplicating their details here.

## Authority and scope

- For current tile behavior, consult the accepted contracts in `openspec/specs/`
  and the live tile catalogue/runtime. Use the Tile Mechanics Reference as the
  level-authoring index.
- An unarchived change under `openspec/changes/` is scoped planning guidance,
  not evidence that proposed behavior is implemented. When working on a change,
  follow its applicable proposal, specs, design, and tasks after checking its
  OpenSpec status and instructions.
- Archived changes and legacy design notes are historical. If historical
  material, an active proposal, an accepted spec, the live catalogue, or runtime
  evidence disagree, identify the conflict and resolve it against the accepted
  contract and selected task before implementation. Do not silently assume an
  undocumented behavior.
- Solver success alone does not prove a level is well designed; an `unknown`
  solver result does not prove solvability.

## Pre-implementation validation

Before implementing a scoped OpenSpec change:

1. Identify the change and inspect its status, instructions, context files, and
   remaining tasks. Confirm it is not blocked and the requested work is within
   its stated scope.
2. Run `openspec validate <change>` when the CLI is available. Resolve artifact
   validation errors before implementation; report blockers rather than working
   around them.
3. Check dependencies and shared assumptions, including tile-ID allocations,
   world-pack dependencies, current runtime behavior, and existing user changes.
   If requirements conflict or work exceeds the task scope, pause and propose an
   artifact update or ask for direction.
4. Map affected behavior to its implementation and regression-test locations.
   For stateful mechanics, include construction, clone/snapshot/restore, undo,
   solver identity, and presentation in the review.

For work not tied to an OpenSpec change, use the accepted specifications and
local references as the contract. Keep changes minimal and scoped.

## Coding and runtime boundaries

- Keep gameplay resolution synchronous, deterministic, and independent of
  rendering delays. The rules layer owns outcomes; renderers play back returned
  events and must not make gameplay decisions.
- Do not introduce DOM access, timers, asynchronous primitives,
  animation-dependent outcomes, network access, or browser-global dependencies
  into the rules core.
- Keep YAML declarative: it may select registered tiles and supported
  parameters, but must not contain executable behavior. Use the common loader,
  validator, and activation path; do not add a world-specific loader.
- Preserve the local-first classic-script architecture and `file://` support
  unless an accepted, explicitly scoped change says otherwise.
- When adding state or entity behavior, keep play, undo, solver search, and
  rendering consistent. Review state construction, cloning, snapshots, restore,
  state identity, ordered events, and solver transitions; add regression tests
  for affected boundaries.
- Apply proposed architecture conventions, such as named tile strategies and
  avoiding tile-ID dispatch, when implementing the change that specifies them.
  Do not silently expand an unarchived proposal into unrelated work.

## Local design and authoring references

- [Tile Mechanics Reference](docs/level-design/tile-mechanics.md) is the
  level-designer guide to registered tile IDs, standard resolver behavior,
  movement capabilities, targets, colors, switches, gates, conveyors, portals,
  and rays.
- [World pack format](docs/world-level-packs.md) documents the shared YAML
  schema, grid orientation, validation, and loading under `file://`.
- [World authoring checklist](docs/level-design/world-authoring-checklist.md)
  covers progression, solver/par checks, softlock review, mechanic-specific
  tests, and real-Chromium verification.
- [Worlds blueprint](docs/level-design/worlds-blueprint.txt) contains the
  Golden Rules and intended progression for the canonical worlds.

## World and level authoring

Before creating or revising a level or world pack, follow the world-authoring
checklist and the relevant section of the worlds blueprint. In particular:

- Load packs through the shared validation path. Preserve stable lowercase
  `world_id`, display names, correct `num_level`, contiguous level keys, and
  world-qualified progress identity.
- Keep grids rectangular, within 16 columns by 9 rows, and use registered,
  implemented tile IDs. YAML rows are top-first; runtime coordinate A1 is
  bottom-left.
- Keep the canonical eight-level progression and make each level's name, goal
  text, intended lesson, board, and actual route agree. Prefer visually minimal,
  inspectable states and introduce mechanics progressively.
- For every level, seek a solver-proven minimum-stroke result and set
  `golf_score` to that optimum. Replay reported routes through the real
  resolver. Report `unknown` distinctly; do not claim it proves solvability.
- Review early levels for unintended irreversible softlocks, including plausible
  wrong pushes and dead ends. Review intended-mechanic use, safe starts and
  respawns, gate or shield necessity, bypasses, target/link correspondence, and
  whether the shortest route teaches the stated lesson.
- For documented PAR route examples, use `npm run levels:routes` when applicable.
  PAR is the minimum stroke count; directional balance only selects a
  representative route among tied minimum routes. Count explicit moves and
  pulls, not ACT or automatic movement. Report incomplete route comparison
  honestly and replay examples before publishing them.
- Record material route-review findings and deliberate deviations from the
  blueprint. Do not introduce unsupported mechanics just to match legacy prose.

## Verification and completion

Use the module-scoped Node unit commands available in `package.json` while
iterating; run only the suite for the code being changed:

```sh
npm run test:unit:registry
npm run test:unit:rules
npm run test:unit:levels
npm run test:unit:helpers
npm run test:unit
```

`npm run test:rules` is the broader Node verification suite, not the default
iteration command. Reserve `npm run test:browser` for final validation; its
jsdom interaction flow is not a substitute for focused unit tests.

Before reporting project work complete, run the final repository check from the
repository root:

```sh
npm test
```

`npm test` runs `tests/verify.js` and `tests/browser-test.js`; focused suites do
not replace it. Do not claim a command passed unless it was run. Report failures
or blockers accurately. Use only test commands that exist in `package.json`; do
not refer to proposed unit-test tiers as available until they are implemented.

For changes to rendering or local pack loading, also follow the real-Chromium
`file://` check in the world-authoring checklist. The jsdom suite is not a
substitute. Report that check separately; do not imply that `npm test` launched
Chromium.
