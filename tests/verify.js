/* =========================================================================
 * tests/verify.js  —  headless verification harness for Streuph's Maze
 *
 *   node tests/verify.js          levels + YAML + rules self-test
 *   node tests/verify.js --pars   also print the computed par for each level
 *
 * Loads the real browser scripts into this process via vm.runInThisContext
 * so we test the shipped files, not a copy.
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'src/js/sm-yaml.js',
  'src/js/tiles.js',
  'src/js/levels.default.js',
  'src/js/levels.js',
  'src/js/sm-rules.js',
  'src/js/sm-store.js'
];

for (const f of FILES) {
  const p = path.join(ROOT, f);
  vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
}

const SM = globalThis.SM;

/* ---------------------------------------------------------------------- */
/* Tiny assertion kit                                                       */
/* ---------------------------------------------------------------------- */

let pass = 0, fail = 0;
const failures = [];

function ok(cond, label, detail) {
  if (cond) { pass++; return true; }
  fail++;
  failures.push(label + (detail ? '  —  ' + detail : ''));
  return false;
}
function eq(actual, expected, label) {
  return ok(JSON.stringify(actual) === JSON.stringify(expected), label,
    'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
function throws(fn, label) {
  try { fn(); } catch (e) { return ok(true, label); }
  return ok(false, label, 'did not throw');
}

function checkTileRegistry() {
  const ice = SM.TILES[5];
  ok(!!ice, 'REG  ice ID 5 is registered');
  if (ice) {
    eq([ice.family, ice.name, ice.glyph, ice.solid, ice.walkable],
      ['terrain', 'ice', 'ice', false, true], 'REG  ice is walkable terrain');
    ok(SM.glyph(ice).length > 0, 'REG  ice has a rendered glyph');
  }

  const targets = [
    { id: 23, link: 1 },
    { id: 24, link: 2 },
    { id: 25, link: 3 }
  ];
  for (const item of targets) {
    const tile = SM.TILES[item.id];
    ok(!!tile, 'REG  target ID ' + item.id + ' is registered');
    if (!tile) continue;
    eq(tile.family, 'target', 'REG  target ID ' + item.id + ' has target family');
    eq(tile.params, { mode: 'momentary', scope: 'tagged', link: item.link },
      'REG  target ID ' + item.id + ' resolves to momentary link ' + item.link);
    eq(tile.glyph, 'target', 'REG  target ID ' + item.id + ' selects target glyph');
    eq([tile.solid, tile.walkable], [false, true],
      'REG  target ID ' + item.id + ' is walkable terrain');
  }

  const rays = [
    { id: 81, name: 'ray_north', glyph: 'rayNorth', direction: 'north', dir: { x: 0, y: 1 } },
    { id: 82, name: 'ray_east', glyph: 'rayEast', direction: 'east', dir: { x: 1, y: 0 } },
    { id: 83, name: 'ray_south', glyph: 'raySouth', direction: 'south', dir: { x: 0, y: -1 } },
    { id: 84, name: 'ray_west', glyph: 'rayWest', direction: 'west', dir: { x: -1, y: 0 } }
  ];
  for (const item of rays) {
    const tile = SM.TILES[item.id];
    ok(!!tile, 'REG  ray emitter ID ' + item.id + ' is registered');
    if (!tile) continue;
    eq([tile.id, tile.family, tile.name, tile.glyph],
      [item.id, 'hazard', item.name, item.glyph],
      'REG  ray emitter ID ' + item.id + ' has its unique directional definition');
    eq(tile.params, { dir: item.dir },
      'REG  ray emitter ID ' + item.id + ' resolves to the intended cardinal direction');
    eq(tile.presentation, { motion: 'static', direction: item.direction },
      'REG  ray emitter ID ' + item.id + ' has static directional presentation metadata');
    ok(SM.glyph(tile).length > 0,
      'REG  ray emitter ID ' + item.id + ' has a rendered directional glyph');
    ok(Object.keys(SM.TILES).filter(id => SM.TILES[id].name === item.name).length === 1,
      'REG  ray emitter ' + item.name + ' has a unique registry entry');
  }
  eq(new Set(rays.map(item => SM.TILES[item.id].glyph)).size, 4,
    'REG  cardinal ray emitters use four distinct glyph keys');

  for (const item of [{ id: 10, link: 1 }, { id: 26, link: 2 }, { id: 27, link: 3 }]) {
    const tile = SM.TILES[item.id];
    ok(!!tile, 'REG  phase-wall ID ' + item.id + ' is registered');
    if (!tile) continue;
    eq(tile.family, 'barrier', 'REG  phase-wall ID ' + item.id + ' has barrier family');
    eq(tile.params, { link: item.link, defaultLocked: true },
      'REG  phase-wall ID ' + item.id + ' resolves to locked link ' + item.link);
    eq(tile.glyph, 'phaseWall', 'REG  phase-wall ID ' + item.id + ' selects phase-wall glyph');
    eq(SM.glyph(tile, { locked: true }), SM.glyph(SM.TILES[10], { locked: true }),
      'REG  phase-wall ID ' + item.id + ' renders with the shared phase-wall glyph');
  }
}

/* ---------------------------------------------------------------------- */
/* A2 — sm-rules.js must be free of timers, DOM and async                   */
/* ---------------------------------------------------------------------- */

function checkRulesPurity() {
  const src = fs.readFileSync(path.join(ROOT, 'src/js/sm-rules.js'), 'utf8');
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  const banned = /\b(setTimeout|setInterval|requestAnimationFrame|Promise|async|await|import|fetch|document|window|navigator|localStorage)\b/;
  const hits = [];
  stripped.split('\n').forEach((ln, i) => {
    if (banned.test(ln)) hits.push((i + 1) + ': ' + ln.trim());
  });
  ok(hits.length === 0, 'A2  sm-rules.js contains no timers / DOM / async',
    hits.join('\n      '));

  for (const f of ['src/css/sm.css', 'index.html']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { ok(false, 'A3  ' + f + ' exists'); continue; }
    const s = fs.readFileSync(p, 'utf8');
    ok(!/https?:\/\//.test(s), 'A3  ' + f + ' references nothing over the network');
  }
  if (fs.existsSync(path.join(ROOT, 'index.html'))) {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    ok(!/type\s*=\s*["']module["']/.test(html), 'S2  index.html uses no ES modules (file:// blocks them)');
    ok(!/\bfetch\s*\(/.test(html), 'S2  index.html does not fetch (file:// blocks it)');
  }
}

/* ---------------------------------------------------------------------- */
/* P1-P7 — the YAML subset parser                                           */
/* ---------------------------------------------------------------------- */

function checkYaml() {
  const Y = SM.parseYAML;

  eq(Y('name: "x"\nnum_level: 2\n').name, 'x', 'P1  quoted string');
  eq(Y('a: 1\nb: -2\nc: 3.5\nd: true\ne: null\nf: ~\n').f, null, 'P1  null forms');
  eq(Y('a: 1\nb: -2\nc: 3.5\nd: true\ne: null\nf: ~\n').d, true, 'P1  bool');
  eq(Y('a: 1\nb: -2\nc: 3.5\nd: true\ne: null\nf: ~\n').c, 3.5, 'P1  float');

  eq(Y('g:\n  - [1, 0, 2]\n  - [0, 1, 0]\n').g, [[1,0,2],[0,1,0]], 'P2  block seq of flow seqs');
  eq(Y('h:\n  a:\n    b: [1, { link: 2 }]\n').h.a.b[1].link, 2, 'P2  nested flow map');
  eq(Y('# lead\na: 1 # tail\n').a, 1, 'P3  comment stripping');
  eq(Y('a: "has # hash"\n').a, 'has # hash', 'P3  # inside quotes is data');
  eq(Y('a: 1\n\n\nb: 2\n').b, 2, 'P3  blank lines');
  eq(Y('a: [1, 2, [3, 4]]\n').a[2][1], 4, 'P2  nested flow seq');
  eq(Y('a: { k: 1, j: 2 }\n').a, { k: 1, j: 2 }, 'P2  flow map');
  eq(Y('a: [1, 2, ]\n').a, [1, 2], 'P2  trailing comma tolerated');

  function lineOf(fn) {
    try { fn(); } catch (e) { return e.line; }
    return -1;
  }
  ok(lineOf(() => Y('a: 1\na: 2\n')) === 2, 'P5  duplicate key reports its line');
  throws(() => Y('a: 1\na: 2\n'), 'P5  duplicate key throws');
  throws(() => Y('a: &anchor 1\n'), 'P6  anchors rejected');
  throws(() => Y('a: *ref\n'), 'P6  aliases rejected');
  throws(() => Y('a: !!str 1\n'), 'P6  tags rejected');
  throws(() => Y('a: |\n  block\n'), 'P6  multi-line scalars rejected');
  throws(() => Y('---\na: 1\n'), 'P7  multi-document streams rejected');
  throws(() => Y('a: 1\n\tb: 2\n'), 'P4  tab indentation rejected');
  throws(() => Y('a: [1, 2\n'), 'P2  unterminated flow seq rejected');
  let syntaxError = null;
  try { Y('a: [1, 2\n'); } catch (e) { syntaxError = e; }
  ok(!!syntaxError && syntaxError.line === 1 && syntaxError.column > 0,
    'P2  YAML syntax errors retain line and column coordinates');
  throws(() => Y('a: 1\n  b: 2\n'), 'P4  bad indentation rejected');
  throws(() => Y('- a: 1\n'), 'P2  inline mapping in a seq rejected with guidance');

  try { Y('a: 1\n  b: 2\n'); } catch (e) { ok(/indentation/i.test(e.message), 'P4  indentation error message names the problem'); }

  /* P7 / N6 — round trip through the emitter. */
  const doc = { name: "Streuph's Maze", num_level: 1, levels: { level_1: { name: 'a', golf_score: 3, overrides: { 41: { link: 2 } }, grid: [[0, 3], [1, 2]] } } };
  const text = SM.emitYAML(doc, 'header line');
  const back = SM.parseYAML(text);
  eq(back.levels.level_1.overrides['41'].link, 2, 'P7  emit/parse round-trips overrides');
  eq(back.levels.level_1.grid, [[0, 3], [1, 2]], 'P7  emit/parse round-trips the grid');
  eq(back.name, "Streuph's Maze", 'P7  emit/parse round-trips the header name');
  ok(text.indexOf('# header line') === 0, 'N6  emitYAML preserves the header comment');
  ok(Object.keys(back.levels.level_1).join(',') === 'name,golf_score,overrides,grid', 'N6  emitYAML preserves key order');

  const winPicture = SM.DEFAULT_LEVELS.levels.level_2.win_picture;
  ok(/^data:image\/png;base64,/.test(winPicture), 'WIN  tutorial custom picture is embedded PNG data');
  const pictureResult = SM.LEVELS.validate(SM.DEFAULT_LEVELS, { solve: false });
  ok(pictureResult.ok, 'WIN  built-in levels accept the 250x250 picture');
  eq(pictureResult.levels[1].winPicture, winPicture, 'WIN  validated image is retained on normalized level');
  const invalidPictureDoc = {
    name: 'invalid picture', world_id: 'invalid-picture', num_level: 1,
    levels: { level_1: { name: 'test', width: 2, height: 1, golf_score: 1,
      win_picture: 'data:image/png;base64,AAAA', grid: [[1, 2]] } }
  };
  ok(SM.LEVELS.validate(invalidPictureDoc, { solve: false }).problems.some(p => /not a PNG/.test(p.message)),
    'WIN  invalid PNG signature is rejected');
  const wrongSizeDoc = {
    name: 'wrong picture size', world_id: 'wrong-picture-size', num_level: 1,
    levels: { level_1: { name: 'test', width: 2, height: 1, golf_score: 1,
      win_picture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX2UAAAAASUVORK5CYII=',
      grid: [[1, 2]] } }
  };
  ok(SM.LEVELS.validate(wrongSizeDoc, { solve: false }).problems.some(p => /250x250/.test(p.message)),
    'WIN  PNG with wrong dimensions is rejected');
  ok(SM.TILES[3].presentation.motion === 'static', 'ANIM  catalogue tiles default to static presentation');
  eq(SM.PLAYER_PRESENTATION.frames, 8, 'ANIM  player presentation has eight frames');
  eq(SM.PLAYER_PRESENTATION.frameMs, 250, 'ANIM  player presentation is 250ms per frame');
}

/* ---------------------------------------------------------------------- */
/* R1-R21 — the resolver                                                    */
/* ---------------------------------------------------------------------- */

function mkLevel(grid, over, par) {
  const h = grid.length, w = grid[0].length;
  return SM.RULES.buildLevel({
    name: 'test', width: w, height: h, golf_score: par || 1, overrides: over || null, grid: grid
  }, 'test');
}
function st(level) { return SM.RULES.newState(level); }
function canonicalSnapshot(s) {
  const snap = SM.RULES.snapshot(s);
  snap.crates = snap.crates.map(row => Array.from({ length: s.width }, (_, x) => row[x] || null));
  return snap;
}
function go(s, dir) { return SM.RULES.resolveTurn(s, { type: 'move', dir: dir }); }
function act(s) { return SM.RULES.resolveTurn(s, { type: 'act' }); }

function rayTestState(emitterId, blocker, overrides) {
  const width = 5, height = 5;
  const grid = Array.from({ length: height }, () => Array(width).fill(0));
  const put = (x, y, id) => { grid[height - 1 - y][x] = id; };
  put(0, 0, 1);
  put(4, 4, 2);
  put(2, 2, emitterId);
  if (blocker) put(blocker.x, blocker.y, blocker.id);
  return st(mkLevel(grid, overrides));
}

function checkRayQueries() {
  const R = SM.RULES;
  const directions = [
    { id: 81, dir: 'north', cells: [{ x: 2, y: 3 }, { x: 2, y: 4 }], player: { x: 2, y: 4 }, offAxis: { x: 3, y: 2 } },
    { id: 82, dir: 'east', cells: [{ x: 3, y: 2 }, { x: 4, y: 2 }], player: { x: 4, y: 2 }, offAxis: { x: 2, y: 3 } },
    { id: 83, dir: 'south', cells: [{ x: 2, y: 1 }, { x: 2, y: 0 }], player: { x: 2, y: 0 }, offAxis: { x: 3, y: 2 } },
    { id: 84, dir: 'west', cells: [{ x: 1, y: 2 }, { x: 0, y: 2 }], player: { x: 0, y: 2 }, offAxis: { x: 2, y: 3 } }
  ];
  for (const item of directions) {
    const s = rayTestState(item.id);
    eq(R.traceRay(s, 2, 2), item.cells,
      'RAY  ' + item.dir + ' emitter traces to the board edge');
    s.player = item.player;
    eq(R.isCaught(s), true, 'RAY  ' + item.dir + ' ray catches an aligned player');
    s.player = item.offAxis;
    eq(R.isCaught(s), false, 'RAY  ' + item.dir + ' ray does not catch an off-axis player');
  }

  const wall = rayTestState(82, { x: 3, y: 2, id: 3 });
  wall.player = { x: 4, y: 2 };
  eq(R.traceRay(wall, 2, 2), [], 'RAY  wall blocks the ray before the player');
  eq(R.isCaught(wall), false, 'RAY  player beyond a wall is safe');

  const crate = rayTestState(82, { x: 3, y: 2, id: 70 });
  crate.player = { x: 4, y: 2 };
  eq(R.traceRay(crate, 2, 2), [], 'RAY  movable crate shields cells beyond it');
  eq(R.isCaught(crate), false, 'RAY  player behind a crate is safe');

  const barrier = rayTestState(82, { x: 3, y: 2, id: 10 });
  barrier.player = { x: 4, y: 2 };
  eq(R.traceRay(barrier, 2, 2), [], 'RAY  closed phase barrier is opaque');

  const closedGate = rayTestState(82, { x: 3, y: 2, id: 30 }, { 30: { link: 1 } });
  closedGate.player = { x: 4, y: 2 };
  eq(closedGate.locked[2][3], true, 'RAY  fixture starts with linked gate closed');
  eq(R.traceRay(closedGate, 2, 2), [], 'RAY  closed gate is opaque');

  const openGate = rayTestState(82, { x: 3, y: 2, id: 30 },
    { 30: { link: 1, defaultLocked: false } });
  openGate.player = { x: 4, y: 2 };
  eq(openGate.locked[2][3], false, 'RAY  fixture starts with linked gate open');
  eq(R.traceRay(openGate, 2, 2), [{ x: 3, y: 2 }, { x: 4, y: 2 }],
    'RAY  open gate is transparent');
  eq(R.isCaught(openGate), true, 'RAY  player beyond an open gate is exposed');

  const target = rayTestState(82, { x: 3, y: 2, id: 23 });
  target.player = { x: 4, y: 2 };
  eq(R.traceRay(target, 2, 2), [{ x: 3, y: 2 }, { x: 4, y: 2 }],
    'RAY  target tiles do not block visibility');
}

function checkCatchTransitions() {
  const R = SM.RULES;

  // Entering a north belt returns the player to the authored start after the
  // forced hop reaches a westbound ray. The final coordinates equal the
  // pre-action coordinates, but the successful caught move still costs one.
  const samePosition = st(mkLevel([
    [0, 0, 0, 0, 2],
    [0, 0, 84, 0, 0],
    [1, 66, 0, 0, 0]
  ]));
  const returned = R.resolveTurn(samePosition, { type: 'move', dir: 'east' });
  eq(samePosition.player, { x: 0, y: 0 }, 'CATCH  forced ray encounter respawns to the pre-action position');
  eq(samePosition.strokes, 1, 'CATCH  respawned move is charged exactly one stroke');
  eq(returned.stroke, true, 'CATCH  same-position outcome is reported as stroked');
  eq(returned.changed, true, 'CATCH  same-position outcome is reported as changed');
  ok(returned.steps.some(step => step.type === 'caught' && step.at.x === 1 && step.at.y === 1),
    'CATCH  resolver reports the caught position');
  ok(returned.steps.some(step => step.type === 'respawn' &&
    step.to.x === 0 && step.to.y === 0), 'CATCH  resolver reports the respawn destination');

  const retained = st(mkLevel([
    [0, 41, 0, 0, 70, 2],
    [0, 0, 0, 40, 84, 0],
    [1, 0, 0, 0, 0, 30]
  ], { 30: { link: 1 }, 41: { link: 2 } }));
  retained.player = { x: 2, y: 1 };
  retained.P = 'red';
  retained.W = 'blu';
  retained.switches.find(sw => sw.inst.id === 41).latched = true;
  R.rebuildLocks(retained);
  const caughtTurn = R.resolveTurn(retained, { type: 'move', dir: 'east' });
  eq(retained.player, { x: 0, y: 0 }, 'CATCH  caught player returns to the authored start');
  eq(retained.crates[2][4].id, 70, 'CATCH  unrelated crate position is preserved');
  eq([retained.P, retained.W], ['red', 'blu'], 'CATCH  player and world colors are preserved');
  eq(retained.switches.find(sw => sw.inst.id === 41).latched, true,
    'CATCH  latched switch state is preserved');
  eq(retained.locked[0][5], true,
    'CATCH  player-occupancy gate is rebuilt after respawn and closes');
  eq(caughtTurn.stroke, true, 'CATCH  push-independent caught move is one stroke');

  const caughtGoal = st(mkLevel([
    [0, 0, 0, 0, 0],
    [1, 82, 2, 0, 0]
  ]));
  go(caughtGoal, 'east');
  const goalTurn = go(caughtGoal, 'east');
  eq(caughtGoal.won, false, 'CATCH  exposed goal entry loses to catch and is not a win');
  eq(caughtGoal.player, { x: 0, y: 0 }, 'CATCH  goal catch respawns before final goal test');
  eq(goalTurn.steps.some(step => step.type === 'goal'), false,
    'CATCH  provisional goal event is removed when ray catch takes precedence');

  const moveUndo = st(mkLevel([
    [0, 0, 0, 0, 2],
    [0, 0, 84, 0, 0],
    [1, 66, 0, 0, 0]
  ]));
  const beforeMoveCatch = canonicalSnapshot(moveUndo);
  R.resolveTurn(moveUndo, { type: 'move', dir: 'east' });
  R.restore(moveUndo, beforeMoveCatch);
  eq(canonicalSnapshot(moveUndo), beforeMoveCatch,
    'CATCH UNDO  undo restores every snapshotted value after a caught move');

  const pushUndo = st(mkLevel([
    [0, 41, 0, 0, 0, 2],
    [0, 0, 0, 70, 84, 0],
    [1, 0, 0, 0, 0, 30]
  ], { 30: { link: 1 }, 41: { link: 2 } }));
  pushUndo.player = { x: 2, y: 1 };
  pushUndo.P = 'red';
  pushUndo.W = 'blu';
  pushUndo.switches.find(sw => sw.inst.id === 41).latched = true;
  R.rebuildLocks(pushUndo);
  const beforePushCatch = canonicalSnapshot(pushUndo);
  const beforePushLocks = JSON.stringify(pushUndo.locked);
  const pushed = R.resolveTurn(pushUndo, { type: 'move', dir: 'east' });
  eq(pushUndo.crates[1][4].id, 70, 'CATCH UNDO  caught push retains the moved crate before undo');
  eq(pushed.stroke, true, 'CATCH UNDO  caught push has a one-stroke outcome');
  R.restore(pushUndo, beforePushCatch);
  eq(canonicalSnapshot(pushUndo), beforePushCatch,
    'CATCH UNDO  undo exactly restores player, crate, colors, latch, and stroke state');
  eq(JSON.stringify(pushUndo.locked), beforePushLocks,
    'CATCH UNDO  undo rebuilds the exact derived gate state');
}

function checkRayTransportTransitions() {
  const R = SM.RULES;
  const level = mkLevel([
    [0, 0, 0, 0, 2],
    [0, 82, 70, 0, 0],
    [1, 0, 0, 0, 0]
  ], null, 1, { C2: { ray: 'transport' } });
  const state = st(level);
  state.player = { x: 4, y: 1 };
  state.P = 'gre'; state.W = 'blu';
  const before = R.snapshot(state);
  const beforeSignature = R.snapshotSig(state);
  const result = R.resolveTurn(state, { type: 'act' });
  eq([state.player.x, state.player.y], [0, 0],
    'RAY TRANSPORT  exposed player is caught after object transport and respawned');
  eq(state.crates[1][3].id, 70,
    'RAY TRANSPORT  crate advances until the exposed player blocks its destination');
  eq([state.P, state.W], ['gre', 'blu'],
    'RAY TRANSPORT  catch preserves player/world colors');
  eq([result.stroke, state.strokes], [true, 1],
    'RAY TRANSPORT  an ACT with transport and catch costs one stroke total');
  ok(result.steps.findIndex(step => step.type === 'push') <
      result.steps.findIndex(step => step.type === 'caught'),
    'RAY TRANSPORT  crate movement resolves before player hazard catch');

  R.restore(state, before);
  eq([state.player.x, state.player.y, state.crates[1][2].id,
    state.P, state.W, R.snapshotSig(state)],
  [4, 1, 70, 'gre', 'blu', beforeSignature],
  'RAY TRANSPORT UNDO  undo restores crate, player, colors, and solver identity');

  const searchLevel = mkLevel([
    [0, 0, 0, 0, 2],
    [0, 82, 70, 0, 0],
    [1, 0, 0, 0, 0]
  ], null, 1, { C2: { ray: 'transport' } });
  const search = SM.LEVELS.solve(searchLevel, { maxStates: 10000, maxDepth: 20 });
  eq(search.status, 'solvable', 'RAY TRANSPORT BFS  solver finds a route with a moving ray object');
  const replay = st(searchLevel);
  let sawTransport = false;
  for (const action of search.path || []) {
    const stepResult = R.resolveTurn(replay, action);
    if (stepResult.steps.some(step => step.type === 'push' && step.crate.x === 2 && step.crate.y === 1)) {
      sawTransport = true;
    }
  }
  eq(replay.won, true, 'RAY TRANSPORT BFS  replay reaches the goal');
  eq(replay.strokes, search.optimal, 'RAY TRANSPORT BFS  replay uses the solver optimum');
  eq(sawTransport, true, 'RAY TRANSPORT BFS  solver replay includes the same ray transport transition');
}

function checkCatchSolver() {
  const R = SM.RULES;
  const level = mkLevel([
    [3, 3, 3, 3, 3],
    [3, 0, 70, 23, 3],
    [1, 0, 81, 10, 2]
  ], { 10: { link: 1 } }, 7);
  const search = SM.LEVELS.solve(level, { maxStates: 10000, maxDepth: 20 });
  eq(search.status, 'solvable', 'CATCH BFS  solver finds a route requiring a strategic respawn');
  eq(search.optimal, level.par, 'CATCH BFS  declared par equals the solver-proven minimum');
  ok(search.explored <= 10000, 'CATCH BFS  search terminates inside its configured state budget');

  const replay = st(level);
  const initialSignature = R.snapshotSig(replay);
  let sawStrategicCatch = false;
  for (const action of search.path || []) {
    const result = R.resolveTurn(replay, action);
    if (!result.steps.some(step => step.type === 'caught')) continue;
    sawStrategicCatch = true;
    eq(replay.player, { x: level.start.x, y: level.start.y },
      'CATCH BFS  replayed catch respawns to the authored start');
    eq(replay.crates[1][3].id, 70, 'CATCH BFS  pushed crate remains on its target after respawn');
    eq(replay.locked[0][3], false, 'CATCH BFS  target-controlled exit stays open after respawn');
    ok(R.snapshotSig(replay) !== initialSignature,
      'CATCH BFS  state signature retains the crate change across respawn');
  }
  eq(sawStrategicCatch, true, 'CATCH BFS  optimal solver path includes the caught push');
  eq(replay.won, true, 'CATCH BFS  replay reaches the goal after strategic respawn');
}


function checkRules() {
  const R = SM.RULES;

  /* C3/C4 — the row flip. */
  {
    const g = [
      [2],           // top row
      [0],
      [1]            // bottom row
    ];
    const L = mkLevel(g);
    const s = st(L);
    eq(s.player, { x: 0, y: 0 }, 'C4  the start tile lands at y = 0 (row 1)');
    eq(L.goal, { x: 0, y: 2 }, 'C4  the goal tile lands at y = height-1');
    eq(s.grid[2][0].name, 'goal', 'C4  grid[0] of the document is the TOP row');
  }

  /* R3/R4 — a blocked move costs nothing. */
  {
    const L = mkLevel([[2], [3], [1]]);
    const s = st(L);
    const r = go(s, 'east');
    eq(r.stroke, false, 'R3  a move into a wall costs 0 strokes');
    eq(s.strokes, 0, 'R3  strokes unchanged by a blocked move');
    ok(r.steps[0].type === 'blocked', 'R3  the view is told the move was blocked');
  }

  /* R2/R5 — a normal move. */
  {
    const L = mkLevel([[2, 0, 0], [0, 0, 0], [1, 0, 0]]);
    const s = st(L);
    const r = go(s, 'east');
    eq(r.stroke, true, 'R2  a real move costs 1 stroke');
    eq(s.strokes, 1, 'R2  strokes incremented');
    eq(s.player, { x: 1, y: 0 }, 'R2  the player moved');
  }

  /* R6-R9 — belts are free and chains terminate deterministically. */
  {
    const L = mkLevel([[2, 0, 0, 0], [0, 0, 0, 0], [1, 64, 64, 64]]);
    const s = st(L);
    const r = go(s, 'east');
    eq(s.strokes, 1, 'R6  a three-tile belt chain costs 1 stroke');
    eq(s.player, { x: 3, y: 0 }, 'R6  the chain carried the player to the end');
    ok(r.steps.filter(x => x.type === 'move').length === 3, 'R6  one step plus two free belt hops');
  }
  {
    /* A player belt does not shove crates. */
    const L = mkLevel([[2, 0, 0, 0], [0, 0, 0, 0], [1, 64, 64, 71]]);
    const s = st(L);
    go(s, 'east');
    eq(s.player, { x: 2, y: 0 }, 'R7  a player belt stops at a crate');
    eq(s.crates[0][3].id, 71, 'R7  the crate did not move');
  }
  {
    /* A crate belt does. */
    const L = mkLevel([[2, 0, 0, 0], [0, 0, 0, 0], [1, 60, 60, 71]]);
    const s = st(L);
    go(s, 'east');
    eq(s.player, { x: 2, y: 0 }, 'R8  a crate belt carried the player into the vacated cell');
    eq(s.crates[0][3].id, 71, 'R8  the crate was shoved one tile forward');
  }
  {
    /* A long belt run reaches its natural endpoint rather than an arbitrary
       fixed 64-hop cutoff. */
    const row = [1];
    for (let i = 0; i < 70; i++) row.push(64);
    row.push(2);
    const L = mkLevel([row]);
    const s = st(L);
    const r = go(s, 'east');
    eq(s.player.x, 71, 'R9  the belt chain reaches its natural stopping tile');
    eq(s.strokes, 1, 'R9  a long forced chain still costs one stroke');
    ok(!r.steps.some(x => x.type === 'belt-cap'), 'R9  the natural chain does not hit its safety cap');
  }
  {
    const L = mkLevel([[1, 5, 5, 0, 2]]);
    const s = st(L);
    const r = go(s, 'east');
    eq(s.player, { x: 3, y: 0 }, 'ICE  player slides over ice and stops on the first floor tile');
    eq(r.steps.filter(x => x.type === 'move').length, 3, 'ICE  each committed slide hop is returned');
    eq(s.strokes, 1, 'ICE  forced slide hops cost no additional strokes');
  }
  {
    const L = mkLevel([[1, 5, 5, 3, 2]]);
    const s = st(L);
    go(s, 'east');
    eq(s.player, { x: 2, y: 0 }, 'ICE  a wall stops the slide on its last valid ice cell');
  }
  {
    const L = mkLevel([[1, 64, 31, 2]]);
    const s = st(L);
    go(s, 'east');
    eq(s.player, { x: 1, y: 0 }, 'FORCE  a colour-blocked gate stops a conveyor hop safely');
  }
  {
    const L = mkLevel([
      [0, 0, 2],
      [0, 0, 0],
      [1, 5, 66]
    ]);
    const s = st(L);
    go(s, 'east');
    eq(s.player, { x: 2, y: 1 }, 'ICE  entering a north belt redirects the slide north');
  }
  {
    /* The directed belt loop returns to the same cell and direction. */
    const L = mkLevel([
      [0, 67, 65, 2],
      [1, 64, 66, 0]
    ]);
    const s = st(L);
    const r = go(s, 'east');
    eq(s.player, { x: 1, y: 0 }, 'R9  a conveyor loop terminates at its repeated state');
    ok(r.steps.some(x => x.type === 'force-loop'), 'R9  loop termination is reported in the step list');
    ok(r.steps.filter(x => x.type === 'move').length <= s.width * s.height * 4 + 1,
      'R9  returned movement stays within the board-derived hop bound');
    eq(s.strokes, 1, 'R9  loop termination keeps the initiating move to one stroke');
  }

  /* R10/R14 — pushing. */
  {
    const L = mkLevel([[2, 0, 0, 0], [0, 0, 0, 0], [1, 0, 71, 0]]);
    const s = st(L);
    go(s, 'east'); go(s, 'east');
    eq(s.player, { x: 2, y: 0 }, 'R10  the player pushed the crate');
    eq(s.crates[0][3].id, 71, 'R10  the crate advanced one tile');
  }
  {
    const L = mkLevel([[2, 0, 0], [1, 71, 0]]);
    const s = st(L);
    eq(s.grid[0][1].name, 'floor', 'SOKO  an authored crate marker normalizes to floor terrain');
    eq(s.crates[0][1].id, 71, 'SOKO  the crate remains in the movable entity layer');
    go(s, 'east');
    eq(s.crates[0][2].id, 71, 'SOKO  pushing moves the crate off its authored cell');
    eq(s.grid[0][1].name, 'floor', 'SOKO  the vacated crate cell exposes floor');
    go(s, 'west');
    const reenter = go(s, 'east');
    eq(reenter.stroke, true, 'SOKO  the player can traverse the crate\'s vacated cell');
    eq(s.player, { x: 1, y: 0 }, 'SOKO  traversal ends in the vacated cell');
  }
  {
    const L = mkLevel([[2, 0], [1, 71]]);
    const s = st(L);
    const before = {
      player: { x: s.player.x, y: s.player.y },
      crates: s.crates.map(row => row.map(crate => crate && crate.id)),
      strokes: s.strokes
    };
    const r = go(s, 'east');
    eq(r.stroke, false, 'R10  a crate with nowhere to go blocks the move');
    eq(r.changed, false, 'SOKO  blocked push reports no state change');
    eq(s.player, before.player, 'SOKO  blocked push leaves the player unchanged');
    eq(s.crates.map(row => row.map(crate => crate && crate.id)), before.crates,
      'SOKO  blocked push leaves every crate unchanged');
    eq(s.strokes, before.strokes, 'SOKO  blocked push costs no stroke');
  }
  {
    const L = mkLevel([[2, 0, 0], [1, 71, 3]]);
    const s = st(L);
    const beforeCrates = s.crates.map(row => row.map(crate => crate && crate.id));
    const r = go(s, 'east');
    eq(r.stroke, false, 'SOKO  a wall blocks a crate push');
    eq(s.player, { x: 0, y: 0 }, 'SOKO  wall-blocked push leaves player in place');
    eq(s.crates.map(row => row.map(crate => crate && crate.id)), beforeCrates,
      'SOKO  wall-blocked push leaves crate in place');
    eq(s.strokes, 0, 'SOKO  wall-blocked push costs no stroke');
  }

  /* T1 — the colour ring. */
  {
    const L = mkLevel([[2, 0], [1, 20]]);
    const s = st(L);
    eq(s.W, 'wht', 'T1  W starts white');
    go(s, 'east');
    eq(s.W, 'red', 'T1  the dial leaves white');
    go(s, 'west'); go(s, 'east');
    eq(s.W, 'gre', 'T1  the dial advances red -> green');
    go(s, 'west'); go(s, 'east');
    eq(s.W, 'blu', 'T1  green -> blue');
    go(s, 'west'); go(s, 'east');
    eq(s.W, 'red', 'T1  the ring closes: blue -> red');
  }
  {
    const L = mkLevel([[2, 0], [1, 20]]);
    const s = st(L);
    go(s, 'east'); eq(s.W, 'red', 'T1  dial');
    act(s); eq(s.W, 'gre', 'T1  ACT advances the dial in place');
    go(s, 'west'); go(s, 'east');
    eq(s.W, 'blu', 'T1  a fresh entry advances it once, not twice');
  }
  {
    const L = mkLevel([[2, 0, 0], [0, 20, 0], [1, 0, 0]]);
    const s = st(L);
    go(s, 'north'); go(s, 'east');
    eq(s.W, 'red', 'T1  cycle_dial');
    go(s, 'east');                       // step off, then back on
    go(s, 'west'); go(s, 'east');
    eq(s.W, 'gre', 'T1  still cycling');
    /* cycle_reset returns W to white from any colour */
    const L2 = mkLevel([[2, 0, 0], [0, 21, 0], [1, 0, 0]]);
    const s2 = st(L2);
    s2.W = 'blu';
    go(s2, 'north'); go(s2, 'east');
    eq(s2.W, 'wht', 'T1  cycle_reset returns W to white from anywhere');
  }

  /* T3 — prisms set P. */
  {
    const L = mkLevel([[2, 0], [1, 12]]);
    const s = st(L);
    go(s, 'east');
    eq(s.P, 'gre', 'T3  a prism sets the player colour');
    eq(s.W, 'wht', 'T3  a prism does not touch the world colour');
    go(s, 'west');
    eq(s.P, 'gre', 'T3  walking away from a prism preserves player colour');
    eq(s.W, 'wht', 'T3  walking away from a prism leaves world colour unchanged');
  }

  /* The win rule: P === W. */
  {
    /* A level where the goal is reached mismatched, then matched. */
    const L = mkLevel([
      [0, 2],
      [1, 11]
    ]);
    const s = st(L);
    go(s, 'east'); eq(s.P, 'red', 'WIN  the prism fired');
    go(s, 'north');
    eq(s.player, { x: 1, y: 1 }, 'WIN  the player reached the goal');
    eq(s.P, 'red', 'WIN  the player aura is red at the goal');
    eq(s.W, 'wht', 'WIN  world colour is still white at the goal');
    eq(s.won, false, 'WIN  a mismatched P/W pair on the goal does not clear it');
    s.W = 'red';
    act(s);
    eq(s.won, true, 'WIN  matching P/W at the goal clears it');
  }
  {
    /* Only the colour should decide, not the route. */
    const L = mkLevel([[2, 0], [1, 11]]);
    const s = st(L);
    go(s, 'east');
    eq(s.won, false, 'WIN  a prism alone does not win: W is still white');
  }

  /* T4 — ACT costs a stroke. */
  {
    const L = mkLevel([[2, 0], [1, 20]]);
    const s = st(L);
    go(s, 'east');
    act(s); eq(s.W, 'gre', 'T4  ACT advances the dial in place');
    eq(s.strokes, 2, 'T4  ACT costs 1 stroke');
    act(s); eq(s.W, 'blu', 'T4  ACT again');
    eq(s.strokes, 3, 'T4  ACT keeps costing');
  }

  /* R11 — locks. */
  {
    /* A colour gate OUT OF THE BOX is a pure colour test: open, but it
       still refuses the wrong carrier. Wiring it to a link (override) makes
       it default to CLOSED. */
    const L = mkLevel([[2, 0, 0, 0], [1, 30, 31, 0]]);
    const s = st(L);
    eq(s.locked[0][1], false, 'R11  an unwired colour gate ships open');
  }
  {
    /* link_key (tagged, latched) flips a gate that is wired to its link. */
    const L = mkLevel([[2, 0, 0], [1, 41, 30]], { 30: { link: 1 } });
    const s = st(L);
    eq(s.locked[0][2], true, 'R11  a wired gate starts locked');
    go(s, 'east');
    eq(s.locked[0][2], false, 'R11  the matching key unlatched it');
    go(s, 'west');
    eq(s.locked[0][2], false, 'R11  a latched key stays latched when you walk away');
    go(s, 'east');
    eq(s.locked[0][2], true, 'R11  walking the key again re-latches it');
  }
  {
    /* Two keys on the same link cancel out (parity). */
    const L = mkLevel([[2, 0, 0, 0], [1, 41, 41, 30]], { 30: { link: 1 } });
    const s = st(L);
    go(s, 'east'); eq(s.locked[0][3], false, 'R11  one key unlocks');
    go(s, 'east'); eq(s.locked[0][3], true, 'R11  two keys on the same link cancel out');
  }
  {
    /* A momentary plate is live only while you stand on it. */
    const L = mkLevel([[2, 0, 0], [1, 42, 30]], { 30: { link: 1 } });
    const s = st(L);
    eq(s.locked[0][2], true, 'R11  the gate starts locked');
    go(s, 'east');
    eq(s.locked[0][2], false, 'R11  standing on the plate unlocks it');
    go(s, 'east');
    eq(s.locked[0][2], true, 'R11  stepping off re-locks it');
  }
  {
    /* A master lock overrides everything. */
    const L = mkLevel([[2, 0, 0, 0], [1, 41, 30, 44]], { 30: { link: 1 } });
    const s = st(L);
    go(s, 'east');
    eq(s.locked[0][2], false, 'R11  the key opened the gate');
    go(s, 'east'); go(s, 'east');
    eq(s.locked[0][2], true, 'R11  the master lock overrode the key');
    go(s, 'west'); go(s, 'east');
    eq(s.locked[0][2], true, 'R11  the master lock still overrides');
  }
  {
    /* A phase wall obeys the same law with no colour test, and is wired to
       link 1 out of the box. */
    const L = mkLevel([[2, 0, 0], [1, 41, 10]]);
    const s = st(L);
    eq(s.locked[0][2], true, 'R11  the phase wall starts locked on link 1');
    go(s, 'east');
    eq(s.locked[0][2], false, 'R11  the key unlocked the phase wall');
    go(s, 'east');
    eq(s.player, { x: 2, y: 0 }, 'R11  the player walks through an unlocked phase wall');
  }
  {
    /* Crate occupancy is a momentary target signal, distinct from receiver
       ID 50's orthogonal crate-adjacency signal. */
    const L = mkLevel([
      [0, 0, 0, 0, 0, 0, 2],
      [1, 70, 23, 24, 10, 26, 0]
    ]);
    const s = st(L);
    const target1 = s.switches.find(sw => sw.inst.id === 23);
    const target2 = s.switches.find(sw => sw.inst.id === 24);
    eq(s.locked[0][4], true, 'TARGET  link-1 gate starts locked');
    eq(s.locked[0][5], true, 'TARGET  link-2 gate starts locked');
    eq(R.switchActive(s, target1), false, 'TARGET  adjacent crate does not activate a target');
    go(s, 'east'); // push crate onto link-1 target
    eq(R.switchActive(s, target1), true, 'TARGET  crate on target activates it');
    eq(R.switchActive(s, target2), false, 'TARGET  crate beside another target does not activate it');
    eq(s.locked[0][4], false, 'TARGET  occupied link-1 target opens its gate');
    eq(s.locked[0][5], true, 'TARGET  link-1 occupancy does not open link-2 gate');
    go(s, 'east'); // push onto link-2 target; player now stands on target 1
    eq(R.switchActive(s, target1), false, 'TARGET  player occupancy does not activate a target');
    eq(R.switchActive(s, target2), true, 'TARGET  crate on second target activates link 2');
    eq(s.locked[0][4], true, 'TARGET  vacated momentary target relocks its gate');
    eq(s.locked[0][5], false, 'TARGET  target activity opens only its matching link');
  }
  {
    /* defaultLocked:false inverts the default even when wired. */
    const L = mkLevel([[2, 0, 0], [1, 41, 10]], { 10: { link: 1, defaultLocked: false } });
    const s = st(L);
    eq(s.locked[0][2], false, 'R11  defaultLocked:false starts unlocked');
    go(s, 'east');
    eq(s.locked[0][2], true, 'R11  the key locks a phase wall that starts open');
  }
  {
    /* Lock state never leaks between levels. */
    const L1 = mkLevel([[2, 0, 0], [1, 41, 30]], { 30: { link: 1 } });
    const a = st(L1); go(a, 'east');
    const L2 = mkLevel([[2, 0, 0], [1, 41, 30]], { 30: { link: 1 } });
    const b = st(L2);
    eq(b.locked[0][2], true, 'R6  a fresh state does not inherit the previous latch');
  }

  /* Gates check the right carrier. */
  {
    /* row 1: start | white aura gate | red aura gate | goal */
    const L = mkLevel([[2, 0, 0, 0], [1, 30, 31, 0]]);
    const s = st(L);
    s.W = 'red';
    go(s, 'east');
    eq(s.player.x, 1, 'GATE  a white aura gate admits a white player despite W=red');
    const r2 = go(s, 'east');
    eq(r2.stroke, false, 'GATE  the red aura gate refuses a white player');
    ok(r2.steps[0].reason === 'colour', 'GATE  the view is told it was a colour block');
    ok(r2.steps[0].need === 'red' && r2.steps[0].have === 'wht', 'GATE  the block reports what was needed');
    eq(s.player.x, 1, 'GATE  a rejected aura gate leaves player position unchanged');
    eq(s.P, 'wht', 'GATE  a rejected aura gate leaves player aura unchanged');
    eq(s.W, 'red', 'GATE  a rejected aura gate leaves world colour unchanged');
    eq(s.strokes, 1, 'GATE  a rejected aura gate costs no stroke');
  }
  {
    /* A world gate reads W, not P. */
    const L = mkLevel([[2, 0, 0, 0], [1, 11, 34, 0]]);
    const s = st(L);
    go(s, 'east');
    eq(s.P, 'red', 'GATE  the player is red');
    const r = go(s, 'east');
    eq(r.stroke, false, 'GATE  the world gate refuses because W is white, even though P is red');
    ok(r.steps[0].have === 'wht', 'GATE  and it reports the world colour, not the player colour');
    eq(s.player.x, 1, 'GATE  rejected world gate leaves player position unchanged');
    eq(s.P, 'red', 'GATE  rejected world gate leaves player aura unchanged');
    eq(s.W, 'wht', 'GATE  rejected world gate leaves world colour unchanged');
    eq(s.strokes, 1, 'GATE  rejected world gate costs no stroke');
  }
  {
    /* A matching world colour passes even when the player aura differs. */
    const L = mkLevel([[2, 0, 0], [1, 20, 34]]);
    const s = st(L);
    s.P = 'gre';
    go(s, 'east');
    eq(s.W, 'red', 'GATE  the cycle dial sets W to red');
    eq(s.P, 'gre', 'GATE  the cycle dial leaves the player aura green');
    go(s, 'east');
    eq(s.player.x, 2, 'GATE  a red world gate admits W=red despite P=gre');
  }
  {
    /* A wired gate is solid regardless of colour until its link is satisfied. */
    const L = mkLevel([[2, 0, 0, 0], [1, 41, 30, 31]], { 30: { link: 1 } });
    const s = st(L);
    go(s, 'east');
    eq(s.locked[0][2], false, 'GATE  the gate is unlocked by the key');
    go(s, 'east');   // pass the unlocked white gate
    eq(s.player.x, 2, 'GATE  the player is through');
    const r2 = go(s, 'east');
    eq(r2.stroke, false, 'GATE  unlocked but the wrong colour still blocks');
    eq(s.locked[0][2], false, 'GATE  unlocking did not re-lock');
  }

  /* B11 / §8.3 — the crate sensor. */
  {
    /* row 1: start | floor | crate | floor | receiver | gate(link 1)
     * row 2: goal */
    const L = mkLevel([
      [2, 0, 0, 0, 0, 0],
      [1, 0, 71, 0, 50, 30]
    ], { 50: { link: 1, colour: 'red' }, 30: { link: 1, colour: 'wht' } });
    const s = st(L);
    eq(s.locked[0][5], true, 'B11  the gate the receiver drives starts locked');
    eq(R.sensorLit(s, s.switches[0]).any, false, 'B11  the receiver is dark at the start');
    go(s, 'east');                       // stand west of the crate
    go(s, 'east');                       // push it one tile east
    eq(s.player.x, 2, 'B11  the player took the crate\'s old cell');
    eq(R.sensorLit(s, s.switches[0]).any, true, 'B11  a red crate west of the receiver lights it');
    ok(R.sensorLit(s, s.switches[0]).lit.w === true, 'B11  the west neighbour is the lit one');
    eq(s.locked[0][5], false, 'B11  the lit receiver unlocked its gate');
    /* Push it again: the crate lands ON the receiver tile, which is NOT
       adjacency, so the sensor goes dark again. */
    go(s, 'east');
    eq(s.player.x, 3, 'B11  the player pushed the crate onto the receiver tile');
    eq(R.sensorLit(s, s.switches[0]).any, false, 'B11  a crate standing ON the sensor is not adjacency');
    eq(s.locked[0][5], true, 'B11  so the gate re-locks');
  }
  {
    /* The wrong colour does not light a receiver. */
    const L = mkLevel([
      [2, 0, 0, 0, 0, 0],
      [1, 0, 72, 0, 50, 30]
    ], { 50: { link: 1, colour: 'red' }, 30: { link: 1, colour: 'wht' } });
    const s = st(L);
    go(s, 'east'); go(s, 'east');
    eq(R.sensorLit(s, s.switches[0]).any, false, 'B11  a green crate does not light a red receiver');
    eq(s.locked[0][5], true, 'B11  so the gate stays locked');
  }
  {
    /* Lighting must survive the player walking away. */
    const L = mkLevel([
      [2, 0, 0, 0],
      [1, 0, 50, 71]
    ], { 50: { link: 1, colour: 'red' } });
    const s = st(L);
    eq(R.sensorLit(s, s.switches[0]).any, true, 'B11  a crate east of the receiver lights it');
    ok(R.sensorLit(s, s.switches[0]).lit.e === true, 'B11  the east neighbour is the lit one');
    go(s, 'east'); go(s, 'east');
    eq(s.player.x, 2, 'B11  the player can stand on the receiver');
    eq(R.sensorLit(s, s.switches[0]).any, true, 'B11  still lit after the player walks onto it');
  }
  {
    /* A sensor must also see crates NORTH and SOUTH of it, not just W/E. */
    const L = mkLevel([
      [2, 71, 0],
      [1, 50, 71],
      [0, 71, 0]
    ], { 50: { link: 1, colour: 'red' } });
    const s = st(L);
    const lit = R.sensorLit(s, s.switches[0]);
    ok(lit.any === true, 'B11  crates north AND south of the receiver both count');
    ok(lit.lit.n === true && lit.lit.s === true, 'B11  both vertical neighbours report lit');
  }

  /* Portals. */
  {
    /*      A2=portal  ...  D2=goal
     * row1  A1=start         D1=portal                              */
    const L = mkLevel([[80, 0, 0, 2], [1, 0, 0, 80]], { 80: { link: 1 } });
    const s = st(L);
    go(s, 'north');
    eq(s.player, { x: 3, y: 0 }, 'R12  the player arrived at the partner portal');
    eq(s.strokes, 1, 'R12  teleporting costs 1 stroke');
    go(s, 'north');
    eq(s.player, { x: 3, y: 1 }, 'R12  the goal was right there');
    eq(s.won, true, 'R12  and it wins');
    /* and the other direction */
    const s2 = st(L);
    s2.player.x = 2; s2.player.y = 0;
    go(s2, 'east');
    eq(s2.player, { x: 0, y: 1 }, 'R12  portals work in both directions');
  }

  /* R19 — undo. */
  {
    const L = mkLevel([[2, 0, 0], [1, 0, 0]]);
    const s = st(L);
    const snap = R.snapshot(s);
    go(s, 'east'); go(s, 'east');
    R.restore(s, snap);
    eq(s.player, { x: 0, y: 0 }, 'R19  undo restores the position');
    eq(s.strokes, 0, 'R19  undo restores the stroke count');
  }
  {
    /* Undo must also restore latches and crates. */
    const L = mkLevel([[2, 0, 0, 0], [1, 41, 30, 71]], { 30: { link: 1 } });
    const s = st(L);
    const snap = R.snapshot(s);
    go(s, 'east'); go(s, 'east'); go(s, 'east');
    eq(s.switches[0].latched, true, 'R19  the key latched');
    R.restore(s, snap);
    eq(s.switches[0].latched, false, 'R19  undo un-latches');
    eq(s.locked[0][2], true, 'R19  undo re-locks');
  }
  {
    const L = mkLevel([
      [0, 0, 0, 0, 3, 3],
      [1, 70, 23, 0, 10, 2]
    ]);
    const s = st(L);
    const target = s.switches.find(sw => sw.inst.id === 23);
    const beforePush = R.snapshot(s);
    go(s, 'east');
    const onTarget = R.snapshot(s);
    eq(R.switchActive(s, target), true, 'TARGET UNDO  pushing onto target activates it');
    eq(s.locked[0][4], false, 'TARGET UNDO  occupied target opens linked gate');

    const clone = R.cloneState(s);
    eq(R.switchActive(clone, clone.switches.find(sw => sw.inst.id === 23)), true,
      'TARGET UNDO  clone retains crate-derived target activity');
    eq(clone.locked[0][4], false, 'TARGET UNDO  clone retains derived gate state');
    go(clone, 'east');
    eq(R.switchActive(s, target), true, 'TARGET UNDO  moving cloned crate does not affect source state');

    go(s, 'east');
    eq(R.switchActive(s, target), false, 'TARGET UNDO  pushing off target deactivates it');
    eq(s.locked[0][4], true, 'TARGET UNDO  vacated target closes linked gate');
    R.restore(s, onTarget);
    eq(s.crates[0][2].id, 70, 'TARGET UNDO  undoing off-target push restores crate onto target');
    eq(R.switchActive(s, target), true, 'TARGET UNDO  restore derives active target again');
    eq(s.locked[0][4], false, 'TARGET UNDO  restore reopens linked gate');
    R.restore(s, beforePush);
    eq(s.crates[0][1].id, 70, 'TARGET UNDO  undoing onto-target push restores crate start');
    eq(R.switchActive(s, target), false, 'TARGET UNDO  restored empty target is inactive');
    eq(s.locked[0][4], true, 'TARGET UNDO  restored initial gate is closed');

    const search = SM.LEVELS.solve(L, { maxStates: 10000, maxDepth: 30 });
    eq(search.status, 'solvable', 'TARGET BFS  solver finds route through target-controlled gate');
    const solved = st(L);
    let crossedOpenGate = false;
    for (const action of search.path || []) {
      R.resolveTurn(solved, action);
      if (solved.player.x === 4 && solved.player.y === 0) {
        crossedOpenGate = true;
        eq(solved.locked[0][4], false, 'TARGET BFS  solver crosses gate while target is active');
      }
    }
    eq(crossedOpenGate, true, 'TARGET BFS  solver path enters the linked gate');
    eq(solved.won, true, 'TARGET BFS  replay reaches the level goal');
  }

  /* Clone independence — the solver depends on this. */
  {
    const L = mkLevel([[2, 0, 0], [0, 71, 0], [1, 0, 0]]);
    const s = st(L);
    const c = R.cloneState(s);
    go(s, 'east');
    ok(c.crates !== s.crates, 'R21  cloneState deep-copies the crate map');
    eq(c.strokes, 0, 'R21  mutating the source does not touch the clone');
  }

  /* Master void toggles ID 4 between passage and a solid wall. */
  {
    const L = mkLevel([[1, 45, 4, 2]]);
    const s = st(L);
    eq(R.masterVoidActive(s), false, 'MASTER VOID  starts in passage mode');
    go(s, 'east');
    eq(R.masterVoidActive(s), true, 'MASTER VOID  entering tile 45 latches it on');
    eq(R.isSolid(s, 2, 0), true, 'MASTER VOID  ID 4 is solid while the switch is on');
    const clone = R.cloneState(s);
    eq(R.masterVoidActive(clone), true, 'MASTER VOID  cloned state retains its switch state');
    const blocked = go(s, 'east');
    eq(blocked.stroke, false, 'MASTER VOID  active Void blocks movement at no stroke cost');
    const snap = R.snapshot(s);
    act(s);
    eq(R.masterVoidActive(s), false, 'MASTER VOID  ACT switches passage back on');
    eq(R.isSolid(s, 2, 0), false, 'MASTER VOID  ID 4 becomes passable again');
    R.restore(s, snap);
    eq(R.masterVoidActive(s), true, 'MASTER VOID  restoring a snapshot restores Void mode');
    act(s); go(s, 'east'); go(s, 'east');
    eq(s.won, true, 'MASTER VOID  passage can be restored to reach the goal');
    eq(s.strokes, 4, 'MASTER VOID  the tutorial solution includes one ACT stroke');
  }
}

/* ---------------------------------------------------------------------- */
/* Boot levels                                                              */
/* ---------------------------------------------------------------------- */

function checkWorld2Content() {
  const file = path.join(ROOT, 'data/worlds/world-02-lolos-castle.levels.yaml');
  ok(fs.existsSync(file), 'WORLD 2  independent Lolo pack exists');
  if (!fs.existsSync(file)) return;

  const text = fs.readFileSync(file, 'utf8');
  const doc = SM.parseYAML(text);
  const loaded = SM.LEVELS.load(text, { solve: true });
  eq(loaded.problems.length, 0, 'WORLD 2  pack parses and validates through the shared UI loader',
    loaded.problems.map(problem => problem.message).join(' | '));
  eq([doc.world_id, doc.num_level, loaded.levels.length],
    ['world-02-lolos-castle', 8, 8], 'WORLD 2  pack has stable identity and eight levels');

  const expected = [
    { name: 'First Medusa', width: 5, height: 5, emitters: 1, crates: 1 },
    { name: 'Crossfire', width: 7, height: 5, emitters: 2, crates: 1 },
    { name: 'Crossing Lines', width: 9, height: 6, emitters: 2, crates: 1 },
    { name: 'The Unhurried Exit', width: 10, height: 8, emitters: 1, crates: 1 },
    { name: 'Four Medusas', width: 12, height: 8, emitters: 4, crates: 1 },
    { name: 'Still Corridor', width: 14, height: 6, emitters: 3, crates: 1 },
    { name: 'Twin Chambers', width: 16, height: 9, emitters: 2, crates: 2 },
    { name: 'Labyrinth Fortress', width: 16, height: 9, emitters: 6, crates: 3 }
  ];
  for (let i = 0; i < expected.length; i++) {
    const level = loaded.levels[i];
    const want = expected[i];
    eq([level.name, level.width, level.height, level.worldId],
      [want.name, want.width, want.height, 'world-02-lolos-castle'],
      'WORLD 2  level_' + (i + 1) + ' has its authored name, board bounds, and world identity');

    const state = SM.RULES.newState(level);
    let emitters = 0, crates = 0;
    const targetLinks = new Set();
    const gateLinks = new Set();
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const tile = level.tiles[y][x];
        if (tile.family === 'hazard') {
          emitters++;
          const dir = tile.params.dir;
          const definition = SM.getTile(tile.id);
          ok((Math.abs(dir.x) + Math.abs(dir.y)) === 1 &&
              definition.presentation.motion === 'static',
            'WORLD 2  ' + level.key + ' uses a registered static cardinal ray');
        }
        if (tile.family === 'target') targetLinks.add(tile.params.link);
        if (tile.solid === 'locked' && tile.params.link > 0) gateLinks.add(tile.params.link);
        if (state.crates[y][x]) crates++;
      }
    }
    eq([emitters, crates], [want.emitters, want.crates],
      'WORLD 2  ' + level.key + ' has the authored emitter and movable-shield counts');
    for (const link of targetLinks) {
      ok(gateLinks.has(link),
        'WORLD 2  ' + level.key + ' target link ' + link + ' has a matching gate');
    }
    eq(SM.RULES.isCaught(state), false,
      'WORLD 2  ' + level.key + ' authored start is safe from every ray');
    eq(level.solve.status, 'solvable', 'WORLD 2  ' + level.key + ' has a solver-proven route');
    eq(level.solve.optimal, level.par,
      'WORLD 2  ' + level.key + ' par matches its solver-proven minimum');

    let respawnsSafe = true;
    for (const action of level.solve.path || []) {
      const result = SM.RULES.resolveTurn(state, action);
      if (result.steps.some(step => step.type === 'caught') &&
          (state.player.x !== state.start.x || state.player.y !== state.start.y ||
           SM.RULES.isCaught(state))) respawnsSafe = false;
    }
    eq(state.won, true, 'WORLD 2  replay of ' + level.key + ' reaches the goal');
    eq(state.strokes, level.par, 'WORLD 2  replay of ' + level.key + ' uses the recorded par');
    eq(respawnsSafe, true, 'WORLD 2  every ' + level.key + ' respawn lands safely');
  }

  for (const number of [4, 7, 8]) {
    const withoutTargets = JSON.parse(JSON.stringify(doc));
    for (const row of withoutTargets.levels['level_' + number].grid) {
      for (let x = 0; x < row.length; x++) if ([23, 24, 25].includes(row[x])) row[x] = 0;
    }
    const checked = SM.LEVELS.validate(withoutTargets, { solve: true });
    eq(checked.levels[number - 1].solve.status, 'unsolvable',
      'WORLD 2  level_' + number + ' cannot bypass its target-controlled gate');
  }
}

function checkLevels() {
  eq(SM.P_COLOURS, ['wht', 'red', 'gre', 'blu'], 'CHROMA  player palette remains the four existing colors');
  eq(SM.W_COLOURS, ['wht', 'red', 'gre', 'blu'], 'CHROMA  world palette remains the four existing colors');
  const smallLevel = { name: 'One step', width: 2, height: 2,
    golf_score: 1, grid: [[0, 2], [1, 0]] };
  const worldDoc = {
    name: 'Test World', world_id: 'test-world', num_level: 1,
    levels: { level_1: smallLevel }
  };
  const validWorld = SM.LEVELS.validate(worldDoc, { solve: false });
  ok(validWorld.ok, 'PACK  a named world with stable identity validates',
    validWorld.problems.map(p => p.message).join(' | '));
  eq(validWorld.levels[0].worldId, 'test-world', 'PACK  normalized levels retain stable world identity');
  eq(validWorld.levels[0].worldName, 'Test World', 'PACK  normalized levels retain display name');
  const unknownTileWorld = SM.LEVELS.validate({
    name: 'Broken World', world_id: 'broken-world', num_level: 1,
    levels: { level_1: { name: 'Bad cell', width: 2, height: 2, grid: [[1, 99], [0, 2]] } }
  }, { solve: false });
  const unknownTileMessage = unknownTileWorld.problems[0] && unknownTileWorld.problems[0].message;
  ok(/World "Broken World" \(broken-world\), level_1:/.test(unknownTileMessage || '') &&
     /tile id 99 at B2/.test(unknownTileMessage || '') && /registered, implemented tile ID/.test(unknownTileMessage || ''),
    'PACK  semantic tile diagnostics include world, level, ID, coordinate, and corrective action');

  const missingIdentity = SM.LEVELS.validate({
    name: 'Missing identity', num_level: 1, levels: { level_1: smallLevel }
  }, { solve: false });
  ok(missingIdentity.problems.some(p => /world_id.*required/i.test(p.message)),
    'PACK  external world pack without stable identity is rejected');
  const malformedIdentity = SM.LEVELS.validate({
    name: 'Bad identity', world_id: 'Not a slug', num_level: 1, levels: { level_1: smallLevel }
  }, { solve: false });
  ok(malformedIdentity.problems.some(p => /world_id.*lowercase slug/i.test(p.message)),
    'PACK  malformed world identity is rejected');
  const reservedIdentity = SM.LEVELS.validate({
    name: 'Reserved identity', world_id: 'prologue', num_level: 1,
    levels: { level_1: smallLevel }
  }, { solve: false });
  ok(reservedIdentity.problems.some(p => /reserved for the built-in Prologue/.test(p.message)),
    'PACK  external packs cannot collide with the built-in Prologue identity');

  const wrongCount = SM.LEVELS.validate({
    name: 'Count mismatch', world_id: 'count-mismatch', num_level: 2,
    levels: { level_1: smallLevel }
  }, { solve: false });
  ok(wrongCount.problems.some(p => /num_level is 2.*contains 1 level record/i.test(p.message)),
    'PACK  declared level count must match records');

  const badKey = SM.LEVELS.validate({
    name: 'Bad key', world_id: 'bad-key', num_level: 1,
    levels: { first: smallLevel }
  }, { solve: false });
  ok(badKey.problems.some(p => /not a level key/.test(p.message)),
    'PACK  invalid level key is rejected');
  const outOfOrder = SM.LEVELS.validate({
    name: 'Out of order', world_id: 'out-of-order', num_level: 2,
    levels: { level_2: smallLevel, level_1: smallLevel }
  }, { solve: false });
  ok(outOfOrder.problems.some(p => /contiguous numeric order/.test(p.message)),
    'PACK  out-of-order level keys are rejected');
  throws(() => SM.parseYAML(
    'name: "Duplicate key"\nworld_id: duplicate-key\nnum_level: 2\nlevels:\n' +
    '  level_1: {}\n  level_1: {}\n'),
  'PACK  duplicate YAML level keys are rejected by the parser');

  const tooWideGrid = new Array(17).fill(0);
  tooWideGrid[0] = 1; tooWideGrid[16] = 2;
  const tooWide = SM.LEVELS.validate({
    name: 'Too wide', world_id: 'too-wide', num_level: 1,
    levels: { level_1: { name: 'Wide', width: 17, height: 1, grid: [tooWideGrid] } }
  }, { solve: false });
  ok(tooWide.problems.some(p => /width 17 is out of range/.test(p.message)),
    'PACK  grid wider than 16 columns is rejected');
  const tooTallGrid = Array.from({ length: 10 }, () => [0, 0]);
  tooTallGrid[0][1] = 2; tooTallGrid[9][0] = 1;
  const tooTall = SM.LEVELS.validate({
    name: 'Too tall', world_id: 'too-tall', num_level: 1,
    levels: { level_1: { name: 'Tall', width: 2, height: 10, grid: tooTallGrid } }
  }, { solve: false });
  ok(tooTall.problems.some(p => /height 10 is out of range/.test(p.message)),
    'PACK  grid taller than 9 rows is rejected');
  const dimensionMismatch = SM.LEVELS.validate({
    name: 'Dimension mismatch', world_id: 'dimension-mismatch', num_level: 1,
    levels: { level_1: { name: 'Mismatch', width: 2, height: 1, grid: [[1, 0, 2]] } }
  }, { solve: false });
  ok(dimensionMismatch.problems.some(p => /width is declared as 2 but the rows are 3/.test(p.message)),
    'PACK  declared dimensions must match grid dimensions');

  const packGuide = fs.readFileSync(path.join(ROOT, 'docs/world-level-packs.md'), 'utf8');
  const sampleMatch = packGuide.match(/```yaml\n([\s\S]*?)```/);
  ok(!!sampleMatch, 'PACK DOC  authoring guide contains a YAML sample');
  if (sampleMatch) {
    const sample = SM.LEVELS.load(sampleMatch[1], { solve: true });
    ok(sample.ok, 'PACK DOC  documented sample parses and validates through the game loader',
      sample.problems.map(p => p.message).join(' | '));
    eq(sample.levels[0].worldId, 'sample-world', 'PACK DOC  sample stable identity is retained');
    eq(sample.levels[0].solve.optimal, sample.levels[0].par,
      'PACK DOC  sample par matches its solver-proven optimum');
  }

  const unsupportedColour = {
    name: 'unsupported color', world_id: 'unsupported-color', num_level: 1,
    levels: { level_1: { name: 'test', width: 3, height: 1, golf_score: 1,
      overrides: { 11: { colour: 'yellow' } }, grid: [[1, 11, 2]] } }
  };
  ok(SM.LEVELS.validate(unsupportedColour, { solve: false }).problems.some(p => /yellow.*not a gameplay colour/i.test(p.message)),
    'CHROMA  validator rejects yellow as a new gameplay color');

  const res = SM.LEVELS.boot({ solve: true });
  ok(res.problems.length === 0, 'V1-V11  the boot levels validate',
    res.problems.map(p => p.level + ': ' + p.message).join('\n      '));
  ok(res.levels.length === 13, 'V3  thirteen boot levels loaded, got ' + res.levels.length);
  eq(res.levels[0].worldId, 'prologue', 'PACK  legacy Prologue gets its stable internal identity');
  ok(typeof res.levels[0].goalText === 'string', 'LEVEL  tutorial text stays distinct from the goal coordinate');
  ok(res.levels[0].goal && typeof res.levels[0].goal.x === 'number', 'LEVEL  goal coordinate remains available to the rules');

  const showPars = process.argv.includes('--pars');
  for (const L of res.levels) {
    const s = L.solve;
    const tag = L.key.padEnd(8) + (L.name + ' ').padEnd(24, '.') +
      ' ' + L.width + 'x' + L.height +
      '  par=' + String(L.par).padStart(3) +
      '  opt=' + (s.optimal === null ? ' ?  ' : String(s.optimal).padStart(3)) +
      '  ' + s.status;
    console.log(tag);
    if (showPars && s.status === 'solvable' && L.par !== s.optimal) {
      console.log('        MISMATCH: declared par ' + L.par + ', computed optimum ' + s.optimal);
    }
  }
  for (const d of res.diagnostics) {
    console.log('  DIAG  ' + d.level + (d.line ? ' line ' + d.line : '') + '  ' + d.message);
  }
  return res;
}

function checkWorldOneContent() {
  const worldPath = path.join(ROOT, 'data/worlds/world-01-sokoban.levels.yaml');
  const source = fs.readFileSync(worldPath, 'utf8');
  const doc = SM.parseYAML(source);
  eq(doc.world_id, 'world-01-sokoban', 'W1  pack declares stable World 1 identity');
  eq(doc.num_level, Object.keys(doc.levels).length, 'W1  declared count matches all authored level records');
  const packKeys = Object.keys(doc.levels);
  eq(packKeys.slice(0, 4), ['level_1', 'level_2', 'level_3', 'level_4'],
    'W1  first four levels remain contiguous and ordered');
  eq(packKeys, Array.from({ length: doc.num_level }, (_, index) => 'level_' + (index + 1)),
    'W1  all authored levels are contiguous and ordered');
  eq(new Set(Object.values(doc.levels).map(level => level.name)).size, doc.num_level,
    'W1  all eight levels have unique display names');

  const result = SM.LEVELS.load(source, { solve: true });
  ok(result.ok, 'W1  levels 1–4 pass the same loader used by the UI',
    result.problems.map(p => p.message).join(' | '));
  eq(result.levels.length, Object.keys(doc.levels).length, 'W1  loader returns every declared level');
  const expected = [
    { key: 'level_1', width: 5, height: 5, crates: 1, pushes: 1, par: 8 },
    { key: 'level_2', width: 6, height: 6, crates: 2, pushes: 2, par: 8 },
    { key: 'level_3', width: 8, height: 6, crates: 1, pushes: 1, par: 9 },
    { key: 'level_4', width: 10, height: 6, crates: 2, pushes: 2, par: 13 },
    { key: 'level_5', width: 12, height: 8, crates: 2, pushes: 2, par: 15 },
    { key: 'level_6', width: 14, height: 6, crates: 1, pushes: 1, par: 17 },
    { key: 'level_7', width: 16, height: 9, crates: 4, pushes: 4, par: 21 },
    { key: 'level_8', width: 16, height: 9, crates: 4, pushes: 4, par: 23 }
  ];
  for (const expectation of expected) {
    const raw = doc.levels[expectation.key];
    const level = result.levels.find(item => item.key === expectation.key);
    ok(!!level, 'W1  ' + expectation.key + ' is normalized');
    if (!level) continue;
    eq([level.width, level.height], [expectation.width, expectation.height],
      'W1  ' + expectation.key + ' uses its intended rectangular dimensions');
    const flat = raw.grid.reduce((cells, row) => cells.concat(row), []);
    eq(raw.grid.filter(row => row.length === expectation.width).length, expectation.height,
      'W1  ' + expectation.key + ' has a rectangular integer grid');
    eq(flat.filter(id => id === 1).length, 1, 'W1  ' + expectation.key + ' has one start');
    eq(flat.filter(id => id === 2).length, 1, 'W1  ' + expectation.key + ' has one exit');
    eq(flat.filter(id => id >= 70 && id <= 73).length, expectation.crates,
      'W1  ' + expectation.key + ' has the intended crate count');
    ok(flat.every(id => Number.isInteger(id) && SM.TILES[id] && SM.TILES[id].implemented !== false),
      'W1  ' + expectation.key + ' uses only registered integer tile IDs');
    ok(level.solve.path.every(action => action.type === 'move' || action.type === 'act'),
      'W1  ' + expectation.key + ' uses only actions supported by the push-only resolver');
    if (expectation.key === 'level_6') {
      ok(flat.every(id => SM.TILES[id].family !== 'flow'),
        'W1  level_6 remix contains no conveyor mechanic');
    }

    const targetLinks = Array.from(new Set(flat.map(id => SM.TILES[id])
      .filter(tile => tile.family === 'target').map(tile => tile.params.link))).sort();
    const gateLinks = Array.from(new Set(flat.map(id => SM.TILES[id])
      .filter(tile => tile.family === 'barrier').map(tile => tile.params.link))).sort();
    eq(targetLinks, gateLinks, 'W1  ' + expectation.key + ' target links match its phase-wall links');
    ok(targetLinks.length > 0, 'W1  ' + expectation.key + ' includes a target-controlled gate');
    eq(level.solve.status, 'solvable', 'W1  ' + expectation.key + ' has a solver-proven route');
    eq(level.par, expectation.par, 'W1  ' + expectation.key + ' records its reviewed par');
    eq(level.solve.optimal, expectation.par, 'W1  ' + expectation.key + ' par matches the solver optimum');

    const state = SM.RULES.newState(level);
    ok(!SM.RULES.isSolid(state, state.start.x, state.start.y) &&
       !SM.RULES.crateAt(state, state.start.x, state.start.y) &&
       !SM.RULES.targetAt(state, state.start.x, state.start.y),
      'W1  ' + expectation.key + ' authored start is safe initially');
    let pushes = 0;
    const activeLinks = {};
    const openedLinks = {};
    const crossedLinks = {};
    for (const action of level.solve.path) {
      const resolution = SM.RULES.resolveTurn(state, action);
      pushes += resolution.steps.filter(step => step.type === 'push').length;
      for (const step of resolution.steps) {
        if (step.type !== 'move' || !state.grid[step.to.y] || !state.grid[step.to.y][step.to.x]) continue;
        const tile = state.grid[step.to.y][step.to.x];
        if (tile.family === 'barrier') {
          crossedLinks[tile.params.link] = true;
          ok(!state.locked[step.to.y][step.to.x] && !state.crates[step.to.y][step.to.x],
            'W1  ' + expectation.key + ' player crosses an open gate without a crate on it');
        }
      }
      for (const sw of state.switches) {
        if (sw.inst.family === 'target' && SM.RULES.switchActive(state, sw)) {
          activeLinks[sw.inst.params.link] = true;
        }
      }
      for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
          const tile = state.grid[y][x];
          if (tile.family === 'barrier' && !state.locked[y][x]) openedLinks[tile.params.link] = true;
        }
      }
    }
    if (expectation.pushes !== undefined) {
      eq(pushes, expectation.pushes, 'W1  ' + expectation.key + ' solver route makes its planned pushes');
    }
    eq(Object.keys(activeLinks).map(Number).sort(), targetLinks,
      'W1  ' + expectation.key + ' solver route occupies every target link');
    eq(Object.keys(openedLinks).map(Number).sort(), gateLinks,
      'W1  ' + expectation.key + ' solver route opens each linked phase wall');
    eq(Object.keys(crossedLinks).map(Number).sort(), gateLinks,
      'W1  ' + expectation.key + ' solver route must pass every linked gate');

    for (const link of targetLinks) {
      const withoutLinkTarget = JSON.parse(JSON.stringify(raw));
      for (let row = 0; row < withoutLinkTarget.grid.length; row++) {
        for (let col = 0; col < withoutLinkTarget.grid[row].length; col++) {
          const tile = SM.TILES[withoutLinkTarget.grid[row][col]];
          if (tile.family === 'target' && tile.params.link === link) withoutLinkTarget.grid[row][col] = 0;
        }
      }
      const variant = SM.RULES.buildLevel(withoutLinkTarget, expectation.key + '-without-link-' + link);
      const blockedRoute = SM.LEVELS.solve(variant);
      eq(blockedRoute.status, 'unsolvable',
        'W1  ' + expectation.key + ' link ' + link + ' is necessary (no-target route cannot bypass gate)');
    }
    eq(state.won, true, 'W1  ' + expectation.key + ' replay of the solver path wins');
    eq(state.strokes, level.par, 'W1  ' + expectation.key + ' replay ends at the recorded stroke count');
  }
}
function checkStore() {
  const store = SM.STORE;
  store.reset();
  store.complete('level_1', null, 8, 12, 'world-alpha');
  store.noteTiles('level_1', [1, 70], 'world-alpha');
  store.setLastLevel('level_1', 'world-alpha');
  store.complete('level_1', null, 5, 9, 'world-beta');
  store.noteTiles('level_1', [1, 23], 'world-beta');
  store.setLastLevel('level_2', 'world-beta');
  eq(store.entry('level_1', 'world-alpha').best.strokes, 8,
    'STORE  same level key keeps independent best score in world alpha');
  eq(store.entry('level_1', 'world-beta').best.strokes, 5,
    'STORE  same level key keeps independent best score in world beta');
  eq(store.entry('level_1', 'world-alpha').seenTiles, [1, 70],
    'STORE  seen tiles stay scoped to world alpha');
  eq(store.entry('level_1', 'world-beta').seenTiles, [1, 23],
    'STORE  seen tiles stay scoped to world beta');
  eq(store.entry('level_1', 'world-alpha').cleared, true,
    'STORE  completion is kept for world alpha');
  eq(store.entry('level_1', 'world-beta').cleared, true,
    'STORE  completion is kept for world beta');
  eq(store.lastLevel('world-alpha'), 'level_1',
    'STORE  last selection for world alpha is retained independently');
  eq(store.lastLevel('world-beta'), 'level_2',
    'STORE  last selection for world beta does not overwrite alpha');

  store.importText(JSON.stringify({
    schema: 1,
    levels: { level_1: { unlocked: true, cleared: true,
      best: { strokes: 7, turns: 11 }, seenTiles: [1, 70] } },
    lastLevel: 'level_1'
  }));
  eq(store.all().schema, 2, 'STORE  legacy progress migrates to the namespaced schema');
  eq(store.entry('level_1', 'prologue').cleared, true,
    'STORE  Prologue completion survives migration');
  eq(store.entry('level_1', 'prologue').best, { strokes: 7, turns: 11 },
    'STORE  Prologue best score survives migration');
  eq(store.entry('level_1', 'prologue').seenTiles, [1, 70],
    'STORE  Prologue codex progress survives migration');
  eq(store.lastLevel('prologue'), 'level_1',
    'STORE  legacy last-level selection migrates to Prologue identity');
  eq(store.entry('level_1', 'world-alpha').cleared, undefined,
    'STORE  migrated Prologue state does not collide with world packs');
}

/* ---------------------------------------------------------------------- */

console.log('--- Streuph\'s Maze: verification ---');
checkTileRegistry();
checkYaml();
checkRayQueries();
checkCatchTransitions();
checkCatchSolver();
checkRules();
const res = checkLevels();
checkWorldOneContent();
checkStore();
try { checkRulesPurity(); }
catch (e) { ok(false, 'A2  purity check ran', e.message); }

console.log('---');
console.log(pass + ' passed, ' + fail + ' failed');
if (fail) {
  for (const f of failures) console.log('  FAIL  ' + f);
  process.exit(1);
}
