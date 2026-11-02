'use strict';
const assert = require('node:assert/strict');
const { reviewEarlyLevel } = require('../../scripts/report-par-routes');

function prologue(SM) {
  const fs = require('node:fs'), path = require('node:path');
  const yaml = SM.parseYAML(fs.readFileSync(path.join(__dirname, '../../data/levels.yaml'), 'utf8'));
  assert.deepEqual(yaml, SM.DEFAULT_LEVELS, 'generated Prologue preserves every authored field, including overrides and embedded victory art');
  const loaded = SM.LEVELS.boot({ solve: false });
  assert.equal(loaded.ok, true);
  const minima = [8, 8, 6, 8, 9, 11, 11, 12, 13, 27, 16, 27, 4];
  const routes = [];
  for (const [index, level] of loaded.levels.entries()) {
    const proof = SM.LEVELS.solve(level);
    assert.equal(proof.status, 'solvable', level.key);
    assert.equal(proof.verified, true, level.key);
    assert.equal(proof.optimal, minima[index], level.key);
    assert.equal(level.par, proof.optimal, level.key);
    assert.equal(proof.routeBalance.complete, true, level.key);
    const replay = SM.RULES.newState(level), events = [];
    for (const action of proof.path) {
      const result = SM.RULES.resolveTurn(replay, action);
      assert.equal(result.aborted, undefined, level.key);
      assert.equal(replay.failed, false, level.key);
      events.push(...result.steps);
    }
    assert.equal(replay.won, true, level.key); assert.equal(replay.strokes, proof.optimal, level.key);
    routes.push(events);
    if (index < 7 && index !== 3) {
      const review = reviewEarlyLevel(SM, level);
      assert.equal(review.status, 'complete', level.key);
      assert.equal(review.unwinnablePlayingStates, 0, level.key);
      assert.equal(review.terminalFailureTransitions, 0, level.key);
    }
  }
  assert.equal(reviewEarlyLevel(SM, loaded.levels[3]).unwinnablePlayingStates, 0,
    'Loader side walls prevent the first crate lesson being reversed into an edge trap');
  assert.ok(routes[1].some(event => event.type === 'colour' && event.which === 'P'));
  assert.ok(routes[1].some(event => event.type === 'colour' && event.which === 'W'));
  assert.ok(routes[2].some(event => event.type === 'move' && event.cause === 'flow'));
  assert.ok(routes[3].some(event => event.type === 'signal-edge' && event.active));
  assert.ok(routes[7].some(event => event.type === 'teleport'));
  assert.ok(routes[8].some(event => event.type === 'push' && event.cause === 'flow'));
  assert.equal(routes[12].filter(event => event.type === 'switch').length, 2);

  function without(index, ids) {
    const raw = JSON.parse(JSON.stringify(SM.DEFAULT_LEVELS.levels['level_' + index]));
    raw.grid = raw.grid.map(row => row.map(id => ids.includes(id) ? 0 : id));
    for (const id of ids) if (raw.overrides) delete raw.overrides[id];
    // The common loader still validates each counterfactual, not a second simulator.
    const result = SM.LEVELS.validate({ name: 'Necessity review', world_id: 'review-prologue', num_level: 1,
      levels: { level_1: raw } }, { solve: false });
    assert.equal(result.ok, true, JSON.stringify(result.problems));
    return SM.LEVELS.solve(result.levels[0]);
  }
  for (const [index, ids] of [[2, [11]], [2, [20]], [4, [50]], [4, [71]], [5, [41]],
    [6, [41]], [7, [41]], [8, [80]], [8, [11]], [8, [20]], [9, [50]], [12, [41]], [12, [11]], [12, [22]]]) {
    assert.equal(without(index, ids).status, 'unsolvable', `Prologue ${index}: ${ids} must be necessary`);
  }
  assert.equal(without(3, [64]).optimal, 8);
  assert.equal(without(9, [60]).optimal, 15, 'cargo belt saves two commands rather than decorating an equal manual route');
  assert.equal(without(13, [45]).optimal, 3);
  for (const [index, ids] of [[5, [44]], [6, [42]], [10, [71]], [11, [30]], [12, [44]]]) {
    assert.equal(without(index, ids).optimal, minima[index - 1], `Prologue ${index}: explicitly optional demonstration`);
  }

  const plate = SM.RULES.newState(loaded.levels[5]);
  function go(dir) { return SM.RULES.resolveTurn(plate, { type: 'move', dir }); }
  // A1 -> C2 key -> F3 plate -> G3 safe release; H3 must already be closed.
  ['north', 'east', 'east', 'east', 'east', 'east', 'north'].forEach(go);
  assert.deepEqual(plate.player, { x: 5, y: 2 });
  assert.equal(SM.RULES.isLocked(plate, 7, 2), false);
  go('east'); assert.equal(plate.failed, false); assert.equal(SM.RULES.isLocked(plate, 7, 2), true);
  assert.equal(go('east').stroke, false); assert.equal(plate.player.x, 6);
  assert.equal(plate.failed, false, 'optional plate experiment blocks safely instead of closing under the dot');
}

