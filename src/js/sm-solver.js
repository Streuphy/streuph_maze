/* =========================================================================
 * sm-solver.js  —  STREUPH'S MAZE
 * The standalone solvability solver.
 *
 * Breadth-first over the REAL resolver (SM.RULES.resolveTurn). It searches an
 * arbitrary start state toward an arbitrary goal predicate and reports the
 * minimum stroke count, a directionally balanced representative route, and an
 * honest `solvable` / `unsolvable` / `unknown` status. It never introduces a
 * second simulator: transitions go through SM.RULES.resolveTurn exactly as
 * gameplay does, so the solver can never disagree with play.
 *
 * `status`:
 *   - 'solvable'  exhaustive search proved an optimum and replayed it
 *   - 'unsolvable' exhaustive search found no goal within budget
 *   - 'unknown'    a budget was hit before the search could finish (or replay
 *                  disagreed). `unknown` never proves B is unreachable.
 *
 * Loaded as a CLASSIC SCRIPT (never an ES module) so it works under file://.
 * The module is DOM-, timer-, and async-free, matching the rules-core boundary.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  var MAX_STATES = 250000;
  var MAX_DEPTH = 200;

  var ACTIONS = [
    { type: 'move', dir: 'north' },
    { type: 'move', dir: 'east' },
    { type: 'move', dir: 'south' },
    { type: 'move', dir: 'west' },
    { type: 'pull', dir: 'north' },
    { type: 'pull', dir: 'east' },
    { type: 'pull', dir: 'south' },
    { type: 'pull', dir: 'west' },
    { type: 'act' }
  ];

  function actionsFor() {
    return ACTIONS.map(function (action) { return Object.assign({}, action); });
  }

  function isInt(v) {
    return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
  }

  function routeMetrics(path) {
    var counts = { up: 0, down: 0, left: 0, right: 0 };
    for (var i = 0; i < path.length; i++) {
      var action = path[i];
      if (action.type !== 'move' && action.type !== 'pull') continue;
      if (action.dir === 'north') counts.up++;
      else if (action.dir === 'south') counts.down++;
      else if (action.dir === 'west') counts.left++;
      else if (action.dir === 'east') counts.right++;
    }
    var total = counts.up + counts.down + counts.left + counts.right;
    var mean = total / 4;
    var score = Math.pow(counts.up - mean, 2) + Math.pow(counts.down - mean, 2) +
      Math.pow(counts.left - mean, 2) + Math.pow(counts.right - mean, 2);
    return { counts: counts, score: score };
  }

  /* ---------------------------------------------------------------------- */
  /* solve                                                                  */
  /* opts: { startState, isGoal, maxStates, maxDepth, maxRouteLabels }       */
  /* `startState` is any state from SM.RULES.newState / cloneState.          */
  /* `isGoal(state)` returns true for a goal state; it is evaluated only on  */
  /* non-failed states, so failure is never a recoverable search node.       */
  /* ---------------------------------------------------------------------- */

  function solve(opts) {
    opts = opts || {};
    var maxStates = opts.maxStates === undefined ? MAX_STATES : opts.maxStates;
    var maxDepth = opts.maxDepth === undefined ? MAX_DEPTH : opts.maxDepth;
    var maxRouteLabels = opts.maxRouteLabels === undefined ? maxStates : opts.maxRouteLabels;
    if ([maxStates, maxDepth, maxRouteLabels].some(function (budget) { return !isInt(budget) || budget < 0; })) {
      return { status: 'unknown', reason: 'invalid-budget', optimal: null, explored: 0, path: null,
        routeBalance: { counts: null, score: null, complete: false } };
    }
    if (!opts.startState) {
      return { status: 'unknown', reason: 'missing-startState', optimal: null, explored: 0, path: null,
        routeBalance: { counts: null, score: null, complete: false } };
    }
    var isGoal = opts.isGoal || function (st) { return st.won; };

    var actions = actionsFor();

    var start = opts.startState;
    var startSig = SM.RULES.snapshotSig(start);
    var stateDepth = {};
    var labels = {};
    stateDepth[startSig] = 0;
    labels[startSig + '|0,0,0,0'] = true;

    var queue = [{ st: start, depth: 0, path: [], counts: [0, 0, 0, 0] }];
    var head = 0, explored = 0, routeLabels = 1;
    var goalDepth = null, best = null, budgetHit = false;
    var depthLimited = false, transitionFailed = false, reason = null;

    function countDirection(counts, action) {
      var next = counts.slice();
      if (action.type !== 'move' && action.type !== 'pull') return next;
      var index = action.dir === 'north' ? 0 : action.dir === 'south' ? 1 :
        action.dir === 'west' ? 2 : 3;
      next[index]++;
      return next;
    }

    function balanceScore(counts) {
      var total = counts[0] + counts[1] + counts[2] + counts[3];
      var mean = total / 4;
      var score = 0;
      for (var i = 0; i < 4; i++) score += Math.pow(counts[i] - mean, 2);
      return score;
    }

    function resultForBest(complete) {
      var metrics = routeMetrics(best.path);
      /* Replay the returned route on a fresh clone of the START state, not a
         level rebuild, so the solver works for arbitrary startState. The
         replay reaches a goal (per the same isGoal predicate) at the reported
         stroke count, or the result is downgraded to `unknown`. */
      var replay = SM.RULES.cloneState(start);
      try {
        best.path.forEach(function (action) { SM.RULES.resolveTurn(replay, action); });
        if (!isGoal(replay) || replay.strokes !== best.depth) throw new Error('replay disagrees');
      } catch (e) {
        return { status: 'unknown', optimal: null, explored: explored, path: null,
          reason: 'replay', routeBalance: { counts: null, score: null, complete: false } };
      }
      return {
        status: 'solvable', optimal: best.depth, explored: explored,
        verified: true,
        routeLabels: routeLabels, path: best.path,
        routeBalance: {
          counts: metrics.counts,
          score: metrics.score,
          complete: complete
        }
      };
    }

    if (isGoal(start) && !start.failed) {
      best = { depth: 0, path: [], counts: [0, 0, 0, 0], score: 0 };
      return resultForBest(true);
    }

    while (head < queue.length) {
      var node = queue[head];
      /* BFS has expanded every possible predecessor at the winning depth once
         the next queued label is itself at that depth. */
      if (goalDepth !== null && node.depth >= goalDepth) break;
      if (explored >= maxStates) { budgetHit = true; reason = 'states'; break; }
      node = queue[head++];
      explored++;
      if (node.depth >= maxDepth) { depthLimited = true; continue; }

      for (var a = 0; a < actions.length; a++) {
        var action = actions[a];
        var next = SM.RULES.cloneState(node.st);
        var r;
        try {
          r = SM.RULES.resolveTurn(next, action);
        } catch (e) {
          transitionFailed = true; budgetHit = true; reason = 'transition';
          break;                    // a skipped transition cannot support a proof
        }
        if (r.aborted && r.steps[0].reason !== 'cycle' && r.steps[0].reason !== 'budget') {
          transitionFailed = true; budgetHit = true; reason = 'effect-' + r.steps[0].reason;
          break;
        }
        if (!r.stroke) continue;
        if (next.failed) continue;    // failure is not a recoverable search node

        var nextDepth = node.depth + 1;
        var nextCounts = countDirection(node.counts, action);
        var path = node.path.concat([action]);
        if (isGoal(next) && !next.failed) {
          var score = balanceScore(nextCounts);
          if (goalDepth === null) goalDepth = nextDepth;
          if (nextDepth === goalDepth && (!best || score < best.score)) {
            best = { depth: next.strokes, path: path, counts: nextCounts, score: score };
          }
          continue;
        }

        /* Once an optimum exists, only its predecessor layer can contain
           another equal-length solution. */
        if (goalDepth !== null && nextDepth >= goalDepth) continue;
        var k = SM.RULES.snapshotSig(next);
        if (stateDepth[k] !== undefined && stateDepth[k] < nextDepth) continue;
        if (stateDepth[k] === undefined) stateDepth[k] = nextDepth;
        var labelKey = k + '|' + nextCounts.join(',');
        if (labels[labelKey]) continue;
        if (routeLabels >= maxRouteLabels) { budgetHit = true; reason = 'route-labels'; break; }
        labels[labelKey] = true;
        routeLabels++;
        queue.push({ st: next, depth: nextDepth, path: path, counts: nextCounts });
      }
      if (budgetHit) break;
    }

    if (best && !transitionFailed) return resultForBest(!budgetHit && !depthLimited);
    if (budgetHit || depthLimited) {
      return { status: 'unknown', optimal: null, explored: explored,
        reason: reason || 'depth',
        routeLabels: routeLabels, path: null,
        routeBalance: { counts: null, score: null, complete: false } };
    }
    return { status: 'unsolvable', optimal: null, explored: explored, path: null };
  }

  SM.SOLVER = {
    solve: solve,
    actionsFor: actionsFor,
    routeMetrics: routeMetrics,
    MAX_STATES: MAX_STATES,
    MAX_DEPTH: MAX_DEPTH
  };

})(typeof window !== 'undefined' ? window : globalThis);