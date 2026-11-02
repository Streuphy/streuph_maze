# Tasks

> **Prerequisite:** This change depends on the separate `standalone-state-solver` change,
> which extracts the embedded `solve` into a standalone, budget-bound module accepting an
> arbitrary start state and goal predicate. Tasks in group 10 (A→B solver integration) MUST
> NOT start until that change is applied and `SM.SOLVER.solve({ startState, isGoal,
> maxStates, maxDepth, maxRouteLabels })` exists with `SM.LEVELS.solve` kept back-compatible.
> Editor work that does not call the solver (groups 1–9, 11) may proceed in parallel with
> that prerequisite.

## 1. Scaffolding and script wiring

- [x] 1.1 Create `editor.html` that loads the existing engine scripts (`sm-board`, `sm-entities`, `tiles`, `sm-glyphs`, `sm-rules`, `levels`, `sm-io`, `sm-store`, `sm-render`, `sm-ui`) plus the new `src/js/sm-editor.js` in dependency order, with no build step and no external/network resources. Verify: opening `editor.html` under `file://` loads without console errors and `window.SM` exposes the expected modules.
- [x] 1.2 Create `src/js/sm-editor.js` (IIFE attaching `SM.EDITOR`) and an editor stylesheet, with an initial empty workspace shell (palette area, grid area, inspector area, toolbar). Verify: the shell renders three named regions and `SM.EDITOR` is defined.
- [x] 1.3 Add `tests/unit/editor.js` and register a `unitSuites['editor']` entry plus a `test:unit:editor` script in `package.json`. Verify: `npm run test:unit:editor` runs and reports the editor suite (initially with a trivial passing assertion).

## 2. World-pack load and save via the shared path

- [x] 2.1 Implement pack loading from file picker, drag-and-drop, and pasted YAML through `SM.LEVELS.load` (parse + validate), surfacing diagnostics inline. Verify: loading each shipped `data/worlds/*.levels.yaml` succeeds; a malformed pack reports diagnostics without replacing the active pack.
- [x] 2.2 Implement pack save through the shared YAML emitter as a downloaded `.yaml`/`.yml` file, preserving `world_id`, `name`, `num_level`, contiguous level keys, dimensions, overrides, `initial_*` fields, and declared scores. Verify: load → save → `SM.LEVELS.load` round-trip produces no new diagnostics for every shipped pack.
- [x] 2.3 Implement level selection within a loaded pack (one level edited at a time), keeping unselected levels intact in the in-memory document. Verify: editing level_2 and saving leaves level_1 and level_3 unchanged in the emitted YAML.
- [x] 2.4 Add editor unit tests covering load round-trip and diagnostic surfacing for an invalid pack. Verify: `npm run test:unit:editor` passes the new cases.

## 3. Registry-driven dual palette

- [x] 3.1 Build the palette from the live `SM.TILES` catalogue, grouped by catalogue `category`, listing every registered tile ID plus the dot, each with glyph, ID, and name. Verify: a unit test asserts the palette contains every catalogue ID (including registered-but-unused IDs) and groups them by category.
- [x] 3.2 Implement Primary and Secondary slots; both accept only registered, implemented tile IDs; selecting a palette entry assigns it to the Primary, with a distinct control to set the Secondary base floor. Verify: a unit test asserts both slots reject unregistered IDs and that the Secondary slot is used as the clear/fill source.
- [x] 3.3 Visually mark registered-but-unused IDs in the palette. Verify: a unit/render test asserts the unused marker is present on the documented unused IDs.
- [x] 3.4 Implement a quick guide panel that always reflects the current Primary and Secondary slot tiles, showing each tile's glyph, ID, name, category, authorable attributes, and an author-friendly behavior summary, updating live when a slot changes. Verify: a unit test changes the Primary slot and asserts the guide reflects the new tile, and asserts both slots are shown side by side.
- [x] 3.5 Implement a category-grouped, collapsible tile selector with clearly labeled categories so the user can browse tiles by category (expand/collapse) without scanning a flat list. Verify: a unit test asserts each category is collapsible and lists its tiles with glyph and name.
- [x] 3.6 Implement per-tile help documentation sourced from the live catalogue, covering identity (ID, name, category, layer), authorable attributes, and a plain-language behavior summary; strategy names, hook identifiers, and resolver internals are not surfaced as authorable. Verify: a unit test asserts a sample tile's help shows ID/name/category/layer/attributes/behavior and does not expose strategy or hook names.
- [x] 3.7 Add editor unit tests for the quick guide, category selector, and per-tile help to `tests/unit/editor.js`. Verify: `npm run test:unit:editor` passes the new cases.

## 4. Grid editing and area fill