function worldOne(SM) {
  const fs = require('node:fs'), path = require('node:path');
  const text = fs.readFileSync(path.join(__dirname, '../../data/worlds/world-01-sokoban.levels.yaml'), 'utf8');
  const loaded = SM.LEVELS.load(text, { solve: false });
  assert.equal(loaded.ok, true); assert.equal(loaded.levels.length, 8);
  const minima = [8, 8, 9, 13, 15, 17, 21, 23];
  for (const [index, level] of loaded.levels.entries()) {
    assert.equal(level.worldId, 'world-01-sokoban'); assert.equal(level.key, 'level_' + (index + 1));
    const proof = SM.LEVELS.solve(level), replay = SM.RULES.newState(level), gates = new Set(), targets = new Set();
    assert.equal(proof.status, 'solvable'); assert.equal(proof.verified, true);
    assert.equal(proof.optimal, minima[index]); assert.equal(level.par, minima[index]);
    assert.equal(proof.routeBalance.complete, true);
    assert.equal(SM.RULES.isSolid(replay, replay.player.x, replay.player.y), false);
    for (const crate of replay.crates.flat().filter(Boolean)) {
      assert.equal(crate.capabilities.pushable, true); assert.equal(crate.capabilities.pullable, false);
      assert.equal(crate.capabilities.ray, 'block');
    }
    for (const action of proof.path) {
      const prior = SM.RULES.snapshot(replay), result = SM.RULES.resolveTurn(replay, action);
      assert.equal(result.aborted, undefined); assert.equal(replay.failed, false);
      const after = SM.RULES.snapshot(replay);
      SM.RULES.restore(replay, prior); SM.RULES.resolveTurn(replay, action);
      assert.deepEqual(SM.RULES.snapshot(replay), after, 'World 1 replay after internal undo matches');
      for (const event of result.steps) {
        if (event.type === 'signal-edge' && event.active) targets.add(event.entityId);
        if (event.type === 'move') {
          const tile = SM.RULES.tileAt(replay, event.to.x, event.to.y);
          if (tile.solid === 'locked') gates.add(tile.params.link);
        }
      }
    }
    assert.equal(replay.won, true); assert.equal(replay.strokes, minima[index]);
    const targetIds = [...new Set(level.raw.grid.flat())].filter(id => [23, 24, 25].includes(id));
    assert.equal(targets.size, targetIds.length, 'every target contributes a real activation edge');
    assert.equal(gates.size, targetIds.length, 'minimum route crosses every linked gate');
    for (const id of targetIds) {
      const raw = JSON.parse(JSON.stringify(level.raw)); raw.grid = raw.grid.map(row => row.map(tile => tile === id ? 0 : tile));
      const counter = SM.LEVELS.validate({ name: 'World 1 necessity', world_id: 'necessity-world-1', num_level: 1,
        levels: { level_1: raw } }, { solve: false });
      assert.equal(counter.ok, true);
      assert.equal(SM.LEVELS.solve(counter.levels[0]).status, 'unsolvable', `${level.key}: target ${id} is essential`);
    }
    if (index < 4) {
      const review = reviewEarlyLevel(SM, level);
      assert.equal(review.status, 'complete'); assert.equal(review.unwinnablePlayingStates, 0);
      assert.equal(review.terminalFailureTransitions, 0);
    }
  }
}

