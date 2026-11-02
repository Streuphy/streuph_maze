# Tasks

> This change unblocks group 10 (A→B solver integration) of the `level-editor-v1` change.
> It is independent of the editor and can be applied and archived separately.

## 1. Extract the solver module

- [x] 1.1 Create `src/js/sm-solver.js` (IIFE attaching `SM.SOLVER`) and move the BFS body, `actionsFor`, `routeMetrics`, and the directional-balance helpers from `src/js/levels.js` into it. Parameterize two seams: accept `opts.startState` instead of building `SM.RULES.newState(level)`, and accept `opts.isGoal` (defaulting to `function (s) { return s.won; }`) instead of the hard-coded `isGoal`. Verify: the module loads in Node (`globalThis.SM.SOLVER.solve` is a function) and exposes `MAX_STATES`, `MAX_DEPTH` defaults mirroring `levels.js`.
- [x] 1.2 Replace the `solve` body in `src/js/levels.js` with a thin wrapper: `SM.LEVELS.solve = function (level, opts) { return SM.SOLVER.solve(Object.assign({}, opts || {}, { startState: SM.RULES.newState(level), isGoal: function (s) { return s.won; } })); };` and remove the now-duplicated BFS body, `actionsFor`/`routeMetrics` exports if they are unused by other callers. Verify: `node -e` loads the engine and `SM.LEVELS.solve` returns the same shape as before for a known level.
- [x] 1.3 Add `src/js/sm-solver.js` to the `FILES` script list in `tests/verify.js` (before `sm-editor.js`, after `levels.js` so the wrapper can call it) and to the `EDITOR_FILES` list in `tests/unit/editor.js`. Verify: `npm run test:unit:rules` and `npm run test:unit:editor` still load without "SM.SOLVER is not a function" errors.

## 2. Verify behavior preservation (parity)

- [x] 2.1 Run the existing PAR-route and rules suites unchanged: `npm run test:unit:rules` and `npm run test:unit:levels`. Verify: both pass with the same counts as before the extraction (no regressions in `checkParRouteSelection`, `checkFailureSolver`, `checkRules`, etc.).
- [x] 2.2 Run `npm run levels:routes` against the shipped packs. Verify: it reports the same proven optima and balanced representative routes as before; the command exits 0 for the expected inventory.
- [x] 2.3 Run the full `npm test`. Verify: `tests/verify.js`, `tests/browser-test.js`, and `tests/browser-editor-test.js` all pass; the extraction introduced no regressions.

## 3. Add generalized-solver unit tests

- [x] 3.1 Add a unit test that calls `SM.SOLVER.solve` directly with a `startState` built from `SM.RULES.newState(level)` and `isGoal = (s) => s.won`, and asserts the result equals `SM.LEVELS.solve(level)` for the same level (status, optimal, path length). Verify: the parity test passes for a representative level.
- [x] 3.2 Add a unit test for an exact-signature A→B goal: build two states from two arrangements of the same level, pass the first as `startState` and `isGoal = (s) => !s.failed && SM.RULES.snapshotSig(s) === sigB`, and assert the result is `solvable` with the expected stroke count for a reachable B. Verify: the A→B test passes and the returned path replays to B via `SM.RULES.resolveTurn`.
- [x] 3.3 Add a unit test for budget exhaustion: call `SM.SOLVER.solve` with a tiny `maxStates` (e.g., 4) on a level whose optimum is larger, and assert the result is `status: 'unknown'` with a budget reason, not `unsolvable`. Verify: the test asserts `unknown` distinctly from `unsolvable`.
- [x] 3.4 Add a unit test for exhaustive `unsolvable`: build an arrangement pair whose B is unreachable from A within generous budgets, and assert `status: 'unsolvable'`. Verify: the test asserts `unsolvable` (not `unknown`).
- [x] 3.5 Add a unit test that a failed state is never accepted as a goal: pass `isGoal = () => true` and a start state; assert the solver does not report a failed state as a goal. Verify: the solver's `next.failed` skip holds; the result is `solvable` only for a non-failed `won` state, or `unknown`/`unsolvable` otherwise.
- [x] 3.6 Register the new solver-parity and A→B tests in the `unitSuites` (under `rules` or a new `solver` suite) so they run via `npm run test:unit` and the focused scripts. Verify: `npm run test:unit:rules` (or the new `test:unit:solver` script) passes the new cases.

## 4. Wire the editor's A→B path to the real solver

- [x] 4.1 Confirm `ed.solveAB()` in `src/js/sm-editor.js` calls `SM.SOLVER.solve` (already implemented defensively to return `unavailable` when `SM.SOLVER` is absent). Verify: with the solver now present, `ed.solveAB()` returns a real `{ status, optimal, ... }` for a reachable A→B.
- [x] 4.2 Add an editor unit test for a reachable A→B that asserts `ed.solveAB()` returns `status === 'solvable'` with the expected stroke count, and that the returned path replays to B through `SM.RULES.resolveTurn`. Verify: `npm run test:unit:editor` passes the new case.
- [x] 4.3 Add an editor unit test for the `unknown` vs `unsolvable` vs invalid-B distinction: a tiny budget asserts `unknown`; an unreachable B asserts `unsolvable`; a B whose arrangement settles to a failed state asserts invalid. Verify: `npm run test:unit:editor` passes the new cases.

## 5. Final verification

- [x] 5.1 Run the focused suites: `npm run test:unit:editor`, `npm run test:unit:rules`, `npm run test:unit:levels`, `npm run test:unit:helpers`. Verify: all pass.
- [x] 5.2 Run `openspec validate standalone-state-solver --strict`. Verify: strict validation reports no warnings.
- [x] 5.3 Run `npm test` from the repo root. Verify: `tests/verify.js`, `tests/browser-test.js`, and `tests/browser-editor-test.js` all pass; do not claim pass unless the command was run.

## Workflow follow-up

- After review requirements are satisfied, run `/openspec-archive-change` (or `opsx archive`) for `standalone-state-solver`.
- Then resume `/openspec-apply-change level-editor-v1` to complete group 10 (tasks 10.1–10.6) and the remaining task 12.4 (real-Chromium `file://` check).
- Sync the new `state-search-solver` capability into the main specs when the project's accepted-spec synchronization step runs.