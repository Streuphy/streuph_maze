# Design

## Context

See `proposal.md` for motivation and scope. The runtime is a set of ordered classic scripts for offline `file://` use. `sm-rules.js` currently owns level normalization, mutable state, general movement, and many mechanic-specific branches; `tiles.js` owns the ID catalogue, a behavior-name switch, behavior callbacks, and SVG glyph generation. `levels.js` validates the shared YAML format against the catalogue, while `sm-render.js` and `sm-ui.js` also branch on tile families or names. Existing OpenSpec contracts and the large resolver/browser suites specify behavior to preserve; this design does not change those contracts.

## Goals / Non-Goals

**Goals:**

- Make the current rule behavior traceable from one readable tile definition to its registered behavior and then to the generic resolver phase that invokes it.
- Make canonical state ownership, mutation, derivation, snapshots, and event semantics explicit inline.
- Make new static tile definitions and compatible behaviors possible without adding tile-ID/name branches to core turn orchestration.
- Keep the engine synchronous, deterministic, headless, and testable; keep YAML authoring and visual presentation outside gameplay resolution.
- Migrate incrementally with existing tests serving as behavior-preservation fixtures.

**Non-Goals:**

- Changing any tile rule, ID, default, YAML format, game UI behavior, solver result, or `file://` support.
- A dynamic/plugin loader, runtime code in YAML, third-party extension API, conversion to ES modules, or broad rewrite of UI and persistence.
- Eliminating all domain knowledge from the engine. The engine necessarily owns generic board/state invariants, action semantics, capability checks, and deterministic phase ordering.

## Decisions

### 1. Use a registry plus named strategy handlers, not tile-ID dispatch or a class hierarchy

`tiles.js` remains the authoritative, readable place for tile definitions and rule strategies. A definition contains stable identity, authoring defaults/schema, generic traits/capabilities, optional presentation keys, and references to named handlers for the lifecycle hooks it uses. A behavior registry maps those stable handler names to synchronous functions. The existing `SM.runBehavior` switch becomes registry dispatch and is extended to cover mechanic hooks currently hard-coded in `sm-rules.js`.

Use only a small documented hook vocabulary: passability/solidity query, activation or signal derivation, final-entry effect, ACT effect, forced-movement response, and ray interaction. Definitions may omit hooks; omitted hooks have documented neutral behavior. The resolver invokes a hook at its named phase, passes a read-only tile instance plus a constrained rules context, validates/commits generic operations, and records ordered events. Handlers must not inspect DOM, time, animation, or global UI state. They use injected context operations for state changes and shared legality checks; they do not duplicate bounds, occupancy, gate, or entity-movement rules.

Prefer functions/strategies over a subclass per tile: classic scripts and a compact catalogue make inheritance-heavy object graphs harder to inspect, while a registry keeps variation explicit and statically auditable. Do not create a general plugin framework or a generic event bus.

### 2. Separate canonical state schema from tile-specific behavior without duplicating state ownership

The core state contract is documented beside `newState`, clone/snapshot/restore, and state identity code in `sm-rules.js`. It names universal fields and ownership, including board geometry/terrain, player/start/goal positions, crate and feature entities, `P`/`W`, turn/stroke/win counters, seen-tile tracking, persistent switch latches, and derived locks. It distinguishes authored/immutable level data, mutable state, derived values, and display-only mirrors. Snapshot, restore, clone, and solver identity must be reviewed against this single list whenever a state field is added.

`tiles.js` provides the canonical tile-facing state/behavior manifest: each handler documents the state attributes it reads, the attributes it may change through context operations, and the events it can emit. The engine owns generic state lifecycle and enforces phase boundaries; a handler cannot introduce an undocumented root state field. A mechanic needing a new canonical field must update both the engine state contract and tile manifest, plus clone/snapshot/restore/signature tests.

Use explicit operation/context methods rather than passing broad engine internals or a mutable global `SM`. Keep the context small and named (current state view, tile/coordinates, action phase, generic state operations, legality/movement helpers, event emitter). The implementation should avoid a premature immutable-state rewrite; current synchronous mutation can remain behind these documented operations while parity is established.