function worldTwoReviewed(SM) {
  const fs = require('node:fs'), path = require('node:path');
  const loaded = SM.LEVELS.load(fs.readFileSync(path.join(__dirname, '../../data/worlds/world-02-lolos-castle.levels.yaml'), 'utf8'), { solve: false });
  assert.equal(loaded.ok, true);
  for (const [index, level] of loaded.levels.entries()) {
    const proof = SM.LEVELS.solve(level), s = SM.RULES.newState(level);
    assert.equal(proof.status, 'solvable'); assert.equal(proof.verified, true);
    assert.equal(proof.optimal, [7, 7, 11, 20, 15, 18, 31, 39][index]); assert.equal(level.par, proof.optimal);
    assert.equal(SM.RULES.isCaught(s), false);
    const events = [];
    for (const action of proof.path) {
      const result = SM.RULES.resolveTurn(s, action);
      assert.equal(s.failed, false); assert.equal(result.aborted, undefined); events.push(...result.steps);
    }
    assert.equal(s.won, true); assert.equal(s.strokes, proof.optimal);
    assert.ok(events.some(event => event.type === 'push'));
    assert.ok(events.some(event => event.type === 'ray' && event.cells.length > 0));
    const review = reviewEarlyLevel(SM, level);
    assert.equal(review.status, 'complete'); assert.equal(review.unwinnablePlayingStates, [0, 0, 0, 0, 0, 0, 212, 464][index]);
    assert.ok(review.terminalFailureTransitions > 0, 'visible ray mistakes remain failures, not hidden playing-state traps');
    function counterfactual(transform) {
      const raw = JSON.parse(JSON.stringify(level.raw)); transform(raw);
      const counter = SM.LEVELS.validate({ name: 'Shield necessity', world_id: 'shield-necessity', num_level: 1,
        levels: { level_1: raw } }, { solve: false });
      assert.equal(counter.ok, true);
      return SM.LEVELS.solve(counter.levels[0]);
    }
    assert.equal(counterfactual(raw => { raw.grid = raw.grid.map(row => row.map(id => id === 70 ? 0 : id)); }).status, 'unsolvable');
    assert.equal(counterfactual(raw => { raw.grid = raw.grid.map(row => row.map(id => id === 84 ? 3 : id)); }).optimal, [3, 3, 3, 16, 5, 4, 23, 27][index],
      'primary ray changes the optimum: immediate goal entry cannot skip the crossing');
    assert.equal(counterfactual(raw => {
      raw.object_overrides = {};
      raw.grid.forEach((row, y) => row.forEach((id, x) => {
        if (id === 70) raw.object_overrides[SM.RULES.cellLabel(x, raw.height - 1 - y)] = { ray: 'ignore' };
      }));
    }).status, 'unsolvable');
    if (index === 3 || index >= 6) {
      assert.ok(events.some(event => event.type === 'signal-edge' && event.active));
      for (const target of [...new Set(level.raw.grid.flat())].filter(id => [23, 24, 25].includes(id))) {
        assert.equal(counterfactual(raw => { raw.grid = raw.grid.map(row => row.map(id => id === target ? 0 : id)); }).status, 'unsolvable');
        const link = SM.getTile(target).params.link;
        assert.ok(events.some(event => event.type === 'move' &&
          SM.RULES.tileAt(s, event.to.x, event.to.y).solid === 'locked' &&
          SM.RULES.tileAt(s, event.to.x, event.to.y).params.link === link), 'every target-controlled gate is actually crossed');
      }
    }
    if (index >= 6) {
      for (const emitterX of index === 6 ? [4, 9] : [4, 9, 15]) {
        assert.equal(counterfactual(raw => { raw.grid[raw.height - 3][emitterX] = 3; }).optimal, level.par - 4,
          'each active chamber beam independently adds a real shielding requirement');
      }
    }
    const mistake = SM.RULES.newState(level);
    for (let step = 0; step < [2, 2, 2, 2, 4, 3, 2, 2][index]; step++) SM.RULES.resolveTurn(mistake, { type: 'move', dir: 'north' });
    assert.equal(mistake.failed, true); assert.equal(mistake.player.y, [2, 2, 2, 2, 4, 3, 2, 2][index]);
    assert.equal(SM.RULES.newState(level).failed, false, 'restart, not a continued respawn path, recovers exposure');
  }
}