- [x] 4.1 Implement arrow-key cursor navigation, `Shift`+arrow contiguous region selection, and cursor bounds within the current level's grid. Verify: a unit test drives key events and asserts the cursor and selection rectangles match expected coordinates.
- [x] 4.2 Implement mouse left-click/drag painting with the Primary slot and right-click contextual placement. Verify: a unit test simulates click/drag and asserts only the targeted cells change to the Primary tile.
- [x] 4.3 Implement rectangle-region fill and connected flood-fill with the Secondary slot, going through the shared validator; an invalid fill is diagnosed atomically and does not replace the active valid pack. Verify: unit tests cover rectangle fill, flood fill stopping at differing tiles, and atomic rejection of an invalid fill.
- [x] 4.4 Implement single-instance Start (1) and Goal (2) markers: painting a second occurrence moves the marker after a confirm, leaving exactly one of each. Verify: a unit test places a second start and asserts exactly one start remains at the new cell.
- [x] 4.5 Add editor unit tests for grid editing, area fill, and marker replacement to `tests/unit/editor.js`. Verify: `npm run test:unit:editor` passes the new cases.

## 5. Inspector and override routing

- [x] 5.1 Implement an Inspector that, for a selected tile or region, lists editable properties grouped by whether they are tile-level parameters (→ ID-wide `overrides`) or entity capabilities (→ coordinate-specific `object_overrides`), labeling each edit's scope. Verify: a unit test asserts an ID-wide param edit writes to `overrides` and a capability edit writes to `object_overrides` at the coordinate.
- [x] 5.2 Add the "affects N cells" warning when an ID-wide edit changes more than the selected cells. Verify: a unit test asserts the warning reports the correct count of affected occurrences.
- [x] 5.3 Constrain Inspector colors to White/Red/Green/Blue and make the Goal color read-only (world-derived). Verify: a unit test asserts no other colors are offered and that selecting the Goal marker exposes no editable color.
- [x] 5.4 Implement mixed-value display across a selected region (e.g., `Color: <Mixed>`) before any batch override is applied. Verify: a unit test builds a region with differing colors and asserts the Inspector shows mixed until an explicit batch override forces one value.

## 6. Live validation and hard-block

- [x] 6.1 On every edit, rebuild the level object and run `SM.LEVELS.load`/`validate` with `solve: false`, mapping diagnostics to inline cell markers and Inspector messages. Verify: a unit test introduces an out-of-bounds/unknown-ID/duplicate-start error and asserts the corresponding inline marker and message appear.
- [x] 6.2 Hard-block Save, Quick test, and Export while the board is invalid; an invalid edit is diagnosed atomically and never replaces the active valid pack. Verify: a unit test asserts all three actions are blocked on an invalid board and the active valid pack remains intact.
- [x] 6.3 Add editor unit tests for live validation and blocking to `tests/unit/editor.js`. Verify: `npm run test:unit:editor` passes the new cases.

## 7. Editor undo/redo and reset

- [x] 7.1 Implement a separate editor edit-history stack (undo/redo) that is independent of gameplay undo. Verify: a unit test performs edits, invokes editor undo/redo, and asserts the board returns to prior states without consulting any gameplay state.
- [x] 7.2 Implement reset-to-last-saved that discards unsaved edits and returns the board to the last saved state. Verify: a unit test makes unsaved edits, resets, and asserts the board matches the last saved state.
- [x] 7.3 Add editor unit tests for undo/redo and reset to `tests/unit/editor.js`. Verify: `npm run test:unit:editor` passes the new cases.

## 8. Quick play/test

- [x] 8.1 Implement quick test: clone the current level's authored initial configuration via `SM.RULES.newState`, then drive the existing UI input/HUD/undo path through `SM.RULES.resolveTurn` (reused, not forked). Verify: a jsdom test asserts a move is resolved by `SM.RULES.resolveTurn` and the HUD reflects the new state.
- [x] 8.2 Ensure quick test never publishes scores and never mutates `sm-store.js` progress. Verify: a jsdom test completes a quick-test level and asserts the progress store is unchanged.
- [x] 8.3 Implement reset returning the test session to the authored initial configuration at any stage, including after terminal failure where gameplay/player undo is blocked per the resolver contract. Verify: a jsdom test drives the session to terminal failure, resets, and asserts the session is back at the initial configuration with undo blocked until reset.

## 9. Snapshot A/B buffers

- [x] 9.1 Implement three distinct buffers (level initial config, snapshot A, snapshot B); editing targets the level buffer only. Verify: a unit test edits the level buffer and asserts snapshots A and B are unchanged.
- [x] 9.2 Implement "use current board as A" and "use current board as B" shortcuts that copy the level's current initial state into a slot, after which the slot is editable independently. Verify: a unit test seeds A from the current board, edits A, and asserts the level buffer is unchanged.
- [x] 9.3 Keep one active A/B pair per session; implement optional named scenario save/load to a sidecar JSON file (`{ arrangementA, arrangementB, notes }`); snapshots are never serialized into the authored YAML. Verify: a unit test saves/loads a named scenario and asserts an exported pack contains no snapshot data.
- [x] 9.4 Capture snapshots only as settled (between-turn) states, never mid-resolution. Verify: a unit test asserts the editor refuses to capture while a resolve is in flight.
- [x] 9.5 Add editor unit tests for snapshot buffers and sidecar scenarios to `tests/unit/editor.js`. Verify: `npm run test:unit:editor` passes the new cases.

