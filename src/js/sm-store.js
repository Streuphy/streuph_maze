/* Current V2 progress only. Local storage is optional under file://; JSON
 * export/import is the durable fallback. No other contract's data is read. */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});
  var KEY = 'streuphs-maze/progress/v2';
  var CONTRACT = 'v2-queued';
  var SCHEMA = 1;
  var memory = null;
  var backend = 'memory';

  function record(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function blank() { return { schema: SCHEMA, contract: CONTRACT, levels: {}, lastLevels: {} }; }
  function worldScope(worldId) {
    var world = worldId === undefined ? 'prologue' : worldId;
    if (typeof world !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(world)) throw new Error('invalid world identity');
    return world;
  }
  function levelKey(key) {
    if (typeof key !== 'string' || !/^level_[1-9]\d*$/.test(key)) throw new Error('invalid level key');
    return key;
  }
  function identity(key, worldId) { return worldScope(worldId) + '::' + levelKey(key); }
  function count(value) { return Number.isInteger(value) && value >= 0; }
  function validate(obj) {
    if (!record(obj) || obj.contract !== CONTRACT || obj.schema !== SCHEMA) throw new Error('unsupported current progress contract/schema');
    if (!record(obj.levels) || !record(obj.lastLevels)) throw new Error('progress requires levels and lastLevels maps');
    Object.keys(obj.levels).forEach(function (key) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*::level_[1-9]\d*$/.test(key)) throw new Error('invalid progress identity ' + key);
      var entry = obj.levels[key];
      if (!record(entry) || (entry.cleared !== undefined && typeof entry.cleared !== 'boolean') ||
          !Array.isArray(entry.seenTiles) || entry.seenTiles.some(function (id) { return !count(id); })) throw new Error('invalid progress entry ' + key);
      if (entry.best !== null && (!record(entry.best) || !count(entry.best.strokes) || !count(entry.best.turns))) throw new Error('invalid best score ' + key);
      if (entry.best !== null && !entry.cleared) throw new Error('best score requires a completed level');
      if (Object.keys(entry).some(function (field) { return ['cleared', 'best', 'seenTiles'].indexOf(field) < 0; })) throw new Error('unsupported progress field');
    });
    Object.keys(obj.lastLevels).forEach(function (world) { worldScope(world); levelKey(obj.lastLevels[world]); });
  }
  function storage() {
    try { return global.localStorage || null; } catch (error) { return null; }
  }
  try {
    var candidate = storage();
    if (candidate) { candidate.setItem('__sm_current_probe__', '1'); candidate.removeItem('__sm_current_probe__'); backend = 'localStorage'; }
  } catch (error) { backend = 'memory'; }
  function read() {
    if (backend === 'memory') return memory || (memory = blank());
    try {
      var text = storage().getItem(KEY);
      if (!text) return blank();
      var data = JSON.parse(text); validate(data); return data;
    } catch (error) { return blank(); }
  }
  function write(data) {
    if (backend === 'memory') { memory = data; return true; }
    try { storage().setItem(KEY, JSON.stringify(data)); return true; }
    catch (error) { backend = 'memory'; memory = data; return false; }
  }
  function ensure(data, key, worldId) {
    var id = identity(key, worldId);
    if (!data.levels[id]) data.levels[id] = { best: null, seenTiles: [] };
    return data.levels[id];
  }
  SM.STORE = {
    backend: function () { return backend; },
    durable: function () { return backend === 'localStorage'; },
    all: function () { return read(); },
    entry: function (key, worldId) { return read().levels[identity(key, worldId)] || { best: null, seenTiles: [] }; },
    complete: function (key, strokes, turns, worldId) {
      if (!count(strokes) || !count(turns)) throw new Error('invalid completed-run counters');
      var data = read(), entry = ensure(data, key, worldId);
      entry.cleared = true;
      if (!entry.best || strokes < entry.best.strokes) entry.best = { strokes: strokes, turns: turns };
      return write(data);
    },
    noteTiles: function (key, ids, worldId) {
      if (!Array.isArray(ids) || ids.some(function (id) { return !count(id); })) throw new Error('invalid seen tile IDs');
      var data = read(), entry = ensure(data, key, worldId), changed = false;
      ids.forEach(function (id) { if (entry.seenTiles.indexOf(id) < 0) { entry.seenTiles.push(id); changed = true; } });
      if (changed) write(data);
      return changed;
    },
    lastLevel: function (worldId) { return read().lastLevels[worldScope(worldId)] || null; },
    setLastLevel: function (key, worldId) { var data = read(); data.lastLevels[worldScope(worldId)] = levelKey(key); return write(data); },
    reset: function () {
      memory = blank();
      if (backend === 'localStorage') {
        try { storage().removeItem(KEY); } catch (error) { backend = 'memory'; }
      }
    },
    exportText: function () { return JSON.stringify(read(), null, 2); },
    importText: function (text) {
      var data;
      try { data = JSON.parse(text); } catch (error) { throw new Error('that is not valid JSON'); }
      validate(data); return write(data);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
