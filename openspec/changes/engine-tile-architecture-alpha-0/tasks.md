# Tasks

## 1. Architecture review and contracts

- [x] 1.1 Inventory tile-specific branches, state reads/writes, resolver phases, event types, and current test coverage across rules, tiles, loader, renderer, and UI; verify the inventory is reviewable and maps every mechanic to a proposed owner before code migration.
- [x] 1.2 Document the canonical state fields, ownership (immutable/authored, mutable, derived, display-only), phase order, event contract, and handler context inline at their owning code boundaries; verify clone/snapshot/restore/signature fields are accounted for and add tests for the published contracts.
- [x] 1.3 Add registry contract checks for unique stable tile IDs and handler names, complete required metadata, valid handler references, parameter/capability schemas, and documented state access; verify with positive and deliberately malformed registry fixtures using a registry-only Node unit command.
- [x] 1.4 Partition fast Node unit tests by registry, rules, level validation, and helpers; add `test:unit:registry`, `test:unit:rules`, `test:unit:levels`, `test:unit:helpers`, and aggregate `test:unit` scripts, reusing existing assertions rather than duplicating them. Verify each command runs only its module with small fixtures, without jsdom or all-pack solver work, and document the command tiers in `README.md` and relevant authoring guidance.
- [x] 1.5 Measure Node verification and browser-suite durations separately, then reduce redundant test setup/repeated exhaustive solver work and replace avoidable fixed browser delays with equivalent observable-state waits; verify assertions remain covered and record comparable before/after timings without a flaky CI time threshold.

## 2. Tile behavior registry

- [x] 2.1 Define named synchronous strategy handlers and the limited hook vocabulary for passability, signal/activation derivation, final entry, ACT, forced movement, and rays; document each hook's phase, context, state access, events, and neutral default inline, and verify dispatch/order with focused tests.
- [x] 2.2 Refactor `tiles.js` into consistently ordered, grouped, readable tile records that reference strategies and explicitly list tile-facing state attributes; verify every registered tile is inspectable from its definition without ID/name rule dispatch using `npm run test:unit:registry`.
- [x] 2.3 Move existing goal, color, actuator, toggle, and portal entry/ACT behavior into named registered handlers; verify the focused rules unit suite preserves resolver events and state transitions for each effect.

## 3. Generic resolver and helper boundaries

- [x] 3.1 Refactor generic passability, linked signal/lock derivation, and switch/sensor/target activation to use tile metadata/strategies; keep collision and link invariants generic, document precedence inline, and verify focused rules and level-validation unit suites pass.
- [x] 3.2 Refactor push, pull, object capabilities, conveyors, ice, and portals to generic movement helpers plus registered tile strategies; document atomicity and helper pre/postconditions inline, and verify targeted movement, loop-bound, event, and undo unit tests pass.
- [x] 3.3 Refactor ray tracing, opacity/transport, catch/respawn, and goal resolution to the documented hooks while preserving the exact settled-board phase order; verify focused ray, catch, respawn, and undo unit tests pass.
- [x] 3.4 Extract only stable geometry, occupancy, destination, entity-commit, and state-copy helpers into focused modules; document pure-query versus mutating-helper contracts and verify `npm run test:unit:helpers` passes and script-order assertions cover both browser and VM harnesses.
- [x] 3.5 Remove tile-ID/name/family mechanic dispatch from core orchestration while retaining family as descriptive metadata; add an architecture regression check targeted at gameplay dispatch sites and verify all fast unit suites pass.

## 4. Presentation and UI separation

- [x] 4.1 Move SVG glyph construction to a presentation module and leave visual keys/labels/descriptions in tile metadata; document that presentation data cannot affect gameplay and verify glyph keys/metadata with fast non-browser unit tests.
- [x] 4.2 Replace mechanic-specific renderer/UI/codex branches with presentation descriptors and read-only engine queries where applicable; document the boundary inline and update `docs/level-design/tile-mechanics.md` to match, verifying descriptors and rule-query behavior with focused unit tests.
- [x] 4.3 Update `index.html` and `tests/verify.js` classic-script order for any new modules, preserving local `file://` loading; verify dependency order through a focused static/VM test, not the browser suite.

## 5. YAML and authoring boundary

- [x] 5.1 Make `levels.js` validate IDs, parameter schemas, and capabilities through the registry contract without interpreting tile behavior; document the schema-to-registry boundary inline and verify valid/invalid YAML diagnostics and top-first grid conversion with small loader unit fixtures.
- [x] 5.2 Update `docs/level-design/tile-mechanics.md` and `docs/world-level-packs.md` only for changed implementation-facing references, preserving the existing YAML examples/format; verify examples with focused validation fixtures and defer all-bundled-pack solver checks to final integration.

## 6. Integration and parity

- [x] 6.1 Audit canonical state fields against construction, clone, snapshot, restore, state signatures, rendering mirrors, and solver keys; add any missing focused parity tests and verify undo and solver identity remain exact for stateful mechanics.
- [x] 6.2 At final validation only, run `npm test` from the repository root; verify fast units, the non-duplicative full Node/solver verification, and `tests/browser-test.js` all pass across bundled YAML and browser flows.
- [x] 6.3 After the final test suite, open `index.html` in real Chromium via `file://`, exercise representative registered behavior, movement, undo, YAML pack loading, and return to the Prologue; verify there are no external-resource dependencies or rule changes tied to animation timing. Do not run browser tests during routine implementation iterations.
