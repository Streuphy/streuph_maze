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
  'src/js/sm-glyphs.js',
  'src/js/sm-board.js',
  'src/js/sm-entities.js',
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
  require('./unit/registry')(SM);
  ok(true, 'REG  shared registry unit suite passed');
}

/* ---------------------------------------------------------------------- */
/* Canonical state contract                                                 */
/* ---------------------------------------------------------------------- */

function checkStateContract() {
  const R = SM.RULES;
  const contract = R.STATE_CONTRACT;
  const state = R.newState(SM.LEVELS.boot({ solve: false }).levels[0]);
  const roots = contract.fixed.concat(contract.mutable, contract.derived, contract.persistent).sort();

  eq(Object.keys(state).sort(), roots,
    'STATE  every runtime root field belongs to one documented lifecycle category');
  eq(Object.keys(R.cloneState(state)).sort(), roots,
    'STATE  solver clones preserve the canonical runtime root-field shape');
  eq(Object.keys(R.snapshot(state)).sort(), [
    'P', 'W', 'crates', 'latched', 'player', 'polarity', 'strokes', 'targets', 'turns', 'won'
  ], 'STATE  undo snapshots contain the explicit reversible payload');
  eq(contract.undo, [
    'player', 'P', 'W', 'polarity', 'strokes', 'turns', 'won',
    'switches[].latched', 'switches[target].position', 'crates[][]'
  ], 'STATE  undo contract names nested switch, target, and crate state');
  eq(contract.solverIdentity, [
    'player', 'P', 'W', 'polarity', 'switches[].latched', 'targets[].position',
    'crates[][]:id+colour+capabilities'
  ], 'STATE  solver identity contract names every gameplay-relevant entity/carrier value');
  ok(R.cloneState(state).seen !== state.seen && R.cloneState(state).crates !== state.crates,
    'STATE  mutable discovery and entity grids are independent in solver clones');

  const before = R.snapshot(state);
  state.player.x = (state.player.x + 1) % state.width;
  state.P = 'red';
  state.polarity = 'blue-open';
  state.strokes++;
  R.restore(state, before);
  eq([state.player, state.P, state.polarity, state.strokes],
    [before.player, before.P, before.polarity, before.strokes],
    'STATE  restore replays the documented undo fields');

  const signature = R.snapshotSig(state);
  state.P = state.P === 'red' ? 'gre' : 'red';
  ok(R.snapshotSig(state) !== signature,
    'STATE  solver identity includes canonical color-carrier state');
  const polaritySignature = R.snapshotSig(state);
  state.polarity = state.polarity === 'red-open' ? 'blue-open' : 'red-open';
  ok(R.snapshotSig(state) !== polaritySignature,
    'STATE  solver identity distinguishes complementary global polarity');
}