function worldThree(SM) {
  const fs = require('node:fs'), path = require('node:path');
  const loaded = SM.LEVELS.load(fs.readFileSync(path.join(__dirname, '../../data/worlds/world-03-hyrule-flip-flop.levels.yaml'), 'utf8'), { solve: false });
  assert.equal(loaded.ok, true); assert.equal(loaded.levels.length, 8);
  const pars = [5, 8, 8, 12, 15, 20, 11, 97], flips = [1, 2, 2, 2, 2, 5, 2, 14];
  for (const [index, level] of loaded.levels.entries()) {
    const proof = SM.LEVELS.solve(level), s = SM.RULES.newState(level);
    assert.equal(proof.status, 'solvable'); assert.equal(proof.verified, true);
    assert.equal(proof.optimal, pars[index]); assert.equal(level.par, proof.optimal);
    assert.equal(proof.path.filter(action => action.type === 'act').length, flips[index]);
    if (index === 7) assert.equal(proof.path.filter(action => action.type === 'move').length, 83,
      'mastery attains the independent 83-move plus 14-flip lower bound');
    assert.equal(proof.routeBalance.complete, true);
    let sawPending = false;
    for (const action of proof.path) {
      const beforePolarity = s.polarity, result = SM.RULES.resolveTurn(s, action);
      assert.equal(result.aborted, undefined); assert.equal(s.failed, false);
      assert.equal(s.P, 'wht'); assert.equal(s.W, 'wht', 'barrier colors do not change aura or world carriers');
      if (action.type === 'act') assert.notEqual(s.polarity, beforePolarity);
      else assert.equal(s.polarity, beforePolarity, 'crystal entry is not an implicit ACTION');
      if (index === 6 && SM.RULES.closureAt(s, 2, 1).pendingClose) {
        sawPending = true;
        assert.ok(s.crates[1][2]);
        const snap = SM.RULES.snapshot(s), clone = SM.RULES.cloneState(s);
        assert.equal(SM.RULES.describeTile(clone, 2, 1).pendingClose, true);
        SM.RULES.restore(clone, snap); assert.equal(SM.RULES.closureAt(clone, 2, 1).effectiveSolid, false);
      }
    }
    assert.equal(s.won, true); assert.equal(s.strokes, pars[index]);
    assert.equal(s.polarity, flips[index] % 2 ? 'blue-open' : 'red-open');
    if (index === 6) assert.equal(sawPending, true, 'the actual minimum demonstrates crate-held physical closure');
    if (index < 3 || index === 7) {
      const review = reviewEarlyLevel(SM, level);
      assert.equal(review.status, 'complete'); assert.equal(review.unwinnablePlayingStates, 0);
      assert.equal(review.terminalFailureTransitions, 0);
    }
    const raw = JSON.parse(JSON.stringify(level.raw)); raw.grid = raw.grid.map(row => row.map(id => id === 48 ? 0 : id));
    const counter = SM.LEVELS.validate({ name: 'Crystal necessity', world_id: 'crystal-necessity', num_level: 1,
      levels: { level_1: raw } }, { solve: false });
    assert.equal(counter.ok, true); assert.equal(SM.LEVELS.solve(counter.levels[0]).status, 'unsolvable');
  }
}

