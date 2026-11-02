/* GPL-3.0. Original editable pixel grammar; no third-party artwork. */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});
  var KEYS = ['floor', 'start', 'goal', 'wall', 'void', 'ice', 'phaseWall', 'prism',
    'cycleDial', 'cycleReset', 'setDial', 'target', 'auraGate', 'worldGate', 'plate',
    'key', 'masterLock', 'masterVoid', 'polarityRedBarrier', 'polarityBlueBarrier',
    'polaritySwitch', 'receiver', 'conveyor', 'crate', 'portal', 'ray', 'dot', 'unknown'];
  var ANIMATED = ['ice', 'portal', 'conveyor', 'dot', 'beam'];
  function shade(hex, factor) {
    var n = parseInt(hex.slice(1), 16);
    return '#' + [n >> 16, n >> 8 & 255, n & 255].map(function (v) {
      return Math.min(255, Math.round(v * factor)).toString(16).padStart(2, '0');
    }).join('');
  }
  function commands(d, frame) {
    var out = [], k = d.key, c = SM.PALETTE[d.colour] || SM.PALETTE.wht;
    var white = SM.PALETTE.wht, ink = '#090c13', floor = '#141923';
    var dark = shade(c, 0.3), mid = shade(c, 0.62 + (frame % 4) * 0.04);
    function rect(x, y, w, h, fill, stroke, sw) { out.push({ kind: 'rect', x: x, y: y, w: w, h: h, fill: fill, stroke: stroke, sw: sw || 1 }); }
    function circle(x, y, r, fill, stroke, sw) { out.push({ kind: 'circle', x: x, y: y, r: r, fill: fill, stroke: stroke, sw: sw || 1 }); }
    function line(points, stroke, sw) { out.push({ kind: 'line', points: points, stroke: stroke, sw: sw || 1 }); }
    function poly(points, fill, stroke, sw) { out.push({ kind: 'poly', points: points, fill: fill, stroke: stroke, sw: sw || 1 }); }
    function arrow(dir, col) {
      var p = [5, 16, 26, 16, 20, 10, 26, 16, 20, 22];
      function rotate(x, y) {
        return dir === 'west' ? [32 - x, 32 - y] : dir === 'north' ? [y, 32 - x] : dir === 'south' ? [32 - y, x] : [x, y];
      }
      var pts = [];
      for (var i = 0; i < p.length; i += 2) pts = pts.concat(rotate(p[i], p[i + 1]));
      line(pts, ink, 5); line(pts, col, 2);
    }
    if (k === 'floor' || k === 'start') {
      rect(0, 0, 32, 32, floor); line([1, 31, 31, 31, 31, 1], '#222a38');
      if (k === 'start') { rect(12, 12, 8, 8, null, '#687285'); line([14, 17, 16, 15, 18, 17], white); }
    } else if (k === 'wall') {
      rect(1, 1, 30, 30, '#343d4d', '#080c14', 2); line([3, 3, 29, 3], '#737e8e');
      line([2, 16, 30, 16, 30, 18, 2, 18], '#141923'); line([15, 3, 15, 15, 17, 15, 17, 3], '#141923');
      line([8, 19, 8, 30, 10, 30, 10, 19], '#141923');
    } else if (k === 'goal') {
      rect(3, 3, 26, 26, ink, c, 2); rect(7, 7, 18, 18, dark, c, 2);
      line([10, 16, 22, 16, 18, 12, 22, 16, 18, 20], c, 2);
    } else if (k === 'void') {
      rect(2, 2, 28, 28, d.solid ? ink : floor);
      for (var z = 3; z < 30; z += 6) { rect(z, 2, 3, 1, white); rect(z, 29, 3, 1, white); rect(2, z, 1, 3, white); rect(29, z, 1, 3, white); }
      if (d.solid) line([7, 7, 25, 25, 16, 16, 25, 7, 7, 25], '#687285', 2);
    } else if (k === 'ice') {
      rect(1, 1, 30, 30, '#142e48', '#457394');
      line([4, 23, 23, 4], '#86bbde', 2); line([13, 28, 28, 13], '#42789f', 2);
      rect(5 + frame % 4 * 4, 7, 2, 2, '#b8e1ed');
    } else if (k === 'prism') {
      rect(2, 2, 28, 28, dark, c); poly([16, 5, 27, 16, 16, 27, 5, 16], mid, c, 2);
      poly([16, 8, 22, 16, 16, 23, 10, 16], c); line([16, 8, 16, 23], ink);
    } else if (k === 'crate') {
      rect(3, 3, 26, 26, dark, ink, 2); rect(5, 5, 22, 22, mid, c, 2);
      line([7, 7, 25, 25], ink, 5); line([7, 25, 25, 7], ink, 5);
      line([7, 7, 25, 25], c, 2); line([7, 25, 25, 7], c, 2);
      rect(5, 5, 2, 2, white); rect(25, 25, 2, 2, white);
    } else if (k === 'target') {
      rect(2, 2, 28, 28, null, d.active ? white : '#697487');
      circle(16, 16, 10, null, d.active ? white : '#697487', 2);
      circle(16, 16, 4, d.active ? white : null, white);
      [3, 26].forEach(function (a) { rect(a, a, 3, 3, d.active ? white : '#697487'); });
    } else if (k === 'phaseWall' || k === 'auraGate' || k === 'worldGate' || k.indexOf('polarity') === 0 && k !== 'polaritySwitch') {
      if (k === 'polarityRedBarrier') c = SM.PALETTE.red;
      if (k === 'polarityBlueBarrier') c = SM.PALETTE.blu;
      rect(3, 3, 26, 26, d.solid ? shade(c, 0.25) : null, c, 2);
      if (d.solid) for (var gx = 8; gx <= 24; gx += 8) rect(gx, 5, 2, 22, c);
      else { rect(5, 4, 22, 4, c); rect(3, 23, 3, 5, c); rect(26, 23, 3, 5, c); }
      if (d.carrier === 'P') { circle(16, 16, 4, c, ink); }
      if (d.carrier === 'W') { rect(11, 11, 10, 10, ink, c, 2); }
      if (k.indexOf('polarity') === 0) poly([16, 10, 22, 16, 16, 22, 10, 16], c, ink);
    } else if (k === 'receiver') {
      poly([8, 6, 24, 6, 28, 16, 24, 26, 8, 26, 4, 16], dark, c, 2);
      circle(16, 16, 5, d.active ? c : ink, c, 2);
      [[14, 0, 'n'], [28, 14, 'e'], [14, 28, 's'], [0, 14, 'w']].forEach(function (p) {
        rect(p[0], p[1], 4, 4, d.contacts[p[2]] ? c : '#485266', d.contacts[p[2]] ? white : ink);
      });
    } else if (k === 'plate' || k === 'key' || k === 'masterLock' || k === 'masterVoid') {
      rect(5, 6, 22, 21, '#343d4d', ink, 2); rect(7, d.active || d.latched ? 12 : 8, 18, 13, d.active || d.latched ? white : '#687285', white);
      if (k === 'key') { circle(16, 15, 4, ink); line([16, 18, 16, 23, 20, 23], ink, 2); }
      if (k === 'masterLock') { circle(16, 14, 3, ink); rect(15, 16, 2, 7, ink); }
      if (k === 'masterVoid') line([11, 16, 21, 16, 16, 16, 16, 11, 16, 21], ink, 2);
    } else if (k === 'polaritySwitch') {
      poly([16, 3, 28, 16, 16, 29, 4, 16], ink, white, 2);
      poly([16, 6, 24, 15, 8, 15], d.polarity === 'red-open' ? SM.PALETTE.red : '#452329');
      poly([8, 18, 24, 18, 16, 26], d.polarity === 'blue-open' ? SM.PALETTE.blu : '#203249');
    } else if (k === 'cycleDial' || k === 'cycleReset' || k === 'setDial') {
      circle(16, 16, 12, ink, white, 2);
      if (k === 'cycleReset') { rect(11, 11, 10, 10, white); circle(16, 16, 3, ink); }
      else {
        circle(16, 16, 6, k === 'setDial' ? c : SM.PALETTE[d.world], white);
        line([5, 11, 11, 5, 20, 5, 26, 11, 23, 10, 26, 11, 26, 7], white, 2);
      }
    } else if (k === 'conveyor') {
      rect(1, 1, 30, 30, '#263142', '#738094');
      for (var t = -8; t < 40; t += 8) {
        var offset = t + frame % 4 * 2;
        var vertical = d.dir === 'east' || d.dir === 'west';
        var track = d.dir === 'west' || d.dir === 'north' ? 32 - offset : offset;
        line(vertical ? [track, 3, track, 29] : [3, track, 29, track], '#3c4a60');
      }
      arrow(d.dir, white);
    } else if (k === 'portal') {
      circle(16, 16, 12, '#172333', c, 2); circle(16, 16, 7, ink, mid, 2);
      var corners = [[14, 3], [26, 14], [14, 26], [3, 14]];
      rect(corners[frame % 4][0], corners[frame % 4][1], 3, 3, white);
    } else if (k === 'ray') {
      rect(2, 2, 28, 28, '#361e26', SM.PALETTE.red, 2); arrow(d.dir, SM.PALETTE.red);
    } else if (k === 'dot') {
      var dy = [0, -1, -1, 0, 0, 1, 1, 0][frame % 8];
      circle(16, 16 + dy, 11, c, SM.PALETTE[d.world], 3);
      rect(11, 13 + dy, 3, 4, ink); rect(19, 13 + dy, 3, 4, ink);
      line([14, 22 + dy, 18, 22 + dy], ink);
    } else {
      rect(2, 2, 28, 28, null, white); line([5, 5, 27, 27, 16, 16, 5, 27, 27, 5], SM.PALETTE.red, 2);
    }
    if (d.link !== null && d.link !== undefined && d.link > 0) {
      var count = Math.min(4, d.link);
      for (var pip = 0; pip < count; pip++) rect(4 + pip * 6, 28, 3, 3, white, ink);
      if (d.link >= 5) circle(28, 29, 2, white, ink);
    }
    if (d.pendingClose) for (var q = 1; q < 31; q += 5) {
      rect(q, 0, 3, 2, white); rect(q, 30, 3, 2, white); rect(0, q, 2, 3, white); rect(30, q, 2, 3, white);
    }
    return out;
  }
  function inside(x, y, points) {
    var c = false;
    for (var i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
      if ((points[i + 1] > y) !== (points[j + 1] > y) &&
          x < (points[j] - points[i]) * (y - points[i + 1]) / (points[j + 1] - points[i + 1]) + points[i]) c = !c;
    }
    return c;
  }
  function segmentDistance(x, y, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    var t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    return Math.hypot(x - ax - t * dx, y - ay - t * dy);
  }
  function raster(d, frame) {
    var pixels = new Uint8ClampedArray(32 * 32 * 4);
    commands(d, frame || 0).forEach(function (p) {
      for (var y = 0; y < 32; y++) for (var x = 0; x < 32; x++) {
        var px = x + 0.5, py = y + 0.5, fill = false, edge = false, pts;
        if (p.kind === 'rect') {
          fill = px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.h;
          pts = [p.x, p.y, p.x + p.w, p.y, p.x + p.w, p.y + p.h, p.x, p.y + p.h, p.x, p.y];
        } else if (p.kind === 'circle') {
          var distance = Math.hypot(px - p.x, py - p.y); fill = distance <= p.r; edge = Math.abs(distance - p.r) <= p.sw / 2;
        } else { pts = p.points; fill = p.kind === 'poly' && inside(px, py, pts); if (p.kind === 'poly') pts = pts.concat(pts.slice(0, 2)); }
        if (pts) for (var i = 0; i + 3 < pts.length; i += 2) if (segmentDistance(px, py, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) <= p.sw / 2) edge = true;
        var col = edge && p.stroke || fill && p.fill;
        if (col) { var n = parseInt(col.slice(1), 16), at = (y * 32 + x) * 4;
          pixels[at] = n >> 16; pixels[at + 1] = n >> 8 & 255; pixels[at + 2] = n & 255; pixels[at + 3] = 255; }
      }
    });
    return pixels;
  }
  function manifest(key) {
    var frames = {}, count = key === 'dot' ? 8 : ANIMATED.indexOf(key) >= 0 ? 4 : 1;
    for (var i = 0; i < count; i++) frames[key + i] = { x: i * 32, y: 0, width: 32, height: 32 };
    return { schema: 1, width: count * 32, height: 32, frames: frames,
      paletteRoles: { required: 'configured-colour', dot: 'P', goal: 'W' },
      animation: { frames: Object.keys(frames), frameMs: key === 'dot' ? 250 : 160 } };
  }
  function validate(m) {
    if (!m || m.schema !== 1 || !Number.isInteger(m.width) || !Number.isInteger(m.height) ||
        m.width < 1 || m.height < 1 || m.width > 2048 || m.height > 2048) throw new Error('Invalid sprite dimensions');
    var keys = Object.keys(m.frames || {});
    if (!keys.length || keys.length > 256) throw new Error('Invalid sprite frame inventory');
    keys.forEach(function (key) { var f = m.frames[key];
      if (!f || ![f.x, f.y, f.width, f.height].every(Number.isInteger) || f.x < 0 || f.y < 0 || f.width < 1 || f.height < 1 ||
          f.x + f.width > m.width || f.y + f.height > m.height) throw new Error('Invalid frame ' + key);
    });
    var a = m.animation;
    if (!a || !Number.isFinite(a.frameMs) || a.frameMs < 16 || a.frameMs > 10000 || !Array.isArray(a.frames) || !a.frames.length ||
        a.frames.some(function (key) { return !m.frames[key]; })) throw new Error('Invalid sprite animation');
    if (!m.paletteRoles || Object.values(m.paletteRoles).some(function (role) {
      return ['configured-colour', 'P', 'W', 'neutral', 'polarity'].indexOf(role) < 0;
    })) throw new Error('Invalid palette role');
    return true;
  }
  function indexed(d, frame) {
    var rgba = raster(d, frame), palette = ['#00000000'], indices = new Uint8Array(1024), map = { '#00000000': 0 };
    for (var i = 0; i < 1024; i++) {
      var at = i * 4, token = '#' + Array.from(rgba.slice(at, at + 4)).map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
      if (map[token] === undefined) { if (palette.length >= 256) throw new Error('Pixel palette overflow'); map[token] = palette.length; palette.push(token); }
      indices[i] = map[token];
    }
    return { palette: palette, indices: indices, width: 32, height: 32 };
  }
  SM.SPRITES = { keys: KEYS, commands: commands, raster: raster, manifest: manifest, validate: validate,
    indexed: indexed,
    license: 'GPL-3.0', source: 'Original editable pixel grammar in sm-sprites.js', cellPixels: 32 };
})(typeof window !== 'undefined' ? window : globalThis);
