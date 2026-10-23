/* Lightweight registry-contract checks. No level solver, DOM, or browser boot. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runRegistrySuite(SM) {
  assert.ok(SM && SM.TILES, 'tile catalogue is registered');
  assert.deepEqual(SM.validateTileRegistry(SM.TILES), { ok: true, errors: [] },
    'the complete catalogue satisfies its registry contract');

  const definitions = Object.values(SM.TILES);
  assert.equal(new Set(definitions.map(tile => tile.id)).size, definitions.length,
    'stable tile IDs are unique');
  for (const tile of definitions) {
    assert.equal(typeof tile.name, 'string', `tile ${tile.id} has a readable name`);
    assert.deepEqual(tile.state.hooks.slice().sort(), Object.keys(tile.strategies).sort(),
      `tile ${tile.id} exposes its registered hooks in its state manifest`);
    for (const field of ['reads', 'writes', 'events']) {
      assert.ok(Array.isArray(tile.state[field]), `tile ${tile.id} documents state ${field}`);
    }
    assert.ok(tile.presentation && tile.presentation.key && tile.presentation.inspection &&
      tile.presentation.codex, `tile ${tile.id} exposes presentation labels and descriptions`);
    for (const [hook, name] of Object.entries(tile.strategies)) {
      const contract = SM.TILE_STRATEGY_CONTRACTS[name];
      assert.ok(contract && contract.hooks.includes(hook),
        `tile ${tile.id} references a ${hook} strategy with a matching contract`);
      for (const field of ['reads', 'writes', 'events']) {
        assert.ok(Array.isArray(contract[field]), `${name} documents ${field}`);
      }
      if (hook === 'onEnter' || hook === 'onAct') {
        assert.equal(typeof SM.TILE_BEHAVIOR_HANDLERS[name], 'function',
          `tile ${tile.id} behavior ${name} has a named implementation`);
      }
    }
    assert.equal(typeof SM.glyph(tile, {
      active: false, latched: false, locked: false, W: 'wht', lit: {}
    }), 'string', `tile ${tile.id} resolves to a display glyph`);
  }

  const ice = SM.TILES[5];
  assert.deepEqual([ice.family, ice.name, ice.glyph, ice.solid, ice.walkable],
    ['terrain', 'ice', 'ice', false, true], 'ice retains its walkable terrain definition');
  assert.ok(SM.glyph(ice).length > 0, 'ice retains a rendered glyph');

  for (const item of [{ id: 23, link: 1 }, { id: 24, link: 2 }, { id: 25, link: 3 }]) {
    const tile = SM.TILES[item.id];
    assert.ok(tile, `target ID ${item.id} is registered`);
    assert.equal(tile.family, 'target', `target ID ${item.id} has target family`);
    assert.deepEqual(tile.params, { mode: 'momentary', scope: 'tagged', link: item.link },
      `target ID ${item.id} retains its link defaults`);
    assert.deepEqual([tile.solid, tile.walkable], [false, true],
      `target ID ${item.id} remains walkable`);
  }

  const rays = [
    { id: 81, name: 'ray_north', glyph: 'rayNorth', direction: 'north', dir: { x: 0, y: 1 } },
    { id: 82, name: 'ray_east', glyph: 'rayEast', direction: 'east', dir: { x: 1, y: 0 } },
    { id: 83, name: 'ray_south', glyph: 'raySouth', direction: 'south', dir: { x: 0, y: -1 } },
    { id: 84, name: 'ray_west', glyph: 'rayWest', direction: 'west', dir: { x: -1, y: 0 } }
  ];
  for (const item of rays) {
    const tile = SM.TILES[item.id];
    assert.deepEqual([tile.id, tile.family, tile.name, tile.glyph],
      [item.id, 'hazard', item.name, item.glyph], `ray ${item.direction} has stable identity`);
    assert.deepEqual(tile.params, { dir: item.dir }, `ray ${item.direction} has a cardinal direction`);
    assert.equal(tile.presentation.motion, 'static',
      `ray ${item.direction} remains static presentation`);
    assert.equal(tile.presentation.direction, item.direction,
      `ray ${item.direction} exposes its visual direction`);
    assert.equal(tile.presentation.key, 'ray',
      `ray ${item.direction} uses the ray display descriptor`);
    assert.ok(SM.glyph(tile).length > 0, `ray ${item.direction} has a glyph`);
  }
  assert.equal(new Set(rays.map(item => SM.TILES[item.id].glyph)).size, 4,
    'cardinal ray emitters use distinct glyph keys');

  for (const item of [{ id: 10, link: 1 }, { id: 26, link: 2 }, { id: 27, link: 3 }]) {
    const tile = SM.TILES[item.id];
    assert.equal(tile.family, 'barrier', `phase-wall ID ${item.id} has barrier family`);
    assert.deepEqual(tile.params, { link: item.link, defaultLocked: true },
      `phase-wall ID ${item.id} retains its linked closed default`);
    assert.equal(tile.glyph, 'phaseWall', `phase-wall ID ${item.id} selects its glyph`);
    assert.equal(SM.glyph(tile, { locked: true }), SM.glyph(SM.TILES[10], { locked: true }),
      `phase-wall ID ${item.id} shares the standard phase-wall glyph`);
  }

  const receiverAllocation = [
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
  assert.equal(new Set(receiverAllocation.map(item => item.id)).size, 11,
    'World 6 receiver allocations use eleven unique IDs');
  assert.deepEqual(receiverAllocation.map(item => item.id),
    Array.from({ length: 11 }, (_, index) => index + 90),
  'World 6 receiver variants reserve the contiguous 90–100 range');
  assert.deepEqual(receiverAllocation.map(({ colour, link }) => [colour, link]), [
    ['gre', 1], ['blu', 1], ['wht', 1],
    ['red', 2], ['gre', 2], ['blu', 2], ['wht', 2],
    ['red', 3], ['gre', 3], ['blu', 3], ['wht', 3]
  ], 'World 6 allocations fill the documented color/link combinations besides ID 50');
  for (const item of receiverAllocation) {
    const tile = SM.TILES[item.id];
    assert.ok(tile, `World 6 receiver ID ${item.id} is registered`);
    assert.deepEqual([tile.family, tile.glyph, tile.solid, tile.walkable],
      ['sensor', 'receiver', false, true],
    `World 6 receiver ID ${item.id} remains a walkable sensor`);
    assert.deepEqual(tile.params,
      { mode: 'sensor', scope: 'tagged', link: item.link, colour: item.colour },
    `World 6 receiver ID ${item.id} defaults to ${item.colour}/link ${item.link}`);
    assert.deepEqual(tile.strategies, { activation: 'crateAdjacencySensor' },
      `World 6 receiver ID ${item.id} uses the existing adjacency strategy`);
  }
  assert.deepEqual([SM.TILES[50].params, SM.TILES[50].family, SM.TILES[50].glyph], [
    { mode: 'sensor', scope: 'tagged', link: 1, colour: 'red' }, 'sensor', 'receiver'
  ], 'legacy receiver ID 50 remains red/link 1 with its original identity');
  assert.deepEqual([SM.TILES[10].params.link, SM.TILES[26].params.link,
    SM.TILES[27].params.link], [1, 2, 3],
  'World 6 link allocation agrees with World 1 phase-wall links 1–3');

  const polarityTiles = [
    { id: 46, name: 'polarity_barrier_red', family: 'barrier', openWhen: 'red-open' },
    { id: 47, name: 'polarity_barrier_blue', family: 'barrier', openWhen: 'blue-open' },
    { id: 48, name: 'polarity_switch', family: 'switch', openWhen: null }
  ];
  for (const item of polarityTiles) {
    const tile = SM.TILES[item.id];
    assert.ok(tile, `World 3 tile ID ${item.id} is registered`);
    assert.deepEqual([tile.id, tile.name, tile.family],
      [item.id, item.name, item.family], `World 3 ID ${item.id} has its allocated meaning`);
    if (item.openWhen) {
      assert.deepEqual([tile.solid, tile.walkable, tile.params.openWhen,
        tile.strategies.passability],
      ['polarity', 'polarity', item.openWhen, 'binaryPolarityBarrier'],
      `World 3 barrier ${item.name} declares its opening polarity and rule strategy`);
    } else {
      assert.deepEqual(tile.strategies, { onAct: 'flipPolarity' },
        'World 3 crystal switch flips only through ACT, never by walking onto it');
    }
  }
  assert.equal(SM.TILES[44].name, 'master_lock', 'ID 44 remains the existing master lock');
  assert.equal(SM.TILES[45].name, 'master_void', 'ID 45 remains the existing master void');
  assert.equal(SM.TILES[49], undefined, 'ID 49 remains unused and reserved');
  assert.equal(new Set(polarityTiles.map(item => SM.TILES[item.id].name)).size, 3,
    'World 3 allocated IDs have three distinct meanings');
  assert.match(SM.TILES[46].presentation.codex, /red-open/,
    'red barrier codex names its independent global polarity state');
  assert.match(SM.TILES[47].presentation.codex, /blue-open/,
    'blue barrier codex names its complementary global polarity state');
  assert.match(SM.TILES[48].presentation.codex, /ACT flips/,
    'crystal switch codex distinguishes explicit activation from entry');
  assert.notEqual(SM.glyph(SM.TILES[46], { solid: false }),
    SM.glyph(SM.TILES[46], { solid: true }),
  'red barrier glyph distinguishes open from closed state');
  assert.notEqual(SM.glyph(SM.TILES[47], { solid: false }),
    SM.glyph(SM.TILES[47], { solid: true }),
  'blue barrier glyph distinguishes open from closed state');
  assert.notEqual(SM.glyph(SM.TILES[48], { polarity: 'red-open' }),
    SM.glyph(SM.TILES[48], { polarity: 'blue-open' }),
  'crystal switch glyph exposes which polarity is currently open');

  const duplicate = { ...SM.TILES[0], name: 'duplicate-floor' };
  const duplicateResult = SM.validateTileRegistry([SM.TILES[0], duplicate]);
  assert.ok(duplicateResult.errors.some(message => /duplicate stable tile id/.test(message)),
    'duplicate IDs are rejected');

  const invalid = {
    ...SM.TILES[0],
    strategies: { onEnter: 'missing-strategy' },
    params: { unsupported: [] },
    capabilities: { pullable: 'sometimes' }
  };
  const invalidResult = SM.validateTileRegistry({ 0: invalid });
  assert.ok(invalidResult.errors.some(message => /invalid strategy/.test(message)),
    'unknown strategy references are rejected');
  assert.ok(invalidResult.errors.some(message => /unsupported parameter default/.test(message)),
    'unsupported parameter schema values are rejected');
  assert.ok(invalidResult.errors.some(message => /pullable.*must be true or false/.test(message)),
    'invalid capability types are rejected');

  const malformedContractResult = SM.validateTileRegistry({
    0: { id: 0, family: 'terrain', name: 'broken', glyph: 'floor', solid: false,
      walkable: true, behavior: 'goal' }
  });
  assert.ok(malformedContractResult.errors.some(message => /params/.test(message)),
    'required definition metadata is rejected when absent');
}

module.exports = runRegistrySuite;

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  for (const file of ['src/js/tiles.js', 'src/js/sm-glyphs.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInThisContext(source, { filename: path.join(root, file) });
  }
  runRegistrySuite(globalThis.SM);
  console.log('registry unit: passed');
}