function worldFour(SM) {
  const fs = require('node:fs'), path = require('node:path');
  const loaded = SM.LEVELS.load(fs.readFileSync(path.join(__dirname, '../../data/worlds/world-04-pengo-vector.levels.yaml'), 'utf8'), { solve: false });
  assert.equal(loaded.ok, true);
  for (const [index, level] of loaded.levels.entries()) {
    const proof = SM.LEVELS.solve(level), s = SM.RULES.newState(level);
    assert.equal(proof.status, 'solvable'); assert.equal(proof.verified, true);
    assert.equal(proof.optimal, [2, 5, 8, 7, 13, 2, 17, 4][index]); assert.equal(level.par, proof.optimal);
    assert.equal(proof.routeBalance.complete, true);
    const events = [];
    for (const action of proof.path) {
      const result = SM.RULES.resolveTurn(s, action); assert.equal(result.aborted, undefined);
      assert.equal(s.failed, false); events.push(...result.steps);
    }
    assert.equal(s.won, true); assert.equal(s.strokes, proof.optimal);
    assert.ok(events.some(event => event.cause === (index === 4 ? 'ice' : 'flow')));
    const review = reviewEarlyLevel(SM, level);
    assert.equal(review.status, 'complete'); assert.equal(review.unwinnablePlayingStates, index === 7 ? 10 : 0);
    assert.equal(review.terminalFailureTransitions, 0); assert.equal(review.diagnosticAborts, 0);
    const raw = JSON.parse(JSON.stringify(level.raw));
    raw.grid = raw.grid.map(row => row.map(id => id >= 60 && id <= 67 ? 0 : id));
    const noBelts = SM.RULES.buildLevel(raw, level.key);
    assert.equal(SM.LEVELS.solve(noBelts).optimal, [5, 8, 9, 11, 13, 15, 18, 18][index]);
    if (level.raw.grid.flat().includes(5)) {
      const noIceRaw = JSON.parse(JSON.stringify(level.raw)); noIceRaw.grid = noIceRaw.grid.map(row => row.map(id => id === 5 ? 0 : id));
      assert.equal(SM.LEVELS.solve(SM.RULES.buildLevel(noIceRaw, level.key)).optimal, [null, null, 10, 6, 13, 3, null, 7][index]);
    }
  }
  const launch = SM.RULES.newState(loaded.levels[2]);
  ['east', 'east', 'east'].forEach(dir => SM.RULES.resolveTurn(launch, { type: 'move', dir }));
  assert.equal(launch.player.x, 5); assert.ok(launch.crates[1][6]); assert.equal(launch.crates[1][7], null,
    'occupied conveyor exit cannot manufacture a front shove');
  const beforeRest = SM.RULES.snapshot(launch);
  SM.RULES.resolveTurn(launch, { type: 'act' });
  assert.equal(launch.player.x, 5); assert.ok(launch.crates[1][6]);
  SM.RULES.restore(launch, beforeRest); assert.equal(launch.strokes, 3);
  const closedLoopRaw = JSON.parse(JSON.stringify(loaded.levels[1].raw));
  closedLoopRaw.grid[2][2] = 66; closedLoopRaw.grid[2][5] = 66;
  const closedLoop = SM.RULES.newState(SM.RULES.buildLevel(closedLoopRaw, 'closed-circuit'));
  const loopBefore = SM.RULES.snapshot(closedLoop);
  const abort = SM.RULES.resolveTurn(closedLoop, { type: 'move', dir: 'east' });
  assert.equal(abort.aborted, true); assert.equal(abort.steps[0].reason, 'cycle');
  assert.deepEqual(SM.RULES.snapshot(closedLoop), loopBefore, 'restoring the old closed circuit rolls back the entire action');
  const noBumperRaw = JSON.parse(JSON.stringify(loaded.levels[7].raw));
  noBumperRaw.grid = noBumperRaw.grid.map(row => row.map(id => id === 70 ? 0 : id));
  assert.equal(SM.LEVELS.solve(SM.RULES.buildLevel(noBumperRaw, 'no-bumper')).status, 'unsolvable');
}