## 10. A→B solver integration (requires `standalone-state-solver`)

- [x] 10.1 Verify the prerequisite standalone solver is available: `SM.SOLVER.solve({ startState, isGoal, maxStates, maxDepth, maxRouteLabels })` exists and `SM.LEVELS.solve` remains back-compatible. Verify: `npm run test:unit:rules` and `npm run test:unit:levels` still pass unchanged.
- [x] 10.2 Build snapshot B's signature from its authored arrangement: construct a level-like config from the arrangement, run `SM.RULES.newState` (which runs `rebuildLocks`/`enforceDotClosure`) on a clone, and compute `SM.RULES.snapshotSig`; if the settle yields a failed state, report B as invalid rather than hand-editing derived fields. Verify: a unit test authors a B whose arrangement settles to failed and asserts the editor reports B invalid with no manual derived-state edit.
- [x] 10.3 Invoke the standalone solver with snapshot A's cloned state as `startState`, a goal predicate of `SM.RULES.snapshotSig(state) === sigB` on a non-failed state, and editor-exposed budgets (defaults mirroring `levels.js`). Verify: a unit test for a reachable A→B asserts the result `status === 'solvable'` with the expected stroke count.
- [x] 10.4 Replay any returned route through `SM.RULES.resolveTurn` on a fresh clone of A before reporting; surface commands, counts, budget usage, and selection completeness. Verify: a unit test asserts the reported route replays to an exact match of B and the reported counts match the replay.
- [x] 10.5 Surface `unknown` (budget-exhausted) distinctly from `unsolvable` (exhaustive) and from invalid B. Verify: a unit test with a tiny budget asserts `unknown`; a test with an unreachable B asserts `unsolvable`; a test with a failed-settle B asserts invalid.
- [x] 10.6 Add editor unit tests for A→B solving to `tests/unit/editor.js`. Verify: `npm run test:unit:editor` passes the new cases.

## 11. Documentation

- [x] 11.1 Write `docs/level-editor.md`, a level-editor usage guide covering: loading/saving packs (file/drag/paste, YAML), palette and dual slots, area fill, grid editing and single-instance markers, the Inspector and override routing, the quick guide and per-tile help, live validation and hard-blocks, editor undo/redo and reset, quick test and reset, snapshot A/B authoring with "use current board" shortcuts and sidecar scenarios, and A→B solving with budget/unknown/unsolvable results. Verify: every workflow described in the guide is exercised by a corresponding unit test added in groups 2–10.
- [x] 11.2 Update `docs/level-design/world-authoring-checklist.md` to point at the editor for authoring, validation, and A→B solving, while keeping the editor a consumer (not a second source) of the shared validator and real resolver. Verify: the checklist references the editor without claiming it as an executable-rules source, and the shared-validation/real-resolver constraints remain stated.
- [x] 11.3 Update `docs/level-editor-PDD-V1.md` and `docs/level_editor_Proposal.md` status lines to mark the editor as implemented by this change and to note the accepted-contract reconciliations (YAML not JSON; runtime bounds 2–16/1–9; registry-driven palette). Verify: the status lines no longer describe the editor as unimplemented/future and the reconciliations are recorded.
- [x] 11.4 Add a short `editor.html` entry in `README.md` alongside `index.html`/`glyphs.html`. Verify: README lists `editor.html` as a local-first authoring entry point with a one-line description.

## 12. Final verification

- [x] 12.1 Run the focused editor suite and the broader unit suites: `npm run test:unit:editor`, `npm run test:unit:levels`, `npm run test:unit:rules`, `npm run test:unit:helpers`. Verify: all pass.
- [x] 12.2 Run `openspec validate level-editor-v1 --strict` and resolve any warnings. Verify: strict validation reports no warnings.
- [x] 12.3 Run the complete repository check from the repo root: `npm test`. Verify: `tests/verify.js` and `tests/browser-test.js` both pass; do not claim pass unless the command was run.
- [ ] 12.4 Perform the real-Chromium `file://` check (per the world-authoring checklist, since this change touches rendering and local pack loading): open `editor.html` from disk, load a shipped pack, paint and area-fill, use the Inspector, run quick test with a representative path and a nonterminal undo, drive a terminal failure and confirm undo is blocked until reset, author snapshots A/B, run an A→B solve, and confirm no external resources load. Report this separately; `npm test` does not launch Chromium.

## Workflow follow-up

- After review requirements are satisfied, run `/openspec-archive-change` (or `opsx archive`) for `level-editor-v1`.
- Sync the new `level-editor` capability into the main specs if/when the project's accepted-spec synchronization step runs.
- Propose and apply the prerequisite `standalone-state-solver` change before group 10 work; it can be archived independently.
