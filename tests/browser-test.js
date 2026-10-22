/* =========================================================================
 * tests/browser-test.js  —  headless DOM smoke test for Streuph's Maze
 *
 *   npm install jsdom        (dev-only; the game itself has no dependencies)
 *   node tests/browser-test.js
 *
 * Loads the REAL index.html from disk with jsdom, lets its boot script run,
 * and then plays a few turns by dispatching real keyboard events. This is the
 * only way to catch "the browser layer is broken" without a human at a
 * screen — which is exactly the class of bug the headless rule tests cannot
 * see.
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');

let pass = 0, fail = 0;
const failures = [];
function ok(cond, label, detail) {
  if (cond) { pass++; return true; }
  fail++; failures.push(label + (detail ? '  —  ' + detail : '')); return false;
}
function eq(a, b, label) {
  return ok(JSON.stringify(a) === JSON.stringify(b), label, 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

const vc = new VirtualConsole();
const consoleErrors = [];
vc.on('jsdomError', e => consoleErrors.push((e && e.stack) ? e.stack : String(e && e.message || e)));
vc.on('error', (...a) => consoleErrors.push(a.join(' ')));

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'file://' + ROOT + '/index.html',
  pretendToBeVisual: true,
  virtualConsole: vc
});

const { window } = dom;
const doc = window.document;

// jsdom loads classic <script src> resources ASYNCHRONOUSLY, so window.SM
// does not exist yet at this point in the module. Read it lazily, and wait for
// the board to be populated — which only happens after every script has run.
const SMRef = { get SM() { return window.SM; } };

function waitFor(cond, ms) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function poll() {
      let v;
      try { v = cond(); } catch (e) { v = false; }
      if (v) return resolve(v);
      if (Date.now() - t0 > (ms || 5000)) return reject(new Error('timed out'));
      setTimeout(poll, 10);
    })();
  });
}

function key(k) {
  const e = new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  doc.dispatchEvent(e);
}

(async function main() {
  try {
    await waitFor(() => SMRef.SM && SMRef.SM.game && SMRef.SM.game.state &&
                          doc.querySelectorAll('#board .cell').length > 0);
  } catch (e) {
    console.error('BOOT FAILED:', e.message);
    console.error(consoleErrors.join('\n'));
    console.error('SM keys:', SMRef.SM ? Object.keys(SMRef.SM).join(',') : '(none)');
    console.error('SM.game:', SMRef.SM && SMRef.SM.game ? Object.keys(SMRef.SM.game).join(',') : '(none)');
    console.error(doc.body.innerHTML.slice(0, 600));
    process.exit(1);
  }

  const SM = SMRef.SM;

  /* ---- shell ---------------------------------------------------------- */
  ok(consoleErrors.length === 0, 'the page boots with no script errors', consoleErrors.join(' | '));
  ok(!doc.querySelector('pre'), 'no fatal banner was rendered');
  ok(SM.game.levels.length === 12, 'all 12 built-in levels loaded', String(SM.game.levels.length));

  const cells = doc.querySelectorAll('#board .cell');
  const lv1 = SM.game.levels[0];
  eq(cells.length, lv1.width * lv1.height, 'the board has width x height cells');
  eq(doc.querySelector('#ruler-x').children.length, lv1.width, 'the column ruler is labelled');
  eq(doc.querySelector('#ruler-y').children.length, lv1.height, 'the row ruler is labelled');

  /* ---- glyphs actually rendered --------------------------------------- */
  let drawn = 0;
  cells.forEach(c => { if (c.innerHTML.trim()) drawn++; });
  ok(drawn > 0, 'tiles are drawn as SVG', drawn + ' of ' + cells.length + ' non-empty');

  /* ---- HUD ------------------------------------------------------------ */
  eq(doc.querySelector('#v-strokes').textContent, '0', 'entries starts at 0');
  eq(doc.querySelector('#v-par').textContent, String(lv1.par), 'par is shown');
  ok(!!doc.querySelector('#tutorial').textContent.trim(), 'the tutorial panel has text');
  ok(doc.querySelector('#tutorial').textContent.indexOf('Arrow keys or WASD') !== -1, 'tutorial hint renders as text rather than an object');
  ok(doc.querySelector('#player').isConnected, 'the player overlay remains attached above the board');
  ok(doc.querySelector('#player').dataset.motion === 'animated', 'player is marked as an animated visual');
  ok(doc.querySelector('#win-picture-panel').hidden, 'no win picture is visible before victory');
  ok(!doc.querySelector('#win-picture').hasAttribute('src'), 'win picture is not loaded before victory');
  ok(/eight display frames/.test(doc.querySelector('#tutorial').textContent), 'tutorial explains the eight-frame player animation');
  ok(/win_picture/.test(doc.querySelector('#tutorial').textContent), 'tutorial documents custom win pictures');
  ok(doc.querySelectorAll('#levels li').length === 12, 'the level list has 12 entries');
  ok(doc.querySelectorAll('#levels button')[1].disabled, 'level 2 starts locked');

  /* ---- the codex is generated from SM.TILES ---------------------------- */
  const codexRows = doc.querySelectorAll('#codex .row');
  const implemented = Object.keys(SM.TILES).filter(k => SM.TILES[k].implemented !== false).length;
  eq(codexRows.length, implemented, 'the codex lists every implemented tile, generated from SM.TILES');
  ok(doc.querySelector('#codex .row svg'), 'codex rows carry a glyph');

  /* ---- play level 1 ---------------------------------------------------- */
  const g = () => SM.game;
  // A1 -> E1 -> E5, par 8.
  ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight',
   'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp'].forEach(k => key(k));
  await new Promise(r => setTimeout(r, 900));

  eq(g().state.strokes, 8, 'eight key presses cost eight entries');
  ok(g().state.won, 'reaching the goal with matching colours wins');
  ok(doc.querySelector('#win').classList.contains('on'), 'the win overlay is shown');
  ok(!doc.querySelector('#win-picture-panel').hidden, 'the default win picture is revealed after victory');
  ok(doc.querySelector('#win-picture').src.indexOf('data:image/svg+xml') === 0, 'missing win_picture uses the PASS image');
  eq(doc.querySelector('#win-score').textContent, '8', 'the overlay reports the score');
  ok(!doc.querySelectorAll('#levels button')[1].disabled, 'solving unlocks level 2');

  /* ---- undo ------------------------------------------------------------ */
  key('Escape');
  g().load(0);
  await new Promise(r => setTimeout(r, 60));
  key('ArrowRight');
  key('ArrowRight');
  await new Promise(r => setTimeout(r, 400));
  eq(g().state.strokes, 2, 'two moves cost two entries');
  key('z');
  eq(g().state.strokes, 1, 'undo removes exactly one entry');
  eq(g().history.length, 1, 'undo pops the history');

  // Level 2 carries the tutorial PNG; it must stay hidden until completion.
  g().load(1);
  ok(doc.querySelector('#win-picture-panel').hidden, 'custom level picture stays hidden at level start');
  const customPath = g().levels[1].solve.path;
  const keyFor = { north: 'ArrowUp', east: 'ArrowRight', south: 'ArrowDown', west: 'ArrowLeft' };
  customPath.forEach(a => key(a.type === 'act' ? ' ' : keyFor[a.dir]));
  await new Promise(r => setTimeout(r, 500));
  ok(g().state.won, 'the custom-picture tutorial level can be completed');
  ok(!doc.querySelector('#win-picture-panel').hidden, 'custom picture appears after the level is won');
  ok(doc.querySelector('#win-picture').src.indexOf('data:image/png;base64,') === 0, 'custom PNG data URI is displayed');
  g().restart();
  ok(doc.querySelector('#win-picture-panel').hidden, 'restart hides and clears the previous win picture');

  /* ---- blocked moves are free ------------------------------------------ */
  g().load(0);
  await new Promise(r => setTimeout(r, 60));
  key('ArrowLeft');           // A1 is the west edge
  eq(g().state.strokes, 0, 'a blocked move costs nothing');
  eq(g().history.length, 0, 'a blocked move does not enter the undo history');

  /* ---- ACT ------------------------------------------------------------- */
  g().load(1);                // Two colours: dial at C2
  await new Promise(r => setTimeout(r, 60));
  key('ArrowRight'); key('ArrowRight'); key('ArrowUp'); // from A1 to the C2 dial
  await new Promise(r => setTimeout(r, 300));
  eq(g().state.W, 'red', 'stepping on a dial advances the world colour');
  key(' ');                   // ACT in place
  await new Promise(r => setTimeout(r, 300));
  eq(g().state.W, 'gre', 'ACT advances it again');

  /* ---- a colour gate refuses ------------------------------------------- */
  g().load(1);
  await new Promise(r => setTimeout(r, 60));
  key('ArrowRight'); key('ArrowRight'); // to column C
  key('ArrowUp'); key('ArrowUp'); key('ArrowUp'); // onto the C4 prism
  await new Promise(r => setTimeout(r, 400));
  eq(g().state.P, 'red', 'the prism set the player colour');

  /* ---- persistence ----------------------------------------------------- */
  const raw = SM.STORE.exportText();
  ok(raw.indexOf('level_1') !== -1, 'exported progress mentions level_1');
  SM.STORE.reset();
  ok(SM.STORE.entry('level_1').cleared === undefined, 'reset clears progress');
  SM.STORE.importText(raw);
  ok(!!SM.STORE.entry('level_1').cleared, 'import restores progress');

  /* ---- the YAML round trip through the UI ------------------------------ */
  const yaml = SM.io.currentText();
  ok(yaml.indexOf('# STREUPH') === 0 || yaml.indexOf('#') === 0, 'emitted YAML keeps a header comment');
  ok(yaml.indexOf('num_level: 12') !== -1, 'emitted YAML keeps the header fields');
  const reloaded = SM.LEVELS.load(yaml, { solve: true });
  eq(reloaded.problems.length, 0, 'the emitted YAML re-validates cleanly',
    reloaded.problems.map(p => p.level + ': ' + p.message).join(' | '));
  eq(reloaded.levels.length, 12, 'the emitted YAML round-trips all 12 levels');

  /* ---- a bad file changes nothing -------------------------------------- */
  const before = SM.game.levels.map(l => l.key).join(',');
  SM.io.applyText('name: "x"\nnum_level: 3\nlevels:\n  level_1:\n    name: "y"\n');
  eq(SM.game.levels.map(l => l.key).join(','), before,
    'a document with too few levels is rejected and the live levels survive');
  ok(doc.querySelector('#diag').textContent.length > 0, 'the diagnostic panel explains the rejection');

  SM.io.applyText('name: "x"\nnum_level: 1\nlevels:\n  level_1:\n    name: "y"\n    width: 2\n    height: 2\n    grid:\n      - [1, 99]\n      - [0, 2]\n');
  eq(SM.game.levels.map(l => l.key).join(','), before,
    'an unknown tile id is rejected and the live levels survive');
  ok(/unknown tile id 99/.test(doc.querySelector('#diag').textContent),
    'the diagnostic names the offending id', doc.querySelector('#diag').textContent.slice(0, 200));

  /* ---- hot reload that DOES work --------------------------------------- */
  const mini = [
    'name: "Mini"',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "Tiny"',
    '    goal: "one step."',
    '    width: 2',
    '    height: 2',
    '    golf_score: 1',
    '    grid:',
    '      - [1, 2]',
    '      - [0, 0]'
  ].join('\n');
  ok(SM.io.applyText(mini), 'a valid pasted document is accepted');
  eq(SM.game.levels.length, 1, 'the level set was replaced');
  eq(doc.querySelectorAll('#board .cell').length, 4, 'the board was rebuilt to 2x2');
  SM.io.applyObject(SM.DEFAULT_LEVELS, 'levels.default.js', SM.YAML_HEADER);
  eq(SM.game.levels.length, 12, 'back to the built-in set');

  /* ---- levels.yaml on disk --------------------------------------------- */
  const onDisk = path.join(ROOT, 'data', 'levels.yaml');
  ok(fs.existsSync(onDisk), 'data/levels.yaml exists');
  if (fs.existsSync(onDisk)) {
    const fromDisk = SM.LEVELS.load(fs.readFileSync(onDisk, 'utf8'), { solve: true });
    eq(fromDisk.problems.length, 0, 'the shipped levels.yaml validates',
      fromDisk.problems.map(p => p.level + ': ' + p.message).join(' | '));
    eq(fromDisk.levels.length, 12, 'the shipped levels.yaml has all 12 levels');
  }

  /* ---- summary --------------------------------------------------------- */
  console.log('--- Streuph\'s Maze: browser smoke test ---');
  console.log(pass + ' passed, ' + fail + ' failed');
  if (fail) {
    for (const f of failures) console.log('  FAIL  ' + f);
    process.exitCode = 1;
  }
  dom.window.close();
})().catch(e => {
  console.error('HARNESS ERROR:', e && e.stack || e);
  console.error(consoleErrors.join('\n'));
  process.exit(1);
});