function worldFive(SM) {
  const fs = require('node:fs'), path = require('node:path');
  const loaded = SM.LEVELS.load(fs.readFileSync(path.join(__dirname, '../../data/worlds/world-05-chips-chromatic.levels.yaml'), 'utf8'), { solve: false });
  assert.equal(loaded.ok, true);
  const pars = [8, 10, 9, 7, 13, 15, 27, 15];
  const essential = [[11, 20], [11, 13, 20], [13, 20], [12, 22, 41], [11, 12, 13, 20],
    [11, 12, 13, 20], [12, 13, 20], [11, 12, 13, 20]];
  for (const [index, level] of loaded.levels.entries()) {
    const proof = SM.LEVELS.solve(level), s = SM.RULES.newState(level);
    assert.equal(proof.status, 'solvable'); assert.equal(proof.verified, true);
    assert.equal(proof.optimal, pars[index]); assert.equal(level.par, proof.optimal);
    assert.equal(proof.routeBalance.complete, true);
    const entries = [], crossedGates = new Set();
    for (const action of proof.path) {
      const before = { P: s.P, W: s.W }, result = SM.RULES.resolveTurn(s, action);
      assert.equal(result.aborted, undefined); assert.equal(s.failed, false);
      for (const event of result.steps) if (event.type === 'move') {
        const tile = SM.RULES.tileAt(s, event.to.x, event.to.y);
        if (tile.family === 'gate') {
          crossedGates.add(tile.id);
          assert.equal(before[tile.params.carrier], tile.params.colour,
            'gate tests the configured carrier at entry, not a deferred next-tile prism');
        }
      }
      entries.push(...result.steps.filter(event => event.type === 'colour'));
    }
    assert.equal(s.won, true); assert.equal(s.strokes, pars[index]);
    assert.equal(s.P, index === 0 ? 'red' : index === 3 ? 'gre' : 'blu'); assert.equal(s.P, s.W);
    assert.ok(entries.some(event => event.which === 'P')); assert.ok(entries.some(event => event.which === 'W'));
    const review = reviewEarlyLevel(SM, level);
    assert.equal(review.status, 'complete'); assert.equal(review.unwinnablePlayingStates, 0);
    assert.equal(review.terminalFailureTransitions, 0); assert.equal(review.diagnosticAborts, 0);
    for (const id of essential[index]) {
      const raw = JSON.parse(JSON.stringify(level.raw)); raw.grid = raw.grid.map(row => row.map(tile => tile === id ? 0 : tile));
      if (raw.overrides) delete raw.overrides[id];
      const counter = SM.LEVELS.validate({ name: 'Chromatic necessity', world_id: 'chromatic-necessity', num_level: 1,
        levels: { level_1: raw } }, { solve: false });
      assert.equal(counter.ok, true, JSON.stringify(counter.problems));
      assert.equal(SM.LEVELS.solve(counter.levels[0]).status, 'unsolvable', level.key + ': ' + id);
    }
    for (const id of crossedGates) {
      const raw = JSON.parse(JSON.stringify(level.raw)); raw.overrides = raw.overrides || {};
      const colour = (raw.overrides[id] || {}).colour || SM.getTile(id).params.colour;
      raw.overrides[id] = Object.assign({}, raw.overrides[id], { colour: { wht: 'red', red: 'gre', gre: 'blu', blu: 'red' }[colour] });
      const counter = SM.LEVELS.validate({ name: 'Gate color necessity', world_id: 'gate-necessity', num_level: 1,
        levels: { level_1: raw } }, { solve: false });
      assert.equal(counter.ok, true);
      const result = SM.LEVELS.solve(counter.levels[0]);
      assert.ok(result.status === 'unsolvable' || (result.status === 'solvable' && result.optimal > level.par),
        'wrong carrier filter must block or lengthen the minimum');
    }
  }
  const guarded = SM.RULES.newState(loaded.levels[3]);
  guarded.player = { x: 5, y: 0 };
  SM.RULES.resolveTurn(guarded, { type: 'act' });
  assert.equal(guarded.W, 'wht', 'linked set-dial queries current link support at execution');
  const branch = SM.RULES.newState(loaded.levels[6]);
  for (const dir of ['east', 'east', 'east', 'east', 'east', 'west', 'west', 'west']) SM.RULES.resolveTurn(branch, { type: 'move', dir });
  assert.equal(branch.failed, false); assert.equal(branch.player.x, 2);
  for (let step = 0; step < 4; step++) SM.RULES.resolveTurn(branch, { type: 'move', dir: 'north' });
  assert.equal(branch.P, 'gre', 'the green prism replaces the recovered red-spur aura');
}

