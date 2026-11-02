# Design

## Context

The engine has a bounded BFS solver embedded in `src/js/levels.js` as `SM.LEVELS.solve`
(lines 609–745). It is BFS over the real `SM.RULES.resolveTurn`, with the start hard-coded
to `SM.RULES.newState(level)` and the goal hard-coded to `st.won`. It enforces `maxStates`,
`maxDepth`, and `maxRouteLabels` budgets, returns `unknown` on exhaustion (never a wrong
answer), replay-verifies the path before reporting `solvable`, and applies the
directional-balance tie-break from the `solver-par-routes` capability. See `proposal.md`
for why it must be extracted and generalized.

## Goals / Non-Goals

**Goals:**
- Extract the solver into `src/js/sm-solver.js` as `SM.SOLVER.solve({ startState, isGoal,
  maxStates, maxDepth, maxRouteLabels })` with no behavior change to existing callers.
- Generalize the start to any pre-built state and the goal to any predicate.
- Keep the real `SM.RULES.resolveTurn` as the only transition engine.

**Non-Goals:**
- Changing the directional-balance selection or status-honesty rules (owned by
  `solver-par-routes`, preserved unchanged).
- A custom A*, iterative deepening, or any non-BFS algorithm (BFS over the real resolver
  guarantees the solver never disagrees with play; that invariant is the point).
- A Web Worker or async API in v1 (the solver stays synchronous, matching the rules core).
- Any change to the rules core, tile IDs, YAML schema, or action set.

## Decisions

### 1. Move the BFS body verbatim, then parameterize two seams
The extraction is mechanical: move `solve`, `actionsFor`, `routeMetrics`, and the
directional-balance helpers from `levels.js` into `sm-solver.js`. Then parameterize exactly
two seams: replace `var start = SM.RULES.newState(level)` with `var start = opts.startState`,
and replace `function isGoal(st) { return st.won; }` with `var isGoal = opts.isGoal ||
function (st) { return st.won; }`. Everything else — the queue, label deduplication, budget
checks, replay verification, and balance scoring — stays identical.
*Alternative*: rewrite the solver from scratch — rejected; it would risk diverging from
the replay-verified, budget-honest behavior the project relies on.

### 2. `SM.LEVELS.solve` becomes a one-line wrapper
`SM.LEVELS.solve = function (level, opts) { return SM.SOLVER.solve(Object.assign({}, opts,
  { startState: SM.RULES.newState(level), isGoal: function (s) { return s.won; } })); };`
This preserves the exact call signature and return shape for `scripts/report-par-routes.js`,
`sm-io.js` validation, and every test. No caller changes.
*Alternative*: have callers call `SM.SOLVER.solve` directly — rejected for this change; it
would force unrelated edits across the codebase and is out of scope.

### 3. Actions are level-independent
The `ACTIONS` constant (4 moves + 4 pulls + act) does not depend on the level; it is the
fixed gameplay action set. The extracted solver builds it once, not per call.
`actionsFor()` returns fresh copies for path mutation safety, as today.

### 4. The goal predicate is evaluated on non-failed states only
The existing solver skips `next.failed` states (`if (next.failed) continue;`). The
generalized `isGoal` is checked after that skip, so a failed state is never accepted as a
goal even if the predicate would return true. This matters for A→B: B's signature is a
settled non-failed state, and the editor's `solveAB` predicate already guards with
`!s.failed && snapshotSig(s) === sigB`. The solver's own guard is defense-in-depth.

### 5. Budget defaults mirror `levels.js`
`MAX_STATES = 250000`, `MAX_DEPTH = 200`, and `maxRouteLabels` defaulting to `maxStates`
are exported from the solver module and used as defaults when the caller omits them. The
editor's `solveAB` forwards caller budgets or falls back to these, so A→B search uses the
same safe envelopes as PAR proof.

### 6. No DOM, timers, or async
The solver module is loaded by `tests/verify.js` and the editor test loader, both of which
run in Node. It must stay DOM-, timer-, and async-free, matching the rules-core boundary.
The only browser-global it touches is `globalThis.SM`, exactly like `levels.js` today.

## Risks / Trade-offs

- **[Risk] Extraction subtly changes behavior** → The body is moved verbatim and only two
  seams are parameterized; the existing `npm run test:unit:rules` and `test:unit:levels`
  suites (which include `checkParRouteSelection` and `checkFailureSolver`) must pass
  unchanged, giving high confidence the extraction is behavior-preserving.
- **[Risk] A caller passes a `startState` that is not produced by `SM.RULES`** → The solver
  calls `SM.RULES.snapshotSig` and `SM.RULES.resolveTurn` on it; an incompatible state will
  throw, which the solver surfaces as `unknown` with reason `transition` (as today), not a
  crash. The editor's `solveAB` builds the start state via `SM.RULES.buildLevel` +
  `newState`, so it is always compatible.
- **[Trade-off] The solver stays synchronous** → A large A→B search with big budgets can
  block the editor UI. v1 reuses the existing budgets (capped, return `unknown`); offloading
  to a Worker is a deferred, opt-in enhancement that must not change resolver outcomes.

## Migration Plan

Greenfield module; no data migration. Steps: (1) add `src/js/sm-solver.js` with the moved
body and two parameterized seams; (2) replace the `solve` body in `levels.js` with the
wrapper; (3) add `sm-solver.js` to the script lists in `tests/verify.js` and
`tests/unit/editor.js`; (4) run `npm run test:unit:rules`, `test:unit:levels`,
`test:unit:editor`, and `npm test`. Rollback is reverting the three files; no shared state
is introduced.

## Open Questions

- Whether to expose a higher-level `solveAB(arrangementA, arrangementB, opts)` convenience
  on `SM.SOLVER` for the editor, or keep that orchestration in the editor (current choice:
  the editor owns `solveAB` orchestration; `SM.SOLVER.solve` stays primitive). Deferrable;
  does not change the spec or task breakdown.
