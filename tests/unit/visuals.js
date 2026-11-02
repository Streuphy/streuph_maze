'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
module.exports = function (SM) {
  if (!SM.VISUALS) vm.runInThisContext(fs.readFileSync(require('node:path').join(__dirname, '../../src/js/sm-visuals.js'), 'utf8'));
  const V = SM.VISUALS;
  if (!SM.SPRITES) vm.runInThisContext(fs.readFileSync(require('node:path').join(__dirname, '../../src/js/sm-sprites.js'), 'utf8'));
  for (const tile of Object.values(SM.TILES).concat(SM.DOT_DEFINITION)) {
    const before = JSON.stringify(tile);
    for (const P of SM.GAME_COLOURS) for (const W of SM.GAME_COLOURS) {
      const d = V.describe(tile, { P, W, pendingClose: true, solid: false, requestedSolid: true });
      assert.ok(d.key); assert.ok(V.label(d).includes('pending close'));
      if (tile.levelRole === 'goal') assert.equal(d.colour, W);
      if (tile.entityRole === 'dot') assert.equal(d.colour, P);
    }
    assert.equal(JSON.stringify(tile), before);
    const descriptor = V.describe(tile, { P: 'red', W: 'blu', active: true, solid: true });
    assert.ok(SM.SPRITES.keys.includes(descriptor.key), descriptor.key);
    const manifest = SM.SPRITES.manifest(descriptor.key);
    assert.equal(SM.SPRITES.validate(manifest), true);
    const pixels = SM.SPRITES.raster(descriptor, 0);
    assert.equal(pixels.length, 4096); assert.ok(pixels.some((n, i) => i % 4 === 3 && n === 255), descriptor.key);
    assert.deepEqual(SM.SPRITES.raster(descriptor, 0), pixels, 'pixel generation is deterministic');
    const indexed = SM.SPRITES.indexed(descriptor, 0);
    assert.equal(indexed.indices.length, 1024); assert.ok(indexed.palette.length < 256);
    for (let phase = 0; phase < manifest.animation.frames.length; phase++) {
      const before = JSON.stringify(descriptor), commands = SM.SPRITES.commands(descriptor, phase);
      assert.equal(JSON.stringify(descriptor), before, 'decorative cycling never changes semantic descriptors');
      if (['goal', 'crate', 'prism', 'receiver', 'auraGate', 'worldGate', 'dot'].includes(descriptor.key)) {
        assert.ok(commands.some(p => p.fill === SM.PALETTE[descriptor.colour] || p.stroke === SM.PALETTE[descriptor.colour]), 'semantic color anchor survives every frame');
      }
      if (descriptor.key === 'conveyor') assert.deepEqual(commands.find(p => p.kind === 'line' && p.stroke === SM.PALETTE.wht).points,
        SM.SPRITES.commands(descriptor, 0).find(p => p.kind === 'line' && p.stroke === SM.PALETTE.wht).points);
    }
  }
  const broken = SM.SPRITES.manifest('conveyor'); broken.animation.frames.push('absent');
  assert.throws(() => SM.SPRITES.validate(broken));
  assert.throws(() => SM.SPRITES.validate({ schema: 1, width: Infinity, height: 32 }));
  const badPalette = SM.SPRITES.manifest('crate'); badPalette.paletteRoles.required = 'fifth-carrier';
  assert.throws(() => SM.SPRITES.validate(badPalette));
  const oldDocument = globalThis.document, oldKonva = globalThis.Konva;
  try {
    globalThis.Konva = require('../../src/vendor/konva/konva.min.js');
    // Prime the upstream environment query as Node (no pixel drawing claimed).
    globalThis.Konva.Util.isCanvasFarblingActive();
    globalThis.document = {};
    vm.runInThisContext(fs.readFileSync(require('node:path').join(__dirname, '../../src/js/sm-draw.js'), 'utf8'));
    for (const tile of Object.values(SM.TILES).concat(SM.DOT_DEFINITION)) {
      const node = SM.GRAPHICS.vector(V.describe(tile, { P: 'red', W: 'blu', pendingClose: true }));
      assert.ok(node.getChildren().length > 0);
      if (node._smAnimation) {
        const count = node.getChildren().length; node.frameIndex(1); node.frameIndex(0);
        assert.equal(node.getChildren().length, count, 'vector frame changes reuse nodes');
      }
      node.destroy();
    }
  } finally {
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
    if (oldKonva === undefined) delete globalThis.Konva; else globalThis.Konva = oldKonva;
  }
  assert.equal(V.describe(SM.TILES[31], { P: 'blu', W: 'gre' }).colour, 'red');
  for (const dir of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
    const a = Object.assign({}, SM.TILES[60], { params: Object.assign({}, SM.TILES[60].params, { dir }) });
    assert.ok(V.describe(a).dir);
    const d = V.describe(a), track0 = SM.SPRITES.commands(d, 0).find(p => p.kind === 'line' && p.stroke === '#3c4a60').points;
    const track1 = SM.SPRITES.commands(d, 1).find(p => p.kind === 'line' && p.stroke === '#3c4a60').points;
    if (dir.x) assert.equal(Math.sign(track1[0] - track0[0]), dir.x, 'treads animate toward the declared exit');
    else assert.equal(Math.sign(track1[1] - track0[1]), -dir.y, 'north is upward in screen coordinates');
  }
  for (const size of [20, 32, 64, 96]) for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) {
    const screen = V.screenCell(x, y, 9, size);
    assert.deepEqual(V.hit(screen.x + size / 2, screen.y + size / 2, 16, 9, size), { x, y });
  }
  assert.equal(V.hit(-1, 0, 16, 9, 32), null);
  const raw = { grid: [[0, 2], [1, 70]] }, before = JSON.stringify(raw);
  const authored = V.authored(raw);
  assert.equal(authored.cells[0].y, 0); assert.equal(authored.cells[0].layers.at(-1).id, 'dot');
  assert.equal(authored.cells[1].layers.length, 2); assert.equal(JSON.stringify(raw), before);
  assert.ok(V.authored({ grid: [[999]] }).cells[0].label.includes('Unsupported'));
  assert.equal(V.frames([{ commit: 1 }, { commit: 1 }, { commit: 2 }, {}]).length, 3);
  const loaded = SM.LEVELS.validate({ name: 'Visual tests', world_id: 'visual-tests', num_level: 1,
    levels: { level_1: { name: 'Push', width: 4, height: 2, grid: [[0, 0, 0, 2], [1, 70, 23, 0]] } } }, { solve: false });
  assert.equal(loaded.ok, true, JSON.stringify(loaded.problems));
  const state = SM.RULES.newState(loaded.levels[0]), mirror = SM.RULES.cloneState(state);
  const result = SM.RULES.resolveTurn(state, { type: 'move', dir: 'east' });
  V.frames(result.steps).forEach(frame => V.applyFrame(mirror, frame));
  assert.deepEqual(SM.RULES.snapshot(mirror), SM.RULES.snapshot(state));
  const saved = SM.RULES.snapshot(mirror);
  V.applyFrame(mirror, [{ type: 'effect-abort' }, { type: 'move', to: { x: 3, y: 1 } }]);
  assert.deepEqual(SM.RULES.snapshot(mirror), saved);
  const actor = Object.create(SM.Renderer.prototype), display = SM.RULES.newState(loaded.levels[0]);
  let finished = 0;
  Object.assign(actor, { generation: 0, sequence: null, draw() {}, say() {},
    surface: { onTick: null, start() {}, settle() {}, dispose() {} } });
  actor.play(result.steps, display, () => finished++);
  const obsoleteTick = actor.surface.onTick;
  actor.cancel(); actor.cancel();
  assert.equal(finished, 1, 'interruption completes once');
  assert.deepEqual(SM.RULES.snapshot(display), SM.RULES.snapshot(state), 'interruption settles all committed frames');
  actor.dispose(); obsoleteTick(999999);
  assert.equal(finished, 1, 'disposed callbacks cannot complete twice');
  const audit = require('../../scripts/audit-v2-assets');
  assert.equal(audit.auditFiles([{ path: 'docs/example.md', text: 'Implemented by the `level-editor-v1` OpenSpec change. Packs use YAML.' }]).errors.length, 0);
  assert.ok(audit.auditFiles([{ path: 'docs/example.md', text: 'Implemented by the `level-editor-v1` OpenSpec change. JSON Level Schema.' }]).errors.length);
  assert.ok(audit.auditFiles([{ path: 'docs/example.md', text: 'The V1 policy returns exposed players to the start.' }]).errors.length);
  console.log('visual descriptors: catalogue/carriers/authoring/coordinates/commit grouping passed');
};