function worldSix(SM) {
  const fs = require('node:fs'), path = require('node:path');
  const loaded = SM.LEVELS.load(fs.readFileSync(path.join(__dirname, '../../data/worlds/world-06-goof-proximity.levels.yaml'), 'utf8'), { solve: false });
  assert.equal(loaded.ok, true); assert.equal(loaded.levels.length, 8);
  const pars = [6, 6, 12, 13, 11, 19, 21, 21], losses = [0, 0, 0, 9, 0, 56, 7, 7];
  const directions = { n: [0, 1], e: [1, 0], s: [0, -1], w: [-1, 0] };
  function inspect(s) {
    for (const receiver of s.switches.filter(sw => sw.inst.strategies.activation === 'crateAdjacencySensor')) {
      const lit = SM.RULES.sensorLit(s, receiver);
      for (const [name, [dx, dy]] of Object.entries(directions)) {
        const crate = SM.RULES.crateAt(s, receiver.x + dx, receiver.y + dy);
        assert.equal(lit.lit[name], !!crate && crate.params.colour === receiver.inst.params.colour);
      }
      assert.equal(lit.any, Object.values(lit.lit).some(Boolean));
      assert.equal(SM.RULES.switchActive(s, receiver), lit.any);
      assert.deepEqual(SM.RULES.describeTile(s, receiver.x, receiver.y).lit, lit.lit);
    }
  }
  for (const [index, level] of loaded.levels.entries()) {
    const proof = SM.LEVELS.solve(level), s = SM.RULES.newState(level), events = [], gates = new Set();
    assert.equal(proof.status, 'solvable'); assert.equal(proof.verified, true);
    assert.equal(proof.optimal, pars[index]); assert.equal(level.par, proof.optimal);
    assert.equal(proof.routeBalance.complete, true); inspect(s);
    for (const action of proof.path) {
      const result = SM.RULES.resolveTurn(s, action);
      assert.equal(result.aborted, undefined); assert.equal(s.failed, false); inspect(s);
      events.push(...result.steps);
      for (const event of result.steps) {
        if (event.type === 'move') {
          const tile = SM.RULES.tileAt(s, event.to.x, event.to.y);
          if (tile.solid === 'locked') gates.add(tile.params.link);
        }
        if (event.type === 'state') {
          const frame = SM.RULES.cloneState(s); SM.RULES.restore(frame, event.snapshot); inspect(frame);
        }
      }
    }
    assert.equal(s.won, true); assert.equal(s.strokes, pars[index]);
    const sensorIds = [...new Set(level.raw.grid.flat())].filter(id => SM.getTile(id).strategies.activation === 'crateAdjacencySensor');
    assert.equal(gates.size, sensorIds.length, 'minimum crosses all required receiver-controlled gates');
    for (const id of sensorIds) {
      const raw = JSON.parse(JSON.stringify(level.raw)); raw.grid = raw.grid.map(row => row.map(tile => tile === id ? 0 : tile));
      const counter = SM.LEVELS.validate({ name: 'Dock source necessity', world_id: 'dock-necessity', num_level: 1,
        levels: { level_1: raw } }, { solve: false });
      assert.equal(counter.ok, true); assert.equal(SM.LEVELS.solve(counter.levels[0]).status, 'unsolvable');
    }
    const review = reviewEarlyLevel(SM, level);
    assert.equal(review.status, 'complete'); assert.equal(review.unwinnablePlayingStates, losses[index]);
    assert.equal(review.terminalFailureTransitions, 0); assert.equal(review.diagnosticAborts, 0);
    if (index === 3) {
      assert.ok(events.some(event => event.type === 'push' && event.cause === 'flow'));
      assert.ok(events.some(event => event.type === 'signal-edge' && event.active));
      const raw = JSON.parse(JSON.stringify(level.raw)); raw.grid = raw.grid.map(row => row.map(id => id === 64 ? 0 : id));
      assert.equal(SM.LEVELS.solve(SM.RULES.buildLevel(raw, level.key)).optimal, 15);
    }
    if (index >= 6) {
      const edges = events.filter(event => event.type === 'signal-edge');
      assert.equal(edges.length, 2); assert.equal(edges[0].active, true); assert.equal(edges[1].active, false);
      assert.equal(edges[0].commit, edges[1].commit, 'one redocking commit derives both receiver edges before lower work');
    }
  }
  const pending = SM.RULES.newState(loaded.levels[6]), cargo = pending.crates[2][2];
  pending.crates[2][2] = null; pending.crates[0][2] = cargo; SM.RULES.rebuildLocks(pending);
  assert.equal(SM.RULES.closureAt(pending, 2, 0).pendingClose, true);
  assert.equal(SM.RULES.isSolid(pending, 2, 0), false);
  const snap = SM.RULES.snapshot(pending), clone = SM.RULES.cloneState(pending);
  SM.RULES.restore(clone, snap); assert.equal(SM.RULES.describeTile(clone, 2, 0).pendingClose, true);
}

module.exports = { prologue, worldOne, worldTwoReviewed, worldThree, worldFour, worldFive, worldSix };
