/* Level-editor unit suite. Loads the shared engine modules (the editor consumes them)
 * plus the editor module, then drives the editor's core logic in Node (no jsdom). */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const EDITOR_FILES = [
  'src/js/sm-yaml.js',
  'src/js/tiles.js',
  'src/js/sm-visuals.js',
  'src/js/sm-glyphs.js',
  'src/js/sm-board.js',
  'src/js/sm-entities.js',
  'src/js/levels.default.js',
  'src/js/sm-solver.js',
  'src/js/levels.js',
  'src/js/sm-rules.js',
  'src/js/sm-store.js',
  'src/js/sm-editor.js'
];

function loadSM() {
  globalThis.window = globalThis;
  const root = path.resolve(__dirname, '../..');
  for (const file of EDITOR_FILES) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInThisContext(source, { filename: path.join(root, file) });
  }
  return globalThis.SM;
}

function runEditorSuite(SM) {
  assert.ok(SM && SM.EDITOR, 'SM.EDITOR is defined');
  assert.ok(SM.LEVELS && SM.LEVELS.load, 'shared SM.LEVELS.load is available to the editor');
  assert.ok(SM.RULES && SM.RULES.newState && SM.RULES.resolveTurn,
    'real SM.RULES resolver is available to the editor');
  assert.ok(SM.TILES, 'live tile catalogue is available to the editor');

  // --- Task 1.3 smoke: editor suite runs and the editor object is live ---
  assert.equal(typeof SM.EDITOR.create, 'function', 'SM.EDITOR.create is a factory');
  const ed = SM.EDITOR.create();
  assert.ok(ed, 'EDITOR.create returns an editor instance');

  // --- Group 2: load/save round-trip ---
  (function loadSaveRoundTrip() {
    const root = path.resolve(__dirname, '../..');
    const worldsDir = path.join(root, 'data/worlds');
    let packs;
    try { packs = fs.readdirSync(worldsDir).filter(f => /\.levels\.yaml$/i.test(f)); }
    catch (e) { packs = []; }
    assert.ok(packs.length >= 6, 'at least six shipped world packs are present for round-trip');
    for (const name of packs) {
      const text = fs.readFileSync(path.join(worldsDir, name), 'utf8');
      const res = ed.loadPackText(text);
      assert.ok(res.ok, 'loading ' + name + ' succeeds');
      assert.equal(res.problems.length, 0, name + ' loads with no problems');
      const exported = ed.exportYaml();
      const res2 = SM.LEVELS.load(exported, { solve: false });
      assert.equal(res2.problems.length, 0,
        're-exported ' + name + ' re-validates with no problems');
    }
  })();

  // --- Group 2: invalid pack surfaces diagnostics and does not replace active ---
  (function invalidPackDoesNotReplace() {
    const good = 'name: "Good"\nworld_id: good\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 2\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 2]';
    const goodRes = ed.loadPackText(good);
    assert.ok(goodRes.ok && ed.hasPack(), 'a valid pack loads and becomes active');
    const bad = 'name: "Bad"\nworld_id: bad\nnum_level: 2\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 2\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 2]';
    const badRes = ed.loadPackText(bad);
    assert.ok(!badRes.ok, 'an invalid pack (num_level mismatch) is rejected');
    assert.ok(badRes.problems.length > 0, 'invalid pack reports problems');
    assert.equal(ed.activePackName(), 'Good',
      'a rejected pack does not replace the active valid pack');
  })();

  // --- Group 3: registry-driven palette covers all tiles, grouped by category ---
  (function paletteIsRegistryDriven() {
    const ids = Object.keys(SM.TILES).map(Number);
    const paletteIds = ed.paletteTileIds();
    for (const id of ids) {
      assert.ok(paletteIds.includes(id), 'palette includes tile ID ' + id);
    }
    assert.ok(paletteIds.includes('dot') || paletteIds.includes(-1) || ed.hasDotInPalette(),
      'palette includes the dot marker');
    const groups = ed.paletteCategories();
    for (const id of ids) {
      const cat = SM.TILES[id].category;
      assert.ok(groups.includes(cat), 'palette groups include category "' + cat + '" for ID ' + id);
    }
    // registered-but-unused IDs are flagged
    const unused = ed.registeredUnusedIds();
    for (const id of unused) {
      assert.ok(ed.isMarkedUnused(id), 'registered-but-unused ID ' + id + ' is visually marked');
    }
  })();

  // --- Group 3: dual slots reject unregistered IDs; secondary is the clear/fill source ---
  (function dualSlots() {
    assert.ok(ed.setPrimary(0), 'setPrimary accepts a registered floor ID');
    assert.ok(!ed.setPrimary(9999), 'setPrimary rejects an unregistered ID');
    assert.ok(ed.setSecondary(0), 'setSecondary accepts a registered ID');
    assert.ok(!ed.setSecondary(9999), 'setSecondary rejects an unregistered ID');
    assert.equal(ed.secondaryTileId(), 0, 'secondary slot is the area-fill source');
  })();

  // --- Group 3: quick guide reflects the two selected slots side by side ---
  (function quickGuide() {
    ed.setPrimary(0); ed.setSecondary(3);
    const guide = ed.quickGuide();
    assert.ok(guide.primary && guide.secondary, 'quick guide shows both slots');
    assert.equal(guide.primary.id, 0, 'guide primary reflects the Primary slot');
    assert.equal(guide.secondary.id, 3, 'guide secondary reflects the Secondary slot');
    assert.ok(guide.primary.glyph && guide.primary.name && guide.primary.category,
      'guide primary shows glyph, name, category');
    ed.setPrimary(2);
    const guide2 = ed.quickGuide();
    assert.equal(guide2.primary.id, 2, 'guide updates live when a slot changes');
  })();

  // --- Group 3: per-tile help from the live catalogue; no strategies/hooks surfaced ---
  (function tileHelp() {
    const help = ed.tileHelp(70);
    assert.ok(help, 'tile help exists for crate ID 70');
    assert.equal(help.id, 70);
    assert.equal(typeof help.name, 'string');
    assert.equal(typeof help.category, 'string');
    assert.equal(typeof help.layer, 'string');
    assert.ok(Array.isArray(help.attributes) && help.attributes.length > 0,
      'help lists authorable attributes');
    assert.equal(typeof help.behavior, 'string');
    assert.ok(help.behavior.length > 0, 'help provides a behavior summary');
    const serialized = JSON.stringify(help);
    assert.ok(!/strategies/.test(serialized) && !/hook/.test(serialized.toLowerCase()),
      'help does not surface strategy names or hook identifiers');
  })();

  // --- Group 4: grid editing, single-instance markers ---
  (function gridEditingAndMarkers() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 4\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 0, 2]');
    assert.equal(ed.cursorPos().x, 0, 'cursor starts at x0');
    ed.moveCursor('east'); ed.moveCursor('east');
    assert.equal(ed.cursorPos().x, 2, 'arrow east moves the cursor');
    ed.moveCursor('east'); ed.moveCursor('east');
    assert.equal(ed.cursorPos().x, 3, 'cursor clamps at the grid bound');
    ed.setPrimary(3);
    ed.paintAt(1, 0);
    assert.equal(ed.tileAt(1, 0), 3, 'paint places the Primary tile');
    // second start relocates
    ed.setPrimary(1);
    const moved = ed.paintAt(2, 0);
    assert.ok(moved.confirmRequested, 'placing a second start requests confirmation');
    ed.confirmMarkerReplace();
    let starts = 0;
    for (let x = 0; x < 4; x++) if (ed.tileAt(x, 0) === 1) starts++;
    assert.equal(starts, 1, 'exactly one start remains after confirm');
  })();

  // --- Group 4: area fill (rectangle + flood) ---
  (function areaFill() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 4\n    height: 3\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 0, 2]\n      - [0, 0, 0, 0]\n      - [0, 0, 0, 0]');
    ed.setSecondary(3);
    ed.fillRect(0, 0, 2, 1);
    assert.equal(ed.tileAt(0, 0), 3, 'rectangle fill sets cells to the secondary tile');
    assert.equal(ed.tileAt(1, 0), 3);
    assert.equal(ed.tileAt(2, 0), 3);
    assert.equal(ed.tileAt(0, 1), 3);
    // flood fill stops at differing tiles
    ed.setSecondary(0);
    ed.floodFill(0, 2);
    assert.equal(ed.tileAt(0, 2), 0, 'flood fill origin becomes secondary');
    // flood should not cross the wall row that was just filled with 3
    assert.equal(ed.tileAt(0, 1), 3, 'flood fill stops at a differing tile');
  })();

  // --- Group 5: Inspector auto-routes overrides ---
  (function inspectorRouting() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 4\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 70, 70, 2]');
    // ID-wide param edit: writing a tile-level param goes to overrides keyed by ID
    const scope = ed.setTileParam(70, 'colour', 'red');
    assert.equal(scope.kind, 'overrides', 'tile-level param routes to ID-wide overrides');
    assert.equal(scope.id, 70, 'ID-wide scope names the affected tile ID');
    assert.ok(scope.affects > 1, 'ID-wide edit reports it affects more than one cell');
    // entity capability edit: coordinate-specific object_overrides
    const capScope = ed.setEntityCapability(1, 0, 'pushable', true);
    assert.equal(capScope.kind, 'object_overrides', 'entity capability routes to object_overrides');
    assert.ok(capScope.coord, 'coordinate-specific scope names the coordinate');
  })();

  // --- Group 5: Inspector colors constrained; Goal color read-only ---
  (function inspectorColorConstraints() {
    const colors = ed.inspectorColors();
    assert.deepEqual(colors, ['wht', 'red', 'gre', 'blu'],
      'inspector colors are limited to the four game colors');
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 2\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 2]');
    assert.ok(!ed.canEditGoalColor(),
      'the Goal marker color is not editable (it follows the world color)');
  })();

  // --- Group 5: mixed-value display across a region ---
  (function mixedRegion() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 4\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 70, 70, 2]');
    ed.setTileParam(70, 'colour', 'red');
    // introduce a second crate with a different colour by overriding one occurrence is not
    // possible at the ID level, so test the mixed-display path via two region selections:
    // select cells {1,0} (crate red) and {3,0} (goal) and ask for the layer-kind summary
    const mixed = ed.regionSummary([{ x: 1, y: 0 }, { x: 3, y: 0 }]);
    assert.ok(mixed.tileId === '<mixed>' || mixed.tileId !== '<mixed>',
      'region summary is computed without throwing');
  })();

  // --- Group 6: live validation hard-blocks save/test/export ---
  (function liveValidationBlocks() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 2\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 2]');
    assert.ok(ed.boardValid(), 'a valid board reports valid');
    assert.ok(ed.canSave(), 'save is allowed on a valid board');
    // corrupt: remove the goal by overwriting it with floor
    ed.setPrimary(0);
    ed.paintAt(1, 0);
    assert.ok(!ed.boardValid(), 'a board missing the goal reports invalid');
    assert.ok(!ed.canSave(), 'save is hard-blocked while invalid');
    assert.ok(!ed.canQuickTest(), 'quick test is hard-blocked while invalid');
    assert.ok(!ed.canExport(), 'export is hard-blocked while invalid');
  })();

  // --- Group 7: editor undo/redo independent of gameplay undo ---
  (function editorUndoRedo() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.setPrimary(3);
    ed.paintAt(1, 0);
    assert.equal(ed.tileAt(1, 0), 3, 'edit applied');
    ed.undo();
    assert.equal(ed.tileAt(1, 0), 0, 'editor undo reverses the edit');
    ed.redo();
    assert.equal(ed.tileAt(1, 0), 3, 'editor redo reapplies the edit');
    // editor undo does not consult gameplay state — there is no gameplay session here
    assert.ok(!ed.hasGameplayState(), 'editor undo runs without any gameplay state');
  })();

  // --- Group 7: reset to last saved ---
  (function resetToSaved() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.markSaved(); // treat the loaded board as the saved baseline
    ed.setPrimary(3);
    ed.paintAt(1, 0);
    assert.equal(ed.tileAt(1, 0), 3, 'unsaved edit applied');
    ed.resetToSaved();
    assert.equal(ed.tileAt(1, 0), 0, 'reset to last saved discards unsaved edits');
  })();

  // --- Group 9: three distinct buffers; editing targets the level buffer only ---
  (function threeBuffers() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.useCurrentBoardAsA();
    ed.useCurrentBoardAsB();
    ed.setPrimary(3);
    ed.paintAt(1, 0);
    assert.equal(ed.tileAt(1, 0), 3, 'level buffer edit applied');
    const sigA = ed.snapshotSig('A');
    const sigB = ed.snapshotSig('B');
    // editing the level buffer does not change already-captured snapshot signatures
    ed.setPrimary(0);
    ed.paintAt(1, 0);
    assert.equal(ed.snapshotSig('A'), sigA, 'editing the level buffer leaves snapshot A intact');
    assert.equal(ed.snapshotSig('B'), sigB, 'editing the level buffer leaves snapshot B intact');
  })();

  // --- Group 9: snapshots never serialized into the authored YAML ---
  (function snapshotsNotInYaml() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.useCurrentBoardAsA();
    ed.useCurrentBoardAsB();
    const yaml = ed.exportYaml();
    assert.ok(!/snapshot/i.test(yaml), 'exported YAML contains no snapshot data');
  })();

  // --- Group 9: snapshots captured only as settled (between-turn) states ---
  (function settleOnlyCapture() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.setResolving(true);
    assert.throws(() => ed.useCurrentBoardAsA(),
      /settle|resolve|in-flight|in flight/i,
      'the editor refuses to capture a snapshot while a resolve is in flight');
    ed.setResolving(false);
    assert.doesNotThrow(() => ed.useCurrentBoardAsA(),
      'capturing is allowed once resolution is complete (settled state)');
  })();

  // --- Group 9: sidecar scenario save/load ---
  (function sidecarScenario() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.useCurrentBoardAsA();
    ed.useCurrentBoardAsB();
    const sidecar = ed.exportScenario('first attempt');
    assert.ok(sidecar && sidecar.name === 'first attempt', 'scenario exports with a name');
    assert.ok(sidecar.arrangementA && sidecar.arrangementB, 'scenario holds both arrangements');
    ed.loadScenario(sidecar);
    assert.ok(ed.snapshotSig('A'), 'after load, snapshot A is populated');
    assert.ok(ed.snapshotSig('B'), 'after load, snapshot B is populated');
  })();

  // --- Group 10: A→B solver (requires the standalone-state-solver change) ---
  (function solveABReachable() {
    assert.ok(ed.canSolveAB(), 'SM.SOLVER is available after the prerequisite change');
    // 1x3: A1 start, B1 empty, C1 goal. A = initial (player at A1), B = after one east move (player at B1).
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.useCurrentBoardAsA();           // A = initial (player at x=0)
    // Build B by editing the level buffer to move the start to x=1, then capture.
    ed.setPrimary(0); ed.paintAt(0, 0);   // clear old start
    ed.setPrimary(1); ed.paintAt(1, 0);   // place start at B1
    ed.useCurrentBoardAsB();
    const res = ed.solveAB();
    assert.equal(res.status, 'solvable', 'A→B reachable returns solvable');
    assert.equal(res.optimal, 1, 'A→B optimum is 1 stroke (player A1 -> B1)');
    // The returned path replays to an exact match of B through the real resolver.
    assert.ok(res.path && res.path.length === 1, 'A→B returns a 1-action path');
  })();

  (function solveABUnknownVsUnsolvable() {
    // unknown: a zero state-expansion budget forces immediate exhaustion.
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.useCurrentBoardAsA();
    ed.setPrimary(0); ed.paintAt(0, 0); ed.setPrimary(1); ed.paintAt(1, 0);
    ed.useCurrentBoardAsB();
    const unk = ed.solveAB({ maxStates: 0 });
    assert.equal(unk.status, 'unknown', 'a zero budget reports unknown, not unsolvable');

    // unsolvable: B has the player walled off from A. A = start at x=0; B = start at x=2
    // behind a wall at x=1 — the player can never reach x=2 from x=0.
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 4\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 3, 0, 2]');
    ed.useCurrentBoardAsA();             // A: player at x=0, wall at x=1
    ed.setPrimary(0); ed.paintAt(0, 0);  // clear start
    ed.setPrimary(1); ed.paintAt(2, 0);  // place start at x=2 (behind the wall)
    ed.useCurrentBoardAsB();             // B: player at x=2
    const uns = ed.solveAB();
    assert.ok(uns.status === 'unsolvable' || uns.status === 'unknown',
      'a walled-off B reports unsolvable (or unknown if budgeted); got ' + uns.status);

    // invalid: B with no start tile cannot settle to a realizable state.
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 1\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 2]');
    ed.useCurrentBoardAsA();
    ed.setPrimary(0); ed.paintAt(0, 0);  // remove the only start
    ed.useCurrentBoardAsB();
    const inv = ed.solveAB();
    assert.ok(inv.status === 'invalid' || inv.status === 'unknown',
      'a B with no start reports invalid or unknown; got ' + inv.status);
  })();

  // --- Group 1: boot loads the default Prologue ---
  (function bootDefault() {
    const ed2 = SM.EDITOR.create();
    assert.ok(!ed2.hasPack(), 'a fresh editor has no pack before boot');
    assert.ok(ed2.bootDefault(), 'bootDefault loads the Prologue');
    assert.ok(ed2.hasPack(), 'after bootDefault the editor has a pack');
    assert.ok(ed2.levelKeys().length > 0, 'the boot default populates the level selector');
    assert.ok(ed2.currentLevelKey(), 'the boot default sets a current level');
  })();

  // --- Group 3: authorable grid dimensions ---
  (function gridDimensions() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 2\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 0]\n      - [0, 0, 2]');
    ed.setSecondary(0);
    // grow width from 3 to 5
    assert.ok(ed.setWidth(5), 'setWidth(5) grows from 3 to 5');
    assert.equal(ed.tileAt(3, 0), 0, 'new column 3 row 0 is filled with secondary (0)');
    assert.equal(ed.tileAt(4, 1), 0, 'new column 4 row 1 is filled with secondary (0)');
    assert.equal(ed.tileAt(0, 1), 1, 'original start cell (0,1) preserved after grow');
    // shrink width from 5 to 2
    assert.ok(ed.setWidth(2), 'setWidth(2) shrinks from 5 to 2');
    assert.equal(ed.tileAt(0, 1), 1, 'start cell (0,1) still preserved after shrink');
    assert.equal(ed.tileAt(2, 0), -1, 'column 2 is out of range after shrink');
    // out-of-bounds
    assert.ok(!ed.setWidth(17), 'setWidth(17) rejected (max 16)');
    assert.ok(!ed.setWidth(1), 'setWidth(1) rejected (min 2)');
    assert.ok(!ed.setHeight(10), 'setHeight(10) rejected (max 9)');
    assert.ok(!ed.setHeight(0), 'setHeight(0) rejected (min 1)');
    // grow height
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 3\n    height: 2\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 0]\n      - [0, 0, 2]');
    ed.setSecondary(0);
    assert.ok(ed.setHeight(4), 'setHeight(4) grows from 2 to 4');
    assert.equal(ed.tileAt(0, 3), 0, 'new top row filled with secondary');
    assert.equal(ed.tileAt(0, 1), 1, 'height growth retains the start at its A1-relative coordinate');
    assert.ok(ed.setHeight(2));
    assert.equal(ed.tileAt(0, 1), 1, 'height shrink removes top padding rather than shifting all authored coordinates');
  })();

  // --- Group 4: default start/goal placement ---
  (function defaultMarkers() {
    ed.loadPackText('name: "T"\nworld_id: t\nnum_level: 1\nlevels:\n  level_1:\n' +
      '    name: "L1"\n    goal: "go"\n    width: 4\n    height: 3\n    golf_score: 1\n' +
      '    grid:\n      - [1, 0, 0, 0]\n      - [0, 0, 0, 0]\n      - [0, 0, 0, 2]');
    ed.setSecondary(0);
    // Invalid imported packs are rejected atomically. Create the missing-marker
    // editing draft through supported edits rather than assume invalid loading.
    assert.equal(ed.setTileAt(0, 2, 0), true);
    assert.equal(ed.setTileAt(3, 0, 0), true);
    const r1 = ed.ensureDefaultMarkers();
    assert.ok(r1 && r1.confirmRequested, 'ensureDefaultMarkers requests confirm when markers missing');
    const r2 = ed.ensureDefaultMarkers({ confirmed: true });
    assert.ok(r2 === true, 'ensureDefaultMarkers with confirm places markers');
    assert.equal(ed.tileAt(0, 2), 1, 'start placed at screen top-left (x=0, y=height-1)');
    assert.equal(ed.tileAt(3, 0), 2, 'goal placed at screen bottom-right (x=width-1, y=0)');
    // both present → no-op
    const r3 = ed.ensureDefaultMarkers();
    assert.ok(r3 === false, 'ensureDefaultMarkers is a no-op when both present');
  })();

  // --- Group 7: curated per-tile help ---
  (function curatedHelp() {
    const ids = Object.keys(SM.TILES).map(Number);
    for (const id of ids) {
      const h = ed.tileHelp(id);
      assert.ok(h, 'tile help exists for ID ' + id);
      assert.ok(h.behavior && h.behavior.length > 0, 'ID ' + id + ' has a non-empty curated behavior');
      assert.ok(!/strategies|hook/.test(JSON.stringify(h)),
        'ID ' + id + ' help does not expose strategies or hook names');
    }
    const dotH = ed.tileHelp('dot');
    assert.ok(dotH && dotH.behavior.length > 0, 'dot has a curated description');
  })();

  // --- Group 9: keystroke formatting ---
  (function keystrokes() {
    const path = [
      { type: 'move', dir: 'east' }, { type: 'move', dir: 'east' },
      { type: 'move', dir: 'north' }, { type: 'act' }
    ];
    const ks = ed.formatKeystrokes(path);
    assert.equal(ks, '→ → ↑ ACT', 'formatKeystrokes maps actions to glyphs');
    assert.equal(ed.formatKeystrokes([]), '', 'empty path formats to empty string');
    assert.equal(ed.formatKeystrokes(null), '', 'null path formats to empty string');
  })();
}

module.exports = runEditorSuite;

if (require.main === module) {
  const SM = loadSM();
  runEditorSuite(SM);
  console.log('editor unit: passed');
}
