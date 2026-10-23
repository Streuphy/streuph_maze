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

function key(k, modifiers) {
  const e = new window.KeyboardEvent('keydown', {
    key: k, bubbles: true, cancelable: true,
    shiftKey: !!(modifiers && modifiers.shiftKey)
  });
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
  ok(SM.game.levels.length === 13, 'all 13 built-in levels loaded', String(SM.game.levels.length));

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
  ok(doc.querySelectorAll('#levels li').length === 13, 'the level list has 13 entries');
  eq(doc.querySelector('#world-name').textContent, "Streuph's Maze",
    'the built-in Prologue display name is shown');
  ok(doc.querySelectorAll('#levels button')[1].disabled, 'level 2 starts locked');

  /* ---- the codex is generated from SM.TILES ---------------------------- */
  const codexRows = doc.querySelectorAll('#codex .row');
  const implemented = Object.keys(SM.TILES).filter(k => SM.TILES[k].implemented !== false).length;
  eq(codexRows.length, implemented, 'the codex lists every implemented tile, generated from SM.TILES');
  ok(doc.querySelector('#codex .row svg'), 'codex rows carry a glyph');
  const northRayCodex = Array.from(codexRows).find(row => row.querySelector('.id').textContent === '81');
  ok(northRayCodex && /Static north ray/.test(northRayCodex.textContent) &&
      /crates shield it/.test(northRayCodex.textContent),
    'codex explains the static direction and crate-shield behavior for World 2 emitters');
  const iceCodex = Array.from(codexRows).find(row => row.querySelector('.id').textContent === '5');
  const beltCodex = Array.from(codexRows).find(row => row.querySelector('.id').textContent === '64');
  ok(iceCodex && /Slides in the entering direction; belts set their own direction/.test(iceCodex.textContent),
    'codex distinguishes direction-preserving ice from directional belts');
  ok(iceCodex && beltCodex && iceCodex.querySelector('svg').innerHTML !== beltCodex.querySelector('svg').innerHTML,
    'ice hatching and belt chevrons have visibly distinct glyphs');

  /* ---- play level 1 ---------------------------------------------------- */
  const g = () => SM.game;
  // A1 -> E1 -> E5, par 8.
  ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight',
   'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp'].forEach(k => key(k));
  await waitFor(() => !g().pending);

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
  key('ArrowRight');
  key('ArrowRight');
  await waitFor(() => !g().pending);
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
  await waitFor(() => !g().pending);
  ok(g().state.won, 'the custom-picture tutorial level can be completed');
  ok(!doc.querySelector('#win-picture-panel').hidden, 'custom picture appears after the level is won');
  ok(doc.querySelector('#win-picture').src.indexOf('data:image/png;base64,') === 0, 'custom PNG data URI is displayed');
  g().restart();
  ok(doc.querySelector('#win-picture-panel').hidden, 'restart hides and clears the previous win picture');

  // The final tutorial level proves the Void/Pass state reaches the renderer.
  g().load(12);
  const voidCell = doc.querySelector('#board .cell[data-x="2"][data-y="0"]');
  ok(!voidCell.classList.contains('wall'), 'Void begins passable');
  key('ArrowRight');
  await waitFor(() => voidCell.classList.contains('wall'));
  ok(voidCell.classList.contains('wall'), 'master_void renders Void as a wall while latched');
  key('ArrowRight');
  eq(g().state.player.x, 1, 'active Void prevents the player entering the tile');
  key(' ');
  await waitFor(() => !voidCell.classList.contains('wall'));
  ok(!voidCell.classList.contains('wall'), 'ACT restores passable Void in the renderer');
  key('ArrowRight'); key('ArrowRight');
  await waitFor(() => !g().pending);
  ok(g().state.won, 'the Void/Pass tutorial is solvable');

  /* ---- blocked moves are free ------------------------------------------ */
  g().load(0);
  key('ArrowLeft');           // A1 is the west edge
  eq(g().state.strokes, 0, 'a blocked move costs nothing');
  eq(g().history.length, 0, 'a blocked move does not enter the undo history');

  /* ---- ACT ------------------------------------------------------------- */
  g().load(1);                // Two colours: dial at C2
  key('ArrowRight'); key('ArrowRight'); key('ArrowUp'); // from A1 to the C2 dial
  await waitFor(() => !g().pending);
  eq(g().state.W, 'red', 'stepping on a dial advances the world colour');
  key(' ');                   // ACT in place
  await waitFor(() => !g().pending);
  eq(g().state.W, 'gre', 'ACT advances it again');

  /* ---- a colour gate refuses ------------------------------------------- */
  g().load(1);
  key('ArrowRight'); key('ArrowRight'); // to column C
  key('ArrowUp'); key('ArrowUp'); key('ArrowUp'); // onto the C4 prism
  await waitFor(() => !g().pending);
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
  ok(yaml.indexOf('num_level: 13') !== -1, 'emitted YAML keeps the header fields');
  const reloaded = SM.LEVELS.load(yaml, { solve: true });
  eq(reloaded.problems.length, 0, 'the emitted YAML re-validates cleanly',
    reloaded.problems.map(p => p.level + ': ' + p.message).join(' | '));
  eq(reloaded.levels.length, 13, 'the emitted YAML round-trips all 13 levels');

  /* ---- a bad file changes nothing -------------------------------------- */
  const before = SM.game.levels.map(l => l.key).join(',');
  SM.io.applyText('name: "x"\nnum_level: 3\nlevels:\n  level_1:\n    name: "y"\n');
  eq(SM.game.levels.map(l => l.key).join(','), before,
    'a document with too few levels is rejected and the live levels survive');
  ok(doc.querySelector('#diag').textContent.length > 0, 'the diagnostic panel explains the rejection');

  const badTileAccepted = SM.io.applyText('name: "x"\nworld_id: invalid-test\nnum_level: 1\nlevels:\n  level_1:\n    name: "y"\n    width: 2\n    height: 2\n    grid:\n      - [1, 999]\n      - [0, 2]\n');
  eq(badTileAccepted, false, 'shared loader rejects unknown tile IDs');
  eq(SM.game.levels.map(l => l.key).join(','), before,
    'an unknown tile id is rejected and the live levels survive');
  ok(/unknown tile id 999/.test(doc.querySelector('#diag').textContent),
    'the diagnostic names the offending id', doc.querySelector('#diag').textContent.slice(0, 200));
  ok(/invalid-test/.test(doc.querySelector('#diag').textContent) &&
     /level_1/.test(doc.querySelector('#diag').textContent) &&
     /tile id 999 at B2/.test(doc.querySelector('#diag').textContent) &&
     /registered, implemented tile ID/.test(doc.querySelector('#diag').textContent),
    'semantic pack errors identify world, level, cell and a correction');

  SM.io.applyText('name: "Malformed"\nworld_id: malformed\nnum_level: 1\nlevels:\n  level_1:\n    name: "bad"\n    width: [1\n');
  ok(/line 7, column \d+/.test(doc.querySelector('#diag .where').textContent),
    'YAML syntax diagnostics preserve line and column');
  eq(SM.game.levels.map(l => l.key).join(','), before,
    'malformed YAML leaves the active levels untouched');

  /* ---- hot reload that DOES work --------------------------------------- */
  const mini = [
    'name: "Mini"',
    'world_id: mini-pack',
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
  eq(doc.querySelector('#world-name').textContent, 'Mini',
    'the active world display name refreshes after paste');
  eq(doc.querySelectorAll('#board .cell').length, 4, 'the board was rebuilt to 2x2');

  const beforeBadFile = {
    keys: g().levels.map(l => l.key).join(','),
    world: doc.querySelector('#world-name').textContent,
    player: { x: g().state.player.x, y: g().state.player.y },
    strokes: g().state.strokes,
    cells: doc.querySelectorAll('#board .cell').length
  };
  const fileInput = doc.querySelector('#file');
  function selectPackFile(text, filename) {
    const file = new window.File([text], filename || 'world.levels.yaml', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
    fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  }
  selectPackFile('name: "Broken upload"\nworld_id: broken-upload\nnum_level: 1\nlevels:\n' +
    '  level_1:\n    name: "Bad tile"\n    width: 2\n    height: 2\n' +
    '    grid:\n      - [1, 999]\n      - [0, 2]\n', 'broken.yaml');
  await waitFor(() => /unknown tile id 999/.test(doc.querySelector('#diag').textContent));
  eq(g().levels.map(l => l.key).join(','), beforeBadFile.keys,
    'invalid picker file leaves the active level pack untouched');
  eq(doc.querySelector('#world-name').textContent, beforeBadFile.world,
    'invalid picker file leaves the active world name untouched');
  eq(g().state.player, beforeBadFile.player, 'invalid picker file leaves the current board state untouched');
  eq(g().state.strokes, beforeBadFile.strokes, 'invalid picker file leaves current strokes untouched');
  eq(doc.querySelectorAll('#board .cell').length, beforeBadFile.cells,
    'invalid picker file leaves board dimensions untouched');

  const pickerPack = mini.replace('Mini', 'Picker World').replace('mini-pack', 'picker-world');
  selectPackFile(pickerPack, 'picker-world.levels.yaml');
  await waitFor(() => doc.querySelector('#world-name').textContent === 'Picker World');
  eq(g().levels.length, 1, 'a valid picker file atomically replaces the loaded pack');
  const droppedPack = pickerPack.replace('Picker World', 'Dropped World').replace('picker-world', 'dropped-world');
  const dropEvent = new window.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(dropEvent, 'dataTransfer', {
    value: { files: [new window.File([droppedPack], 'dropped-world.yaml', { type: 'text/plain' })] }
  });
  doc.dispatchEvent(dropEvent);
  await waitFor(() => doc.querySelector('#world-name').textContent === 'Dropped World');
  eq(g().levels.length, 1, 'a valid drag-and-drop file replaces the active pack');

  SM.io.applyObject(SM.DEFAULT_LEVELS, 'levels.default.js', SM.YAML_HEADER);
  eq(SM.game.levels.length, 13, 'back to the built-in set');
  eq(doc.querySelector('#world-name').textContent, "Streuph's Maze",
    'returning to built-in levels restores the Prologue name');

  SM.STORE.reset();
  const directPack = [
    'name: "Direct Selection World"',
    'world_id: direct-selection-world',
    'num_level: 2',
    'levels:',
    '  level_1:',
    '    name: "First"',
    '    width: 2',
    '    height: 2',
    '    golf_score: 2',
    '    grid:',
    '      - [0, 2]',
    '      - [1, 0]',
    '  level_2:',
    '    name: "Uncleared Later Level"',
    '    width: 2',
    '    height: 2',
    '    golf_score: 1',
    '    grid:',
    '      - [2, 0]',
    '      - [1, 0]'
  ].join('\n');
  ok(SM.io.applyText(directPack), 'the two-level world pack is accepted');
  eq(SM.STORE.entry('level_2').cleared, undefined, 'the later test level has no completion record');
  const laterLevelButton = doc.querySelectorAll('#levels button')[1];
  ok(!laterLevelButton.disabled, 'an uncleared world-pack level is directly selectable');
  ok(/Uncleared Later Level/.test(laterLevelButton.textContent),
    'world-pack selector uses the level display name');
  laterLevelButton.click();
  eq(g().state.key, 'level_2', 'direct selection loads the uncleared later level');
  eq(doc.querySelector('#world-name').textContent, 'Direct Selection World',
    'the selected level remains under its active world name');
  doc.querySelector('#btn-reset-levels').click();
  eq(g().levels.length, 13, 'the built-in Prologue remains available after a world pack');
  eq(doc.querySelector('#world-name').textContent, "Streuph's Maze",
    'the built-in button returns from the world pack to the Prologue');

  /* ---- Sokoban crate/terrain composition ------------------------------- */
  const sokoban = [
    'name: "Sokoban overlay test"',
    'world_id: world-01-sokoban',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "Crate on target"',
    '    width: 6',
    '    height: 2',
    '    golf_score: 7',
    '    grid:',
    '      - [0, 0, 0, 0, 3, 3]',
    '      - [1, 70, 23, 0, 10, 2]'
  ].join('\n');
  ok(SM.io.applyText(sokoban), 'a Sokoban crate/target test pack loads');
  await waitFor(() => doc.querySelectorAll('#board .cell').length === 12);
  const crateSource = doc.querySelector('#board .cell[data-x="1"][data-y="0"]');
  const crateTarget = doc.querySelector('#board .cell[data-x="2"][data-y="0"]');
  const linkedGate = doc.querySelector('#board .cell[data-x="4"][data-y="0"]');
  const inactiveTargetMark = crateTarget.dataset.mark;
  const closedGateMark = linkedGate.dataset.mark;
  const initialTargetView = SM.RULES.describeTile(g().state, 2, 0);
  eq(initialTargetView.active, false, 'the unoccupied target is inactive in its read-only description');
  ok(!/fill-opacity="0\.8"/.test(inactiveTargetMark), 'the inactive target has an unfilled center');
  ok(linkedGate.classList.contains('wall'), 'the linked gate renders as closed initially');
  key('ArrowRight');
  await waitFor(() => !g().pending);
  eq(g().state.crates[0][2].id, 70, 'the crate moved onto the target');
  const sourceView = SM.RULES.describeTile(g().state, 1, 0);
  eq(sourceView.inst.name, 'floor', 'the crate source is described as floor');
  eq(sourceView.crate, null, 'the crate source has no remaining crate entity');
  ok(crateSource.innerHTML.trim() === '', 'the moved crate exposes its source floor visually');
  const targetView = SM.RULES.describeTile(g().state, 2, 0);
  eq(targetView.inst.family, 'target', 'the occupied cell retains its target terrain');
  eq(targetView.crate.id, 70, 'the read-only tile description exposes the crate overlay');
  eq(targetView.active, true, 'the occupied target is active in its read-only description');
  ok(crateTarget.dataset.mark !== inactiveTargetMark && /fill-opacity="0\.8"/.test(crateTarget.dataset.mark),
    'the occupied target has a visibly active glyph');
  const gateView = SM.RULES.describeTile(g().state, 4, 0);
  eq(gateView.locked, false, 'the target opens its linked phase wall in the rules state');
  ok(!linkedGate.classList.contains('wall') && linkedGate.dataset.mark !== closedGateMark,
    'the linked gate renders open after target occupancy');
  ok(/<circle/.test(crateTarget.innerHTML) && /<rect/.test(crateTarget.innerHTML) &&
     /<path/.test(crateTarget.innerHTML),
    'the occupied target renders both the target marks and crate glyph');

  g().load(0);
  ['ArrowRight', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight']
    .forEach(key);
  await waitFor(() => !g().pending);
  ok(g().state.won, 'the World 1 sample route reaches its exit');
  ok(!doc.querySelector('#win-picture-panel').hidden, 'the generated World 1 picture appears after victory');
  eq(doc.querySelector('#win-picture').alt, 'Solved World 1 board',
    'the generated picture has descriptive alternative text');
  const generatedSource = doc.querySelector('#win-picture').getAttribute('src') || '';
  ok(generatedSource.indexOf('data:image/svg+xml;charset=utf-8,') === 0,
    'a World 1 level without custom art uses an offline SVG snapshot');
  const generatedSvg = decodeURIComponent(generatedSource.split(',')[1] || '');
  ok(generatedSvg.indexOf('<circle cx="12" cy="12" r="9"') !== -1 &&
     generatedSvg.indexOf('M2 2 L22 22') !== -1,
    'the solved snapshot contains the target and final crate glyphs');
  g().restart();
  ok(doc.querySelector('#win-picture-panel').hidden && !doc.querySelector('#win-picture').hasAttribute('src'),
    'restart clears the generated snapshot');
  g().load(0);
  ok(doc.querySelector('#win-picture-panel').hidden && !doc.querySelector('#win-picture').hasAttribute('src'),
    'loading a level clears any previous victory snapshot');

  const customWorldPicture = SM.DEFAULT_LEVELS.levels.level_2.win_picture;
  const customSokoban = sokoban.replace('    golf_score: 7',
    '    golf_score: 7\n    win_picture: "' + customWorldPicture + '"');
  ok(SM.io.applyText(customSokoban), 'a World 1 level with custom PNG art loads');
  await waitFor(() => doc.querySelectorAll('#board .cell').length === 12);
  ['ArrowRight', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight']
    .forEach(key);
  await waitFor(() => !g().pending);
  ok(g().state.won, 'the custom-art World 1 sample route reaches its exit');
  eq(doc.querySelector('#win-picture').getAttribute('src'), customWorldPicture,
    'custom PNG art takes precedence over the generated World 1 snapshot');
  eq(doc.querySelector('#win-picture').alt, 'Custom level victory picture',
    'custom World 1 art retains its descriptive alternative text');

  SM.io.applyObject(SM.DEFAULT_LEVELS, 'levels.default.js', SM.YAML_HEADER);
  await waitFor(() => g().levels.length === 13 && doc.querySelectorAll('#board .cell').length === 25);

  /* ---- World 6 receiver indicators and shared crate overlays ------------ */
  const receiverBrowserPack = [
    'name: "Receiver Indicator Browser Test"',
    'world_id: world-06-goof-proximity',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "Four-Way Contact"',
    '    goal: "Matching crates light only their cardinal receiver indicators."',
    '    width: 5',
    '    height: 5',
    '    golf_score: 1',
    '    grid:',
    '      - [0, 0, 0, 0, 2]',
    '      - [0, 0, 71, 0, 0]',
    '      - [0, 71, 50, 71, 0]',
    '      - [0, 0, 71, 0, 0]',
    '      - [1, 0, 0, 0, 0]'
  ].join('\n');
  ok(SM.io.applyText(receiverBrowserPack),
    'a World 6 receiver fixture loads through the shared world-pack path');
  await waitFor(() => g().levels.length === 1 &&
    doc.querySelectorAll('#board .cell').length === 25);
  const receiverBrowserCell = (x, y) =>
    doc.querySelector('#board .cell[data-x="' + x + '"][data-y="' + y + '"]');
  const receiverBrowserView = SM.RULES.describeTile(g().state, 2, 2);
  eq([receiverBrowserView.inst.id, receiverBrowserView.active, receiverBrowserView.lit],
    [50, true, { n: true, e: true, s: true, w: true }],
  'all four orthogonal indicators are exposed by the read-only receiver view');
  const receiverMark = receiverBrowserCell(2, 2).dataset.mark;
  for (const direction of [
    { x: 12, y: 2, name: 'north' }, { x: 22, y: 12, name: 'east' },
    { x: 12, y: 22, name: 'south' }, { x: 2, y: 12, name: 'west' }
  ]) {
    ok(new RegExp('cx="' + direction.x + '" cy="' + direction.y +
      '" r="1\\.8" fill="' + SM.PALETTE.red + '"').test(receiverMark),
    'the rendered receiver visibly lights its ' + direction.name + ' indicator');
  }
  for (const crateCell of [{ x: 2, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 1, y: 2 }]) {
    const view = SM.RULES.describeTile(g().state, crateCell.x, crateCell.y);
    const element = receiverBrowserCell(crateCell.x, crateCell.y);
    eq([view.inst.family, view.crate.id], ['terrain', 71],
      'receiver fixture keeps the walkable terrain and crate as separate layers');
    ok(/<rect/.test(element.innerHTML),
      'the World 1 shared crate-overlay renderer visibly draws the adjacent crate');
  }
  const receiverGuide = fs.readFileSync(
    path.join(ROOT, 'docs/level-design/tile-mechanics.md'), 'utf8');
  ok(/receiver is not an occupancy target/i.test(receiverGuide),
  'receiver authoring semantics explicitly distinguish contact from occupancy');

  SM.io.applyObject(SM.DEFAULT_LEVELS, 'levels.default.js', SM.YAML_HEADER);
  await waitFor(() => g().levels.length === 13 && doc.querySelectorAll('#board .cell').length === 25);

  /* ---- World 5 chromatic pack: named selection, white, and gate feedback -- */
  const chromaticText = fs.readFileSync(
    path.join(ROOT, 'data/worlds/world-05-chips-chromatic.levels.yaml'), 'utf8');
  ok(SM.io.applyText(chromaticText), 'the World 5 pack loads through the shared UI path');
  await waitFor(() => g().levels.length === 8 &&
    doc.querySelector('#world-name').textContent === "Chip's Chromatic");
  eq(g().levels.map(level => level.name), [
    'The White Mark', 'Two Prisms', 'The Other Carrier', 'Guarded Spectrum',
    'Three-Way Filter', 'Chromatic Corridor', 'Commit to Green', 'Spectrum Nexus'
  ], 'the World 5 selector receives every named level');
  for (let index = 0; index < g().levels.length; index++) {
    const level = g().levels[index];
    const button = Array.from(doc.querySelectorAll('#levels button'))
      .find(candidate => candidate.textContent.includes(level.name));
    ok(!!button && !button.disabled,
      'World 5 level is directly selectable by name: ' + level.name);
    if (button) button.click();
    eq([g().state.key, g().levels[g().index].name],
      ['level_' + (index + 1), level.name],
      'direct selection loads World 5 level ' + (index + 1));
  }

  const whiteMark = Array.from(doc.querySelectorAll('#levels button'))
    .find(button => button.textContent.includes('The White Mark'));
  whiteMark.click();
  ok(/white is still white/i.test(doc.querySelector('#banner').textContent) &&
     /yellow-key role/i.test(doc.querySelector('#banner').textContent),
    'the World 5 tutorial explains the yellow analogy without renaming white');
  const firstChromatic = g().levels[0];
  firstChromatic.solve.path.forEach(action =>
    key(action.type === 'act' ? ' ' : keyFor[action.dir]));
  await waitFor(() => !g().pending);
  ok(g().state.won, 'the World 5 tutorial route reaches a matching-color goal');
  ok(!doc.querySelector('#win-picture-panel').hidden &&
     doc.querySelector('#win-picture').src.indexOf('data:image/svg+xml') === 0 &&
     doc.querySelector('#win-picture').alt === 'PASS',
    'World 5 without custom art uses the shared offline PASS fallback');

  const nexusButton = Array.from(doc.querySelectorAll('#levels button'))
    .find(button => button.textContent.includes('Spectrum Nexus'));
  nexusButton.click();
  eq([g().state.P, g().state.W], ['wht', 'wht'],
    'the mastery level begins with the existing white carrier state');
  eq(doc.querySelector('#player .aura').style.background, 'rgb(237, 234, 227)',
    'the mastery player aura renders with the existing neutral-white palette value');
  ok(SM.PALETTE.yellow === undefined,
    'the browser palette does not expose a yellow gameplay/display color');

  const feedbackPack = [
    'name: "Chromatic Gate Feedback"',
    'world_id: world-05-gate-feedback',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "White Cannot Pass Red"',
    '    width: 3',
    '    height: 2',
    '    golf_score: 6',
    '    grid:',
    '      - [0, 11, 20]',
    '      - [1, 31, 2]'
  ].join('\n');
  ok(SM.io.applyText(feedbackPack), 'the chromatic gate-feedback fixture loads offline');
  await waitFor(() => g().levels.length === 1 && g().state.key === 'level_1');
  key('ArrowRight');
  eq(g().state.strokes, 0, 'a wrong-color gate attempt does not charge a stroke');
  ok(/white mark will not open that gate; it wants red/i.test(doc.querySelector('#banner').textContent),
    'the UI reports the actual white-versus-red gate mismatch');
  g().levels[0].solve.path.forEach(action =>
    key(action.type === 'act' ? ' ' : keyFor[action.dir]));
  await waitFor(() => !g().pending);
  ok(g().state.won, 'the gate-feedback fixture remains solvable via its red prism and dial');

  SM.io.applyObject(SM.DEFAULT_LEVELS, 'levels.default.js', SM.YAML_HEADER);
  await waitFor(() => g().levels.length === 13 && doc.querySelectorAll('#board .cell').length === 25);

  /* ---- World 2 ray shielding, catch, and respawn ------------------------ */
  const rayPack = [
    'name: "Ray Browser Test"',
    'world_id: world-02-ray-test',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "Strategic Respawn"',
    '    width: 5',
    '    height: 3',
    '    golf_score: 7',
    '    grid:',
    '      - [3, 3, 3, 3, 3]',
    '      - [3, 0, 70, 23, 3]',
    '      - [1, 0, 81, 10, 2]'
  ].join('\n');
  ok(SM.io.applyText(rayPack), 'a World 2 ray/respawn browser pack loads');
  await waitFor(() => doc.querySelectorAll('#board .cell').length === 15);
  const rayPlayerCell = (x, y) => doc.querySelector('#board .cell[data-x="' + x + '"][data-y="' + y + '"]');
  ok(/Line of sight/.test(doc.querySelector('#tutorial').textContent) &&
      /no timer or sweeping beam/.test(doc.querySelector('#tutorial').textContent),
    'World 2 tutorial describes turn-based rays without timed or sweeping behavior');
  rayPlayerCell(2, 0).click();
  ok(/static ray points north/.test(doc.querySelector('#banner').textContent) &&
      /0 unobstructed cells/.test(doc.querySelector('#banner').textContent),
    'inspecting the emitter reports its direction and currently blocked ray');
  rayPlayerCell(2, 1).click();
  ok(/crate shields the north ray/.test(doc.querySelector('#banner').textContent),
    'inspecting the shielding crate reports its current ray effect');
  const initiallyShieldedCell = rayPlayerCell(2, 1);
  ok(!initiallyShieldedCell.dataset.ray && /<rect/.test(initiallyShieldedCell.innerHTML),
    'crate shielding stops the rendered ray at the crate');
  key('ArrowRight');
  await waitFor(() => !g().pending);
  key('ArrowUp');
  await waitFor(() => !g().pending);
  const resolveTurn = SM.RULES.resolveTurn;
  let caughtResult = null;
  SM.RULES.resolveTurn = function (state, action) {
    caughtResult = resolveTurn(state, action);
    return caughtResult;
  };
  key('ArrowRight');
  SM.RULES.resolveTurn = resolveTurn;
  await waitFor(() => !g().pending);
  ok(!!caughtResult && caughtResult.steps.some(step => step.type === 'ray' &&
      step.cells.some(cell => cell.x === 2 && cell.y === 1)),
    'resolver returns the settled ray path that reaches the player');
  ok(caughtResult && caughtResult.steps.some(step => step.type === 'caught') &&
      caughtResult.steps.some(step => step.type === 'respawn'),
    'resolver returns explicit catch and respawn steps');
  eq(g().state.player, { x: 0, y: 0 }, 'caught animation finishes with the player at the authored start');
  eq(g().state.crates[1][3].id, 70, 'caught animation preserves the crate pushed onto the target');
  eq(g().r.view.player, g().state.player, 'renderer mirror reaches the resolver final player state');
  eq(g().r.view.crates[1][3].id, 70, 'renderer mirror reaches the resolver final crate state');
  ok(rayPlayerCell(2, 1).dataset.ray === 'north' &&
      rayPlayerCell(2, 1).querySelector('.ray-beam'),
    'unshielded ray is visibly drawn through the vacated crate cell');
  ok(!rayPlayerCell(3, 1).dataset.ray && /<rect/.test(rayPlayerCell(3, 1).innerHTML),
    'the target crate visibly shields its own cell from the ray');
  ok(!doc.querySelector('#player').classList.contains('caught'),
    'respawn clears the transient caught presentation');

  const vectorPack = [
    'name: "Vector Browser Test"',
    'world_id: world-04-vector-test',
    'num_level: 2',
    'levels:',
    '  level_1:',
    '    name: "Belt into Ice"',
    '    width: 6',
    '    height: 1',
    '    golf_score: 2',
    '    grid:',
    '      - [1, 64, 5, 5, 0, 2]',
    '  level_2:',
    '    name: "Pushed Ice Block"',
    '    width: 7',
    '    height: 3',
    '    golf_score: 7',
    '    grid:',
    '      - [0, 0, 0, 0, 0, 0, 2]',
    '      - [0, 0, 0, 0, 0, 0, 0]',
    '      - [1, 0, 71, 5, 5, 0, 0]'
  ].join('\n');
  ok(SM.io.applyText(vectorPack), 'a World 4 belt-and-ice pack loads through the shared workflow');
  await waitFor(() => g().levels.length === 2 && doc.querySelectorAll('#board .cell').length === 6);

  g().load(0);
  let playerForceResult = null;
  const resolveVectorTurn = SM.RULES.resolveTurn;
  SM.RULES.resolveTurn = function (state, action) {
    playerForceResult = resolveVectorTurn(state, action);
    return playerForceResult;
  };
  key('ArrowRight');
  SM.RULES.resolveTurn = resolveVectorTurn;
  await waitFor(() => !g().pending);
  eq(g().state.player, { x: 4, y: 0 }, 'player belt and ice chain reaches its safe stopping cell');
  eq(playerForceResult.steps.filter(step => step.type === 'move').length, 4,
    'resolver returns each player belt-to-ice hop for playback');
  eq(g().r.view.player, g().state.player,
    'renderer mirror finishes the player chain at the resolver position');
  eq(g().state.strokes, 1, 'player belt-to-ice animation costs one stroke');

  g().load(1);
  key('ArrowRight');
  await waitFor(() => !g().pending);
  let crateForceResult = null;
  SM.RULES.resolveTurn = function (state, action) {
    crateForceResult = resolveVectorTurn(state, action);
    return crateForceResult;
  };
  key('ArrowRight');
  SM.RULES.resolveTurn = resolveVectorTurn;
  await waitFor(() => !g().pending);
  eq(crateForceResult.steps.filter(step => step.type === 'push').map(step =>
    [step.crate.x, step.to.x]), [[2, 3], [3, 4], [4, 5]],
  'resolver returns the direct push and both forced crate-slide hops');
  eq(g().state.player, { x: 2, y: 0 }, 'player follows the pushed crate into its former cell');
  eq(g().state.crates[0][5].id, 71, 'rules state retains the crate at its final ice-slide cell');
  eq(g().r.view.player, g().state.player,
    'renderer mirror finishes the pushed player at the resolver position');
  eq(g().r.view.crates[0][5].id, 71,
    'renderer mirror replays every forced crate hop to the resolver position');
  key('z');
  eq([g().state.player.x, g().state.crates[0][2].id, g().state.strokes], [1, 71, 1],
    'undo restores the pre-push player, crate, and stroke count after an ice chain');
  eq(g().r.view.crates[0][2].id, 71,
    'undo redraws the crate at its restored pre-force position');

  /* ---- World 3 polarity barriers and explicit ACT ---------------------- */
  const polarityPack = [
    'name: "Polarity Browser Test"',
    'world_id: world-03-polarity-test',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "Flip the route"',
    '    goal: "Reach the crystal and ACT to exchange the open barrier."',
    '    initial_polarity: red-open',
    '    width: 4',
    '    height: 2',
    '    golf_score: 6',
    '    grid:',
    '      - [0, 48, 0, 3]',
    '      - [1, 46, 47, 2]'
  ].join('\n');
  ok(SM.io.applyText(polarityPack), 'a World 3 polarity browser pack loads through the shared workflow');
  await waitFor(() => g().levels.length === 1 && doc.querySelectorAll('#board .cell').length === 8);
  const polarityCell = (x, y) => doc.querySelector('#board .cell[data-x="' + x + '"][data-y="' + y + '"]');
  const redBarrierCell = polarityCell(1, 0);
  const blueBarrierCell = polarityCell(2, 0);
  const crystalCell = polarityCell(1, 1);
  eq([g().state.polarity, redBarrierCell.className, blueBarrierCell.className],
    ['red-open', 'cell', 'cell wall'],
  'World 3 renders red-open/blue-closed barriers from resolver state');
  const redOpenCrystalGlyph = crystalCell.innerHTML;
  redBarrierCell.click();
  ok(/Red polarity barrier/.test(doc.querySelector('#banner').textContent) &&
      /open under red-open/.test(doc.querySelector('#banner').textContent),
    'World 3 barrier inspection reports its class, open state, and current polarity');
  key('ArrowRight');
  await waitFor(() => !g().pending);
  key('ArrowUp');
  await waitFor(() => !g().pending);
  eq(g().state.player, { x: 1, y: 1 }, 'player reaches the explicit crystal switch');
  key(' ');
  await waitFor(() => !g().pending);
  eq([g().state.polarity, redBarrierCell.className, blueBarrierCell.className],
    ['blue-open', 'cell wall', 'cell'],
  'ACT immediately exchanges the visible red and blue barrier states');
  ok(crystalCell.innerHTML !== redOpenCrystalGlyph && g().r.view.polarity === 'blue-open',
    'renderer mirror and crystal glyph both reflect blue-open after ACT');
  key('z');
  eq([g().state.polarity, redBarrierCell.className, blueBarrierCell.className,
    crystalCell.innerHTML === redOpenCrystalGlyph, g().state.strokes],
    ['red-open', 'cell', 'cell wall', true, 2],
  'undo restores the previous polarity, both gate glyphs, switch glyph, and stroke count');

  const world3Text = fs.readFileSync(
    path.join(ROOT, 'data/worlds/world-03-hyrule-flip-flop.levels.yaml'), 'utf8');
  ok(SM.io.applyText(world3Text), 'the complete World 3 pack loads through the shared UI path');
  await waitFor(() => g().levels.length === 8 && doc.querySelectorAll('#board .cell').length === 25);
  const world3LevelButtons = doc.querySelectorAll('#levels button');
  world3LevelButtons[7].click();
  await waitFor(() => g().state.key === 'level_8' &&
    doc.querySelectorAll('#board .cell').length === 144);
  eq([g().state.level.name, doc.querySelector('#world-name').textContent],
    ['Grand Inversion', 'World 3: Hyrule Flip-Flop'],
  'all World 3 levels, including mastery, are directly selectable in the shared picker');
  world3LevelButtons[6].click();
  await waitFor(() => g().state.key === 'level_7' &&
    doc.querySelectorAll('#board .cell').length === 144);
  for (const direction of ['ArrowRight', 'ArrowUp', 'ArrowRight', 'ArrowRight', ' ']) {
    key(direction);
    await waitFor(() => !g().pending);
  }
  const closedCrateBarrier = doc.querySelector(
    '#board .cell[data-x="2"][data-y="1"]');
  eq([g().state.polarity, g().state.crates[1][2].id,
    closedCrateBarrier.className, !!closedCrateBarrier.querySelector('svg')],
  ['blue-open', 70, 'cell wall', true],
  'World 3 browser route leaves a crate visible on the red barrier closed by ACT');
  key('z');
  eq([g().state.polarity, g().state.crates[1][2].id, closedCrateBarrier.className],
    ['red-open', 70, 'cell'],
  'undo reopens the barrier while restoring the crate on it');

  const blockedPushPack = [
    'name: "World 3 Closed-Barrier Push Test"',
    'world_id: world-03-closed-push-test',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "Do not push into blue"',
    '    goal: "A blue barrier is closed while red is open."',
    '    initial_polarity: red-open',
    '    width: 4',
    '    height: 1',
    '    golf_score: 1',
    '    grid:',
    '      - [1, 70, 47, 2]'
  ].join('\n');
  ok(SM.io.applyText(blockedPushPack), 'World 3 closed-barrier push fixture loads in the browser');
  await waitFor(() => g().levels.length === 1 && doc.querySelectorAll('#board .cell').length === 4);
  key('ArrowRight');
  eq([g().state.player, g().state.crates[0][1].id, g().state.strokes],
    [{ x: 0, y: 0 }, 70, 0],
  'player cannot push a crate into the initially closed blue barrier in the browser');
  SM.io.applyObject(SM.DEFAULT_LEVELS, 'levels.default.js', SM.YAML_HEADER);
  await waitFor(() => g().levels.length === 13 && doc.querySelectorAll('#board .cell').length === 25);

  const pullPack = [
    'name: "Pull Browser Test"',
    'world_id: pull-browser-test',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "Pull the crate"',
    '    width: 5',
    '    height: 1',
    '    golf_score: 3',
    '    object_overrides:',
    '      A1: { pullable: true }',
    '    grid:',
    '      - [70, 1, 0, 0, 2]'
  ].join('\n');
  ok(SM.io.applyText(pullPack), 'a pull interaction browser pack loads');
  await waitFor(() => doc.querySelectorAll('#board .cell').length === 5);
  key('ArrowRight', { shiftKey: true });
  await waitFor(() => !g().pending);
  eq(g().state.player, { x: 2, y: 0 }, 'Shift+direction advances the player while pulling');
  eq(g().state.crates[0][1].id, 70, 'Shift+direction pulls the crate into the vacated cell');
  eq(g().state.strokes, 1, 'the pull and player step cost one stroke');

  const targetPack = [
    'name: "Movable Target Browser Test"',
    'world_id: movable-target-browser-test',
    'num_level: 1',
    'levels:',
    '  level_1:',
    '    name: "Move the target"',
    '    width: 5',
    '    height: 1',
    '    golf_score: 4',
    '    object_overrides:',
    '      B1: { pushable: true }',
    '    grid:',
    '      - [1, 23, 0, 0, 2]'
  ].join('\n');
  ok(SM.io.applyText(targetPack), 'a movable-target browser pack loads');
  await waitFor(() => doc.querySelectorAll('#board .cell').length === 5);
  key('ArrowRight');
  await waitFor(() => !g().pending);
  const targetRecord = g().state.switches.find(sw => sw.inst.family === 'target');
  eq([targetRecord.x, targetRecord.y, g().state.player.x], [2, 0, 1],
    'player pushes the target entity while entering its former cell');
  eq(g().r.view.switches.find(sw => sw.inst.family === 'target').x, 2,
    'renderer mirror replays the target movement event');
  const movedTargetCell = doc.querySelector('#board .cell[data-x="2"][data-y="0"]');
  ok(movedTargetCell.querySelector('circle'), 'target glyph is drawn at its moved location');
  movedTargetCell.click();
  ok(/movable floor target/.test(doc.querySelector('#banner').textContent) &&
      /link 1/.test(doc.querySelector('#banner').textContent),
    'target inspection reports its movement role and linked behavior');
  key('z');
  eq(g().state.switches.find(sw => sw.inst.family === 'target').x, 1,
    'undo restores the target position');
  eq(g().r.view.switches.find(sw => sw.inst.family === 'target').x, 1,
    'renderer mirror matches the restored target position');

  SM.io.applyObject(SM.DEFAULT_LEVELS, 'levels.default.js', SM.YAML_HEADER);
  await waitFor(() => g().levels.length === 13 && doc.querySelectorAll('#board .cell').length === 25);

  /* ---- levels.yaml on disk --------------------------------------------- */
  const onDisk = path.join(ROOT, 'data', 'levels.yaml');
  ok(fs.existsSync(onDisk), 'data/levels.yaml exists');
  if (fs.existsSync(onDisk)) {
    const fromDisk = SM.LEVELS.load(fs.readFileSync(onDisk, 'utf8'), { solve: true });
    eq(fromDisk.problems.length, 0, 'the shipped levels.yaml validates',
      fromDisk.problems.map(p => p.level + ': ' + p.message).join(' | '));
    eq(fromDisk.levels.length, 13, 'the shipped levels.yaml has all 13 levels');
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
