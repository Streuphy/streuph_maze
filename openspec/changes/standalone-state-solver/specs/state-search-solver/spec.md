# Spec Delta

## Purpose

A standalone, budget-bound breadth-first solver that searches the real resolver's state
space from an arbitrary start state to a goal predicate, returning an optimal-stroke route
with honest solvable/unsolvable/unknown status.

## ADDED Requirements

### Requirement: The solver accepts an arbitrary start state

The solver SHALL accept a pre-built `startState` produced by `SM.RULES.newState` or
`SM.RULES.cloneState`, and SHALL NOT require a level object to build the start state. The
caller owns start-state construction; the solver searches from the state it is given.

#### Scenario: Search from a cloned state
- **WHEN** the caller passes a state cloned from an authored arrangement
- **THEN** the solver searches from that state without rebuilding it from a level

#### Scenario: Search from a level's initial state
- **WHEN** the caller passes `SM.RULES.newState(level)` as the start state
- **THEN** the solver searches from the level's initial configuration, matching the existing behavior

### Requirement: The solver accepts an arbitrary goal predicate

The solver SHALL accept an `isGoal(state)` predicate and SHALL treat a state as a goal when
the predicate returns true on a non-failed state. The predicate MAY be `state.won` (the
classic PAR case) or an exact-signature match to a target state (the A→B case).

#### Scenario: The classic won predicate
- **WHEN** the caller passes `isGoal = (s) => s.won`
- **THEN** the solver finds a route that wins the level, matching the existing PAR behavior

#### Scenario: An exact-signature goal
- **WHEN** the caller passes `isGoal = (s) => !s.failed && SM.RULES.snapshotSig(s) === targetSig`
- **THEN** the solver finds a route whose settled state matches the target signature exactly

#### Scenario: A failed state is never a goal
- **WHEN** a resolved turn produces a failed state and the goal predicate returns true
- **THEN** the solver does not accept that state as a goal, because failure is not a recoverable search node

### Requirement: Search is breadth-first over the real resolver

The solver SHALL expand states by applying the standard action set (move in each cardinal
direction, pull in each cardinal direction, and act) through `SM.RULES.resolveTurn`, cloning
the state before each transition. It SHALL NOT introduce a second simulator, an alternative
transition engine, or any editor-invented action.

#### Scenario: Transitions use the real resolver
- **WHEN** the solver expands a state
- **THEN** each successor is produced by `SM.RULES.resolveTurn` on a cloned state, never by a parallel implementation

#### Scenario: The action set is the standard one
- **WHEN** the solver enumerates actions
- **THEN** it considers only move, pull, and act, the same actions gameplay uses

### Requirement: Search is bound by configured budgets

The solver SHALL enforce `maxStates` (expanded states), `maxDepth` (search depth), and
`maxRouteLabels` (distinct route-balance labels). When a budget is exhausted, the solver
SHALL return `unknown` with the budget reason; it SHALL NOT return `unsolvable` unless the
search is exhaustive.

#### Scenario: Budget exhaustion returns unknown
- **WHEN** the solver cannot finish within the configured budgets
- **THEN** it returns `status: 'unknown'` with the budget reason, and does not claim the goal is unreachable

#### Scenario: Exhaustive search returns unsolvable
- **WHEN** the solver explores the entire reachable state space within budget and finds no goal
- **THEN** it returns `status: 'unsolvable'`

#### Scenario: A reachable goal returns solvable
- **WHEN** the solver finds a state satisfying the goal predicate within budget
- **THEN** it returns `status: 'solvable'` with the minimum stroke count as `optimal`

### Requirement: The optimal route is replay-verified before reporting

Before returning a `solvable` result, the solver SHALL replay the returned path through
`SM.RULES.resolveTurn` on a fresh clone of the start state and SHALL verify it reaches a
goal state with the reported stroke count. If replay disagrees, the solver SHALL return
`unknown` with reason `replay` rather than a false `solvable` result.

#### Scenario: Replay agrees
- **WHEN** the solver replays the returned path
- **THEN** the replay reaches a goal state with the reported stroke count and the result is `solvable`

#### Scenario: Replay disagrees
- **WHEN** replaying the returned path does not reach a goal state or the stroke count differs
- **THEN** the solver returns `unknown` with reason `replay`, not `solvable`

### Requirement: Minimum-stroke routes use directional-balance tie-break

Among all routes at the minimum stroke count, the solver SHALL select the route with the
lowest squared deviation of its north, south, east, and west command counts from an equal
split, counting explicit move and pull commands once in their commanded direction and
excluding act and automatic movement. Ties SHALL be broken by the first route in the
solver's deterministic breadth-first action order. This preserves the `solver-par-routes`
selection rules.

#### Scenario: A more balanced minimum route is preferred
- **WHEN** two minimum routes have different directional-balance scores
- **THEN** the solver selects the route with the lower score without changing the optimal stroke count

#### Scenario: Ties use discovery order
- **WHEN** two minimum routes have the same best balance score
- **THEN** repeated searches select the earliest such route in the established action order

### Requirement: The result shape is stable and honest

The solver SHALL return a result object containing `status` (`solvable`, `unsolvable`, or
`unknown`), `optimal` (the minimum stroke count or null), `explored` (states expanded),
`path` (the ordered action sequence or null), and `routeBalance` (counts, score, and
completeness). It SHALL distinguish a completed comparison of minimum routes from a
route search stopped by budget, preserving any already-proven optimal stroke count.

#### Scenario: A complete solvable result
- **WHEN** the solver finds and replay-verifies an optimal route within budget
- **THEN** the result contains the optimal stroke count, the path, command counts, and balance-comparison completeness

#### Scenario: An incomplete balance comparison
- **WHEN** the solver proves an optimal route but cannot finish comparing all minimum routes within budget
- **THEN** it retains the valid optimal route and stroke count and marks balanced-route selection as incomplete

### Requirement: The classic level solver remains back-compatible

`SM.LEVELS.solve(level, opts)` SHALL remain available and SHALL return the same results as
before by building `SM.RULES.newState(level)` and passing `isGoal = (s) => s.won` to the
standalone solver. Existing call sites — validation, route reporting, and tests — SHALL
continue to pass unchanged.

#### Scenario: Existing callers are unaffected
- **WHEN** `SM.LEVELS.solve(level, opts)` is called with the same arguments as before
- **THEN** it returns the same `status`, `optimal`, `path`, and `routeBalance` as the prior embedded solver

#### Scenario: PAR route reporting still works
- **WHEN** `scripts/report-par-routes.js` runs against the shipped packs
- **THEN** it reports the same proven optima and balanced representative routes as before