### 3. Keep resolver phases explicit and generic

Retain one `resolveTurn` entry point and make its orchestration read as named stages: validate action, commit direct action, settle forced movement, invoke final resting-tile effect, derive signals/locks, resolve ray transport, derive final ray/lock state, resolve catch/respawn, account for turn/stroke, and test goal. Preserve the exact current ordering and event semantics.

Core orchestration may query registry metadata and call the documented hooks, but must not switch on tile ID, tile name, or descriptive family to implement a mechanic. Domain-general mechanics such as bounds, collision, action accounting, safe entity relocation, deterministic iteration, finite loop guards, and event sequencing remain generic engine policy. This distinction allows the resolver to make fewer assumptions without pretending that shared invariants can be removed.

### 4. Extract focused generic helpers and keep them deterministic

Move reusable geometry, occupancy, destination legality, capability lookup, entity relocation, state-copy, and event helpers into cohesive helper modules only when the migration shows a stable ownership boundary. Helpers are synchronous and deterministic; pure queries do not mutate state, while commit helpers make mutations and emitted events explicit. Avoid one catch-all `utils` module and avoid helpers that hide phase order or silently mutate unrelated state.

The existing rule tests load classic scripts by explicit order. Any helper module is loaded before its consumers in `index.html` and `tests/verify.js`; no module/fetch conversion is part of this work.

### 5. Keep the tile registry separate from visual rendering and UI interpretation

Move SVG glyph construction out of `tiles.js` to a presentation-focused renderer module (for example `sm-glyphs.js`). Tile definitions expose stable visual keys and concise human-readable labels/descriptions as data. Rendering resolves those keys; UI/codex code formats descriptors and does not implement tile rules or branch on gameplay IDs/names. Runtime descriptions may use read-only rule queries supplied by the engine.

This is not a ban on family metadata: family may remain descriptive/grouping metadata for authoring and presentation. It must not be the dispatch key for a gameplay rule. Keep player animation and all timers in the display layer.

### 6. Keep YAML as validated data and the catalogue as its schema authority

`levels.js` remains the only module that parses/validates YAML. It queries the active tile registry for known IDs, parameter schemas, and supported object capabilities, then normalizes data through the existing `SM.RULES.buildLevel` path. YAML stays unaware of handler names or executable callbacks. Keep the existing shared pack loading/atomic activation behavior and top-first to bottom-left coordinate conversion unchanged.

### 7. Optimize for expert readability and regression evidence

Group tile definitions by mechanic with one consistent field order and short comments explaining non-obvious defaults. For each tile, an expert should be able to identify its ID/name, family, defaults/schema, capabilities, handler references, and presentation key without searching for a hidden ID switch. Put each behavior in a named function with a contract comment explaining purpose, phase, state reads/writes, emitted events, and assumptions. Document `resolveTurn` phase order and state invariants inline at their ownership points; avoid comments that merely restate code.

Add focused architecture assertions for unique IDs/handler keys, required metadata, valid hook references, supported parameters/capabilities, handler purity constraints, and state-manifest consistency. Keep behavior tests for all existing mechanics, and add representative end-to-end tests showing a registered behavior flows through YAML load, resolver events, undo/solver, and presentation. Architecture tests should verify useful contracts, not forbid every `family` string or overfit exact internal file layout.

### 8. Use a fast-to-full testing pyramid and reserve browser tests for final validation

Add small Node-only unit suites that can run independently by module, for example `test:unit:registry`, `test:unit:rules`, `test:unit:levels`, and `test:unit:helpers`, plus `test:unit` to run the fast suites together. These suites load only the code needed for the target and use small fixtures; they must not boot jsdom, solve every bundled level, or run browser interaction flows. Prefer the existing VM/lightweight assertion pattern or Node's built-in test runner; do not add a test dependency solely for suite selection.

