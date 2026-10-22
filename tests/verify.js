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
  'src/js/sm-rules.js'
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
    name: 'invalid picture', num_level: 1,
    levels: { level_1: { name: 'test', width: 2, height: 1, golf_score: 1,
      win_picture: 'data:image/png;base64,AAAA', grid: [[1, 2]] } }
  };
  ok(SM.LEVELS.validate(invalidPictureDoc, { solve: false }).problems.some(p => /not a PNG/.test(p.message)),
    'WIN  invalid PNG signature is rejected');
  const wrongSizeDoc = {
    name: 'wrong picture size', num_level: 1,
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
function go(s, dir) { return SM.RULES.resolveTurn(s, { type: 'move', dir: dir }); }
function act(s) { return SM.RULES.resolveTurn(s, { type: 'act' }); }

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

function checkLevels() {
  eq(SM.P_COLOURS, ['wht', 'red', 'gre', 'blu'], 'CHROMA  player palette remains the four existing colors');
  eq(SM.W_COLOURS, ['wht', 'red', 'gre', 'blu'], 'CHROMA  world palette remains the four existing colors');
  const unsupportedColour = {
    name: 'unsupported color', num_level: 1,
    levels: { level_1: { name: 'test', width: 3, height: 1, golf_score: 1,
      overrides: { 11: { colour: 'yellow' } }, grid: [[1, 11, 2]] } }
  };
  ok(SM.LEVELS.validate(unsupportedColour, { solve: false }).problems.some(p => /yellow.*not a gameplay colour/i.test(p.message)),
    'CHROMA  validator rejects yellow as a new gameplay color');

  const res = SM.LEVELS.boot({ solve: true });
  ok(res.problems.length === 0, 'V1-V11  the boot levels validate',
    res.problems.map(p => p.level + ': ' + p.message).join('\n      '));
  ok(res.levels.length === 13, 'V3  thirteen boot levels loaded, got ' + res.levels.length);
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

/* ---------------------------------------------------------------------- */

console.log('--- Streuph\'s Maze: verification ---');
checkTileRegistry();
checkYaml();
checkRules();
const res = checkLevels();
try { checkRulesPurity(); }
catch (e) { ok(false, 'A2  purity check ran', e.message); }

console.log('---');
console.log(pass + ' passed, ' + fail + ' failed');
if (fail) {
  for (const f of failures) console.log('  FAIL  ' + f);
  process.exit(1);
}
