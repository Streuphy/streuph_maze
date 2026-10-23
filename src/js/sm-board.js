/* =========================================================================
 * sm-board.js — board geometry and layer queries shared by rules and loaders.
 * Pure board helpers only: no tile policy, events, DOM, or mutable side effects.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  function inBounds(state, x, y) {
    return !!state && x >= 0 && y >= 0 && x < state.width && y < state.height;
  }

  function tileAt(state, x, y) {
    return inBounds(state, x, y) ? state.grid[y][x] : null;
  }

  function crateAt(state, x, y) {
    return inBounds(state, x, y) ? state.crates[y][x] : null;
  }

  function targetAt(state, x, y) {
    if (!inBounds(state, x, y)) return null;
    for (var i = 0; i < state.switches.length; i++) {
      var feature = state.switches[i];
      if (feature.inst && feature.inst.entityRole === 'target' && feature.x === x && feature.y === y) {
        return feature;
      }
    }
    return null;
  }

  function isLocked(state, x, y) {
    return inBounds(state, x, y) ? !!state.locked[y][x] : true;
  }

  function createGrid(width, height, fill) {
    var grid = new Array(height);
    for (var y = 0; y < height; y++) {
      grid[y] = new Array(width);
      for (var x = 0; x < width; x++) grid[y][x] = fill;
    }
    return grid;
  }

  /** Copy row storage, preserving references to immutable tile/entity records. */
  function copyGrid(source) {
    var copy = new Array(source.length);
    for (var y = 0; y < source.length; y++) copy[y] = source[y].slice();
    return copy;
  }

  function colName(x) { return String.fromCharCode(65 + x); }
  function cellLabel(x, y) { return colName(x) + (y + 1); }

  SM.BOARD = Object.freeze({
    inBounds: inBounds,
    tileAt: tileAt,
    crateAt: crateAt,
    targetAt: targetAt,
    isLocked: isLocked,
    createGrid: createGrid,
    copyGrid: copyGrid,
    colName: colName,
    cellLabel: cellLabel
  });
})(typeof window !== 'undefined' ? window : globalThis);