Keep the existing broad Node verification and jsdom browser interaction suite as integration/final checks. During implementation, run the unit command for the touched module, then the combined fast-unit command at logical integration points. Run `npm test` once at final validation; its comprehensive Node verification and browser suite remain required for release confidence. Browser tests are not an iterative substitute for focused presentation/registry unit coverage.

Measure the current Node and browser portions separately before restructuring. Reduce redundant test setup and repeated exhaustive solver/pack work where it duplicates existing coverage, and replace avoidable fixed browser delays with waits for observable state where this preserves the same assertion. Record before/after runtime from comparable local runs; do not impose a flaky wall-clock CI threshold. Keep the existing end-to-end assertions and full final command intact.

## Risks / Trade-offs

- [A broad migration can alter subtle rule ordering, event playback, or solver identity] → First inventory each current family/name branch and its tests; migrate one hook/mechanic slice at a time; run the affected focused unit suite after each slice and the fast unit aggregate at integration points; keep a differential or golden replay check for representative levels, with the full resolver/browser suites at final validation.
- [Splitting test suites could leave gaps or make the final command slower] → Map each existing assertion to a focused suite or final integration check, profile the current command before changing it, remove only genuinely duplicated expensive work, and compare before/after timings while keeping `npm test` comprehensive.
- [A generic hook API can become an opaque mini-framework] → Limit hook names to observed mechanic needs, make invocation points visible in the resolver, use explicit context operations, and reject speculative dynamic registration/loading.
- [A handler with too much context can recreate tight coupling] → Expose only documented state queries/operations and generic movement helpers; forbid global DOM/time access; test the rule modules for banned browser/async dependencies.
- [Per-tile prose and metadata can become redundant] → Keep concise behavior contracts next to registration, link longer player/author explanations to the mechanics guide, and generate catalog-facing data where practical instead of maintaining parallel lists.
- [The classic-script dependency order can break boot or headless loading] → Update `index.html` and test harness file lists together, preserve local scripts, and keep boot smoke tests as an acceptance gate.
- [Generic metadata can become underspecified for future mechanics] → Treat extension as bounded by the documented state and hook contract; require explicit review of the contract when a new mechanic needs state or phases the engine does not currently expose.

## Migration Plan

1. Inventory every tile-specific branch and state access in rules, renderer, UI, loader, and tests. Record the owning tile strategy, generic invariant, lifecycle phase, event output, and relevant test coverage before changing code; profile current Node and browser suite durations to establish a baseline.
2. Add fast, targetable unit suites and npm scripts for the registry, rules, level validation, and helpers. Document the test command tiers in `README.md`; verify each named script runs only its intended Node-only suite and that no unit command boots the browser harness or performs all-pack solver work.
3. Document the canonical state model, existing resolver phase order, behavior context, event contract, and tile definition field order inline. Add focused contract tests before moving behavior.
4. Introduce named behavior registration and hook dispatch while preserving existing behavior functions. Move mechanic-specific branches by category into the tile strategy registry, retaining generic collision and movement operations in the engine; use the affected module's unit suite during iteration.
5. Extract glyph rendering and remove mechanic-specific UI/render branching where tile descriptors can replace it. Keep all visuals display-only and cover display metadata with focused non-browser tests.
6. Extract stable shared helpers into focused modules and update classic script/test load order. Refactor `levels.js` only to consume registry schemas and avoid embedding rule interpretation; use focused unit suites while migrating.
7. Profile and streamline the comprehensive test path by removing redundant setup or repeated expensive solver work and replacing avoidable fixed jsdom waits with observable-state waits where equivalent. Verify assertions remain covered and record comparable before/after timing.
8. At final validation only, run `npm test`, validate all bundled YAML packs and solver/replay behavior, review state fields against clone/snapshot/restore/signature, and perform the real-Chromium `file://` check if rendering or loading paths changed.

If a migration slice fails parity, revert only that slice and keep the last passing boundary; do not land partially migrated behavior with duplicate dispatch paths. Since this is a local code refactor, rollback is source-level and requires no data migration.

## Open Questions

None. The exact helper-module split may follow evidence from the branch inventory, but it must preserve the ownership and API decisions above and does not block the task breakdown.
