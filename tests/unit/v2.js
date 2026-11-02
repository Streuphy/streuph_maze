'use strict';
const assert = require('node:assert/strict');

function pack(grid, fields) {
  return { name: 'V2 fixtures', world_id: 'v2-fixtures', num_level: 1,
    levels: { level_1: Object.assign({ name: 'Fixture', goal: 'Reach a matching exit.',
      width: grid[0].length, height: grid.length, grid }, fields) } };
}

function state(SM, grid, fields) {
  const result = SM.LEVELS.validate(pack(grid, fields), { solve: false });
  assert.equal(result.ok, true, JSON.stringify(result.problems));
  return SM.RULES.newState(result.levels[0]);
}

function levels(SM) {
  const load = doc => SM.LEVELS.validate(doc, { solve: false });
  assert.deepEqual(SM.GAME_COLOURS, ['wht', 'red', 'gre', 'blu']);
  assert.deepEqual(SM.parseYAML('values: []').values, []);
  assert.deepEqual(SM.parseYAML(SM.emitYAML({ values: [] })).values, []);
  const valid = pack([[1, 70, 23, 2]]);
  const level = load(valid).levels[0];
  assert.equal(level.ruleset, undefined, 'no runtime mode selector');
  assert.equal(level.runtimeTiles[0][1].id, 0);
  assert.equal(level.runtimeTiles[0][2].id, 0);
  for (const selector of ['v2', 'future', null, false, 1, {}, []]) {
    assert.equal(load(Object.assign({}, valid, { ruleset: selector })).ok, false);
  }
  for (const fields of [{ ruleset: 'v2' }, { floor_colours: {} }, { requires: [] },
    { initial_player_colour: 'blk' }, { initial_world_colour: 'yellow' },
    { overrides: { 70: { colour: 'blk' } } }, { overrides: { 2: { colour: 'red' } } }]) {
    assert.equal(load(pack([[1, 70, 2]], fields)).ok, false, JSON.stringify(fields));
  }
  for (const colour of SM.GAME_COLOURS) {
    assert.equal(load(pack([[1, 70, 2]], { initial_player_colour: colour,
      initial_world_colour: colour, overrides: { 70: { colour } },
      object_overrides: { B1: { pullable: true } } })).ok, true);
  }
  const corridor = state(SM, [[1, 0, 0, 2]]).level;
  assert.equal(SM.LEVELS.actionsFor().length, 9, 'four moves, four explicit pulls, ACTION');
  for (const budget of [{ maxDepth: 0 }, { maxDepth: 1 }, { maxStates: 0 }, { maxRouteLabels: 1 }]) {
    assert.equal(SM.LEVELS.solve(corridor, budget).status, 'unknown');
  }
  for (const budget of [{ maxStates: Infinity }, { maxStates: '100' }, { maxDepth: -1 }, { maxRouteLabels: NaN }]) {
    const invalid = SM.LEVELS.solve(corridor, budget);
    assert.equal(invalid.status, 'unknown'); assert.equal(invalid.optimal, null);
    assert.equal(invalid.reason, 'invalid-budget');
  }
  assert.equal(SM.LEVELS.solve(state(SM, [[1, 3, 2]]).level).status, 'unsolvable');
  const terminalBoard = state(SM, [[3, 3, 3, 3, 3], [3, 0, 70, 23, 3], [1, 0, 81, 10, 2]],
    { overrides: { 10: { link: 1 } } }).level;
  assert.equal(SM.LEVELS.solve(terminalBoard).status, 'unsolvable', 'failed push cannot become a recovery route');
  const solved = SM.LEVELS.solve(corridor);
  assert.equal(solved.optimal, 3); assert.equal(solved.verified, true);
  const replay = SM.RULES.newState(corridor);
  solved.path.forEach(action => SM.RULES.resolveTurn(replay, action));
  assert.equal(replay.won, true); assert.equal(replay.strokes, 3);
  const resolve = SM.RULES.resolveTurn;
  try {
    SM.RULES.resolveTurn = () => { throw new Error('unsupported transition'); };
    assert.equal(SM.LEVELS.solve(corridor).status, 'unknown');
  } finally { SM.RULES.resolveTurn = resolve; }
  try {
    SM.RULES.resolveTurn = () => ({ aborted: true, stroke: false,
      steps: [{ type: 'effect-abort', reason: 'invariant' }] });
    const incomplete = SM.LEVELS.solve(corridor);
    assert.equal(incomplete.status, 'unknown'); assert.equal(incomplete.reason, 'effect-invariant');
  } finally { SM.RULES.resolveTurn = resolve; }
  const fs = require('node:fs'), path = require('node:path');
  const guide = fs.readFileSync(path.join(__dirname, '../../docs/world-level-packs.md'), 'utf8');
  for (const match of guide.matchAll(/```yaml\n([\s\S]*?)```/g)) {
    assert.equal(SM.LEVELS.load(match[1], { solve: false }).ok, true, match[1]);
  }
  const emitter = require('../../scripts/emit-levels-yaml');
  assert.ok(emitter.RUNTIME_FILES.indexOf('sm-board') < emitter.RUNTIME_FILES.indexOf('sm-rules'));
  assert.ok(emitter.RUNTIME_FILES.indexOf('sm-entities') < emitter.RUNTIME_FILES.indexOf('sm-rules'));
  const authoring = pack([[0, 0, 2], [1, 0, 70]], { golf_score: 3,
    initial_player_colour: 'red', initial_world_colour: 'red',
    object_overrides: { C1: { pullable: true, portal: true } }, overrides: { 70: { colour: 'blu' } },
    win_picture: SM.DEFAULT_LEVELS.levels.level_2.win_picture });
  const originalFile = fs.readFileSync(path.join(__dirname, '../../data/levels.yaml'), 'utf8');
  const emitted = emitter.generate(SM, authoring, { pars: true });
  assert.deepEqual(SM.parseYAML(emitted.text), authoring, 'all supported initial/profile/art fields round-trip');
  assert.equal(emitted.levels[0].solve.verified, true);
  const wrongPar = JSON.parse(JSON.stringify(authoring)); wrongPar.levels.level_1.golf_score = 99;
  assert.throws(() => emitter.generate(SM, wrongPar, { pars: true }), /reviewed source golf_score/);
  assert.throws(() => emitter.generate(SM, pack([[1, 3, 2]], { golf_score: 1 })), /no replay-proven minimum/);
  assert.equal(fs.readFileSync(path.join(__dirname, '../../data/levels.yaml'), 'utf8'), originalFile,
    'generation helper cannot overwrite unreviewed Prologue files');
  const reports = require('../../scripts/report-par-routes');
  assert.equal(reports.INVENTORY.length, 7); assert.equal(reports.INVENTORY.reduce((sum, world) => sum + world.count, 0), 61);
  const reportLevels = SM.LEVELS.validate(authoring, { solve: false }).levels;
  const groups = [{ world: 'v2-fixtures', source: 'fixture.yaml', levels: reportLevels, problems: [] }];
  const reportOptions = { inventory: [{ world: 'v2-fixtures', count: 1 }], maxStates: 1000, maxDepth: 20 };
  const completeReport = reports.analyse(SM, groups, reportOptions);
  assert.equal(completeReport.proofComplete, true); assert.equal(completeReport.rows.length, 1);
  assert.equal(completeReport.rows[0].replay, true); assert.equal(completeReport.rows[0].optimal, 3);
  assert.equal(completeReport.rows[0].profiles[0].identity, 'dot');
  const limitedReport = reports.analyse(SM, groups, Object.assign({}, reportOptions, { maxDepth: 0 }));
  assert.equal(limitedReport.proofComplete, false); assert.equal(limitedReport.rows[0].status, 'unknown');
  const omitted = reports.analyse(SM, [], reportOptions);
  assert.equal(omitted.proofComplete, false); assert.equal(omitted.rows.length, 1); assert.equal(omitted.rows[0].status, 'invalid');
  const mismatched = reports.analyse(SM, [{ world: 'v2-fixtures', source: 'fixture.yaml',
    levels: SM.LEVELS.validate(wrongPar, { solve: false }).levels, problems: [] }], reportOptions);
  assert.equal(mismatched.proofComplete, false); assert.equal(mismatched.rows[0].optimal, 3);
  assert.ok(mismatched.rows[0].issues.some(issue => /declared golf_score/.test(issue)));
  const audits = require('../../scripts/audit-v2-assets');
  const guideFixture = fs.readFileSync(path.join(__dirname, '../../docs/level-design/tile-mechanics.md'), 'utf8');
  const usedFixture = [...new Set(reports.collect(SM).groups.flatMap(group => group.levels.flatMap(level => level.raw.grid.flat())))];
  assert.equal(audits.auditDefinitions(SM, guideFixture, usedFixture).length, 0);
  assert.ok(audits.auditDefinitions(SM, guideFixture.replace('| 0 | `floor` |', ''), usedFixture).length > 0);
  assert.ok(audits.auditDefinitions(SM, guideFixture.replace('**State:** no mutable tile fields', '**Notes:** no mutable tile fields'), usedFixture).length > 0);
  assert.ok(audits.auditDefinitions(SM, guideFixture.replace('link 1, defaultLocked true', 'link 2, defaultLocked true'), usedFixture).length > 0);
  assert.ok(audits.auditDefinitions(SM, guideFixture, [999]).some(error => /unsupported ID/.test(error)));
  assert.equal(audits.auditInventory(groups, reportOptions.inventory).length, 0);
  assert.ok(audits.auditInventory([], reportOptions.inventory).length > 0);
  const references = audits.auditFiles([
    { path: 'src/js/unsupported.js', text: 'if (level.ruleset === "other") runAnotherEngine();' },
    { path: 'docs/current.md', text: 'The world can be of 5 different colors. Black (reversed).' },
    { path: 'docs/design-history/retained.txt', text: 'V1 rules and historical respawn design' }
  ]);
  assert.equal(references.errors.length, 2, 'history exemption does not exempt maintained dispatch/guidance');
  const deferred = audits.auditFiles([{ path: 'openspec/specs/example/spec.md', text: 'An exposed player returns to the start.' }], { preaccept: true });
  assert.equal(deferred.errors.length, 0); assert.equal(deferred.deferred.length, 1);
  const deltaFixture = '## MODIFIED Requirements\n### Requirement: Current boundary\nThe resolver SHALL commit atomically.\n\n## REMOVED Requirements\n### Requirement: Old boundary\n';
  assert.deepEqual(audits.auditSpecSync({ fixture: deltaFixture }, {
    fixture: '# Accepted\n## Requirements\n### Requirement: Current boundary\nThe resolver SHALL commit atomically.\n'
  }), []);
  assert.deepEqual(audits.auditSpecSync({ fixture: deltaFixture }, {
    fixture: '### Requirement: Current boundary\nThe resolver SHALL commit atomically.\n### Requirement: Old boundary\nA superseded outcome.'
  }), ['fixture'], 'remaining removed requirements block synchronization even when keyword scans would pass');
  assert.deepEqual(audits.auditSpecSync({ fixture: deltaFixture }, {}), ['fixture']);
  const signedReport = Object.assign({}, completeReport, { engineFingerprint: 'fixture-engine' });
  const reviewed = '## Fixture — `v2-fixtures`\n| level_1 | Fixture | 3 | certified — review: fixture |\n';
  assert.equal(audits.auditEvidence(signedReport, groups, reviewed, 'fixture-engine', reportOptions.inventory).length, 0);
  assert.ok(audits.auditEvidence(signedReport, groups, reviewed, 'changed-engine', reportOptions.inventory).length > 0);
  assert.ok(audits.auditEvidence(signedReport, groups, reviewed.replace('certified — review: fixture', 'pending'), 'fixture-engine', reportOptions.inventory).length > 0);
  const browserRow = { world: 'v2-fixtures', levels: 1, sourceFingerprint: 'source' };
  for (const key of ['filePicker', 'pasteAndYamlRoundTrip', 'invalidLoadAtomic', 'nativeMinimaVerified', 'nonterminalUndo',
    'authoredExportAfterPlay', 'sharedTerminalFixture', 'restart', 'returnToPrologue']) browserRow[key] = true;
  const browserFixture = { generatedBy: 'verify-v2-chromium', passed: true, engineFingerprint: 'engine', presentationFingerprint: 'display',
    browser: { product: 'Chrome/fixture' }, pageErrors: [], externalResources: [], packs: [browserRow],
    gallery: { definitions: 63, arrows: 8, directions: 4, inertTint: true, pendingAndFailedSamples: true } };
  assert.equal(audits.auditBrowserEvidence(browserFixture, { 'v2-fixtures': 'source' }, 'engine', 'display', reportOptions.inventory).length, 0);
  assert.ok(audits.auditBrowserEvidence(browserFixture, { 'v2-fixtures': 'changed' }, 'engine', 'display', reportOptions.inventory).length > 0);
  assert.ok(audits.auditBrowserEvidence(Object.assign({}, browserFixture, { packs: [] }), {}, 'engine', 'display', reportOptions.inventory).length > 0);
  const safeReview = reports.reviewEarlyLevel(SM, state(SM, [[1, 0, 2]]).level);
  assert.equal(safeReview.status, 'complete'); assert.equal(safeReview.unwinnablePlayingStates, 0);
  const strandedReview = reports.reviewEarlyLevel(SM, state(SM, [[2, 0, 0], [0, 70, 0], [1, 0, 0]]).level);
  assert.equal(strandedReview.status, 'complete'); assert.ok(strandedReview.unwinnablePlayingStates > 0);
  assert.equal(reports.reviewEarlyLevel(SM, corridor, { maxStates: 1 }).status, 'unknown');
  const hazardReview = reports.reviewEarlyLevel(SM, state(SM, [[82, 0, 2], [1, 0, 0]]).level);
  assert.equal(hazardReview.status, 'complete'); assert.equal(hazardReview.unwinnablePlayingStates, 0);
  assert.ok(hazardReview.terminalFailureTransitions > 0, 'visible terminal mistakes are counted separately from playing-state softlocks');
  const deadlockReport = reports.analyse(SM, [{ world: 'v2-fixtures', source: 'deadlock.yaml', problems: [],
    levels: [state(SM, [[2, 0, 0], [0, 70, 0], [1, 0, 0]]).level] }],
    Object.assign({}, reportOptions, { earlyReview: true }));
  assert.equal(deadlockReport.proofComplete, false);
  assert.ok(deadlockReport.rows[0].issues.includes('early level has unwinnable playing states'));
  require('./pack-migration').prologue(SM);
  require('./pack-migration').worldOne(SM);
  require('./pack-migration').worldTwoReviewed(SM);
  require('./pack-migration').worldThree(SM);
  require('./pack-migration').worldFour(SM);
  require('./pack-migration').worldFive(SM);
  require('./pack-migration').worldSix(SM);
}

