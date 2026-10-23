/* =========================================================================
 * sm-glyphs.js — display-only SVG glyph renderer.
 *
 * Tile rules and schemas live in tiles.js; this module consumes the family,
 * presentation key, and read-only view state to produce 24x24 SVG fragments.
 * It has no authority over gameplay and may safely be changed independently.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  function hexPath(size, flat) {
    // Pointy-top (size=0) or flat-top (size=1) regular hexagon, inscribed in 24x24.
    var pts;
    if (flat) {
      pts = [[2, 12], [7, 3], [17, 3], [22, 12], [17, 21], [7, 21]];
    } else {
      pts = [[12, 2], [21, 7], [21, 17], [12, 22], [3, 17], [3, 7]];
    }
    return 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L') + ' Z';
  }

  function pips(n, col) {
    // §19: count ceiling 4, link ≥5 encoded as ring-with-centre-dot.
    if (n === undefined || n === null) {
      return '<circle cx="12" cy="12" r="1.6" fill="' + col + '"/>';
    }
    if (n >= 5) {
      return '<circle cx="12" cy="12" r="6" fill="none" stroke="' + col + '" stroke-width="2"/>' +
             '<circle cx="12" cy="12" r="1.6" fill="' + col + '"/>';
    }
    if (n <= 0) {
      return '<circle cx="12" cy="12" r="1.8" fill="' + col + '"/>';
    }
    var gap = 5;
    var startX = 12 - (n - 1) * gap / 2;
    var s = '';
    for (var i = 0; i < n; i++) {
      s += '<circle cx="' + (startX + i * gap) + '" cy="12" r="1.7" fill="' + col + '"/>';
    }
    return s;
  }

  function beltGlyph(dir) {
    // Three chevrons along the axis. Hardcoded cardinal paths stay inspectable.
    if (dir.x > 0) {
      return '<path d="M6 7 L11 12 L6 17" stroke-width="2" fill="none"/>' +
             '<path d="M11 7 L16 12 L11 17" stroke-width="2" fill="none"/>' +
             '<path d="M16 7 L21 12 L16 17" stroke-width="2" fill="none"/>';
    }
    if (dir.x < 0) {
      return '<path d="M18 7 L13 12 L18 17" stroke-width="2" fill="none"/>' +
             '<path d="M13 7 L8  12 L13 17" stroke-width="2" fill="none"/>' +
             '<path d="M8  7 L3  12 L8  17" stroke-width="2" fill="none"/>';
    }
    if (dir.y > 0) {
      return '<path d="M7 18 L12 13 L17 18" stroke-width="2" fill="none"/>' +
             '<path d="M7 13 L12 8  L17 13" stroke-width="2" fill="none"/>' +
             '<path d="M7 8  L12 3  L17 8"  stroke-width="2" fill="none"/>';
    }
    return '<path d="M7 6  L12 11 L17 6"  stroke-width="2" fill="none"/>' +
           '<path d="M7 11 L12 16 L17 11" stroke-width="2" fill="none"/>' +
           '<path d="M7 16 L12 21 L17 16" stroke-width="2" fill="none"/>';
  }

  function squareBacking(col, locked) {
    if (locked) {
      return '<rect x="2" y="2" width="20" height="20" fill="' + col + '" fill-opacity="0.22" ' +
             'stroke="' + col + '" stroke-width="2" stroke-opacity="1"/>';
    }
    return '<rect x="2" y="2" width="20" height="20" fill="none" ' +
           'stroke="' + col + '" stroke-width="2" stroke-opacity="0.35"/>';
  }

  SM.glyph = function (inst, state) {
    var family = inst.family;
    var params = inst.params || {};
    var colour = params.colour || (state && state.W) || 'wht';
    var colHex = SM.PALETTE[colour] || SM.PALETTE.wht;
    var s = state || {};

    switch (family) {
      case 'terrain':
        switch (inst.name) {
          case 'wall':
            return '<rect x="1" y="1" width="22" height="22" fill="' + SM.PALETTE.blk + '" ' +
                   'stroke="' + SM.PALETTE.mute + '" stroke-width="1"/>';
          case 'goal':
            return '<circle cx="12" cy="12" r="9" fill="none" stroke="' + colHex + '" stroke-width="2"/>' +
                   '<circle cx="12" cy="12" r="4" fill="' + colHex + '"/>';
          case 'start':
            return '<rect x="9.5" y="9.5" width="5" height="5" fill="none" ' +
                   'stroke="' + SM.PALETTE.mute + '" stroke-width="1" stroke-opacity="0.6"/>';
          case 'ice':
            return '<path d="M4 18 L18 4 M8 21 L21 8 M3 12 L12 3" fill="none" ' +
                   'stroke="' + SM.PALETTE.blu + '" stroke-width="1.5" stroke-opacity="0.75"/>';
          case 'void':
          case 'floor':
          default:
            return '';
        }

      case 'barrier':
        var polarityClass = inst.presentation && inst.presentation.polarityClass;
        if (polarityClass) {
          var polarityColour = SM.PALETTE[polarityClass] || SM.PALETTE.wht;
          return squareBacking(polarityColour, !!s.solid) +
                 '<path d="M7 7 L17 17 M17 7 L7 17" fill="none" stroke="' +
                 polarityColour + '" stroke-width="2" stroke-linecap="round" stroke-opacity="' +
                 (s.solid ? 0.9 : 0.45) + '"/>';
        }
        return squareBacking(SM.PALETTE.wht, !!s.locked);

      case 'aura':
        return '<circle cx="12" cy="12" r="8" fill="' + colHex + '"/>';

      case 'gate': {
        var innerMark = /^aura_/.test(inst.name)
          ? '<circle cx="12" cy="12" r="5" fill="' + colHex + '"/>'
          : '<circle cx="12" cy="12" r="5" fill="none" stroke="' + colHex + '" stroke-width="2"/>';
        return squareBacking(colHex, !!s.locked) + innerMark;
      }

      case 'switch': {
        if (inst.presentation && inst.presentation.polaritySwitch) {
          var redOpen = (s.polarity || 'red-open') === 'red-open';
          return '<path d="' + hexPath(0) + '" fill="none" stroke="' + SM.PALETTE.wht +
                 '" stroke-width="2"/>' +
                 '<path d="M12 5 L16 9 L12 12 L8 9 Z" fill="' + SM.PALETTE.red +
                 '" fill-opacity="' + (redOpen ? 1 : 0.25) + '"/>' +
                 '<path d="M12 12 L16 15 L12 19 L8 15 Z" fill="' + SM.PALETTE.blu +
                 '" fill-opacity="' + (redOpen ? 0.25 : 1) + '"/>';
        }
        if (inst.name === 'master_lock' || inst.name === 'master_void') {
          var masterMark = inst.name === 'master_lock'
            ? '<circle cx="12" cy="10" r="2" fill="' + SM.PALETTE.wht + '" fill-opacity="' + (s.latched ? 1 : 0.4) + '"/>' +
              '<rect x="11" y="11" width="2" height="5" fill="' + SM.PALETTE.wht + '" fill-opacity="' + (s.latched ? 1 : 0.4) + '"/>'
            : '<path d="M7 12 H17 M12 7 V17" stroke="' + SM.PALETTE.wht + '" stroke-width="2" stroke-opacity="' + (s.latched ? 1 : 0.4) + '"/>';
          return '<path d="' + hexPath(0) + '" fill="none" stroke="' + SM.PALETTE.wht +
                 '" stroke-width="2" stroke-opacity="' + (s.latched ? 1 : 0.4) + '"/>' + masterMark;
        }
        var on = !!s.active;
        var opacity = on ? 1 : 0.4;
        var dot = pips((params.link | 0) || 0, SM.PALETTE.wht);
        return '<path d="' + hexPath(0) + '" fill="' + SM.PALETTE.wht +
               '" fill-opacity="' + (on ? 0.25 : 0) + '" stroke="' + SM.PALETTE.wht +
               '" stroke-width="2" stroke-opacity="' + opacity + '"/>' + dot;
      }

      case 'sensor': {
        var lit = s.lit || {};
        var dotR = 1.8;
        return '<path d="' + hexPath(1) + '" fill="none" stroke="' + colHex +
               '" stroke-width="2" stroke-opacity="' + (s.active ? 1 : 0.4) + '"/>' +
               '<circle cx="12" cy="2" r="' + dotR + '" fill="' + (lit.n ? colHex : SM.PALETTE.mute) + '"/>' +
               '<circle cx="22" cy="12" r="' + dotR + '" fill="' + (lit.e ? colHex : SM.PALETTE.mute) + '"/>' +
               '<circle cx="12" cy="22" r="' + dotR + '" fill="' + (lit.s ? colHex : SM.PALETTE.mute) + '"/>' +
               '<circle cx="2" cy="12" r="' + dotR + '" fill="' + (lit.w ? colHex : SM.PALETTE.mute) + '"/>';
      }

      case 'target': {
        var targetOn = !!s.active;
        return '<circle cx="12" cy="12" r="9" fill="none" stroke="' +
               SM.PALETTE.wht + '" stroke-width="2" stroke-opacity="' + (targetOn ? 1 : 0.45) + '"/>' +
               '<circle cx="12" cy="12" r="3" fill="' + SM.PALETTE.wht +
               '" fill-opacity="' + (targetOn ? 0.8 : 0) + '" stroke="' + SM.PALETTE.wht +
               '" stroke-width="1.5" stroke-opacity="' + (targetOn ? 1 : 0.45) + '"/>';
      }

      case 'hazard': {
        var dir = params.dir || { x: 1, y: 0 };
        var arrow = dir.y > 0
          ? 'M12 17 V6 M8 10 L12 6 L16 10'
          : dir.x > 0
            ? 'M7 12 H18 M14 8 L18 12 L14 16'
            : dir.y < 0
              ? 'M12 7 V18 M8 14 L12 18 L16 14'
              : 'M17 12 H6 M10 8 L6 12 L10 16';
        return '<circle cx="12" cy="12" r="9" fill="none" stroke="' +
               SM.PALETTE.red + '" stroke-width="2"/>' +
               '<path d="' + arrow + '" fill="none" stroke="' + SM.PALETTE.red +
               '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      }

      case 'flow':
        return beltGlyph(params.dir || { x: 1, y: 0 });

      case 'crate':
        return '<rect x="2" y="2" width="20" height="20" fill="' + colHex +
               '" fill-opacity="0.18" stroke="' + colHex + '" stroke-width="2"/>' +
               '<path d="M2 2 L22 22 M22 2 L2 22" stroke="' + colHex + '" stroke-width="2"/>';

      case 'portal':
        return '<circle cx="12" cy="12" r="9" fill="none" stroke="' + colHex + '" stroke-width="2"/>' +
               '<circle cx="12" cy="12" r="4" fill="none" stroke="' + colHex + '" stroke-width="2"/>';

      case 'actuator':
        if (inst.name === 'cycle_dial') {
          var world = s.W || 'wht';
          return '<path d="M12 4 L21 19 L3 19 Z" fill="none" stroke="' + SM.PALETTE.wht + '" stroke-width="2"/>' +
                 '<circle cx="12" cy="2.5" r="1.8" fill="' + SM.PALETTE.red + '" fill-opacity="' + (world === 'red' ? 1 : 0.25) + '"/>' +
                 '<circle cx="21" cy="20" r="1.8" fill="' + SM.PALETTE.gre + '" fill-opacity="' + (world === 'gre' ? 1 : 0.25) + '"/>' +
                 '<circle cx="3" cy="20" r="1.8" fill="' + SM.PALETTE.blu + '" fill-opacity="' + (world === 'blu' ? 1 : 0.25) + '"/>';
        }
        if (inst.name === 'cycle_reset') {
          return '<rect x="4" y="4" width="16" height="16" fill="none" stroke="' +
                 SM.PALETTE.wht + '" stroke-width="2" stroke-opacity="0.5"/>' +
                 '<circle cx="12" cy="12" r="1.6" fill="none" stroke="' +
                 SM.PALETTE.wht + '" stroke-width="1.5" stroke-opacity="0.7"/>';
        }
        if (inst.name === 'set_dial') {
          return '<path d="M12 4 L21 19 L3 19 Z" fill="none" stroke="' +
                 SM.PALETTE.wht + '" stroke-width="2"/><circle cx="12" cy="12" r="1.8" fill="' + colHex + '"/>';
        }
        return '';

      default:
        return '<rect x="1" y="1" width="22" height="22" fill="none" stroke="' +
               SM.PALETTE.mute + '" stroke-width="1" stroke-dasharray="2 2"/>';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