function checkTileHookDispatch() {
  const S = SM;
  const defaults = S.TILE_HOOK_DEFAULTS;
  eq(Object.keys(defaults).sort(), [
    'activation', 'forcedMovement', 'onAct', 'onEnter', 'passability', 'rayInteraction'
  ], 'HOOK  the registry publishes the complete documented hook vocabulary');
  eq(S.resolveTileHook({ strategies: {} }, 'passability', {}), null,
    'HOOK  missing passability strategy has the neutral fallback');
  eq(S.resolveTileHook({ strategies: {} }, 'activation', {}), false,
    'HOOK  missing activation strategy is inactive');
  eq(S.resolveTileHook({ strategies: {} }, 'onEnter', {}), null,
    'HOOK  missing entry strategy is a no-op');
  eq(S.resolveTileHook({ strategies: {} }, 'onAct', {}), null,
    'HOOK  missing ACT strategy is a no-op');
  eq(S.resolveTileHook({ strategies: {} }, 'forcedMovement', {}), null,
    'HOOK  missing forced-movement strategy stops automatically');
  eq(S.resolveTileHook({ strategies: {} }, 'rayInteraction', {}), null,
    'HOOK  missing ray strategy has no ray effect');

  eq(S.resolveTileHook({ solid: true, strategies: { passability: 'solidTrait' } },
    'passability', { inst: { solid: true } }), { solid: true },
  'HOOK  passability strategy returns a declarative solid result');
  const playerContext = { state: { player: { x: 2, y: 1 } }, x: 2, y: 1 };
  eq(S.resolveTileHook({ strategies: { activation: 'playerOccupancy' } },
    'activation', playerContext), true,
  'HOOK  activation strategy reads player occupancy');
  eq(S.resolveTileHook({ params: { dir: { x: 1, y: 0 }, kind: 'crate' },
    strategies: { forcedMovement: 'directionalFlow' } }, 'forcedMovement',
    { inst: { params: { dir: { x: 1, y: 0 }, kind: 'crate' } } }),
  { type: 'flow', direction: { x: 1, y: 0 }, kind: 'crate' },
  'HOOK  forced-movement strategy returns a direction/kind descriptor');
  eq(S.resolveTileHook({ strategies: { forcedMovement: 'incomingIce' } },
    'forcedMovement', { direction: { x: 0, y: -1 } }),
  { type: 'ice', direction: { x: 0, y: -1 } },
  'HOOK  ice strategy preserves the incoming direction');
  eq(S.resolveTileHook({ strategies: { forcedMovement: 'linkedPortal' } },
    'forcedMovement', { inst: { params: { link: 4 } } }),
  { type: 'portal', link: 4 },
  'HOOK  portal strategy returns its configured link');
  eq(S.resolveTileHook({ params: { dir: { x: 0, y: -1 } },
    strategies: { rayInteraction: 'cardinalRayEmitter' } }, 'rayInteraction',
    { inst: { params: { dir: { x: 0, y: -1 } } } }),
  { type: 'emitter', direction: { x: 0, y: -1 } },
  'HOOK  ray strategy returns the static emitter direction');
  throws(() => S.resolveTileHook({ strategies: { activation: 'missing' },
    }, 'activation', {}), 'HOOK  unknown strategy reference fails loudly');
  throws(() => S.resolveTileHook({}, 'unregistered-hook', {}),
    'HOOK  unknown hook name fails loudly');

  const state = { P: 'wht' };
  const behaviorContext = { state, inst: { params: { colour: 'red' } }, press: false };
  S.resolveTileHook({ strategies: { onEnter: 'setPlayerColour' } }, 'onEnter', behaviorContext);
  eq(state.P, 'red', 'HOOK  entry phase dispatches its named behavior strategy');
  state.P = 'wht';
  behaviorContext.press = true;
  S.runBehavior('setPlayerColour', behaviorContext);
  eq(state.P, 'red', 'HOOK  ACT phase dispatches the same registered behavior');
  throws(() => S.runBehavior('unknown-behavior', {}),
    'HOOK  unknown behavior names fail loudly');
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

function checkRulesTileDispatchPurity() {
  const source = fs.readFileSync(path.join(ROOT, 'src/js/sm-rules.js'), 'utf8');
  const executable = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  const violations = executable.split('\n').map((line, index) => ({ line, number: index + 1 }))
    .filter(item => /\b(?:inst|tile|terrain|authoredInst)\.family\s*(?:===|!==|==|!=)/.test(item.line) ||
      /\b(?:inst|tile|terrain|authoredInst)\.name\s*(?:===|!==|==|!=)/.test(item.line));
  ok(violations.length === 0, 'ARCH  resolver has no tile family/name gameplay dispatch',
    violations.map(item => item.number + ': ' + item.line.trim()).join('\n'));

  const ui = fs.readFileSync(path.join(ROOT, 'src/js/sm-ui.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  const uiViolations = ui.split('\n').map((line, index) => ({ line, number: index + 1 }))
    .filter(item => /\b(?:inst|i|tile|def)\.(?:family|name)\s*(?:===|!==|==|!=)/.test(item.line));
  ok(uiViolations.length === 0, 'ARCH  UI descriptions do not dispatch on tile family/name',
    uiViolations.map(item => item.number + ': ' + item.line.trim()).join('\n'));
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

  const invalidParameterDoc = {
    name: 'parameter schema', world_id: 'parameter-schema', num_level: 1,
    levels: { level_1: { name: 'bad link type', width: 3, height: 1, golf_score: 1,
      grid: [[1, 80, 2]], overrides: { 80: { link: 'one' } } } }
  };
  ok(SM.LEVELS.validate(invalidParameterDoc, { solve: false }).problems.some(p =>
    /link must be integer, got string/.test(p.message)),
  'V6  tile parameter values are checked against their registered defaults-derived schema');

  const incompleteDirectionDoc = {
    name: 'direction schema', world_id: 'direction-schema', num_level: 1,
    levels: { level_1: { name: 'partial ray direction', width: 3, height: 1, golf_score: 1,
      grid: [[1, 81, 2]], overrides: { 81: { dir: { x: 1 } } } } }
  };
  ok(SM.LEVELS.validate(incompleteDirectionDoc, { solve: false }).problems.some(p =>
    /dir must contain exactly x, y/.test(p.message)),
  'V6  nested parameter overrides must preserve the registered object shape');
  ok(SM.TILES[3].presentation.motion === 'static', 'ANIM  catalogue tiles default to static presentation');
  eq(SM.PLAYER_PRESENTATION.frames, 8, 'ANIM  player presentation has eight frames');
  eq(SM.PLAYER_PRESENTATION.frameMs, 250, 'ANIM  player presentation is 250ms per frame');
}

/* ---------------------------------------------------------------------- */
/* R1-R21 — the resolver                                                    */
/* ---------------------------------------------------------------------- */

function mkLevel(grid, over, par, objectOverrides) {
  const h = grid.length, w = grid[0].length;
  return SM.RULES.buildLevel({
    name: 'test', width: w, height: h, golf_score: par || 1,
    overrides: over || null, object_overrides: objectOverrides || null, grid: grid
  }, 'test');
}

function polarityDocument(grid, initialPolarity) {
  const level = {
    name: 'Polarity fixture', goal: 'Test complementary global barriers.',
    width: grid[0].length, height: grid.length, golf_score: 1, grid
  };
  if (initialPolarity !== undefined) level.initial_polarity = initialPolarity;
  return { name: 'Polarity Test', world_id: 'polarity-test', num_level: 1,
    levels: { level_1: level } };
}

function st(level) { return SM.RULES.newState(level); }
function canonicalSnapshot(s) {
  const snap = SM.RULES.snapshot(s);
  snap.crates = snap.crates.map(row => Array.from({ length: s.width }, (_, x) => row[x] || null));
  return snap;
}
function go(s, dir) { return SM.RULES.resolveTurn(s, { type: 'move', dir: dir }); }
function act(s) { return SM.RULES.resolveTurn(s, { type: 'act' }); }

function checkPolarityBarriers() {
  const R = SM.RULES;
  const grid = [[1, 46, 47, 3, 2]];
  const defaultResult = SM.LEVELS.validate(polarityDocument(grid), { solve: false });
  ok(defaultResult.ok, 'POLARITY  omitted initial state validates with the default');
  const redOpen = st(defaultResult.levels[0]);
  eq([redOpen.polarity, R.isSolid(redOpen, 1, 0), R.isSolid(redOpen, 2, 0)],
    ['red-open', false, true], 'POLARITY  red-open admits red barriers and closes blue barriers');
  eq([R.canEnter(redOpen, 1, 0), R.canEnter(redOpen, 2, 0), R.isSolid(redOpen, 3, 0)],
    [true, false, true], 'POLARITY  player passability is complementary and ordinary walls stay solid');

  const blueResult = SM.LEVELS.validate(polarityDocument(grid, 'blue-open'), { solve: false });
  ok(blueResult.ok, 'POLARITY  blue-open is accepted as the alternate initial state');
  const blueOpen = st(blueResult.levels[0]);
  eq([blueOpen.polarity, R.isSolid(blueOpen, 1, 0), R.isSolid(blueOpen, 2, 0)],
    ['blue-open', true, false], 'POLARITY  blue-open exchanges both barrier classes');

  const colourResult = SM.LEVELS.validate(polarityDocument([[1, 31, 2]]), { solve: false });
  const colourGate = st(colourResult.levels[0]);
  colourGate.P = 'red';
  eq(R.canEnter(colourGate, 1, 0), true, 'POLARITY  existing red aura gate admits matching P');
  colourGate.polarity = 'blue-open';
  eq(R.canEnter(colourGate, 1, 0), true,
    'POLARITY  changing polarity does not affect ordinary color-gate carrier checks');

  const crateResult = SM.LEVELS.validate(polarityDocument([[1, 70, 47, 2]]), { solve: false });
  const crateState = st(crateResult.levels[0]);
  const blockedPush = go(crateState, 'east');
  eq([blockedPush.stroke, crateState.strokes, crateState.crates[0][1].id,
    crateState.crates[0][2]], [false, 0, 70, null],
  'POLARITY  a crate cannot be pushed into a closed barrier and no state or stroke changes');
}

function checkPolarityValidation() {
  for (const value of ['red', 'blue', 'green', null, 1]) {
    const result = SM.LEVELS.validate(polarityDocument([[1, 0, 2]], value), { solve: false });
    ok(result.problems.some(problem => /initial_polarity.*red-open.*blue-open/.test(problem.message)),
      'POLARITY YAML  invalid initial_polarity ' + JSON.stringify(value) + ' is rejected');
  }
  for (const value of ['red-open', 'blue-open']) {
    const result = SM.LEVELS.validate(polarityDocument([[1, 0, 2]], value), { solve: false });
    ok(result.ok && result.levels[0].initialPolarity === value,
      'POLARITY YAML  valid initial_polarity ' + value + ' is normalized');
  }
}

function checkPolaritySwitch() {
  const R = SM.RULES;
  const pack = SM.LEVELS.validate(polarityDocument([
    [0, 0, 0, 0, 0, 0],
    [0, 0, 48, 0, 0, 0],
    [1, 70, 46, 0, 0, 2]
  ]), { solve: false });
  ok(pack.ok, 'POLARITY  switch/cargo fixture validates');
  const state = st(pack.levels[0]);
  go(state, 'east'); // Put a crate on the initially open red barrier.
  eq([state.player, state.crates[0][2].id, state.polarity],
    [{ x: 1, y: 0 }, 70, 'red-open'], 'POLARITY  crate can enter a barrier open in the initial state');
  go(state, 'north');
  const switchEntry = go(state, 'east');
  eq([state.polarity, switchEntry.steps.some(step => step.type === 'polarity')],
    ['red-open', false], 'POLARITY  walking onto the crystal switch does not flip state');
  const beforeFlip = R.snapshot(state);
  const flip = act(state);
  eq([state.polarity, state.crates[0][2].id, R.isSolid(state, 2, 0)],
    ['blue-open', 70, true], 'POLARITY  ACT closes the red barrier without moving its crate');
  eq(flip.steps.filter(step => step.type === 'polarity').map(step => [step.from, step.to]),
    [['red-open', 'blue-open']], 'POLARITY  one ACT emits exactly one ordered polarity transition');

  const postFlipSignature = R.snapshotSig(state);
  ok(R.cloneState(state).polarity === 'blue-open',
    'POLARITY  solver clones retain the current polarity');
  R.restore(state, beforeFlip);
  eq([state.polarity, state.strokes, R.snapshotSig(state) === postFlipSignature],
    ['red-open', beforeFlip.strokes, false],
  'POLARITY  restore undoes the switch state, stroke count, and solver identity');
  act(state); // Reapply the switch for the crate departure/re-entry path below.

  // Approach the box from its west side and push it off the now-closed tile.
  go(state, 'west');
  go(state, 'south');
  go(state, 'east');
  eq([state.crates[0][3].id, state.player, R.isSolid(state, 2, 0)],
    [70, { x: 2, y: 0 }, true], 'POLARITY  a crate may be pushed off a closed barrier');
  go(state, 'north'); go(state, 'east'); go(state, 'east'); go(state, 'south');
  const beforeRejectedPush = [state.strokes, state.crates[0][3], state.player];
  const rejectedPush = go(state, 'west');
  eq([rejectedPush.stroke, [state.strokes, state.crates[0][3], state.player]],
    [false, beforeRejectedPush], 'POLARITY  crate cannot be pushed back onto its closed barrier');

  // Defensive invariant: no normal switch action can close a barrier under
  // the player, so construct that state directly and verify departure/re-entry.
  const playerPack = SM.LEVELS.validate(polarityDocument([[1, 46, 0, 2]]), { solve: false });
  const playerState = st(playerPack.levels[0]);
  playerState.player.x = 1;
  playerState.polarity = 'blue-open';
  eq([playerState.player, R.isSolid(playerState, 1, 0)],
    [{ x: 1, y: 0 }, true], 'POLARITY  defensive fixture keeps a player on a newly closed barrier');
  const leave = go(playerState, 'east');
  eq([leave.stroke, playerState.player], [true, { x: 2, y: 0 }],
    'POLARITY  player may leave a barrier closed beneath them');
  const reenter = go(playerState, 'west');
  eq([reenter.stroke, playerState.strokes, playerState.player],
    [false, 1, { x: 2, y: 0 }], 'POLARITY  player cannot re-enter a closed barrier');
}

function checkPolaritySolver() {
  const R = SM.RULES;
  const validated = SM.LEVELS.validate(polarityDocument([
    [0, 48, 0, 3],
    [1, 46, 47, 2]
  ]), { solve: false });
  ok(validated.ok, 'POLARITY BFS  switch-order fixture validates');
  const level = validated.levels[0];
  const solved = SM.LEVELS.solve(level);
  eq(solved.status, 'solvable', 'POLARITY BFS  real resolver proves the switch-order fixture solvable');
  ok(solved.path.some(action => action.type === 'act'),
    'POLARITY BFS  winning route explicitly activates the global switch');
  const replay = st(level);
  for (const action of solved.path) R.resolveTurn(replay, action);
  eq([replay.won, replay.polarity, replay.strokes],
    [true, 'blue-open', solved.optimal],
  'POLARITY BFS  replay uses the matching polarity and wins at the proven minimum');
}

function checkGeometryHelpers() {
  const R = SM.RULES;
  const state = st(mkLevel([[1, 0, 70, 2]]));
  eq(R.inBounds(state, 0, 0), true, 'HELPER  lower-left board cell is in bounds');
  eq(R.inBounds(state, state.width, 0), false, 'HELPER  east edge is outside the board');
  eq(R.tileAt(state, 1, 0).name, 'floor', 'HELPER  tileAt reads the normalized terrain layer');
  eq(R.tileAt(state, -1, 0), null, 'HELPER  tileAt returns null out of bounds');
  eq(R.crateAt(state, 2, 0).id, 70, 'HELPER  crateAt reads the movable entity layer');
  eq(R.crateAt(state, 2, -1), null, 'HELPER  crateAt returns null out of bounds');
  eq(R.cellLabel(0, 0), 'A1', 'HELPER  runtime coordinates retain bottom-left labels');

  const matrix = SM.BOARD.createGrid(2, 2, false);
  matrix[0][0] = state.crates[0][2];
  const copied = SM.BOARD.copyGrid(matrix);
  ok(copied !== matrix && copied[0] !== matrix[0],
    'HELPER  board copies isolate matrix and row storage');
  eq(copied[0][0], matrix[0][0],
    'HELPER  board copies retain immutable entity-definition references');

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scripts = ['tiles.js', 'sm-glyphs.js', 'sm-board.js', 'sm-entities.js', 'sm-rules.js'].map(name =>
    html.indexOf('src/js/' + name));
  ok(scripts.every(index => index >= 0) && scripts.every((index, i) => i === 0 || scripts[i - 1] < index),
    'HELPER  classic scripts load tile presentation and helpers before rules');
  const rulesFiles = FILES.filter(file => /(?:tiles|sm-glyphs|sm-board|sm-entities|sm-rules)\.js$/.test(file));
  eq(rulesFiles, ['src/js/tiles.js', 'src/js/sm-glyphs.js', 'src/js/sm-board.js',
    'src/js/sm-entities.js', 'src/js/sm-rules.js'],
  'HELPER  VM test harness follows the same tile/presentation/helper dependency order');
}

function rayTestState(emitterId, blocker, overrides, objectOverrides) {
  const width = 5, height = 5;
  const grid = Array.from({ length: height }, () => Array(width).fill(0));
  const put = (x, y, id) => { grid[height - 1 - y][x] = id; };
  put(0, 0, 1);
  put(4, 4, 2);
  put(2, 2, emitterId);
  if (blocker) put(blocker.x, blocker.y, blocker.id);
  return st(mkLevel(grid, overrides, 1, objectOverrides));
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

  const transportedCrate = rayTestState(82, { x: 3, y: 2, id: 70 }, null,
    { D3: { ray: 'transport' } });
  eq(R.traceRay(transportedCrate, 2, 2), [{ x: 3, y: 2 }, { x: 4, y: 2 }],
    'RAY  transport-capable crate is transparent to the beam');
  const transportTurn = go(transportedCrate, 'east');
  eq(transportedCrate.crates[2][4].id, 70,
    'RAY  crate on an active beam is carried in its cardinal direction');
  ok(transportTurn.steps.some(step => step.type === 'push' && step.to.x === 4 && step.to.y === 2),
    'RAY  transport movement is returned as a resolver event');

  const ignoredCrate = rayTestState(82, { x: 3, y: 2, id: 70 }, null,
    { D3: { ray: 'ignore' } });
  eq(R.traceRay(ignoredCrate, 2, 2), [{ x: 3, y: 2 }, { x: 4, y: 2 }],
    'RAY  ignored crate neither blocks nor consumes the ray');
  go(ignoredCrate, 'east');
  eq(ignoredCrate.crates[2][3].id, 70,
    'RAY  ignored crate remains stationary on the ray');

  const transportedTarget = rayTestState(82, { x: 3, y: 2, id: 23 }, null,
    { D3: { ray: 'transport' } });
  go(transportedTarget, 'east');
  eq(R.targetAt(transportedTarget, 4, 2).inst.id, 23,
    'RAY  a target with transport capability travels without losing its link identity');
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
      result.steps.findIndex(step => step.type === 'ray') &&
      result.steps.findIndex(step => step.type === 'ray') <
      result.steps.findIndex(step => step.type === 'caught') &&
      result.steps.findIndex(step => step.type === 'caught') <
      result.steps.findIndex(step => step.type === 'respawn'),
    'RAY TRANSPORT  object transport and final ray evaluation precede catch and respawn');

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

function checkParRouteSelection() {
  const R = SM.RULES;
  const tieLevel = mkLevel([[0, 2], [1, 0]]);
  const firstTie = SM.LEVELS.solve(tieLevel, { maxStates: 100, maxDepth: 10 });
  const secondTie = SM.LEVELS.solve(tieLevel, { maxStates: 100, maxDepth: 10 });
  eq(firstTie.path.map(a => a.dir), ['north', 'east'],
    'PAR ROUTE  equal-score solutions keep the first BFS action order');
  eq(secondTie.path, firstTie.path,
    'PAR ROUTE  equal-score route selection is deterministic');
  eq(firstTie.routeBalance, {
    counts: { up: 1, down: 0, left: 0, right: 1 }, score: 1, complete: true
  }, 'PAR ROUTE  tied route reports balanced directions');

  const actionMetrics = SM.LEVELS.routeMetrics([
    { type: 'move', dir: 'north' },
    { type: 'pull', dir: 'west' },
    { type: 'act' }
  ]);
  eq(actionMetrics, {
    counts: { up: 1, down: 0, left: 1, right: 0 }, score: 1
  }, 'PAR ROUTE  move and pull count once; ACT adds no direction count');

  function routeTokens(path) {
    return path.map(action => action.type === 'act' ? 'ACT' :
      (action.type === 'pull' ? 'P' : '') +
      ({ north: 'U', east: 'R', south: 'D', west: 'L' }[action.dir]));
  }

  const world1Path = path.join(ROOT, 'data/worlds/world-01-sokoban.levels.yaml');
  const world1 = SM.LEVELS.load(fs.readFileSync(world1Path, 'utf8'), { solve: false });
  ok(world1.ok, 'PAR ROUTE  World 1 example loads through the shared loader');
  const world1Example = SM.LEVELS.solve(world1.levels[0]);
  eq([world1Example.optimal, routeTokens(world1Example.path), world1Example.routeBalance], [
    8, ['R', 'U', 'U', 'R', 'R', 'R', 'D', 'D'],
    { counts: { up: 2, down: 2, left: 0, right: 4 }, score: 8, complete: true }
  ], 'PAR ROUTE  documented World 1 example is solver-selected and balanced-optimal');
  const world1Replay = st(world1.levels[0]);
  for (const action of world1Example.path) R.resolveTurn(world1Replay, action);
  eq([world1Replay.won, world1Replay.strokes], [true, world1Example.optimal],
    'PAR ROUTE  World 1 example replays to a win at PAR');

  /* Recreate the previous one-path-per-state BFS so this fixture proves the
     new selector improves the representative without altering the optimum. */
  function firstShortestPath(level) {
    const actions = [
      { type: 'move', dir: 'north' }, { type: 'move', dir: 'east' },
      { type: 'move', dir: 'south' }, { type: 'move', dir: 'west' },
      { type: 'pull', dir: 'north' }, { type: 'pull', dir: 'east' },
      { type: 'pull', dir: 'south' }, { type: 'pull', dir: 'west' },
      { type: 'act' }
    ];
    const start = R.newState(level);
    const seen = { [R.snapshotSig(start)]: true };
    const queue = [{ state: start, path: [] }];
    for (let head = 0; head < queue.length; head++) {
      const node = queue[head];
      for (const action of actions) {
        const next = R.cloneState(node.state);
        let resolved;
        try { resolved = R.resolveTurn(next, action); } catch (_) { continue; }
        if (!resolved.stroke) continue;
        const path = node.path.concat([action]);
        if (next.player.x === next.goal.x && next.player.y === next.goal.y && next.P === next.W) {
          return { optimal: next.strokes, path: path };
        }
        const key = R.snapshotSig(next);
        if (seen[key]) continue;
        seen[key] = true;
        queue.push({ state: next, path: path });
      }
    }
    return null;
  }

  const world2Path = path.join(ROOT, 'data/worlds/world-02-lolos-castle.levels.yaml');
  const world2 = SM.LEVELS.load(fs.readFileSync(world2Path, 'utf8'), { solve: false });
  ok(world2.ok, 'PAR ROUTE  World 2 fixture loads through the shared loader');
  const level = world2.levels[4]; // Four Medusas has tied optimums with distinct direction balance.
  const original = firstShortestPath(level);
  const balanced = SM.LEVELS.solve(level, { maxStates: 10000, maxDepth: 100 });
  eq(balanced.status, 'solvable', 'PAR ROUTE  balanced fixture remains solvable');
  eq(balanced.optimal, original.optimal,
    'PAR ROUTE  directional preference does not change the minimum PAR');
  eq(balanced.routeBalance.complete, true,
    'PAR ROUTE  fixture comparison completes within budget');
  ok(balanced.routeBalance.score < SM.LEVELS.routeMetrics(original.path).score,
    'PAR ROUTE  selected route is better balanced than the first shortest route');
  eq(balanced.routeBalance.counts, SM.LEVELS.routeMetrics(balanced.path).counts,
    'PAR ROUTE  reported counts agree with the selected action sequence');
  eq([routeTokens(balanced.path), balanced.routeBalance], [
    ['U', 'U', 'R', 'R', 'R', 'R', 'R', 'U', 'L', 'U', 'L', 'L', 'L', 'L'],
    { counts: { up: 4, down: 0, left: 5, right: 5 }, score: 17, complete: true }
  ], 'PAR ROUTE  documented World 2 example matches the selected route report');
  const replay = st(level);
  for (const action of balanced.path) R.resolveTurn(replay, action);
  eq([replay.won, replay.strokes], [true, balanced.optimal],
    'PAR ROUTE  selected balanced route replays to a win at PAR');

  const limited = SM.LEVELS.solve(level, {
    maxStates: 120, maxDepth: 100, maxRouteLabels: 10000
  });
  eq([limited.status, limited.optimal, limited.routeBalance.complete],
    ['solvable', balanced.optimal, false],
    'PAR ROUTE  exhausted tie-search budget preserves proven PAR and marks selection incomplete');
  const limitedReplay = st(level);
  for (const action of limited.path) R.resolveTurn(limitedReplay, action);
  eq([limitedReplay.won, limitedReplay.strokes], [true, limited.optimal],
    'PAR ROUTE  budget-limited fallback remains a replayable optimum');

  const conveyorLevel = SM.LEVELS.boot({ solve: false }).levels[2];
  const conveyorSearch = SM.LEVELS.solve(conveyorLevel);
  const conveyorReplay = st(conveyorLevel);
  let sawAutomaticMovement = false;
  for (const action of conveyorSearch.path) {
    const resolved = R.resolveTurn(conveyorReplay, action);
    if (resolved.steps.filter(step => step.type === 'move').length > 1) sawAutomaticMovement = true;
  }
  ok(sawAutomaticMovement, 'PAR ROUTE  conveyor fixture includes automatic movement');
  eq(conveyorSearch.routeBalance.counts, SM.LEVELS.routeMetrics(conveyorSearch.path).counts,
    'PAR ROUTE  automatic conveyor hops do not enter command direction counts');
}

function checkChromaticContracts() {
  const R = SM.RULES;

  const replacement = st(mkLevel([[0, 0, 2], [1, 11, 12]]));
  go(replacement, 'east');
  eq([replacement.P, replacement.W], ['red', 'wht'],
    'CHROMA CONTRACT  red prism sets P without changing W');
  go(replacement, 'east');
  eq([replacement.P, replacement.W], ['gre', 'wht'],
    'CHROMA CONTRACT  entering a second prism replaces P');

  const auraGate = st(mkLevel([[0, 0, 0], [1, 31, 2]]));
  const wrongAura = go(auraGate, 'east');
  eq([wrongAura.stroke, auraGate.player, auraGate.P, auraGate.strokes],
    [false, { x: 0, y: 0 }, 'wht', 0],
    'CHROMA CONTRACT  a player-color gate rejects the wrong P without a stroke');
  auraGate.P = 'red';
  R.resolveTurn(auraGate, { type: 'move', dir: 'east' });
  eq(auraGate.player, { x: 1, y: 0 },
    'CHROMA CONTRACT  a matching player aura opens its gate');

  const worldGate = st(mkLevel([[0, 0, 0], [1, 34, 2]]));
  worldGate.P = 'red';
  const wrongWorld = go(worldGate, 'east');
  eq([wrongWorld.stroke, worldGate.player, worldGate.P, worldGate.W, worldGate.strokes],
    [false, { x: 0, y: 0 }, 'red', 'wht', 0],
    'CHROMA CONTRACT  a world-color gate checks W rather than matching P');
  worldGate.W = 'red';
  R.resolveTurn(worldGate, { type: 'move', dir: 'east' });
  eq(worldGate.player, { x: 1, y: 0 },
    'CHROMA CONTRACT  a matching world color opens its gate');

  const reset = st(mkLevel([[0, 0, 0, 2], [1, 20, 21, 0]]));
  reset.P = 'blu';
  go(reset, 'east');
  eq([reset.W, reset.P], ['red', 'blu'],
    'CHROMA CONTRACT  cycle dial changes W independently of P');
  act(reset);
  eq(reset.W, 'gre', 'CHROMA CONTRACT  ACT advances the world-color cycle');
  go(reset, 'east');
  eq([reset.W, reset.P], ['wht', 'blu'],
    'CHROMA CONTRACT  reset returns W to white and preserves P');

  const goal = st(mkLevel([[1, 0, 2]]));
  goal.P = 'red';
  go(goal, 'east');
  go(goal, 'east');
  eq(goal.won, false, 'CHROMA CONTRACT  a mismatched P/W pair cannot clear the goal');
  goal.W = 'red';
  act(goal);
  eq(goal.won, true, 'CHROMA CONTRACT  matching P/W clears the occupied goal');

  const unsupportedPalette = SM.LEVELS.validate({
    name: 'Unsupported palette', world_id: 'unsupported-palette', num_level: 1,
    levels: { level_1: { name: 'No fifth color', width: 3, height: 1,
      golf_score: 1, grid: [[1, 11, 2]], overrides: { 11: { colour: 'yellow' } } } }
  }, { solve: false });
  ok(unsupportedPalette.problems.some(problem => /yellow.*not a gameplay colour/i.test(problem.message)),
    'CHROMA CONTRACT  loader rejects a fifth gameplay color');
}

function checkReceiverVariants() {
  const R = SM.RULES;
  const receiverVariants = [
    { id: 50, colour: 'red', link: 1 },
    { id: 90, colour: 'gre', link: 1 },
    { id: 91, colour: 'blu', link: 1 },
    { id: 92, colour: 'wht', link: 1 },
    { id: 93, colour: 'red', link: 2 },
    { id: 94, colour: 'gre', link: 2 },
    { id: 95, colour: 'blu', link: 2 },
    { id: 96, colour: 'wht', link: 2 },
    { id: 97, colour: 'red', link: 3 },
    { id: 98, colour: 'gre', link: 3 },
    { id: 99, colour: 'blu', link: 3 },
    { id: 100, colour: 'wht', link: 3 }
  ];
  const crateFor = { wht: 70, red: 71, gre: 72, blu: 73 };
  const gateFor = { 1: 10, 2: 26, 3: 27 };

  for (const variant of receiverVariants) {
    const level = mkLevel([[1, variant.id, crateFor[variant.colour], 0,
      gateFor[variant.link], 2]]);
    const state = st(level);
    const receiver = state.switches.find(item => item.inst.id === variant.id);
    ok(!!receiver, 'RECEIVER MATRIX  ID ' + variant.id + ' constructs a receiver');
    eq([receiver.inst.params.colour, receiver.inst.params.link,
      R.sensorLit(state, receiver).any, R.sensorLit(state, receiver).lit.e,
      state.locked[0][4]],
    [variant.colour, variant.link, true, true, false],
    'RECEIVER MATRIX  ID ' + variant.id + ' detects its matching east crate and opens only its linked gate');

    const beforeMove = R.snapshot(state);
    go(state, 'east'); // Stand on the receiver.
    const moved = go(state, 'east'); // Push the crate away from adjacency.
    eq([moved.stroke, state.crates[0][3].id, R.sensorLit(state, receiver).any,
      state.locked[0][4]],
    [true, crateFor[variant.colour], false, true],
    'RECEIVER MATRIX  ID ' + variant.id + ' deactivates immediately when its crate is pushed away');
    const movedSignature = R.snapshotSig(state);
    R.restore(state, beforeMove);
    eq([state.crates[0][2].id, R.sensorLit(state, receiver).any,
      state.locked[0][4], state.strokes, R.snapshotSig(state) === movedSignature],
    [crateFor[variant.colour], true, false, 0, false],
    'RECEIVER MATRIX  ID ' + variant.id + ' restore re-derives the dock, linked gate, and solver identity');

    const wrongColour = Object.keys(crateFor).find(colour => colour !== variant.colour);
    const wrongState = st(mkLevel([[1, variant.id, crateFor[wrongColour], 0,
      gateFor[variant.link], 2]]));
    const wrongReceiver = wrongState.switches.find(item => item.inst.id === variant.id);
    eq([R.sensorLit(wrongState, wrongReceiver).any, wrongState.locked[0][4]], [false, true],
      'RECEIVER MATRIX  ID ' + variant.id + ' ignores a wrong-color adjacent crate');
  }

  const diagonal = st(mkLevel([
    [0, 0, 71],
    [0, 50, 0],
    [1, 0, 2]
  ]));
  const diagonalReceiver = diagonal.switches.find(item => item.inst.id === 50);
  eq(R.sensorLit(diagonal, diagonalReceiver),
    { lit: { n: false, e: false, s: false, w: false }, any: false },
  'RECEIVER GEOMETRY  a diagonally adjacent matching crate is not contact');

  const fourDirections = st(mkLevel([
    [0, 71, 0],
    [71, 50, 71],
    [1, 71, 2]
  ]));
  const fourWayReceiver = fourDirections.switches.find(item => item.inst.id === 50);
  eq(R.sensorLit(fourDirections, fourWayReceiver),
    { lit: { n: true, e: true, s: true, w: true }, any: true },
  'RECEIVER GEOMETRY  all four matching cardinal contacts report lit simultaneously');
}

function checkReceiverLinksAndSolver() {
  const R = SM.RULES;
  const redOnly = st(mkLevel([[1, 71, 50, 10, 0, 94, 26, 2]]));
  eq([redOnly.locked[0][3], redOnly.locked[0][6]], [false, true],
    'RECEIVER LINKS  red/link 1 opens its phase wall without affecting green/link 2');
  const greenOnly = st(mkLevel([[1, 0, 50, 10, 72, 94, 26, 2]]));
  eq([greenOnly.locked[0][3], greenOnly.locked[0][6]], [true, false],
    'RECEIVER LINKS  green/link 2 opens its phase wall without affecting red/link 1');

  const sameLinkOr = st(mkLevel([[1, 50, 0, 71, 50, 10, 2]]));
  const sameLinkReceivers = sameLinkOr.switches.filter(item => item.inst.id === 50);
  eq(sameLinkReceivers.map(receiver => R.switchActive(sameLinkOr, receiver)), [false, true],
    'RECEIVER LINKS  same-link receivers retain independent derived activity');
  eq(sameLinkOr.locked[0][5], false,
    'RECEIVER LINKS  one active receiver is sufficient to open a shared link (OR semantics)');

  const solverLevel = mkLevel([
    [0, 50, 71, 0],
    [1, 0, 10, 2]
  ]);
  const solved = SM.LEVELS.solve(solverLevel);
  eq([solved.status, solved.optimal], ['solvable', 3],
    'RECEIVER SOLVER  BFS finds the minimum route through a receiver-controlled gate');
  const replay = st(solverLevel);
  for (const action of solved.path) R.resolveTurn(replay, action);
  eq([replay.won, replay.strokes, replay.locked[0][2]], [true, 3, false],
    'RECEIVER SOLVER  the returned resolver path activates the sensor and wins at par');

  const withoutReceiver = mkLevel([
    [0, 0, 71, 0],
    [1, 0, 10, 2]
  ]);
  eq(SM.LEVELS.solve(withoutReceiver).status, 'unsolvable',
    'RECEIVER SOLVER  removing the receiver proves its gate is necessary');
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
    ok(!SM.RULES.isSolid(state, state.start.x, state.start.y) &&
       !SM.RULES.crateAt(state, state.start.x, state.start.y),
      'WORLD 2  level_' + (i + 1) + ' authored start is safe initially');
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

function checkWorld3Content() {
  const file = path.join(ROOT, 'data/worlds/world-03-hyrule-flip-flop.levels.yaml');
  ok(fs.existsSync(file), 'WORLD 3  independent Hyrule Flip-Flop pack exists');
  if (!fs.existsSync(file)) return;

  const text = fs.readFileSync(file, 'utf8');
  const doc = SM.parseYAML(text);
  const loaded = SM.LEVELS.load(text, { solve: true });
  eq(loaded.problems.length, 0, 'WORLD 3  pack uses the shared parser, validator, and solver',
    loaded.problems.map(problem => problem.message).join(' | '));
  eq([doc.world_id, doc.num_level, loaded.levels.length],
    ['world-03-hyrule-flip-flop', 8, 8], 'WORLD 3  pack has stable identity and eight levels');

  const expected = [
    { name: 'Red First, Blue Next', width: 5, height: 5, par: 5, acts: 1 },
    { name: 'Two-Switch Zigzag', width: 6, height: 6, par: 8, acts: 2 },
    { name: 'Ordered Twin Chambers', width: 8, height: 8, par: 8, acts: 2 },
    { name: 'Switch Loop', width: 10, height: 8, par: 12, acts: 2 },
    { name: 'Palace of Darkness', width: 12, height: 8, par: 15, acts: 2 },
    { name: 'Sixteen-Column Exchange', width: 16, height: 2, par: 20, acts: 5 },
    { name: 'Barrier Blocker', width: 16, height: 9, par: 11, acts: 2 },
    { name: 'Grand Inversion', width: 16, height: 9, par: 97, acts: 14 }
  ];
  const R = SM.RULES;
  for (let i = 0; i < expected.length; i++) {
    const level = loaded.levels[i];
    const want = expected[i];
    eq([level.key, level.name, level.width, level.height, level.par, level.initialPolarity],
      ['level_' + (i + 1), want.name, want.width, want.height, want.par, 'red-open'],
      'WORLD 3  level_' + (i + 1) + ' has the declared identity, dimensions, par, and start polarity');
    ok(doc.levels[level.key].grid.length === want.height &&
        doc.levels[level.key].grid.every(row => row.length === want.width),
      'WORLD 3  level_' + (i + 1) + ' is rectangular within the 16×9 board limit');
    ok(doc.levels[level.key].grid.flat().every(id => !!SM.getTile(id)),
      'WORLD 3  level_' + (i + 1) + ' uses registered tile IDs only');
    eq(level.solve.status, 'solvable',
      'WORLD 3  level_' + (i + 1) + ' has a solver-proven route');
    eq([level.solve.optimal, level.par, level.solve.routeBalance.complete],
      [want.par, want.par, true],
      'WORLD 3  level_' + (i + 1) + ' par is the complete solver-selected minimum');
    eq(level.solve.path.filter(action => action.type === 'act').length, want.acts,
      'WORLD 3  level_' + (i + 1) + ' shortest route exercises every intended polarity change');
    const state = R.newState(level);
    ok(!R.isSolid(state, state.start.x, state.start.y),
      'WORLD 3  level_' + (i + 1) + ' starts on a safe, traversable cell');
    for (const action of level.solve.path) R.resolveTurn(state, action);
    const finalPolarity = want.acts % 2 ? 'blue-open' : 'red-open';
    eq([state.won, state.strokes, state.polarity], [true, want.par, finalPolarity],
      'WORLD 3  replay of level_' + (i + 1) + ' wins at par with the expected polarity');
  }
  eq([SM.TILES[46].params.openWhen, SM.TILES[47].params.openWhen],
    ['red-open', 'blue-open'], 'WORLD 3  barrier classes retain complementary state declarations');
  eq(doc.levels.level_7.grid.flat().filter(id => id === 70).length, 1,
    'WORLD 3  level 7 uses its single movable blocker exactly once');
}

function checkWorld4Content() {
  const file = path.join(ROOT, 'data/worlds/world-04-pengo-vector.levels.yaml');
  ok(fs.existsSync(file), 'WORLD 4  independent Pengo Vector pack exists');
  if (!fs.existsSync(file)) return;

  const text = fs.readFileSync(file, 'utf8');
  const doc = SM.parseYAML(text);
  const loaded = SM.LEVELS.load(text, { solve: true });
  eq(loaded.problems.length, 0, 'WORLD 4  pack loads through the shared parser, validator, and solver',
    loaded.problems.map(problem => problem.message).join(' | '));
  eq([doc.world_id, doc.num_level, loaded.levels.length],
    ['world-04-pengo-vector', 8, 8], 'WORLD 4  pack has stable identity and eight levels');

  const expected = [
    { name: 'First Current', width: 5, height: 5, par: 2 },
    { name: 'Double Circuit', width: 7, height: 5, par: 8 },
    { name: 'Ice Launch', width: 9, height: 6, par: 7 },
    { name: 'Wall Channel', width: 10, height: 8, par: 7 },
    { name: 'Compression Chamber', width: 12, height: 8, par: 13 },
    { name: 'Long Alley', width: 16, height: 6, par: 2 },
    { name: 'Circuit Exit', width: 16, height: 9, par: 17 },
    { name: 'Absolute Momentum', width: 16, height: 9, par: 4 }
  ];

  for (let i = 0; i < expected.length; i++) {
    const level = loaded.levels[i];
    const want = expected[i];
    eq([level.key, level.name, level.width, level.height, level.worldId, level.par],
      ['level_' + (i + 1), want.name, want.width, want.height, 'world-04-pengo-vector', want.par],
      'WORLD 4  level_' + (i + 1) + ' has its authored name, bounds, identity, and par');
    eq(level.raw.grid.length, want.height,
      'WORLD 4  ' + level.key + ' has the declared number of top-first grid rows');
    ok(level.raw.grid.every(row => row.length === want.width),
      'WORLD 4  ' + level.key + ' has a rectangular grid within 16×9');
    ok(level.raw.grid.flat().every(id => Number.isInteger(id) && SM.TILES[id] &&
        SM.TILES[id].implemented !== false),
      'WORLD 4  ' + level.key + ' uses only implemented registered tile IDs');
    eq([level.solve.status, level.solve.optimal], ['solvable', want.par],
      'WORLD 4  ' + level.key + ' has a solver-proven minimum par');

    const state = SM.RULES.newState(level);
    const turns = [];
    for (const action of level.solve.path) turns.push(SM.RULES.resolveTurn(state, action));
    eq([state.won, state.strokes], [true, want.par],
      'WORLD 4  replay of ' + level.key + ' wins at the recorded par');
    const steps = turns.flatMap(turn => turn.steps);
    ok(!steps.some(step => step.type === 'destroy' || step.type === 'crush'),
      'WORLD 4  ' + level.key + ' resolves without crushing or deleting an entity');
    ok(!steps.some(step => step.type === 'belt-cap' || step.type === 'object-force-cap'),
      'WORLD 4  ' + level.key + ' shortest route ends naturally without depending on a safety cap');
  }

  const levels = loaded.levels;
  const first = SM.RULES.newState(levels[0]);
  const firstTurn = SM.RULES.resolveTurn(first, { type: 'move', dir: 'east' });
  eq([first.player, firstTurn.steps.filter(step => step.type === 'move').length],
    [{ x: 4, y: 2 }, 4], 'WORLD 4  tutorial rides one east vector to the safe floor stop');

  const doubleCircuit = SM.RULES.newState(levels[1]);
  const loopEvents = [];
  for (const action of levels[1].solve.path) {
    const turn = SM.RULES.resolveTurn(doubleCircuit, action);
    loopEvents.push(...turn.steps.filter(step => step.type === 'force-loop'));
  }
  ok(loopEvents.some(step => step.x === 1 || step.x === 2) &&
      loopEvents.some(step => step.x === 4 || step.x === 5),
    'WORLD 4  level_2 shortest route exercises both bounded cardinal loops');

  const launch = SM.RULES.newState(levels[2]);
  eq(levels[2].tiles[1][5].id, 60,
    'WORLD 4  crate ice route uses the crate-force belt rather than a player-only belt');
  SM.RULES.resolveTurn(launch, { type: 'move', dir: 'east' });
  const launchPush = SM.RULES.resolveTurn(launch, { type: 'move', dir: 'east' });
  eq([launch.player, launch.crates[1][6] && launch.crates[1][6].id],
    [{ x: 2, y: 1 }, 71], 'WORLD 4  pushed ice block reaches its safe belt endpoint as the player follows');
  ok(launchPush.steps.filter(step => step.type === 'push').length >= 3,
    'WORLD 4  crate slide records each forced ice/belt hop');
  const playerFollowIndex = launchPush.steps.findIndex(step =>
    step.type === 'move' && step.to.x === 2 && step.to.y === 1);
  const firstIcePushIndex = launchPush.steps.findIndex(step =>
    step.type === 'push' && step.crate.x === 3 && step.to.x === 4);
  ok(playerFollowIndex >= 0 && firstIcePushIndex > playerFollowIndex,
    'WORLD 4  player follow event precedes the pushed crate ice events');
  const crateBeltTurn = SM.RULES.resolveTurn(launch, { type: 'move', dir: 'east' });
  eq([launch.player, launch.crates[1][7] && launch.crates[1][7].id],
    [{ x: 6, y: 1 }, 71], 'WORLD 4  crate belt advances its block while the player follows the vacated cell');
  ok(crateBeltTurn.steps.some(step => step.type === 'push' && step.crate.x === 6 && step.to.x === 7),
    'WORLD 4  explicit crate-force effect is represented by an undoable push event');

  const recoverablePush = SM.RULES.newState(levels[2]);
  for (const action of [
    { type: 'move', dir: 'east' }, { type: 'move', dir: 'east' },
    { type: 'move', dir: 'east' }, { type: 'move', dir: 'east' },
    { type: 'move', dir: 'north' }, { type: 'move', dir: 'north' },
    { type: 'move', dir: 'north' }, { type: 'move', dir: 'east' }
  ]) SM.RULES.resolveTurn(recoverablePush, action);
  eq(recoverablePush.won, true,
    'WORLD 4  level_3 remains recoverable after the optional extra eastward crate push');

  const forceUndo = SM.RULES.newState(levels[2]);
  SM.RULES.resolveTurn(forceUndo, { type: 'move', dir: 'east' });
  const beforeForce = canonicalSnapshot(forceUndo);
  const beforeForceSignature = SM.RULES.snapshotSig(forceUndo);
  SM.RULES.resolveTurn(forceUndo, { type: 'move', dir: 'east' });
  SM.RULES.restore(forceUndo, beforeForce);
  eq(canonicalSnapshot(forceUndo), beforeForce,
    'WORLD 4  undo restores player, crate, and strokes after the forced crate chain');
  eq(SM.RULES.snapshotSig(forceUndo), beforeForceSignature,
    'WORLD 4  restored forced-movement state has its original solver signature');

  const wallStop = SM.RULES.newState(levels[3]);
  SM.RULES.resolveTurn(wallStop, { type: 'move', dir: 'east' });
  eq(wallStop.player, { x: 3, y: 4 }, 'WORLD 4  wall channel stops the redirected ice route safely');
  eq(SM.RULES.isSolid(wallStop, 3, 5), true,
    'WORLD 4  the level-4 stopping wall remains solid rather than redirecting or crushing');

  const compression = SM.RULES.newState(levels[4]);
  SM.RULES.resolveTurn(compression, { type: 'move', dir: 'east' });
  SM.RULES.resolveTurn(compression, { type: 'move', dir: 'east' });
  eq([compression.crates[2][6] && compression.crates[2][6].id,
    SM.RULES.isSolid(compression, 7, 2)], [71, true],
  'WORLD 4  compression chamber safely parks the sliding block against its wall');

  const alley = SM.RULES.newState(levels[5]);
  const alleyTurn = SM.RULES.resolveTurn(alley, { type: 'move', dir: 'east' });
  eq([alley.player, alleyTurn.steps.filter(step => step.type === 'move').length,
    alley.strokes], [{ x: 15, y: 2 }, 15, 1],
  'WORLD 4  full-width alley crosses one deterministic 16-column channel for one stroke');

  const circuit = SM.RULES.newState(levels[6]);
  const circuitFirst = SM.RULES.resolveTurn(circuit, { type: 'move', dir: 'east' });
  const circuitPush = SM.RULES.resolveTurn(circuit, { type: 'move', dir: 'south' });
  SM.RULES.resolveTurn(circuit, { type: 'move', dir: 'south' });
  eq(circuitFirst.steps.some(step => step.type === 'force-loop'), true,
    'WORLD 4  circuit-exit route has a finite four-way loop');
  eq([circuit.player, circuit.crates[0][1] && circuit.crates[0][1].id],
    [{ x: 1, y: 1 }, 71], 'WORLD 4  two deliberate pushes move the block out of the loop exit lane');
  ok(circuitPush.steps.some(step => step.type === 'push'),
    'WORLD 4  loop-exit staging is a normal, undoable crate push');

  const mastery = SM.RULES.newState(levels[7]);
  const networkTurn = SM.RULES.resolveTurn(mastery, { type: 'move', dir: 'east' });
  eq([mastery.player, mastery.crates[4][5] && mastery.crates[4][5].id],
    [{ x: 6, y: 4 }, 70], 'WORLD 4  mastery network stops immediately before its crate bumper');
  ok(networkTurn.steps.filter(step => step.type === 'move').length >= 9,
    'WORLD 4  mastery first input traverses the joined east/north/west vector network');
}

function checkWorld5Content() {
  const file = path.join(ROOT, 'data/worlds/world-05-chips-chromatic.levels.yaml');
  ok(fs.existsSync(file), 'WORLD 5  independent Chip chromatic pack exists');
  if (!fs.existsSync(file)) return;

  const source = fs.readFileSync(file, 'utf8');
  const doc = SM.parseYAML(source);
  const loaded = SM.LEVELS.load(source, { solve: true });
  eq(loaded.problems.length, 0,
    'WORLD 5  pack parses and validates through the shared loader and solver',
    loaded.problems.map(problem => problem.message).join(' | '));
  eq([doc.world_id, doc.num_level, Object.keys(doc.levels).length, loaded.levels.length],
    ['world-05-chips-chromatic', 8, 8, 8],
    'WORLD 5  pack has stable identity and eight declared levels');
  eq(Object.keys(doc.levels), Array.from({ length: 8 }, (_, i) => 'level_' + (i + 1)),
    'WORLD 5  level keys are contiguous and ordered');
  eq(new Set(Object.values(doc.levels).map(level => level.name)).size, 8,
    'WORLD 5  each level has a unique display name');
  ok(/white is still white/i.test(doc.levels.level_1.goal) &&
     /yellow-key role/i.test(doc.levels.level_1.goal),
    'WORLD 5  the yellow analogy explicitly retains the white gameplay identity');
  eq(SM.PALETTE.wht, '#EDEAE3',
    'WORLD 5  white retains its existing neutral-white presentation');

  const palette = ['wht', 'red', 'gre', 'blu'];
  for (const colour of palette) {
    const valid = SM.LEVELS.validate({
      name: 'Palette acceptance', world_id: 'palette-acceptance', num_level: 1,
      levels: { level_1: { name: 'Existing color', width: 3, height: 1, golf_score: 1,
        grid: [[1, 30, 2]], overrides: { 30: { colour } } } }
    }, { solve: false });
    ok(valid.ok, 'WORLD 5  shared validation accepts gameplay color ' + colour,
      valid.problems.map(problem => problem.message).join(' | '));
  }
  for (const colour of ['yellow', 'red+blu', 'mixed']) {
    const invalid = SM.LEVELS.validate({
      name: 'Unsupported color', world_id: 'unsupported-color', num_level: 1,
      levels: { level_1: { name: 'Unsupported state', width: 3, height: 1, golf_score: 1,
        grid: [[1, 30, 2]], overrides: { 30: { colour } } } }
    }, { solve: false });
    ok(invalid.problems.some(problem => new RegExp(colour.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '.*not a gameplay colour', 'i').test(problem.message)),
      'WORLD 5  shared validation rejects unsupported color value ' + colour);
  }

  const expected = [
    { name: 'The White Mark', width: 5, height: 5, par: 8, final: 'red',
      prisms: [11], actuators: [20], gates: [31], essential: [11, 20] },
    { name: 'Two Prisms', width: 7, height: 5, par: 10, final: 'blu',
      prisms: [11, 13], actuators: [20], gates: [31, 33], essential: [11, 13, 20] },
    { name: 'The Other Carrier', width: 9, height: 6, par: 9, final: 'blu',
      prisms: [11, 13], actuators: [20], gates: [36], essential: [13, 20] },
    { name: 'Guarded Spectrum', width: 10, height: 8, par: 7, final: 'gre',
      prisms: [12], actuators: [22], gates: [32], essential: [12, 22, 41] },
    { name: 'Three-Way Filter', width: 12, height: 8, par: 13, final: 'blu',
      prisms: [11, 12, 13], actuators: [20], gates: [31, 32, 33], essential: [11, 12, 13, 20] },
    { name: 'Chromatic Corridor', width: 16, height: 2, par: 15, final: 'blu',
      prisms: [11, 12, 13], actuators: [20], gates: [31, 32, 33, 34, 35, 36],
      essential: [11, 12, 13, 20] },
    { name: 'Commit to Green', width: 16, height: 9, par: 27, final: 'blu',
      prisms: [12, 13], actuators: [20], gates: [32, 33], essential: [12, 13, 20] },
    { name: 'Spectrum Nexus', width: 16, height: 9, par: 15, final: 'blu',
      prisms: [11, 12, 13], actuators: [20], gates: [30, 31, 32, 33, 34, 35, 36],
      essential: [11, 12, 13, 20] }
  ];
  const wrongGate = { 30: 31, 31: 32, 32: 33, 33: 31, 34: 35, 35: 36, 36: 34 };

  for (let i = 0; i < expected.length; i++) {
    const want = expected[i];
    const raw = doc.levels['level_' + (i + 1)];
    const level = loaded.levels[i];
    eq([level.key, level.name, level.width, level.height, level.worldId, level.par],
      ['level_' + (i + 1), want.name, want.width, want.height,
        'world-05-chips-chromatic', want.par],
      'WORLD 5  level_' + (i + 1) + ' has its authored name, dimensions, identity, and par');
    eq(raw.grid.length, want.height,
      'WORLD 5  ' + level.key + ' has the declared number of top-first rows');
    ok(raw.grid.every(row => row.length === want.width),
      'WORLD 5  ' + level.key + ' is rectangular and within the 16×9 board limit');
    ok(raw.grid.flat().every(id => Number.isInteger(id) && SM.TILES[id] &&
        SM.TILES[id].implemented !== false),
      'WORLD 5  ' + level.key + ' uses only registered, implemented tile IDs');
    eq([level.solve.status, level.solve.optimal], ['solvable', want.par],
      'WORLD 5  ' + level.key + ' has a solver-proven minimum par');

    const state = SM.RULES.newState(level);
    ok(!SM.RULES.isSolid(state, state.start.x, state.start.y),
      'WORLD 5  ' + level.key + ' starts on a safe cell');
    const visited = new Set([state.grid[state.player.y][state.player.x].id]);
    const crossedGates = new Set();
    for (const action of level.solve.path) {
      const carriersBefore = { P: state.P, W: state.W };
      const turn = SM.RULES.resolveTurn(state, action);
      for (const step of turn.steps) {
        if (step.type !== 'move' || !step.to) continue;
        const tile = state.grid[step.to.y][step.to.x];
        visited.add(tile.id);
        if (tile.family === 'gate') {
          crossedGates.add(tile.id);
          eq(carriersBefore[tile.params.carrier], tile.params.colour,
            'WORLD 5  ' + level.key + ' crosses gate ' + tile.id + ' using carrier ' + tile.params.carrier);
        }
      }
    }
    eq([state.won, state.strokes, state.P, state.W],
      [true, want.par, want.final, want.final],
      'WORLD 5  replay of ' + level.key + ' wins at par with matching final carriers');
    eq(Array.from(want.prisms).every(id => visited.has(id)), true,
      'WORLD 5  shortest route of ' + level.key + ' exercises each intended prism');
    eq(Array.from(want.actuators).every(id => visited.has(id)), true,
      'WORLD 5  shortest route of ' + level.key + ' exercises its world-color actuator');
    eq(Array.from(want.gates).every(id => crossedGates.has(id)), true,
      'WORLD 5  shortest route of ' + level.key + ' crosses each intended color gate');

    for (const id of want.essential) {
      const withoutMechanic = JSON.parse(JSON.stringify(raw));
      for (const row of withoutMechanic.grid) {
        for (let x = 0; x < row.length; x++) if (row[x] === id) row[x] = 0;
      }
      const result = SM.LEVELS.solve(SM.RULES.buildLevel(withoutMechanic, level.key + '-without-' + id));
      eq(result.status, 'unsolvable',
        'WORLD 5  ' + level.key + ' needs tile ' + id + ' for its color route and matching goal');
    }

    for (const id of want.gates) {
      const wrongColor = JSON.parse(JSON.stringify(raw));
      for (const row of wrongColor.grid) {
        for (let x = 0; x < row.length; x++) if (row[x] === id) row[x] = wrongGate[id];
      }
      const result = SM.LEVELS.solve(SM.RULES.buildLevel(wrongColor, level.key + '-wrong-gate-' + id));
      ok(result.status === 'unsolvable' ||
         (result.status === 'solvable' && result.optimal > want.par),
        'WORLD 5  ' + level.key + ' requires the authored color at gate ' + id,
        'wrong-color variant status=' + result.status + ', optimum=' + result.optimal + ', par=' + want.par);
    }
  }

  const level6 = loaded.levels[5];
  eq([level6.width, level6.height], [16, 2],
    'WORLD 5  corridor remix resolves the blueprint mismatch as 16 columns by 2 rows');
}

function checkWorld6Content() {
  const file = path.join(ROOT, 'data/worlds/world-06-goof-proximity.levels.yaml');
  ok(fs.existsSync(file), 'WORLD 6  independent Goof Proximity pack exists');
  if (!fs.existsSync(file)) return;

  const source = fs.readFileSync(file, 'utf8');
  const doc = SM.parseYAML(source);
  const loaded = SM.LEVELS.load(source, { solve: true });
  eq(loaded.problems.length, 0,
    'WORLD 6  complete pack validates atomically through the shared loader and solver',
    loaded.problems.map(problem => problem.message).join(' | '));
  eq([doc.world_id, doc.num_level, Object.keys(doc.levels).length, loaded.levels.length],
    ['world-06-goof-proximity', 8, 8, 8],
  'WORLD 6  pack has stable identity and exactly eight loaded levels');
  eq(Object.keys(doc.levels), Array.from({ length: 8 }, (_, index) => 'level_' + (index + 1)),
    'WORLD 6  level keys are contiguous and ordered');
  eq(new Set(Object.values(doc.levels).map(level => level.name)).size, 8,
    'WORLD 6  all eight display names are unique');

  const expected = [
    { name: 'First Dock', width: 5, height: 5, par: 6, sensors: [50], gates: [10], route: 'N E S E E E' },
    { name: 'Two Colors, Two Links', width: 7, height: 5, par: 6,
      sensors: [50, 94], gates: [10, 26], route: 'E E E E E E' },
    { name: 'Around the Corner', width: 9, height: 6, par: 12,
      sensors: [50], gates: [10], route: 'N W N E E E S E S E E E' },
    { name: 'Belt and Barrier', width: 10, height: 8, par: 8,
      sensors: [50], gates: [10], route: 'E E E E E E E E' },
    { name: 'Castle Basement Rooms', width: 12, height: 8, par: 11,
      sensors: [50, 94], gates: [10, 26], route: 'E E E E E E E E E E E' },
    { name: 'Railway Dock', width: 16, height: 6, par: 19,
      sensors: [50], gates: [10], route: 'N N E E E E E E E E E E S S E E E E E' },
    { name: 'Re-dock the Red Crate', width: 16, height: 9, par: 21,
      sensors: [50, 93], gates: [10, 26], route: 'E E N E N W E S S E E E E E E E E E E E E' },
    { name: 'Grand Dockworks', width: 16, height: 9, par: 21,
      sensors: [50, 93, 99], gates: [10, 26, 27],
      route: 'E E N E N W E S S E E E E E E E E E E E E' }
  ];
  const directionName = { north: 'N', south: 'S', west: 'W', east: 'E' };
  const gateLinks = { 10: 1, 26: 2, 27: 3 };
  const R = SM.RULES;

  for (let index = 0; index < expected.length; index++) {
    const want = expected[index];
    const key = 'level_' + (index + 1);
    const raw = doc.levels[key];
    const level = loaded.levels[index];
    eq([level.key, level.name, level.worldId, level.width, level.height, level.par],
      [key, want.name, 'world-06-goof-proximity', want.width, want.height, want.par],
    'WORLD 6  ' + key + ' has the authored name, identity, dimensions, and par');
    ok(raw.grid.every(row => row.length === want.width) &&
      raw.grid.flat().every(id => Number.isInteger(id) && SM.TILES[id] &&
        SM.TILES[id].implemented !== false),
    'WORLD 6  ' + key + ' is rectangular and uses only implemented tile IDs');
    eq(level.solve.status, 'solvable',
      'WORLD 6  ' + key + ' is solver-proven solvable');
    eq([level.solve.optimal, level.par, level.solve.routeBalance.complete],
      [want.par, want.par, true],
    'WORLD 6  ' + key + ' declares the fully compared minimum-stroke PAR');
    eq(level.solve.path.map(action => directionName[action.dir]), want.route.split(' '),
      'WORLD 6  ' + key + ' retains its documented minimum route');

    const sensorIds = Array.from(new Set(raw.grid.flat().filter(id =>
      SM.TILES[id].strategies.activation === 'crateAdjacencySensor'))).sort((a, b) => a - b);
    const gateIds = Array.from(new Set(raw.grid.flat().filter(id => gateLinks[id]))).sort((a, b) => a - b);
    eq(sensorIds, want.sensors.slice().sort((a, b) => a - b),
      'WORLD 6  ' + key + ' uses the planned receiver variants');
    eq(gateIds, want.gates.slice().sort((a, b) => a - b),
      'WORLD 6  ' + key + ' uses its planned link-specific phase walls');
    ok(!raw.grid.flat().some(id => id >= 23 && id <= 25),
      'WORLD 6  ' + key + ' does not substitute occupancy targets for receiver contact');

    const sensorLinks = new Set(sensorIds.map(id => SM.TILES[id].params.link));
    for (const id of sensorIds) {
      const receiver = SM.TILES[id];
      eq(receiver.params.mode, 'sensor',
        'WORLD 6  receiver ' + id + ' derives adjacency instead of occupancy');
      ok(receiver.params.colour === 'wht' || receiver.params.colour === 'red' ||
        receiver.params.colour === 'gre' || receiver.params.colour === 'blu',
      'WORLD 6  receiver ' + id + ' uses a supported crate color');
    }
    for (const id of gateIds) {
      ok(sensorLinks.has(gateLinks[id]),
        'WORLD 6  ' + key + ' wires phase wall ' + id + ' to an authored receiver link');
    }

    const state = R.newState(level);
    ok(!R.isSolid(state, state.start.x, state.start.y),
      'WORLD 6  ' + key + ' has a safe, traversable authored start');
    const crossedGates = new Set();
    const activeReceivers = new Set();
    const cardinal = [
      { dx: 0, dy: 1 }, { dx: 1, dy: 0 },
      { dx: 0, dy: -1 }, { dx: -1, dy: 0 }
    ];
    function inspectReceivers() {
      for (const receiver of state.switches.filter(item =>
        item.inst.strategies.activation === 'crateAdjacencySensor')) {
        const lit = R.sensorLit(state, receiver);
        const active = R.switchActive(state, receiver);
        eq(active, lit.any,
          'WORLD 6  ' + key + ' derives receiver activity from settled crate positions');
        if (!active) continue;
        const matchingCrate = cardinal.some(direction => {
          const crate = R.crateAt(state, receiver.x + direction.dx, receiver.y + direction.dy);
          return !!crate && crate.params.colour === receiver.inst.params.colour;
        });
        eq(matchingCrate, true,
          'WORLD 6  ' + key + ' activates only from an adjacent crate of the receiver color');
        activeReceivers.add(receiver.x + ',' + receiver.y);
      }
    }
    inspectReceivers();
    for (const action of level.solve.path) {
      const turn = R.resolveTurn(state, action);
      for (const step of turn.steps) {
        if (step.type !== 'move' || !step.to) continue;
        const tile = state.grid[step.to.y][step.to.x];
        if (gateLinks[tile.id]) crossedGates.add(tile.id);
      }
      inspectReceivers();
    }
    eq([state.won, state.strokes], [true, want.par],
      'WORLD 6  replay of ' + key + ' wins at its recorded minimum par');
    eq(Array.from(crossedGates).sort((a, b) => a - b),
      want.gates.slice().sort((a, b) => a - b),
    'WORLD 6  shortest route of ' + key + ' crosses every intended linked gate');

    for (let row = 0; row < raw.grid.length; row++) {
      for (let x = 0; x < raw.grid[row].length; x++) {
        if (!sensorIds.includes(raw.grid[row][x])) continue;
        const y = raw.grid.length - 1 - row;
        ok(activeReceivers.has(x + ',' + y),
          'WORLD 6  ' + key + ' shortest route exercises receiver ' + raw.grid[row][x] + ' at ' + x + ',' + y);
      }
    }

    for (const id of sensorIds) {
      const withoutReceiver = JSON.parse(JSON.stringify(raw));
      for (const row of withoutReceiver.grid) {
        for (let x = 0; x < row.length; x++) if (row[x] === id) row[x] = 0;
      }
      const result = SM.LEVELS.solve(R.buildLevel(withoutReceiver, key + '-without-receiver-' + id));
      eq(result.status, 'unsolvable',
        'WORLD 6  ' + key + ' requires receiver ' + id + ' and its linked gate');
    }
  }

  const railway = loaded.levels[5];
  eq([railway.width, railway.height], [16, 6],
    'WORLD 6  Railway Dock is the full 16-column track within the 16×6 blueprint role');
  const belt = loaded.levels[3];
  const beltState = R.newState(belt);
  const beltTurn = R.resolveTurn(beltState, belt.solve.path[0]);
  ok(beltTurn.steps.filter(step => step.type === 'move').length > 1,
    'WORLD 6  Belt and Barrier shortest route exercises automatic conveyor movement');

  const corner = R.newState(loaded.levels[2]);
  const cornerReceiver = corner.switches.find(item => item.inst.id === 50);
  for (const action of loaded.levels[2].solve.path.slice(0, 5)) R.resolveTurn(corner, action);
  eq([R.crateAt(corner, cornerReceiver.x, cornerReceiver.y).id,
    R.sensorLit(corner, cornerReceiver).any], [71, false],
  'WORLD 6  corner level proves a crate occupying the receiver does not count as adjacency');
  R.resolveTurn(corner, loaded.levels[2].solve.path[5]);
  eq([R.sensorLit(corner, cornerReceiver).any, corner.locked[0][6]], [true, false],
  'WORLD 6  pushing that crate off the receiver re-docks it and opens the required gate');

  const redocking = loaded.levels[6];
  const redockingState = R.newState(redocking);
  const sensorById = id => redockingState.switches.find(item => item.inst.id === id);
  const firstGateOpen = !R.isLocked(redockingState, 2, 0);
  for (const action of redocking.solve.path.slice(0, 6)) R.resolveTurn(redockingState, action);
  eq([firstGateOpen, R.switchActive(redockingState, sensorById(50)),
    R.switchActive(redockingState, sensorById(93)),
    R.isLocked(redockingState, 2, 0), R.isLocked(redockingState, 5, 0)],
  [true, false, true, true, false],
  'WORLD 6  level 7 re-docks one red crate from link 1 onto link 2 after crossing gate 1');

  const mastery = R.newState(loaded.levels[7]);
  eq([50, 93, 99].map(id => R.switchActive(mastery,
    mastery.switches.find(item => item.inst.id === id))), [true, false, true],
  'WORLD 6  mastery starts with link 1 and the blue link 3 dock active');
  for (const action of loaded.levels[7].solve.path.slice(0, 6)) R.resolveTurn(mastery, action);
  eq([R.switchActive(mastery, mastery.switches.find(item => item.inst.id === 50)),
    R.switchActive(mastery, mastery.switches.find(item => item.inst.id === 93)),
    R.switchActive(mastery, mastery.switches.find(item => item.inst.id === 99)),
    R.isLocked(mastery, 2, 0), R.isLocked(mastery, 5, 0), R.isLocked(mastery, 12, 0)],
  [false, true, true, true, false, false],
  'WORLD 6  mastery re-docks red from link 1 to link 2 while preserving the independent blue link 3 dock');
}

function checkVectorSolver() {
  const R = SM.RULES;
  const iceLevel = mkLevel([[1, 64, 5, 5, 0, 2]], null, 2);
  const iceSearch = SM.LEVELS.solve(iceLevel, { maxStates: 1000, maxDepth: 10 });
  eq([iceSearch.status, iceSearch.optimal], ['solvable', 2],
    'VECTOR BFS  solver uses the real belt-to-ice resolver and proves the two-stroke optimum');
  const replay = st(iceLevel);
  for (const action of iceSearch.path || []) R.resolveTurn(replay, action);
  eq([replay.won, replay.strokes], [true, 2],
    'VECTOR BFS  replaying the solver path wins at the recorded forced-movement par');

  const loopLevel = mkLevel([
    [0, 0, 0, 0, 2],
    [0, 67, 65, 0, 0],
    [0, 64, 66, 0, 0],
    [1, 0, 0, 0, 0]
  ], null, 7);
  const loopSearch = SM.LEVELS.solve(loopLevel, { maxStates: 1000, maxDepth: 20 });
  eq([loopSearch.status, loopSearch.optimal], ['solvable', 7],
    'VECTOR BFS  solver remains finite and finds the safe route around a conveyor loop');
  ok(loopSearch.explored <= 1000,
    'VECTOR BFS  loop fixture stays within the configured search budget');

  const loopState = st(loopLevel);
  loopState.player = { x: 0, y: 1 };
  const loopTurn = R.resolveTurn(loopState, { type: 'move', dir: 'east' });
  ok(loopTurn.steps.some(step => step.type === 'force-loop'),
    'VECTOR BFS  bounded-loop fixture returns a deterministic loop event');
  ok(loopTurn.steps.filter(step => step.type === 'move').length <=
      loopState.width * loopState.height * 4 + 1,
    'VECTOR BFS  loop fixture respects the board-derived forced-hop bound');
}

function checkTileMechanicsGuide() {
  const guidePath = path.join(ROOT, 'docs/level-design/tile-mechanics.md');
  ok(fs.existsSync(guidePath), 'DOC  level-designer tile mechanics guide exists');
  if (!fs.existsSync(guidePath)) return;
  const guide = fs.readFileSync(guidePath, 'utf8');
  const documented = Array.from(guide.matchAll(/^\|\s*(\d+)\s*\|\s*`([^`]+)`/gm))
    .map(match => [Number(match[1]), match[2]]);
  const registered = Object.keys(SM.TILES).map(Number).sort((a, b) => a - b)
    .map(id => [id, SM.TILES[id].name]);
  eq(documented, registered,
    'DOC  catalogue IDs and names match every registered runtime tile');

  const example = guide.match(/```yaml\s*\n([\s\S]*?)\n```/);
  ok(!!example, 'DOC  guide includes a fenced YAML authoring example');
  if (!example) return;
  const loaded = SM.LEVELS.validate(SM.parseYAML(example[1]), { solve: false });
  ok(loaded.ok, 'DOC  YAML example passes the production level loader',
    loaded.problems.map(problem => problem.message).join(' | '));
  if (loaded.ok) {
    const crate = loaded.levels[0].cratesInit[0][2];
    eq([crate.capabilities.pullable, crate.capabilities.conveyor, crate.capabilities.ray],
      [false, true, 'transport'], 'DOC  example applies its per-cell profile to the named crate');
  }
}

function checkWorldPackGuide() {
  const guide = fs.readFileSync(path.join(ROOT, 'docs/world-level-packs.md'), 'utf8');
  const example = guide.match(/```yaml\s*\n([\s\S]*?)\n```/);
  ok(!!example, 'PACK DOC  canonical world pack example exists');
  if (!example) return;
  const loaded = SM.LEVELS.validate(SM.parseYAML(example[1]), { solve: false });
  ok(loaded.ok, 'PACK DOC  canonical example passes the shared loader',
    loaded.problems.map(problem => problem.message).join(' | '));
}

function checkObjectOverrides() {
  function documentFor(objectOverrides, row) {
    return {
      name: 'Capability Test', world_id: 'capability-test', num_level: 1,
      levels: { level_1: {
        name: 'Profiles', width: row.length, height: 1,
        grid: [row], object_overrides: objectOverrides
      } }
    };
  }

  const valid = SM.LEVELS.validate(documentFor({
    B1: { pullable: false },
    C1: { pullable: true, ray: 'transport' }
  }, [1, 71, 71, 2]), { solve: false });
  ok(valid.ok, 'OBJECT  per-cell movement capabilities validate',
    valid.problems.map(problem => problem.message).join(' | '));
  if (valid.ok) {
    const crates = valid.levels[0].cratesInit[0];
    eq(crates[1].capabilities.pullable, false,
      'OBJECT  first crate receives only its own pull override');
    eq(crates[2].capabilities.pullable, true,
      'OBJECT  same-ID crate retains its independent default/override');
    eq(crates[2].capabilities.ray, 'transport',
      'OBJECT  ray transport override is retained by the authored entity');
    eq(crates[1].capabilities.ray, 'block',
      'OBJECT  unconfigured crate retains its ray-blocking default');
  }

  const nonEntity = SM.LEVELS.validate(documentFor({ A1: { pullable: false } }, [1, 71, 0, 2]), { solve: false });
  ok(nonEntity.problems.some(problem => /does not contain a movable object/.test(problem.message)),
    'OBJECT  override on non-object cell is rejected');

  const outside = SM.LEVELS.validate(documentFor({ E1: { pullable: false } }, [1, 71, 0, 2]), { solve: false });
  ok(outside.problems.some(problem => /outside this board/.test(problem.message)),
    'OBJECT  out-of-bounds coordinate is rejected');

  const unsupported = SM.LEVELS.validate(documentFor({ B1: { teleport: true } }, [1, 71, 0, 2]), { solve: false });
  ok(unsupported.problems.some(problem => /does not support capability "teleport"/.test(problem.message)),
    'OBJECT  unknown capability name is rejected');

  const invalidValue = SM.LEVELS.validate(documentFor({ B1: { pullable: 'yes' } }, [1, 71, 0, 2]), { solve: false });
  ok(invalidValue.problems.some(problem => /must be true or false/.test(problem.message)),
    'OBJECT  non-boolean capability value is rejected');

  const invalidRay = SM.LEVELS.validate(documentFor({ B1: { ray: 'bounce' } }, [1, 71, 0, 2]), { solve: false });
  ok(invalidRay.problems.some(problem => /ray capability.*must be block, transport, or ignore/.test(problem.message)),
    'OBJECT  unsupported ray mode is rejected');

  const target = SM.LEVELS.validate(documentFor({}, [1, 23, 0, 2]), { solve: false });
  ok(target.ok, 'OBJECT  target object defaults validate');
  if (target.ok) {
    const targetInst = target.levels[0].switchesInit[0].inst;
    eq([targetInst.capabilities.pushable, targetInst.capabilities.pullable,
      targetInst.capabilities.portal, targetInst.capabilities.ray],
    [false, false, false, 'ignore'], 'OBJECT  target is stationary and transparent by default');
  }

  const crateDefaults = SM.LEVELS.validate(documentFor({}, [1, 71, 0, 2]), { solve: false });
  ok(crateDefaults.ok, 'OBJECT  default crate profile validates');
  if (crateDefaults.ok) {
    const crate = crateDefaults.levels[0].cratesInit[0][1];
    eq([crate.capabilities.pushable, crate.capabilities.pullable, crate.capabilities.ray],
      [true, false, 'block'], 'OBJECT  default crate is push-only and ray-opaque');
  }
}

function checkReceiverValidation() {
  function document(overrides) {
    return {
      name: 'Receiver validation', world_id: 'receiver-validation', num_level: 1,
      levels: { level_1: {
        name: 'Receiver validation', width: 3, height: 1, golf_score: 1,
        grid: [[1, 50, 2]], overrides: overrides || {}
      } }
    };
  }

  for (const colour of ['wht', 'red', 'gre', 'blu']) {
    for (const link of [1, 2, 3]) {
      const result = SM.LEVELS.validate(document({ 50: { colour, link } }), { solve: false });
      ok(result.ok,
        'RECEIVER VALIDATION  supported color ' + colour + ' and configured link ' + link + ' are accepted',
        result.problems.map(problem => problem.message).join(' | '));
    }
  }

  for (const link of [0, 4]) {
    const result = SM.LEVELS.validate(document({ 50: { link } }), { solve: false });
    ok(result.problems.some(problem => /receiver tile id 50 link must be one of the configured links 1, 2, or 3/.test(problem.message)),
      'RECEIVER VALIDATION  unsupported/dangling link ' + link + ' is rejected');
  }

  const malformedLink = SM.LEVELS.validate(document({ 50: { link: '2' } }), { solve: false });
  ok(malformedLink.problems.some(problem => /link must be integer, got string/.test(problem.message)),
    'RECEIVER VALIDATION  a non-integer link is rejected by the parameter schema');

  const unsupportedColour = SM.LEVELS.validate(document({ 50: { colour: 'yellow' } }), { solve: false });
  ok(unsupportedColour.problems.some(problem => /receiver tile id 50 colour must be a supported gameplay colour/.test(problem.message)),
    'RECEIVER VALIDATION  a non-gameplay receiver color is rejected');

  const danglingOverride = SM.LEVELS.validate(document({ 90: { link: 2 } }), { solve: false });
  ok(danglingOverride.problems.some(problem => /override key "90" is dangling/.test(problem.message)),
    'RECEIVER VALIDATION  a receiver configuration for an absent tile ID is rejected as dangling');
}

function checkTargetLayer() {
  const raw = {
    name: 'Movable target layer', world_id: 'movable-target-layer', num_level: 1,
    levels: { level_1: {
      name: 'Target over floor', width: 4, height: 1,
      grid: [[1, 71, 23, 2]]
    } }
  };
  const loaded = SM.LEVELS.validate(raw, { solve: false });
  ok(loaded.ok, 'TARGET LAYER  target feature level validates',
    loaded.problems.map(problem => problem.message).join(' | '));
  if (!loaded.ok) return;

  const level = loaded.levels[0];
  const targetRecord = level.switchesInit.find(sw => sw.inst.family === 'target');
  eq([targetRecord.x, targetRecord.y, targetRecord.inst.params.link], [2, 0, 1],
    'TARGET LAYER  target marker becomes a coordinate-bearing link entity');
  eq(level.tiles[0][2].family, 'target',
    'TARGET LAYER  authored level view retains the target marker');
  eq(level.runtimeTiles[0][2].name, 'floor',
    'TARGET LAYER  runtime terrain retains ordinary floor beneath the target');

  const state = SM.RULES.newState(level);
  eq(state.grid[0][2].name, 'floor',
    'TARGET LAYER  mutable board uses underlying floor at target coordinates');
  const emptyView = SM.RULES.describeTile(state, 2, 0);
  eq([emptyView.inst.family, emptyView.terrain.name, emptyView.active],
    ['target', 'floor', false], 'TARGET LAYER  view composes target feature over its underlying terrain');

  const crate = state.crates[0][1];
  state.crates[0][1] = null;
  state.crates[0][2] = crate;
  const occupiedView = SM.RULES.describeTile(state, 2, 0);
  eq([occupiedView.inst.family, occupiedView.crate.id], ['target', 71],
    'TARGET LAYER  target feature and crate can share a cell');
  eq(SM.RULES.switchActive(state, targetRecord), true,
    'TARGET LAYER  crate co-location activates the target link');
}

function checkDirectObjectMovement() {
  const R = SM.RULES;

  const cratePush = st(mkLevel([[1, 71, 0, 2]]));
  const pushedCrate = go(cratePush, 'east');
  eq(cratePush.player, { x: 1, y: 0 }, 'OBJECT MOVE  pushing advances the player into the crate cell');
  eq(cratePush.crates[0][2].id, 71, 'OBJECT MOVE  pushing moves one crate cell forward');
  eq([pushedCrate.stroke, cratePush.strokes], [true, 1],
    'OBJECT MOVE  a successful crate push costs one stroke');

  const fixedTarget = st(mkLevel([[1, 23, 0, 2]]));
  const fixedTargetMove = go(fixedTarget, 'east');
  eq([fixedTarget.player.x, R.targetAt(fixedTarget, 1, 0) !== null,
    fixedTargetMove.stroke, fixedTarget.strokes], [0, true, false, 0],
  'OBJECT MOVE  target stays fixed unless movement is explicitly enabled');

  const targetPush = st(mkLevel([[1, 23, 0, 2]], null, null,
    { B1: { pushable: true } }));
  const pushedTarget = go(targetPush, 'east');
  eq(R.targetAt(targetPush, 2, 0).inst.id, 23,
    'OBJECT MOVE  pushing relocates the target entity and preserves its ID');
  eq([targetPush.player.x, targetPush.strokes, pushedTarget.stroke], [1, 1, true],
    'OBJECT MOVE  target push and player step resolve as one stroke');
  eq(targetPush.grid[0][1].name, 'floor',
    'OBJECT MOVE  vacated target cell retains its underlying floor');

  const blockedCrate = st(mkLevel([[1, 71, 3, 2]]));
  const blockedCrateMove = go(blockedCrate, 'east');
  eq([blockedCrate.player.x, blockedCrate.crates[0][1].id,
    blockedCrateMove.stroke, blockedCrate.strokes], [0, 71, false, 0],
  'OBJECT MOVE  wall-blocked crate push is atomic and costs no stroke');

  const blockedTarget = st(mkLevel([[1, 23, 3, 2]], null, null,
    { B1: { pushable: true } }));
  const blockedTargetMove = go(blockedTarget, 'east');
  eq([blockedTarget.player.x, R.targetAt(blockedTarget, 1, 0) !== null,
    blockedTargetMove.stroke, blockedTarget.strokes], [0, true, false, 0],
  'OBJECT MOVE  wall-blocked target push leaves player and target unchanged');

  const gateBlocked = st(mkLevel([[1, 71, 31, 2]]));
  const gatePush = go(gateBlocked, 'east');
  eq([gateBlocked.player.x, gateBlocked.crates[0][1].id, gatePush.stroke], [0, 71, false],
    'OBJECT MOVE  crate cannot be pushed through a wrong-color gate');

  const blockedDefaultPull = st(mkLevel([[0, 71, 1, 0, 2]]));
  const blockedDefaultPullResult = R.resolveTurn(blockedDefaultPull, { type: 'pull', dir: 'east' });
  eq([blockedDefaultPull.player.x, blockedDefaultPull.crates[0][1].id,
    blockedDefaultPullResult.stroke, blockedDefaultPull.strokes], [2, 71, false, 0],
  'OBJECT MOVE  default crate profile rejects pulling without charging a stroke');

  const cratePull = st(mkLevel([[1, 71, 0, 0, 2]], null, null,
    { B1: { pullable: true } }));
  cratePull.player.x = 2;
  const pulledCrate = R.resolveTurn(cratePull, { type: 'pull', dir: 'east' });
  eq([cratePull.player.x, cratePull.crates[0][1] && cratePull.crates[0][1].id,
    cratePull.crates[0][2] && cratePull.crates[0][2].id], [3, null, 71],
  'OBJECT MOVE  pull advances player and brings trailing crate into its old cell');
  eq([pulledCrate.stroke, cratePull.strokes], [true, 1],
    'OBJECT MOVE  pull is one movement stroke');

  const targetPull = st(mkLevel([[1, 23, 0, 0, 2]], null, null,
    { B1: { pullable: true } }));
  targetPull.player.x = 2;
  const pulledTarget = R.resolveTurn(targetPull, { type: 'pull', dir: 'east' });
  eq([targetPull.player.x, R.targetAt(targetPull, 2, 0).inst.id], [3, 23],
    'OBJECT MOVE  target can be pulled into the player\'s vacated cell');
  eq([pulledTarget.stroke, targetPull.strokes], [true, 1],
    'OBJECT MOVE  target pull is one movement stroke');

  const targetState = st(mkLevel([[1, 23, 0, 0, 2]], null, null,
    { B1: { pushable: true } }));
  const targetBefore = R.snapshot(targetState);
  const targetBeforeSignature = R.snapshotSig(targetState);
  go(targetState, 'east');
  const targetAfterSignature = R.snapshotSig(targetState);
  ok(targetAfterSignature !== targetBeforeSignature,
    'OBJECT STATE  solver identity includes the relocated target position');
  const targetClone = R.cloneState(targetState);
  eq(R.targetAt(targetClone, 2, 0).entityId, R.targetAt(targetState, 2, 0).entityId,
    'OBJECT STATE  cloned target retains its stable identity');
  go(targetClone, 'east');
  eq(R.targetAt(targetClone, 3, 0) !== null, true,
    'OBJECT STATE  cloned target can move independently');
  eq(R.targetAt(targetState, 2, 0) !== null, true,
    'OBJECT STATE  moving a clone does not move the source target');
  R.restore(targetState, targetBefore);
  eq([targetState.player.x, R.targetAt(targetState, 1, 0) !== null,
    targetState.strokes, R.snapshotSig(targetState)], [0, true, 0, targetBeforeSignature],
  'OBJECT STATE  undo snapshot restores target position, player, and stroke identity exactly');

  let solverTriedPull = 0;
  const resolveTurn = R.resolveTurn;
  R.resolveTurn = function (state, action) {
    if (action.type === 'pull') solverTriedPull++;
    return resolveTurn(state, action);
  };
  const pullSearch = SM.LEVELS.solve(mkLevel([[1, 0, 2]]), { maxStates: 100, maxDepth: 10 });
  R.resolveTurn = resolveTurn;
  eq(pullSearch.status, 'solvable', 'OBJECT STATE  solver still resolves the ordinary movement route');
  ok(solverTriedPull > 0, 'OBJECT STATE  BFS enumerates pull actions through the real resolver');

  const blockedPull = st(mkLevel([[1, 71, 0, 3, 2]]));
  blockedPull.player.x = 2;
  const blockedPullResult = R.resolveTurn(blockedPull, { type: 'pull', dir: 'east' });
  eq([blockedPull.player.x, blockedPull.crates[0][1].id,
    blockedPullResult.stroke, blockedPull.strokes], [2, 71, false, 0],
  'OBJECT MOVE  wall-blocked pull is atomic and costs no stroke');
}

function checkObjectForceChains() {
  const R = SM.RULES;

  const crateOnBelt = st(mkLevel([[1, 0, 71, 60, 0, 2]]));
  go(crateOnBelt, 'east');
  const beltPush = go(crateOnBelt, 'east');
  eq([crateOnBelt.player.x, crateOnBelt.crates[0][4].id], [2, 71],
    'OBJECT FORCE  crate pushed onto a compatible belt is carried onward');
  eq(crateOnBelt.strokes, 2, 'OBJECT FORCE  forced crate belt hop costs no extra stroke');
  ok(beltPush.steps.some(step => step.type === 'push'),
    'OBJECT FORCE  crate belt movement is included in the initiating turn');

  const crateOnIce = st(mkLevel([[1, 0, 71, 5, 5, 0, 2]]));
  go(crateOnIce, 'east');
  go(crateOnIce, 'east');
  eq(crateOnIce.crates[0][5].id, 71,
    'OBJECT FORCE  pushed crate preserves direction across ice and stops on floor');

  const cratePortal = st(mkLevel([[1, 0, 71, 80, 0, 0, 80, 2]], { 80: { link: 1 } }, 1,
    { C1: { portal: true } }));
  go(cratePortal, 'east');
  const portalResult = go(cratePortal, 'east');
  eq(cratePortal.crates[0][6].entityId, 'crate@C1',
    'OBJECT FORCE  portal transports the same crate identity to its pair');
  ok(portalResult.steps.some(step => step.type === 'object-teleport' &&
    step.objectType === 'crate' && step.to.x === 6),
  'OBJECT FORCE  portal returns a typed object-teleport event');
  eq([portalResult.stroke, cratePortal.strokes], [true, 2],
    'OBJECT FORCE  crate portal transport adds no stroke beyond its push');

  const immobileTarget = st(mkLevel([[1, 23, 60, 0, 2]], null, null,
    { B1: { pushable: true } }));
  go(immobileTarget, 'east');
  eq(R.targetAt(immobileTarget, 2, 0) !== null, true,
    'OBJECT FORCE  target default profile ignores conveyors');
  const beltTarget = st(mkLevel([[1, 23, 60, 0, 2]], null, 1,
    { B1: { pushable: true, conveyor: true } }));
  go(beltTarget, 'east');
  eq(R.targetAt(beltTarget, 3, 0) !== null, true,
    'OBJECT FORCE  per-cell profile lets a target travel along a conveyor');

  const beltLoop = st(mkLevel([
    [0, 0, 63, 61, 2],
    [1, 71, 60, 62, 3]
  ]));
  const firstLoopResult = go(beltLoop, 'east');
  eq(beltLoop.crates[0][2].id, 71,
    'OBJECT FORCE  repeated object route settles without losing its crate');
  ok(firstLoopResult.steps.some(step => step.type === 'force-loop'),
    'OBJECT FORCE  object chain reports repeated directed state termination');
  const loopResult = go(beltLoop, 'east');
  eq([beltLoop.crates.flat().filter(Boolean).length, beltLoop.strokes], [1, 2],
    'OBJECT FORCE  interacting player/object loops retain one crate and one stroke per action');
  ok(loopResult.steps.some(step => step.type === 'force-loop'),
    'OBJECT FORCE  loop termination is reported to playback');
  ok(loopResult.steps.length < beltLoop.width * beltLoop.height * 4 + 10,
    'OBJECT FORCE  cyclic movement remains within a board-derived bound');

  const iceWall = st(mkLevel([[1, 0, 71, 5, 3, 2]]));
  go(iceWall, 'east');
  go(iceWall, 'east');
  eq(iceWall.crates[0][3].id, 71,
    'OBJECT FORCE  crate stops on its last legal ice cell before a wall');
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
    levels: { level_1: { name: 'Bad cell', width: 2, height: 2, grid: [[1, 999], [0, 2]] } }
  }, { solve: false });
  const unknownTileMessage = unknownTileWorld.problems[0] && unknownTileWorld.problems[0].message;
  ok(/World "Broken World" \(broken-world\), level_1:/.test(unknownTileMessage || '') &&
      /tile id 999 at B2/.test(unknownTileMessage || '') && /registered, implemented tile ID/.test(unknownTileMessage || ''),
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
    const crates = level.cratesInit.reduce((all, row) => all.concat(row.filter(Boolean)), []);
    const targets = level.switchesInit.filter(sw => sw.inst.family === 'target');
    ok(crates.every(crate => crate.capabilities.pushable && !crate.capabilities.pullable),
      'W1  ' + expectation.key + ' keeps every crate push-only');
    ok(targets.every(target => !target.capabilities.pushable && !target.capabilities.pullable),
      'W1  ' + expectation.key + ' keeps target markers stationary');
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

const unitSuites = {
  registry: [checkTileRegistry],
  rules: [checkStateContract, checkTileHookDispatch, checkRules, checkRayQueries,
    checkPolarityBarriers, checkPolaritySwitch, checkPolaritySolver,
    checkCatchTransitions, checkRayTransportTransitions, checkCatchSolver, checkChromaticContracts,
    checkReceiverVariants, checkReceiverLinksAndSolver,
    checkDirectObjectMovement, checkObjectForceChains],
  levels: [checkYaml, checkPolarityValidation, checkObjectOverrides, checkTargetLayer,
    checkReceiverValidation, checkWorld5Content, checkWorld6Content,
    checkTileMechanicsGuide, checkWorldPackGuide],
  helpers: [checkGeometryHelpers, checkRulesPurity, checkRulesTileDispatchPurity]
};

function report(label) {
  console.log('---');
  console.log(pass + ' passed, ' + fail + ' failed');
  if (fail) {
    for (const f of failures) console.log('  FAIL  ' + f);
    process.exitCode = 1;
  }
}

const unitArg = process.argv.find(arg => arg.indexOf('--suite=') === 0);
if (unitArg) {
  const name = unitArg.slice('--suite='.length);
  const selected = name === 'all-unit'
    ? Object.keys(unitSuites).reduce((all, key) => all.concat(unitSuites[key]), [])
    : unitSuites[name];
  if (!selected) {
    console.error('Unknown test suite "' + name + '". Available: ' +
      Object.keys(unitSuites).join(', ') + ', all-unit');
    process.exit(2);
  }
  console.log('--- Streuph\'s Maze: ' + name + ' unit suite ---');
  selected.forEach(fn => fn());
  report(name);
} else {
  console.log('--- Streuph\'s Maze: verification ---');
  checkTileRegistry();
  checkStateContract();
  checkTileHookDispatch();
  checkYaml();
  checkRayQueries();
  checkCatchTransitions();
  checkRayTransportTransitions();
  checkCatchSolver();
  checkParRouteSelection();
  checkChromaticContracts();
  checkRules();
  checkGeometryHelpers();
  checkLevels();
  checkWorldOneContent();
  checkWorld4Content();
  checkWorld5Content();
  checkVectorSolver();
  checkWorld2Content();
  checkWorld3Content();
  checkTileMechanicsGuide();
  checkObjectOverrides();
  checkTargetLayer();
  checkDirectObjectMovement();
  checkObjectForceChains();
  checkStore();
  try { checkRulesPurity(); }
  catch (e) { ok(false, 'A2  purity check ran', e.message); }
  checkRulesTileDispatchPurity();
  report('full verification');
}
