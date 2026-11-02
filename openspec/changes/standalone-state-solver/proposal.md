# Proposal

## Why

The engine has a bounded BFS solver, but it is embedded in `src/js/levels.js` as
`SM.LEVELS.solve`, with the start hard-coded to `SM.RULES.newState(level)` and the goal
hard-coded to `st.won`. That is sufficient for proving a level's PAR, but it cannot answer
the broader design question the level editor needs: "what is the optimal stroke count
between two arbitrary board arrangements A and B?" Extracting the solver into a standalone
module that accepts an arbitrary start state and an arbitrary goal predicate — while keeping
the real `SM.RULES.resolveTurn` as the only transition engine — makes A→B search possible
without a second simulator, and leaves `SM.LEVELS.solve` as a thin back-compatible wrapper.

## What Changes

- Add a new module `src/js/sm-solver.js` exposing `SM.SOLVER.solve({ startState, isGoal,
  maxStates, maxDepth, maxRouteLabels })` returning the existing shape
  `{ status, optimal, explored, path, routeBalance, ... }`.
- **Generalize the start**: accept a pre-built `startState` (any state produced by
  `SM.RULES.newState` or `SM.RULES.cloneState`) instead of always rebuilding from a level.
- **Generalize the goal**: accept an `isGoal(state)` predicate instead of hard-coding
  `state.won`. The predicate is evaluated on non-failed states after each resolved turn.
- **Preserve the budget contract**: enforce `maxStates` / `maxDepth` / `maxRouteLabels`;
  budget exhaustion returns `unknown`, never `unsolvable`. Only exhaustive search returns
  `unsolvable`. This preserves the `solver-par-routes` capability's honesty rule.
- **Preserve directional-balance tie-break**: among minimum-stroke routes, select the route
  with the lowest squared deviation of north/south/east/west command counts from an equal
  split, using the solver's fixed breadth-first action order to break ties.
- **No second simulator**: reuse only `SM.RULES.cloneState`, `SM.RULES.snapshotSig`, and
  `SM.RULES.resolveTurn`. No DOM, timers, async, or editor-invented transitions. The
  standard action set (move/pull/act) is used; no action restriction is introduced.
- **Replay-verify**: any returned route is replayed through `SM.RULES.resolveTurn` on a fresh
  clone of the start state before a `solvable` result is reported, exactly as today.
- **Back-compatibility**: `SM.LEVELS.solve(level, opts)` becomes a thin wrapper that builds
  `SM.RULES.newState(level)` and passes `isGoal = (s) => s.won`. Existing call sites —
  `scripts/report-par-routes.js`, validation, and all tests — remain unchanged and green.

## Capabilities

### New Capabilities
- `state-search-solver`: A standalone, budget-bound breadth-first solver that searches the
  real resolver's state space from an arbitrary start state to a goal predicate, returning
  an optimal-stroke route with directional-balance tie-break and honest
  `solvable`/`unsolvable`/`unknown` status.

### Modified Capabilities
<!-- None. The `solver-par-routes` capability (directional-balance selection and honest
     status reporting among minimum-stroke routes) is preserved unchanged; this change
     generalizes the solver's start and goal but keeps its selection and reporting rules. -->

## Impact

- **New files**: `src/js/sm-solver.js` and solver-focused unit tests.
- **Modified files**: `src/js/levels.js` — `SM.LEVELS.solve` becomes a thin wrapper over
  `SM.SOLVER.solve`; the embedded BFS body moves to the new module. `tests/verify.js` and
  the editor test loader gain `sm-solver.js` in their script lists.
- **Consumed APIs**: `SM.RULES.newState`/`cloneState`/`snapshotSig`/`resolveTurn` only.
- **No rules-core changes**: no DOM, timers, async, new tile IDs, or new YAML behavior. The
  rules layer stays DOM-, timer-, and async-free.
- **Downstream**: unblocks group 10 (A→B solver integration) of the `level-editor-v1`
  change, whose `ed.solveAB()` already calls `SM.SOLVER.solve` defensively and surfaces
  `unavailable` until this change lands.
