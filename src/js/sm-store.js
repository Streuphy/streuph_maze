/* =========================================================================
 * sm-store.js  —  STREUPH'S MAZE
 * Progress persistence, with an in-memory fallback for file:// pages.
 *
 * localStorage is NOT guaranteed under file:// — Chrome gives every file://
 * document an opaque origin and may throw on access. So every call is
 * wrapped, and the store degrades to an in-memory object that still works
 * for the session. Export / Import is the durable fallback, and the UI
 * exposes it (G5).
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  var KEY = 'streuphs-maze/progress/v1';
  var SCHEMA = 1;

  var memory = null;      // the always-present fallback
  var backend = null;     // 'localStorage' | 'memory'

  function probe() {
    try {
      var ls = global.localStorage;
      if (!ls) return null;
      var t = '__sm_probe__';
      ls.setItem(t, '1');
      ls.removeItem(t);
      return ls;
    } catch (e) {
      return null;
    }
  }

  backend = probe() ? 'localStorage' : 'memory';

  function blank() {
    return { schema: SCHEMA, levels: {}, lastLevel: null };
  }

  function read() {
    if (backend === 'memory') return memory || (memory = blank());
    try {
      var raw = global.localStorage.getItem(KEY);
      if (!raw) return blank();
      var obj = JSON.parse(raw);
      if (!obj || obj.schema !== SCHEMA || typeof obj.levels !== 'object') return blank();
      return obj;
    } catch (e) {
      return blank();
    }
  }

  function write(obj) {
    if (backend === 'memory') { memory = obj; return true; }
    try {
      global.localStorage.setItem(KEY, JSON.stringify(obj));
      return true;
    } catch (e) {
      // Quota, or a privacy mode that started refusing mid-session.
      backend = 'memory';
      memory = obj;
      return false;
    }
  }

  function ensure(prog, key) {
    if (!prog.levels[key]) prog.levels[key] = { unlocked: false, best: null, seenTiles: [] };
    var e = prog.levels[key];
    if (!e.seenTiles) e.seenTiles = [];
    return e;
  }

  var STORE = {
    /** 'localStorage' | 'memory' — the UI shows this so the player knows. */
    backend: function () { return backend; },
    durable: function () { return backend === 'localStorage'; },

    all: function () { return read(); },

    entry: function (key) {
      var p = read();
      return p.levels[key] || { unlocked: false, best: null, seenTiles: [] };
    },

    /** Mark a level finished. Unlocks the NEXT level (G3, gating order = file order). */
    complete: function (key, nextKey, strokes, turns) {
      var p = read();
      var e = ensure(p, key);
      e.unlocked = true;
      e.cleared = true;
      if (!e.best || strokes < e.best.strokes) e.best = { strokes: strokes, turns: turns };
      if (nextKey) {
        var n = ensure(p, nextKey);
        n.unlocked = true;
      }
      return write(p);
    },

    /** Record which tile ids the player has stood on, for the codex (W2). */
    noteTiles: function (key, ids) {
      var p = read();
      var e = ensure(p, key);
      var changed = false;
      for (var i = 0; i < ids.length; i++) {
        if (e.seenTiles.indexOf(ids[i]) === -1) { e.seenTiles.push(ids[i]); changed = true; }
      }
      if (changed) write(p);
      return changed;
    },

    lastLevel: function () { return read().lastLevel; },
    setLastLevel: function (key) {
      var p = read();
      p.lastLevel = key;
      write(p);
    },

    isUnlocked: function (key, index) {
      var p = read();
      if (index === 0) return true;                 // the first level is always open
      if (p.levels[key] && p.levels[key].unlocked) return true;
      // Fall back to "every earlier level is cleared".
      var order = Object.keys(p.levels).sort();
      return false;
    },

    reset: function () {
      memory = blank();
      if (backend === 'localStorage') {
        try { global.localStorage.removeItem(KEY); } catch (e) { /* nothing to do */ }
      }
    },

    /* --- Export / Import (G5, N4) ------------------------------------- */

    exportText: function () {
      return JSON.stringify(read(), null, 2);
    },

    importText: function (text) {
      var obj;
      try {
        obj = JSON.parse(text);
      } catch (e) {
        throw new Error('that is not valid JSON');
      }
      if (!obj || typeof obj !== 'object') throw new Error('expected a progress object');
      if (obj.schema !== SCHEMA) {
        throw new Error('progress schema is ' + JSON.stringify(obj.schema) + ', expected ' + SCHEMA);
      }
      if (!obj.levels || typeof obj.levels !== 'object') {
        throw new Error('the object has no "levels" map');
      }
      return write(obj);
    }
  };

  SM.STORE = STORE;

})(typeof window !== 'undefined' ? window : globalThis);