function rules(SM) {
  const R = SM.RULES;
  const queue = R.createQueue(4, 4);
  queue.add({ kind: 'ordinary', op: 'onEnter', x: 0, y: 0, actorId: 'dot', payload: { value: 1 } });
  queue.add({ kind: 'transport', op: 'flow', x: 2, y: 0, actorId: 'dot', payload: { direction: { x: 1, y: 0 } } });
  queue.add({ kind: 'transport', op: 'flow', x: 1, y: 0, actorId: 'crate@A1', payload: {} });
  assert.equal(queue.shift().actorId, 'crate@A1', 'equal priority uses source y/x');
  queue.add({ kind: 'signal', op: 'onActivate', x: 3, y: 3, payload: {} });
  assert.equal(queue.shift().kind, 'signal', 'new signal work preempts remaining transport');
  assert.equal(queue.shift().kind, 'transport'); assert.equal(queue.shift().kind, 'ordinary');
  const q1 = R.createQueue(2, 2), q2 = R.createQueue(2, 2);
  const record = { kind: 'ordinary', op: 'onEnter', actorId: 'dot', x: 0, y: 0, payload: {} };
  q1.add(record); q1.shift(); q1.add(record); q2.add(record);
  assert.equal(q1.signature(), q2.signature(), 'absolute enqueue serials do not hide repetition');
  assert.throws(() => q1.add({ kind: 'unknown', op: 'bad', x: 0, y: 0 }));
  assert.throws(() => q1.add({ kind: 'ordinary', op: 'onEnter', actorId: 'dot', x: 0, y: 0, payload: { fn() {} } }), /non-declarative/);
  assert.throws(() => q1.add({ kind: 'ordinary', op: 'unknown', actorId: 'dot', x: 0, y: 0 }));
  assert.throws(() => q1.add(Object.assign({}, record, { payload: new Date() })));
  const mutableChild = { value: 1 }, frozenParent = Object.freeze({ child: mutableChild });
  const capturedQueue = R.createQueue(2, 2);
  capturedQueue.add(Object.assign({}, record, { payload: frozenParent }));
  mutableChild.value = 2;
  assert.equal(capturedQueue.shift().payload.child.value, 1, 'captured payload is deep-independent even when a handler supplies a shallow-frozen parent');
  const conflict = state(SM, [[1, 64, 0, 65, 70, 71, 2]]);
  conflict.crates[0][1] = conflict.crates[0][4]; conflict.crates[0][4] = null;
  conflict.crates[0][3] = conflict.crates[0][5]; conflict.crates[0][5] = null;
  const first = conflict.crates[0][1], second = conflict.crates[0][3];
  R.resolveTurn(conflict, { type: 'act' });
  assert.equal(conflict.crates[0][2], first);
  assert.equal(conflict.crates[0][3], second, 'first legal queued destination wins without overwrite');
  const stale = state(SM, [[1, 0, 0, 0, 0, 70, 2], [82, 66, 0, 0, 0, 0, 0]],
    { object_overrides: { F2: { ray: 'transport' } } });
  stale.crates[0][1] = stale.crates[1][5]; stale.crates[1][5] = null;
  const staleActor = stale.crates[0][1];
  R.resolveTurn(stale, { type: 'act' });
  assert.equal(stale.crates[0][6], staleActor);
  assert.equal(stale.crates[1][6], null, 'stale North belt request cannot retarget a ray-moved passenger');
  const s = state(SM, [[70, 1, 0, 2]], { object_overrides: { A1: { pullable: true } } });
  R.resolveTurn(s, { type: 'move', dir: 'east' });
  assert.ok(s.crates[0][0], 'normal movement never infers a trailing pull');
  const pulling = state(SM, [[70, 1, 0, 2]], { object_overrides: { A1: { pullable: true } } });
  const snap = R.snapshot(pulling), signature = R.snapshotSig(pulling);
  R.resolveTurn(pulling, { type: 'pull', dir: 'east' });
  assert.ok(pulling.crates[0][1]); assert.equal(pulling.player.x, 2);
  R.restore(pulling, snap); assert.equal(R.snapshotSig(pulling), signature);
  const target = state(SM, [[1, 23, 0, 2]]);
  R.resolveTurn(target, { type: 'move', dir: 'east' });
  assert.equal(target.player.x, 1); assert.equal(target.switches[0].x, 1);
  assert.equal(R.describeTile(target, 1, 0).active, false);
  const action = state(SM, [[1, 41, 2]]);
  R.resolveTurn(action, { type: 'act' });
  assert.equal(action.switches[0].latched, false, 'ACTION does not activate a neighboring tile');
  R.resolveTurn(action, { type: 'move', dir: 'east' });
  assert.equal(action.switches[0].latched, true);
  R.resolveTurn(action, { type: 'act' });
  assert.equal(action.switches[0].latched, false, 'occupied ACTION activates once');
  for (const id of [70, 71, 72, 73]) {
    const colored = state(SM, [[1, id, 0, 2]]);
    R.resolveTurn(colored, { type: 'move', dir: 'east' });
    assert.equal(colored.crates[0][2].id, id, 'crate tint does not control push permission');
  }
  const clone = R.cloneState(pulling);
  clone.crates[0][0] = null; clone.P = 'red';
  assert.ok(pulling.crates[0][0]); assert.equal(pulling.P, 'wht');
  const lifecycle = state(SM, [[1, 23, 0, 2]], { object_overrides: { B1: { pullable: true } } });
  const initial = R.snapshot(lifecycle), initialSig = R.snapshotSig(lifecycle);
  lifecycle.failed = true; lifecycle.failureReason = 'closure';
  assert.equal(R.outcome(lifecycle), 'failed');
  assert.notEqual(R.snapshotSig(lifecycle), initialSig);
  assert.equal(R.cloneState(lifecycle).failed, true);
  lifecycle.switches[0].capabilities.pullable = false;
  lifecycle.switches = [];
  R.restore(lifecycle, initial);
  assert.equal(R.outcome(lifecycle), 'playing'); assert.equal(R.snapshotSig(lifecycle), initialSig);
  assert.equal(lifecycle.switches[0].capabilities.pullable, true);
  assert.equal(R.newState(lifecycle.level).failed, false);
  assert.throws(() => { lifecycle.grid[0][0] = lifecycle.grid[0][1]; }, TypeError);
  assert.throws(() => { lifecycle.level.initialPlayerColour = 'blk'; }, TypeError);
  assert.throws(() => { lifecycle.untracked = 1; }, TypeError);
  const atomic = state(SM, [[1, 70, 0, 23, 10, 2]]);
  const hook = SM.resolveTileHook, observations = [];
  try {
    SM.resolveTileHook = function (inst, phase, ctx) {
      if (phase === 'activation' && ctx.crateAt(2, 0)) {
        observations.push([ctx.state.player.x, !!ctx.state.crates[0][2]]);
      }
      return hook(inst, phase, ctx);
    };
    R.resolveTurn(atomic, { type: 'move', dir: 'east' });
  } finally { SM.resolveTileHook = hook; }
  assert.ok(observations.length > 0);
  assert.ok(observations.every(([dotX, crate]) => dotX === 1 && crate), 'signals observe the complete push');
  const abort = state(SM, [[1, 11, 2]]), abortSnap = R.snapshot(abort);
  try {
    SM.resolveTileHook = function (inst, phase, ctx) {
      if (phase === 'onEnter') { ctx.state.P = 'red'; ctx.state.switches = []; throw new Error('effect fixture'); }
      return hook(inst, phase, ctx);
    };
    const result = R.resolveTurn(abort, { type: 'move', dir: 'east' });
    assert.equal(result.aborted, true); assert.equal(result.stroke, false);
    assert.deepEqual(R.snapshot(abort), abortSnap);
  } finally { SM.resolveTileHook = hook; }
  const blocked = state(SM, [[1, 3, 11, 2]]), phases = [];
  try {
    SM.resolveTileHook = function (inst, phase, ctx) {
      if (phase === 'onEnter' || phase === 'onAct' || phase === 'forcedMovement') phases.push(phase);
      return hook(inst, phase, ctx);
    };
    R.resolveTurn(blocked, { type: 'move', dir: 'east' });
    assert.deepEqual(phases, []); assert.equal(blocked.strokes, 0); assert.equal(blocked.turns, 1);
  } finally { SM.resolveTileHook = hook; }
  const batch = state(SM, [[1, 11, 0, 41, 2]], { initial_world_colour: 'gre' });
  try {
    SM.resolveTileHook = function (inst, phase, ctx) {
      if (inst.id === 11 && phase === 'onEnter') {
        ctx.state.P = 'gre'; ctx.state.player.x = 2; ctx.state.switches[0].latched = true;
        return;
      }
      return hook(inst, phase, ctx);
    };
    const result = R.resolveTurn(batch, { type: 'move', dir: 'east' });
    assert.equal(result.aborted, undefined);
    assert.equal(batch.P, 'gre'); assert.equal(batch.player.x, 2); assert.equal(batch.switches[0].latched, true);
    const color = result.steps.find(step => step.type === 'colour' && step.to === 'gre');
    const move = result.steps.find(step => step.type === 'move' && step.to.x === 2);
    const toggle = result.steps.find(step => step.type === 'switch' && step.latched);
    assert.ok(color && move && toggle); assert.equal(color.commit, move.commit); assert.equal(color.commit, toggle.commit);
    assert.ok(result.steps.some(step => step.type === 'state' && step.commit === color.commit && step.snapshot.P === 'gre'));
  } finally { SM.resolveTileHook = hook; }
  const corruptions = [
    ctx => { ctx.state.P = 'blk'; },
    ctx => { ctx.state.player.x = -1; },
    ctx => { ctx.state.crates = []; },
    ctx => { ctx.state.switches = []; },
    ctx => { ctx.state.switches[0].hidden = true; },
    ctx => { delete ctx.state.switches[0].capabilities.portal; },
    ctx => { ctx.state.crates[0].hidden = true; },
    ctx => { ctx.state.seen[2] = true; },
    ctx => { ctx.state.strokes += 2; },
    ctx => { ctx.state.won = true; ctx.state.failed = true; },
    ctx => { ctx.enqueue({ kind: 'ordinary', op: 'onEnter', actorId: 'ghost', x: 0, y: 0, inst: ctx.state.grid[0][0], payload: {} }); },
    ctx => { ctx.enqueue({ kind: 'ordinary', op: 'onEnter', actorId: 'dot', x: 0, y: 0, inst: ctx.inst, payload: {} }); }
  ];
  for (const corrupt of corruptions) {
    const invalid = state(SM, [[1, 11, 23, 2]]), beforeInvalid = R.snapshot(invalid);
    const knowledge = JSON.stringify(invalid.seen);
    try {
      SM.resolveTileHook = function (inst, phase, ctx) {
        if (inst.id === 11 && phase === 'onEnter') { ctx.state.P = 'red'; corrupt(ctx); return; }
        return hook(inst, phase, ctx);
      };
      const result = R.resolveTurn(invalid, { type: 'move', dir: 'east' });
      assert.equal(result.aborted, true, corrupt.toString());
      assert.equal(result.stroke, false); assert.deepEqual(R.snapshot(invalid), beforeInvalid);
      assert.equal(JSON.stringify(invalid.seen), knowledge);
      assert.equal(result.steps.length, 1, 'uncommitted playback events are discarded');
    } finally { SM.resolveTileHook = hook; }
  }
  const cycle = state(SM, [[0, 67, 65, 2], [1, 64, 66, 0]]);
  const beforeCycle = R.snapshot(cycle), progress = SM.STORE.exportText();
  const cycleResult = R.resolveTurn(cycle, { type: 'move', dir: 'east' });
  assert.equal(cycleResult.aborted, true); assert.equal(cycleResult.steps[0].reason, 'cycle');
  assert.deepEqual(R.snapshot(cycle), beforeCycle); assert.equal(SM.STORE.exportText(), progress);
  const exhausted = state(SM, [[1, 11, 64, 3, 2]]), beforeBudget = R.snapshot(exhausted);
  try {
    SM.resolveTileHook = function (inst, phase, ctx) {
      if (inst.id === 11 && phase === 'onEnter') {
        ctx.state.P = 'red'; ctx.state.player.x = 2;
        for (let nonce = 0; nonce <= 64 * ctx.state.width * ctx.state.height; nonce++) {
          ctx.enqueue({ kind: 'transport', op: 'flow', actorId: 'dot', x: 2, y: 0,
            inst: ctx.state.grid[0][2], payload: { direction: { x: 1, y: 0 }, nonce } });
        }
        return;
      }
      return hook(inst, phase, ctx);
    };
    const result = R.resolveTurn(exhausted, { type: 'move', dir: 'east' });
    assert.equal(result.aborted, true); assert.equal(result.steps[0].reason, 'budget');
    assert.deepEqual(R.snapshot(exhausted), beforeBudget, 'blocked attempts count and all prior commits roll back');
    assert.equal(SM.STORE.exportText(), progress);
  } finally { SM.resolveTileHook = hook; }
  for (let id = 60; id <= 67; id++) {
    const exit = SM.getTile(id).params.dir;
    for (const role of ['dot', 'crate', 'target']) {
      let referenceEvents;
      for (const tint of SM.GAME_COLOURS) {
        const grid = Array.from({ length: 5 }, () => Array(5).fill(0));
        grid[4][0] = 1; grid[4][1] = 70; grid[4][3] = 23; grid[0][4] = 2; grid[2][2] = id;
        const passenger = state(SM, grid, { overrides: { [id]: { colour: tint } },
          object_overrides: { D1: { conveyor: true } } });
        let identity;
        if (role === 'dot') passenger.player = { x: 2, y: 2 };
        if (role === 'crate') {
          identity = passenger.crates[0][1]; passenger.crates[0][1] = null; passenger.crates[2][2] = identity;
        }
        if (role === 'target') { passenger.switches[0].x = 2; passenger.switches[0].y = 2; }
        const result = R.resolveTurn(passenger, { type: 'act' });
        assert.equal(result.aborted, undefined, `${id}/${role}/${tint}`);
        const destination = { x: 2 + exit.x, y: 2 + exit.y };
        if (role === 'dot') assert.deepEqual(passenger.player, destination);
        if (role === 'crate') assert.equal(passenger.crates[destination.y][destination.x], identity);
        if (role === 'target') assert.deepEqual({ x: passenger.switches[0].x, y: passenger.switches[0].y }, destination);
        assert.equal(passenger.grid[2][2].id, id); assert.equal(passenger.strokes, 1);
        const semanticEvents = JSON.stringify(result.steps);
        if (referenceEvents === undefined) referenceEvents = semanticEvents;
        else assert.equal(semanticEvents, referenceEvents, 'conveyor tint never changes effects');
      }
    }
    for (const incoming of R.DIRS) {
      const grid = Array.from({ length: 5 }, () => Array(5).fill(0));
      grid[4][0] = 1; grid[0][4] = 2; grid[2][2] = id;
      const entering = state(SM, grid);
      entering.player = { x: 2 - incoming.x, y: 2 - incoming.y };
      R.resolveTurn(entering, { type: 'move', dir: incoming.name });
      assert.deepEqual(entering.player, { x: 2 + exit.x, y: 2 + exit.y }, 'entry side does not choose the exit');
      assert.equal(entering.strokes, 1);
    }
  }
  const coLocated = state(SM, [[0, 0, 0, 0, 2], [0, 0, 64, 0, 0], [1, 70, 23, 0, 0]],
    { object_overrides: { C1: { conveyor: true } } });
  const blocking = coLocated.crates[0][1]; coLocated.crates[0][1] = null; coLocated.crates[1][2] = blocking;
  coLocated.switches[0].x = 2; coLocated.switches[0].y = 1;
  R.resolveTurn(coLocated, { type: 'act' });
  assert.equal(coLocated.crates[1][3], blocking);
  assert.equal(coLocated.switches[0].x, 2, 'same-source blocking passenger is enumerated before a feature');
  const noTick = state(SM, [[0, 0, 0, 0, 2], [0, 0, 64, 0, 0], [1, 3, 70, 0, 0]]);
  const remote = noTick.crates[0][2]; noTick.crates[0][2] = null; noTick.crates[1][2] = remote;
  const blockedTick = R.resolveTurn(noTick, { type: 'move', dir: 'east' });
  assert.equal(blockedTick.stroke, false); assert.equal(noTick.crates[1][2], remote);
  assert.equal(noTick.turns, 1); assert.equal(noTick.strokes, 0);
  const dedup = R.createQueue(3, 1), request = { kind: 'transport', op: 'flow', actorId: 'dot', x: 1, y: 0,
    payload: { direction: { x: 1, y: 0 } } };
  assert.equal(dedup.add(request), true); assert.equal(dedup.add(request), false); assert.equal(dedup.length, 1);
  dedup.shift(); assert.equal(dedup.add(request), true, 'later real arrivals are not suppressed');
  const front = state(SM, [[1, 64, 70, 0, 2]]);
  R.resolveTurn(front, { type: 'move', dir: 'east' });
  assert.equal(front.player.x, 1); assert.ok(front.crates[0][2], 'a blocked exit never shoves a front crate');
  const filter = state(SM, [[0, 0, 0, 0, 2], [0, 0, 64, 31, 0], [1, 71, 0, 0, 0]]);
  const filtered = filter.crates[0][1]; filter.crates[0][1] = null; filter.crates[1][2] = filtered;
  R.resolveTurn(filter, { type: 'act' });
  assert.equal(filter.crates[1][2], filtered, 'gate tests configured global carrier, not a red passenger tint');
  filter.P = 'red'; R.resolveTurn(filter, { type: 'act' });
  assert.equal(filter.crates[1][3], filtered);
  const disabled = state(SM, [[0, 0, 0, 0, 2], [0, 0, 64, 10, 0], [1, 70, 0, 0, 0]],
    { object_overrides: { B1: { conveyor: false } } });
  const immobile = disabled.crates[0][1]; disabled.crates[0][1] = null; disabled.crates[1][2] = immobile;
  R.resolveTurn(disabled, { type: 'act' }); assert.equal(disabled.crates[1][2], immobile);
  const closed = state(SM, [[0, 0, 0, 0, 2], [0, 0, 64, 10, 0], [1, 70, 0, 0, 0]]);
  const barred = closed.crates[0][1]; closed.crates[0][1] = null; closed.crates[1][2] = barred;
  R.resolveTurn(closed, { type: 'act' }); assert.equal(closed.crates[1][2], barred, 'effective closure blocks the exit');
  const portal = state(SM, [[1, 80, 0, 80, 2]]), beforePortal = R.snapshot(portal);
  const portalResult = R.resolveTurn(portal, { type: 'move', dir: 'east' });
  assert.equal(portal.player.x, 3);
  assert.equal(portalResult.steps.filter(step => step.type === 'teleport').length, 1);
  assert.equal(portal.strokes, 1);
  R.restore(portal, beforePortal); assert.equal(portal.player.x, 0);
  R.resolveTurn(portal, { type: 'act' }); assert.equal(portal.player.x, 0, 'remote empty portal never retargets the dot');
  for (const enabled of [false, true]) {
    const cargo = state(SM, [[1, 70, 80, 0, 80, 2]], { object_overrides: { B1: { portal: enabled } } });
    R.resolveTurn(cargo, { type: 'move', dir: 'east' });
    assert.ok(cargo.crates[0][enabled ? 4 : 2]);
  }
  const featurePortal = state(SM, [[1, 23, 80, 0, 80, 2]], { object_overrides: { B1: { pushable: true, portal: true } } });
  const featureBefore = R.snapshot(featurePortal), featureIdentity = featurePortal.switches[0].entityId;
  R.resolveTurn(featurePortal, { type: 'move', dir: 'east' });
  assert.equal(featurePortal.switches[0].x, 4); assert.equal(featurePortal.switches[0].entityId, featureIdentity);
  assert.equal(featurePortal.grid[0][2].id, 80);
  R.restore(featurePortal, featureBefore); assert.equal(featurePortal.switches[0].x, 1);
  const occupiedPortal = state(SM, [[1, 70, 80, 0, 80, 71, 2]], { object_overrides: { B1: { portal: true } } });
  occupiedPortal.crates[0][4] = occupiedPortal.crates[0][5]; occupiedPortal.crates[0][5] = null;
  R.resolveTurn(occupiedPortal, { type: 'move', dir: 'east' });
  assert.ok(occupiedPortal.crates[0][2]); assert.ok(occupiedPortal.crates[0][4]);
  const iceStop = state(SM, [[1, 5, 5, 3, 2]]);
  R.resolveTurn(iceStop, { type: 'move', dir: 'east' }); assert.equal(iceStop.player.x, 2);
  R.resolveTurn(iceStop, { type: 'act' }); assert.equal(iceStop.player.x, 2, 'stationary ice has no retained vector');
  R.resolveTurn(iceStop, { type: 'move', dir: 'west' }); assert.equal(iceStop.player.x, 0);
  const originalRegistry = SM.getActiveRegistry(), visits = [];
  try {
    // A registered code-side combination exercises the general per-hop entry
    // contract without adding executable behavior to authored YAML.
    const iceWithEntry = Object.assign({}, SM.getTile(5), {
      params: { colour: 'red' }, strategies: { forcedMovement: 'incomingIce', onEnter: 'setPlayerColour' },
      state: { hooks: ['forcedMovement', 'onEnter'], reads: ['P'], writes: ['P'], events: ['colour'] }
    });
    const registry = Object.assign({}, originalRegistry, { 5: iceWithEntry });
    assert.equal(SM.validateTileRegistry(registry).ok, true);
    SM.setTileRegistry(registry);
    const intermediate = state(SM, [[1, 5, 5, 0, 2]]);
    SM.resolveTileHook = function (inst, phase, ctx) {
      if (inst.id === 5 && phase === 'onEnter') visits.push([ctx.x, ctx.state.player.x, ctx.actor.entityId]);
      return hook(inst, phase, ctx);
    };
    R.resolveTurn(intermediate, { type: 'move', dir: 'east' });
    assert.equal(intermediate.P, 'red'); assert.equal(intermediate.player.x, 3);
    assert.deepEqual(visits, [[1, 3, 'dot'], [2, 3, 'dot']], 'captured intermediate entries execute after transport without retargeting');
  } finally { SM.resolveTileHook = hook; SM.setTileRegistry(originalRegistry); }
  const crossing = state(SM, [[0, 0, 0, 0, 2], [0, 0, 0, 0, 0], [82, 0, 70, 0, 0],
    [0, 0, 0, 0, 0], [1, 0, 81, 0, 0]], { object_overrides: { C3: { ray: 'transport' } } });
  const crossingActor = crossing.crates[2][2];
  const crossingResult = R.resolveTurn(crossing, { type: 'act' });
  assert.equal(crossingResult.aborted, undefined);
  assert.equal(crossing.crates[4][2], crossingActor, 'lower-y emitter session wins the initial overlap');
  assert.equal(crossing.crates.flat().filter(Boolean).length, 1);
  assert.equal(crossingResult.steps.filter(step => step.type === 'push').length, 2,
    'session continuations do not create duplicate whole-ray transports');
  try {
    const receiver = Object.assign({}, SM.getTile(50), {
      strategies: Object.assign({}, SM.getTile(50).strategies, { onActivate: 'advanceWorld', onRelease: 'advanceWorld' }),
      state: { hooks: ['activation', 'onActivate', 'onRelease'], reads: ['crates', 'W'], writes: ['W'], events: ['colour'] }
    });
    const registry = Object.assign({}, originalRegistry, { 50: receiver });
    assert.equal(SM.validateTileRegistry(registry).ok, true); SM.setTileRegistry(registry);
    const transient = state(SM, [[0, 0, 0, 0, 0, 2], [0, 0, 50, 0, 0, 0], [1, 71, 64, 64, 64, 0]]);
    const transientResult = R.resolveTurn(transient, { type: 'move', dir: 'east' });
    assert.equal(transient.W, 'gre', 'activation and release each run once within the round');
    const edges = transientResult.steps.filter(step => step.type === 'signal-edge');
    assert.deepEqual(edges.map(step => step.active), [true, false]);
    const firstColor = transientResult.steps.findIndex(step => step.type === 'colour');
    const firstTransport = transientResult.steps.findIndex(step => step.type === 'push' && step.cause === 'flow');
    assert.ok(firstColor < firstTransport, 'signal reaction preempts the remaining transport');
    const contacts = state(SM, [[0, 0, 0, 10, 2], [0, 71, 50, 71, 0], [1, 0, 0, 0, 0]]);
    R.resolveTurn(contacts, { type: 'act' }); assert.equal(contacts.W, 'wht', 'unchanged occupied sensor has no initial edge');
    contacts.player = { x: 1, y: 0 };
    const oneLeft = R.resolveTurn(contacts, { type: 'move', dir: 'north' });
    assert.equal(oneLeft.steps.filter(step => step.type === 'signal-edge').length, 0);
    assert.equal(R.isLocked(contacts, 3, 2), false, 'another contact keeps the link open');
    contacts.player = { x: 3, y: 0 };
    const lastLeft = R.resolveTurn(contacts, { type: 'move', dir: 'north' });
    assert.deepEqual(lastLeft.steps.filter(step => step.type === 'signal-edge').map(step => step.active), [false]);
    assert.equal(contacts.W, 'red');
  } finally { SM.setTileRegistry(originalRegistry); }
  try {
    const exits = [];
    const withExit = Object.assign({}, SM.getTile(5), { params: { colour: 'red' },
      strategies: { forcedMovement: 'incomingIce', onEnter: 'setPlayerColour', onExit: 'resetWorld' },
      state: { hooks: ['forcedMovement', 'onEnter', 'onExit'], reads: ['P', 'W'], writes: ['P', 'W'], events: ['colour'] } });
    SM.setTileRegistry(Object.assign({}, originalRegistry, { 5: withExit }));
    const departed = state(SM, [[1, 5, 5, 0, 2]], { initial_world_colour: 'blu' });
    SM.resolveTileHook = function (inst, phase, ctx) {
      if (phase === 'onExit') exits.push([ctx.x, ctx.state.player.x]);
      return hook(inst, phase, ctx);
    };
    R.resolveTurn(departed, { type: 'move', dir: 'east' });
    assert.deepEqual(exits, [[1, 3], [2, 3]]); assert.equal(departed.W, 'wht');
  } finally { SM.resolveTileHook = hook; SM.setTileRegistry(originalRegistry); }
  for (const [surface, toggle] of [[10, 44], [46, 48], [4, 45]]) {
    const fields = { object_overrides: { A2: { pullable: true } } };
    if (surface === 10) fields.overrides = { 10: { defaultLocked: false } };
    const closing = state(SM, [[toggle, 0, 0, 0, 0, 2], [70, 71, 0, 0, 0, 0], [1, 64, surface, 0, 0, 0]], fields);
    const held = closing.crates[1][0], waiting = closing.crates[1][1];
    closing.crates[1][0] = null; closing.crates[1][1] = null;
    closing.crates[0][2] = held; closing.crates[0][1] = waiting; closing.player = { x: 0, y: 2 };
    R.resolveTurn(closing, { type: 'act' });
    assert.deepEqual(R.closureAt(closing, 2, 0), { requestedSolid: true, pendingClose: true, effectiveSolid: false });
    R.resolveTurn(closing, { type: 'act' });
    assert.deepEqual(R.closureAt(closing, 2, 0), { requestedSolid: false, pendingClose: false, effectiveSolid: false });
    R.resolveTurn(closing, { type: 'act' });
    const pendingSnapshot = R.snapshot(closing);
    closing.player = { x: 3, y: 0 };
    R.resolveTurn(closing, { type: 'pull', dir: 'east' });
    assert.equal(closing.failed, false); assert.equal(closing.crates[0][3], held);
    assert.equal(closing.crates[0][1], waiting, 'later queued passenger cannot enter a newly closed surface');
    assert.deepEqual(R.closureAt(closing, 2, 0), { requestedSolid: true, pendingClose: false, effectiveSolid: true });
    R.restore(closing, pendingSnapshot);
    closing.crates[0][1] = null; closing.crates[1][1] = waiting; closing.player = { x: 1, y: 0 };
    const beforeFailure = closing.strokes;
    R.resolveTurn(closing, { type: 'move', dir: 'east' });
    assert.equal(closing.failed, true); assert.equal(closing.failureReason, 'closure');
    assert.equal(closing.strokes, beforeFailure + 1); assert.equal(closing.player.x, 2);
    assert.equal(closing.crates[0][3], held);
    const frozen = R.snapshot(closing); R.resolveTurn(closing, { type: 'move', dir: 'west' });
    assert.deepEqual(R.snapshot(closing), frozen);
  }
  const colorMismatch = state(SM, [[1, 31, 0, 2]], { initial_player_colour: 'red' });
  R.resolveTurn(colorMismatch, { type: 'move', dir: 'east' }); colorMismatch.P = 'wht';
  R.resolveTurn(colorMismatch, { type: 'act' });
  assert.equal(colorMismatch.failed, false); assert.equal(R.closureAt(colorMismatch, 1, 0).requestedSolid, false);
  R.resolveTurn(colorMismatch, { type: 'move', dir: 'west' }); assert.equal(colorMismatch.player.x, 0);
  const interrupted = state(SM, [[0, 0, 64, 70, 0], [1, 2, 0, 0, 0]]);
  const interruptedCargo = interrupted.crates[1][3]; interrupted.crates[1][3] = null; interrupted.crates[1][2] = interruptedCargo;
  const immediate = R.resolveTurn(interrupted, { type: 'move', dir: 'east' });
  assert.equal(interrupted.won, true); assert.equal(interrupted.crates[1][2], interruptedCargo,
    'goal checkpoint cancels unrelated pending conveyor work');
  assert.equal(immediate.steps.filter(step => step.type === 'goal').length, 1);
  assert.equal(immediate.steps.filter(step => step.type === 'ray').length, 0);
  try {
    const delayedPrism = Object.assign({}, SM.getTile(5), { params: { colour: 'red' },
      strategies: { forcedMovement: 'incomingIce', onEnter: 'setPlayerColour' },
      state: { hooks: ['forcedMovement', 'onEnter'], reads: ['P'], writes: ['P'], events: ['colour'] } });
    SM.setTileRegistry(Object.assign({}, originalRegistry, { 5: delayedPrism }));
    const delayed = state(SM, [[1, 5, 2]], { initial_world_colour: 'red' });
    R.resolveTurn(delayed, { type: 'move', dir: 'east' });
    assert.equal(delayed.player.x, 2); assert.equal(delayed.P, 'red'); assert.equal(delayed.won, false,
      'deferred color equality does not fabricate a new goal entry');
    R.resolveTurn(delayed, { type: 'act' }); assert.equal(delayed.won, false);
    R.resolveTurn(delayed, { type: 'move', dir: 'west' });
    R.resolveTurn(delayed, { type: 'move', dir: 'east' }); assert.equal(delayed.won, true);
    const canceled = state(SM, [[1, 5, 2]], { initial_world_colour: 'wht' });
    const wonBeforePrism = R.resolveTurn(canceled, { type: 'move', dir: 'east' });
    assert.equal(canceled.won, true); assert.equal(canceled.P, 'wht');
    assert.equal(wonBeforePrism.steps.filter(step => step.type === 'colour').length, 0,
      'immediate matching entry cancels later ordinary color effects');
  } finally { SM.setTileRegistry(originalRegistry); }
  try {
    const reactiveGoal = Object.assign({}, SM.getTile(2), {
      solid: 'phaseVoid', walkable: 'phaseVoid', closingSurface: true,
      params: { mode: 'toggle', scope: 'global', key: 'master_void' },
      strategies: { passability: 'masterVoid', activation: 'playerOccupancy', onEnter: 'goal', onAct: 'goal', onActivate: 'toggleLatched' },
      state: { hooks: ['passability', 'activation', 'onEnter', 'onAct', 'onActivate'], reads: ['P', 'W'], writes: ['won', 'switches'], events: ['goal', 'switch'] }
    });
    const registry = Object.assign({}, originalRegistry, { 2: reactiveGoal });
    assert.equal(SM.validateTileRegistry(registry).ok, true); SM.setTileRegistry(registry);
    const closureFirst = state(SM, [[1, 2]]);
    const failedBeforeGoal = R.resolveTurn(closureFirst, { type: 'move', dir: 'east' });
    assert.equal(closureFirst.failed, true); assert.equal(closureFirst.won, false);
    assert.equal(failedBeforeGoal.steps.filter(step => step.type === 'goal').length, 0,
      'signal-triggered physical closure precedes the matching entry checkpoint');
  } finally { SM.setTileRegistry(originalRegistry); }
}

