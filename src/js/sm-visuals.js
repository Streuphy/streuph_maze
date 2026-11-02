/* GPL-3.0: headless visual descriptions. No renderer objects or rule mutations. */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});
  var COLOURS = ['wht', 'red', 'gre', 'blu'];
  function colour(value) { return COLOURS.indexOf(value) >= 0 ? value : 'wht'; }
  function direction(dir) {
    if (!dir) return null;
    if (dir.x === 1 && dir.y === 0) return 'east';
    if (dir.x === -1 && dir.y === 0) return 'west';
    if (dir.x === 0 && dir.y === 1) return 'north';
    if (dir.x === 0 && dir.y === -1) return 'south';
    return null;
  }
  function describe(inst, view) {
    var v = view || {}, p = inst && inst.params || {};
    var presentation = inst && inst.presentation || {};
    var key = presentation.key;
    if (!key || key === 'generic') key = inst && inst.glyph || 'unknown';
    var dot = inst && inst.entityRole === 'dot';
    var goal = inst && inst.levelRole === 'goal';
    var locked = v.locked === undefined ? !!p.defaultLocked : !!v.locked;
    var solid = v.solid === undefined ? !!(inst && inst.solid === true) || locked : !!v.solid;
    var d = {
      id: inst && inst.id === undefined ? (dot ? 'dot' : null) : inst && inst.id,
      key: key, name: inst && inst.name || 'Unsupported tile', layer: inst && inst.layer || 'terrain',
      colour: colour(dot ? v.P : goal ? v.W : p.colour),
      world: colour(v.W), carrier: p.carrier || (key === 'auraGate' ? 'P' : key === 'worldGate' ? 'W' : null),
      dir: direction(p.dir), link: p.link === undefined ? null : p.link,
      active: !!v.active, latched: !!v.latched, solid: solid, locked: locked,
      requestedSolid: v.requestedSolid === undefined ? solid : !!v.requestedSolid,
      pendingClose: !!v.pendingClose, polarity: v.polarity || 'red-open',
      contacts: { n: !!(v.lit && v.lit.n), e: !!(v.lit && v.lit.e),
        s: !!(v.lit && v.lit.s), w: !!(v.lit && v.lit.w) },
      outcome: v.outcome || (v.failed ? 'failed' : v.won ? 'won' : 'playing'),
      knownState: v.knownState !== false, diagnostic: !inst ? 'Unsupported tile' : null
    };
    return d;
  }
  function label(d) {
    return d.name + '; ' + d.colour + (d.carrier ? '; carrier ' + d.carrier : '') +
      (d.dir ? '; exit/emission ' + d.dir : '') + (d.link === null ? '' : '; link ' + d.link) +
      (d.knownState ? '; active ' + d.active + '; latch ' + d.latched +
        '; requested ' + (d.requestedSolid ? 'closed' : 'open') +
        '; effective ' + (d.solid ? 'closed' : 'open') +
        (d.pendingClose ? '; pending close' : '') : '; authored preview: effective state not evaluated') +
      '; contacts ' + Object.keys(d.contacts).filter(function (k) { return d.contacts[k]; }).join(' ') +
      '; outcome ' + d.outcome + (d.diagnostic ? '; ' + d.diagnostic : '');
  }
  function cell(state, x, y) {
    var c = SM.RULES.describeTile(state, x, y), layers = [];
    if (c.target) layers.push(describe(c.terrain, c));
    var feature = describe(c.inst, c); if (c.target) feature.actorId = c.target.entityId; layers.push(feature);
    if (c.crate) { var crate = describe(c.crate, c); crate.actorId = c.crate.entityId; layers.push(crate); }
    if (c.dotHere) { var dot = describe(SM.DOT_DEFINITION, c); dot.actorId = 'dot'; layers.push(dot); }
    return { x: x, y: y, layers: layers, pendingClose: c.pendingClose,
      label: SM.RULES.cellLabel(x, y) + ': ' + layers.map(label).join(' / ') };
  }
  function board(state) {
    var cells = [];
    for (var y = 0; y < state.height; y++) for (var x = 0; x < state.width; x++) cells.push(cell(state, x, y));
    return { width: state.width, height: state.height, cells: cells,
      rays: SM.RULES.traceRays(state), outcome: SM.RULES.outcome(state) };
  }
  function authored(raw) {
    raw = raw || {};
    var grid = raw.grid || [], h = grid.length, w = h && Array.isArray(grid[0]) ? grid[0].length : 0;
    var cells = [];
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var row = grid[h - 1 - y] || [], id = row[x], original = SM.getTile(id);
      var inst = original && Object.assign({}, original, { params: Object.assign({}, original.params, raw.overrides && raw.overrides[id]) });
      var v = { P: raw.initial_player_colour || 'wht', W: raw.initial_world_colour || 'wht',
        polarity: raw.initial_polarity || 'red-open', knownState: false };
      var layers = [];
      if (inst && (inst.entityRole === 'crate' || inst.entityRole === 'target')) layers.push(describe(SM.getTile(0), v));
      layers.push(describe(inst, v));
      if (inst && inst.levelRole === 'start') layers.push(describe(SM.DOT_DEFINITION, v));
      cells.push({ x: x, y: y, layers: layers, label: String.fromCharCode(65 + x) + (y + 1) + ': ' + layers.map(label).join(' / ') });
    }
    return { width: w, height: h, cells: cells, rays: [], outcome: 'authoring' };
  }
  function screenCell(x, y, height, size) { return { x: x * size, y: (height - 1 - y) * size }; }
  function hit(px, py, width, height, size) {
    if (!(size > 0) || px < 0 || py < 0) return null;
    var x = Math.floor(px / size), y = height - 1 - Math.floor(py / size);
    return x < width && y >= 0 && y < height ? { x: x, y: y } : null;
  }
  function frames(steps) {
    var result = [];
    (steps || []).forEach(function (step) {
      var previous = result[result.length - 1];
      if (step.commit !== undefined && previous && previous[0].commit === step.commit) previous.push(step);
      else result.push([step]);
    });
    return result;
  }
  function applyFrame(view, events) {
    if (events.some(function (e) { return e.type === 'effect-abort'; })) return view;
    var authoritative = events.filter(function (e) { return e.type === 'state'; }).pop();
    if (authoritative) {
      SM.RULES.restore(view, authoritative.snapshot);
      if (authoritative.seen) view.seen = Object.assign({}, authoritative.seen);
      return view;
    }
    events.forEach(function (e) {
      if (e.type === 'move' || e.type === 'teleport') view.player = { x: e.to.x, y: e.to.y };
      else if (e.type === 'colour') view[e.which] = e.to;
      else if (e.type === 'polarity') view.polarity = e.to;
      else if (e.type === 'goal') view.won = true;
      else if (e.type === 'failed') { view.failed = true; view.won = false; view.failureReason = e.reason; }
      else if (e.type === 'switch') view.switches.forEach(function (s) {
        if (e.entityId ? s.entityId === e.entityId : s.x === e.x && s.y === e.y) s.latched = e.latched;
      });
      else if (e.type === 'target-move' || e.type === 'object-teleport' && e.objectType === 'target') {
        view.switches.forEach(function (s) {
          if (e.entityId ? s.entityId === e.entityId : s.inst.id === e.id && s.x === e.from.x && s.y === e.from.y) {
            s.x = e.to.x; s.y = e.to.y;
          }
        });
      } else if (e.type === 'push' || e.type === 'pull' || e.type === 'object-teleport') {
        var from = e.crate || e.from;
        view.crates[e.to.y][e.to.x] = view.crates[from.y][from.x]; view.crates[from.y][from.x] = null;
      }
    });
    return view;
  }
  SM.VISUALS = { describe: describe, label: label, cell: cell, board: board, authored: authored,
    screenCell: screenCell, hit: hit, frames: frames, applyFrame: applyFrame };
})(typeof window !== 'undefined' ? window : globalThis);