function helpers(SM) {
  const levels = [state(SM, [[1, 2]]).level, state(SM, [[1, 0, 2]]).level];
  levels.forEach(level => { level.solve = SM.LEVELS.solve(level); });
  assert.equal(SM.LEVELS.worldScores(levels).par, 3);
  assert.equal(SM.LEVELS.worldScores(levels).best, null);
  levels[1].solve = { status: 'unknown' };
  assert.equal(SM.LEVELS.worldScores(levels).par, null);
  const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
  const jobs = [];
  let clock = 0;
  SM.PRESENTATION = { reduced() { return false; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../src/js/sm-render.js'), 'utf8'),
    { SM, performance: { now() { return clock; } } });
  const moving = state(SM, [[1, 70, 60, 0, 0, 2]]);
  const display = SM.RULES.cloneState(moving);
  const movement = SM.RULES.resolveTurn(moving, { type: 'move', dir: 'east' });
  const renderer = Object.create(SM.Renderer.prototype), overlaps = [];
  let finished = 0;
  Object.assign(renderer, { draw(view) { overlaps.push(!!view.crates[view.player.y][view.player.x]); },
    placePlayer() {}, say() {}, generation: 0, sequence: null,
    surface: { onTick: null, settle() {}, start() { const self = this; jobs.push(() => {
      clock += 70; if (self.onTick) self.onTick(clock); if (self.onTick) self.start();
    }); } } });
  renderer.play(movement.steps, display, () => { finished++; });
  while (jobs.length) jobs.shift()();
  assert.equal(finished, 1); assert.ok(overlaps.every(value => !value), 'atomic event batches never draw a half-push');
  assert.deepEqual(SM.RULES.snapshot(display), SM.RULES.snapshot(moving));
  assert.equal(SM.RULES.snapshotSig(display), SM.RULES.snapshotSig(moving));
  const pendingGlyph = SM.VISUALS.describe(SM.getTile(10), { locked: true, solid: false, pendingClose: true, W: 'wht' });
  assert.equal(pendingGlyph.pendingClose, true); assert.equal(pendingGlyph.solid, false);
  assert.equal(SM.VISUALS.describe(SM.DOT_DEFINITION, { P: 'red', W: 'gre' }).colour, 'red');
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../src/js/sm-ui.js'), 'utf8'), { SM });
  const verifiedScore = SM.Game.scoreInfo({ par: 8, solve: { status: 'solvable', verified: true, optimal: 4 } });
  assert.equal(verifiedScore.value, 4); assert.equal(verifiedScore.proven, true);
  assert.ok(verifiedScore.label.includes('declared 8'));
  const declaredScore = SM.Game.scoreInfo({ par: 8, solve: { status: 'unknown' } });
  assert.equal(declaredScore.value, 8); assert.equal(declaredScore.proven, false);
  assert.ok(declaredScore.label.includes('declared') && declaredScore.label.includes('unknown'));
  assert.equal(SM.Game.scoreInfo({ par: null }).value, null);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../src/js/sm-io.js'), 'utf8'), { SM });
  const doc = pack([[1, 2]]);
  doc.num_level = 2;
  doc.levels.level_2 = Object.assign({}, doc.levels.level_1, { name: 'Second' });
  const controller = Object.create(SM.Game.prototype);
  Object.assign(controller, {
    levels: SM.LEVELS.validate(doc, { solve: false }).levels, index: 0,
    root: { querySelector() { return null; } },
    r: { build() {}, say() {}, cancel() {} }, clearWinPicture() {}, dismissWin() {},
    syncAll() {}, syncLevels() {}, syncCodex() {}, syncHud() {}
  });
  assert.equal(controller.unlocked(1), true, 'imported levels are directly selectable');
  assert.equal(controller.load(1), true);
  const io = new SM.IO(controller); io.report = () => {};
  const oldState = controller.state, oldLevels = controller.levels;
  assert.equal(io.applyObject(Object.assign({}, doc, { ruleset: 'v2' }), 'bad.yaml'), false);
  assert.equal(controller.state, oldState); assert.equal(controller.levels, oldLevels);
  const failed = state(SM, [[82, 0, 2], [1, 0, 0]]);
  SM.RULES.resolveTurn(failed, { type: 'move', dir: 'east' });
  SM.RULES.resolveTurn(failed, { type: 'move', dir: 'north' });
  assert.equal(failed.failed, true);
  controller.levels = [failed.level]; controller.index = 0; controller.state = failed;
  controller.history = [SM.RULES.snapshot(SM.RULES.newState(failed.level))];
  const frozen = SM.RULES.snapshot(failed), beforeWin = SM.STORE.exportText();
  controller.act({ type: 'move', dir: 'west' }); controller.undo(); controller.onWin();
  assert.deepEqual(SM.RULES.snapshot(failed), frozen); assert.equal(controller.history.length, 1);
  assert.equal(SM.STORE.exportText(), beforeWin, 'failed onWin cannot award completion or best');
  controller.restart();
  assert.equal(controller.state.failed, false); assert.equal(controller.state.won, false);
  assert.equal(controller.state.strokes, 0); assert.equal(controller.history.length, 0);
  controller.levels = [failed.level, oldLevels[1]]; controller.index = 0; controller.state = failed;
  controller.next();
  assert.equal(controller.index, 1); assert.equal(controller.state.failed, false, 'navigation remains available after failure');
  const retainedKey = 'streuphs-maze/progress/v1'; // Negative fixture: never a supported read/import path.
  const retainedBytes = JSON.stringify({ schema: 2, levels: { 'saved-world::level_1': { cleared: true } } });
  const values = new Map([[retainedKey, retainedBytes]]), reads = [], removals = [];
  const context = { SM: {}, localStorage: {
    getItem(key) { reads.push(key); return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { removals.push(key); values.delete(key); }
  } };
  const storeSource = fs.readFileSync(path.join(__dirname, '../../src/js/sm-store.js'), 'utf8');
  vm.runInNewContext(storeSource, context);
  const current = context.SM.STORE;
  assert.equal(current.all().contract, 'v2-queued');
  assert.equal(current.entry('level_1', 'saved-world').cleared, undefined);
  current.complete('level_1', 4, 5, 'alpha'); current.complete('level_1', 8, 9, 'beta');
  current.complete('level_1', 6, 7, 'alpha'); current.complete('level_1', 3, 4, 'alpha');
  current.noteTiles('level_1', [1, 70], 'alpha'); current.setLastLevel('level_2', 'alpha');
  assert.equal(current.entry('level_1', 'alpha').best.strokes, 3);
  assert.equal(current.entry('level_1', 'beta').best.strokes, 8);
  const saved = current.exportText();
  current.reset(); current.importText(saved);
  assert.equal(current.lastLevel('alpha'), 'level_2');
  assert.equal(current.entry('level_1', 'alpha').seenTiles.join(','), '1,70');
  for (const rejected of [retainedBytes, JSON.stringify({ schema: 1, contract: 'other', levels: {}, lastLevels: {} }),
    JSON.stringify({ schema: 1, contract: 'v2-queued', levels: { bad: { best: null, seenTiles: [] } }, lastLevels: {} })]) {
    assert.throws(() => current.importText(rejected)); assert.equal(current.exportText(), saved);
  }
  assert.equal(values.get(retainedKey), retainedBytes); assert.ok(!reads.includes(retainedKey)); assert.ok(!removals.includes(retainedKey));
  const denied = { SM: {} };
  Object.defineProperty(denied, 'localStorage', { get() { throw new Error('file storage denied'); } });
  vm.runInNewContext(storeSource, denied);
  denied.SM.STORE.complete('level_1', 2, 2, 'offline');
  assert.equal(denied.SM.STORE.backend(), 'memory');
  assert.equal(JSON.parse(denied.SM.STORE.exportText()).levels['offline::level_1'].best.strokes, 2);
  const quota = { SM: {}, localStorage: {
    getItem() { return null; }, removeItem() {},
    setItem(key) { if (key !== '__sm_current_probe__') throw new Error('quota'); }
  } };
  vm.runInNewContext(storeSource, quota);
  assert.equal(quota.SM.STORE.complete('level_1', 2, 2, 'quota'), false);
  assert.equal(quota.SM.STORE.durable(), false);
  assert.equal(quota.SM.STORE.entry('level_1', 'quota').best.strokes, 2);
}

module.exports = { pack, state, levels, rules, helpers };
