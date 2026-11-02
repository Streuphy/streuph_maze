/* GPL-3.0: shared Konva board/authoring surface and presentation preferences. */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {}), listeners = new Set(), surfaces = new Set();
  var settings = { theme: 'pixel', motion: 'system' }, storageKey = 'streuphs-maze/presentation';
  try {
    var stored = JSON.parse(global.localStorage.getItem(storageKey) || 'null');
    if (stored && stored.schema === 1) {
      if (['pixel', 'vector'].indexOf(stored.theme) >= 0) settings.theme = stored.theme;
      if (['system', 'reduced', 'full'].indexOf(stored.motion) >= 0) settings.motion = stored.motion;
    }
  } catch (ignore) { /* session preferences remain usable */ }
  try { var urlTheme = new URLSearchParams(global.location.search).get('theme');
    if (['pixel', 'vector'].indexOf(urlTheme) >= 0) settings.theme = urlTheme;
  } catch (ignore) { /* headless context */ }
  var reduced = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function notify() { listeners.forEach(function (fn) { fn(settings); }); }
  function change(values) {
    if (['pixel', 'vector'].indexOf(values.theme) >= 0) settings.theme = values.theme;
    if (['system', 'reduced', 'full'].indexOf(values.motion) >= 0) settings.motion = values.motion;
    try { global.localStorage.setItem(storageKey, JSON.stringify({ schema: 1, theme: settings.theme, motion: settings.motion })); } catch (ignore) {}
    if (values.theme && global.history) try {
      var url = new URL(global.location.href); url.searchParams.set('theme', settings.theme); global.history.replaceState(null, '', url.href);
    } catch (ignore) {}
    notify();
  }
  if (reduced.addEventListener) reduced.addEventListener('change', notify);
  function controls(host) {
    if (!host || host.querySelector('.graphics-controls')) return;
    var box = global.document.createElement('span'); box.className = 'graphics-controls';
    [['theme', 'Graphics', ['pixel', 'vector']], ['motion', 'Motion', ['system', 'reduced', 'full']]].forEach(function (field) {
      var label = global.document.createElement('label'), select = global.document.createElement('select');
      label.appendChild(global.document.createTextNode(field[1] + ' ')); select.setAttribute('aria-label', field[1]);
      field[2].forEach(function (value) { var option = global.document.createElement('option'); option.value = value; option.textContent = value; select.appendChild(option); });
      select.value = settings[field[0]]; select.addEventListener('change', function () { var v = {}; v[field[0]] = select.value; change(v); });
      listeners.add(function () { if (select.isConnected) select.value = settings[field[0]]; });
      label.appendChild(select); box.appendChild(label);
    });
    host.appendChild(box);
  }
  SM.PRESENTATION = { settings: settings, set: change, controls: controls,
    reduced: function () { return settings.motion === 'reduced' || settings.motion === 'system' && reduced.matches; },
    subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; } };

  function Surface(host, options) {
    this.host = host; this.options = options || {}; this.groups = new Map(); this.size = this.options.cellSize || 32;
    this.disposed = false; this.board = null; this.phase = 0; this.fallbacks = 0;
    surfaces.add(this);
    host.textContent = ''; host.classList.add('graphics-board'); host.style.position = 'relative';
    this.canvasHost = global.document.createElement('div'); this.canvasHost.className = 'graphics-canvas';
    this.grid = global.document.createElement('div'); this.grid.className = 'graphics-semantics'; this.grid.setAttribute('role', 'grid');
    this.grid.style.position = 'absolute'; this.grid.style.inset = '0'; host.appendChild(this.canvasHost); host.appendChild(this.grid);
    var self = this;
    try {
      var probe = global.document.createElement('canvas'); if (!probe.getContext('2d')) throw new Error('Canvas2D renderer unavailable');
      this.stage = new global.Konva.Stage({ container: this.canvasHost, width: 32, height: 32 });
      this.layers = [0, 1, 2].map(function () { var layer = new global.Konva.Layer({ listening: false }); self.stage.add(layer); return layer; });
      this.clock = new global.Konva.Animation(function () { self.tick(); }, this.layers);
    } catch (error) {
      this.error = 'Canvas2D renderer unavailable: ' + error.message;
      this.canvasHost.textContent = this.error; this.canvasHost.setAttribute('role', 'status');
    }
    this.onVisibility = function () {
      if (global.document.hidden) { if (self.clock) self.clock.stop(); if (self.onSuspend) self.onSuspend(); else self.settle(); }
      else self.start();
    };
    global.document.addEventListener('visibilitychange', this.onVisibility);
    this.unsubscribe = SM.PRESENTATION.subscribe(function () { if (self.board) { self.settle(); self.update(self.board); } });
  }
  Surface.prototype.identity = function () { return this.options.identity || settings.theme; };
  Surface.prototype.update = function (board, animate) {
    if (this.disposed) return;
    this.board = board;
    this.fallbacks = 0;
    if (!(board.width > 0 && board.height > 0)) {
      this.grid.textContent = 'Empty or invalid board';
      this.host.setAttribute('aria-label', 'Empty or invalid board');
      this.groups.forEach(function (r) { r.group.destroy(); }); this.groups.clear();
      if (this.clock) this.clock.stop();
      if (this.stage) { this.layers.forEach(function (l) { l.destroyChildren(); }); this.stage.draw(); }
      return;
    }
    Array.from(this.grid.childNodes).forEach(function (n) { if (n.nodeType === 3) n.remove(); });
    var self = this, K = global.Konva, size = this.size, theme = this.identity(), alive = new Set();
    var terminal = board.outcome === 'failed' || board.outcome === 'won';
    this.host.dataset.outcome = board.outcome; this.host.dataset.theme = theme;
    this.host.setAttribute('aria-label', 'maze board — ' + board.outcome);
    this.host.style.width = board.width * size + 'px'; this.host.style.height = board.height * size + 'px';
    if (this.stage) {
      var ratio = global.devicePixelRatio || 1;
      if (this.dpr !== ratio) {
        this.layers.forEach(function (layer) { layer.getCanvas().setPixelRatio(ratio); layer.getHitCanvas().setPixelRatio(ratio); });
        [this.stage.bufferCanvas, this.stage.bufferHitCanvas].forEach(function (canvas) { if (canvas) canvas.setPixelRatio(ratio); });
        this.dpr = ratio;
      }
      this.stage.size({ width: board.width * size, height: board.height * size });
      this.layers.forEach(function (l) {
        l.imageSmoothingEnabled(theme !== 'pixel');
        // A DPR-only Canvas resize resets native context state even if the
        // Konva attribute itself did not change.
        l.getContext().setAttr('imageSmoothingEnabled', theme !== 'pixel');
      });
      this.layers[2].destroyChildren();
    }
    var existing = new Map(Array.from(this.grid.children).map(function (c) { return [c.dataset.x + ',' + c.dataset.y, c]; }));
    board.cells.forEach(function (cell, cellIndex) {
      var pos = SM.VISUALS.screenCell(cell.x, cell.y, board.height, size), coord = cell.x + ',' + cell.y;
      var button = existing.get(coord);
      if (!button) {
        button = global.document.createElement('button'); button.type = 'button'; button.className = 'cell';
        button.dataset.x = cell.x; button.dataset.y = cell.y; button.setAttribute('role', 'gridcell');
        button.tabIndex = cellIndex === 0 ? 0 : -1;
        button.addEventListener('click', function (event) { if (self.options.onCell) self.options.onCell(cell.x, cell.y, event); });
        button.addEventListener('contextmenu', function (event) { if (self.options.onCell) { event.preventDefault(); self.options.onCell(cell.x, cell.y, event); } });
        button.addEventListener('keydown', function (event) {
          var delta = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
          if (!delta) return;
          // Play keeps ordinary arrows as game commands; Alt+arrows inspect.
          if (!self.options.onCell && !event.altKey) return;
          event.preventDefault(); event.stopPropagation();
          var next = self.grid.querySelector('[data-x="' + (cell.x + delta[0]) + '"][data-y="' + (cell.y + delta[1]) + '"]');
          if (next) { button.tabIndex = -1; next.tabIndex = 0; next.focus();
            if (self.options.onCursor) self.options.onCursor(+next.dataset.x, +next.dataset.y, event);
            else if (!self.options.onCell) next.click();
          }
        });
        self.grid.appendChild(button);
      }
      existing.delete(coord); button.setAttribute('aria-label', cell.label); button.title = cell.label;
      button.dataset.mark = JSON.stringify(cell.layers);
      button.classList.toggle('wall', !!cell.layers[0].solid);
      button.classList.toggle('pending-close', !!cell.pendingClose);
      var rays = (board.rays || []).filter(function (ray) { return ray.cells.some(function (p) { return p.x === cell.x && p.y === cell.y; }); });
      if (rays.length) button.dataset.ray = rays.map(function (r) { return r.dir.x > 0 ? 'east' : r.dir.x < 0 ? 'west' : r.dir.y > 0 ? 'north' : 'south'; }).join(' ');
      else delete button.dataset.ray;
      button.dataset.pendingClose = String(!!cell.pendingClose); button.style.cssText = 'position:absolute;left:' + pos.x + 'px;top:' + pos.y + 'px;width:' + size + 'px;height:' + size + 'px';
      if (!self.stage) return;
      cell.layers.forEach(function (d, index) {
        var actor = d.actorId || (d.id === 'dot' ? 'dot' : null);
        var id = actor ? 'actor:' + actor : coord + ':' + index;
        var signature = theme + ':' + JSON.stringify(d), record = self.groups.get(id);
        if (!record) {
          record = { group: new K.Group({ listening: false }), signature: null, x: pos.x, y: pos.y };
          self.layers[actor ? 1 : 0].add(record.group); self.groups.set(id, record);
        }
        record.actor = !!actor; record.weight = d.layer === 'feature' ? 0 : d.id === 'dot' ? 2 : 1;
        alive.add(id);
        if (record.signature !== signature) { record.group.destroyChildren(); record.group.add(SM.GRAPHICS.node(d, theme)); record.signature = signature; }
        record.group.scale({ x: size / 32, y: size / 32 });
        record.from = { x: record.x, y: record.y }; record.to = pos;
        var adjacent = Math.abs(record.x - pos.x) + Math.abs(record.y - pos.y) === size;
        record.started = animate && actor && adjacent && !SM.PRESENTATION.reduced() && !terminal ? global.performance.now() : null;
        record.x = pos.x; record.y = pos.y; record.group.position(record.started === null ? pos : record.from);
        record.group.getChildren().forEach(function (node) { if (node.getAttr('pixelFallback')) self.fallbacks++; });
      });
      if (cell.pendingClose || self.options.cursor && self.options.cursor.x === cell.x && self.options.cursor.y === cell.y) {
        self.layers[2].add(new K.Rect({ x: pos.x + 1, y: pos.y + 1, width: size - 2, height: size - 2,
          stroke: SM.PALETTE.wht, strokeWidth: 2, dash: cell.pendingClose ? [4, 3] : [], listening: false }));
      }
      // Occupants must not erase the supporting target/gate identity. These
      // small semantic badges sit above actors, alongside the pending outline.
      if (cell.layers.some(function (d) { return d.key === 'crate' || d.id === 'dot'; })) {
        var support = cell.layers.find(function (d) { return ['target', 'phaseWall', 'auraGate', 'worldGate', 'void', 'polarityRedBarrier', 'polarityBlueBarrier'].indexOf(d.key) >= 0; });
        if (support) {
          var badge = Math.max(4, Math.floor(size / 8)), col = support.key === 'polarityRedBarrier' ? SM.PALETTE.red : support.key === 'polarityBlueBarrier' ? SM.PALETTE.blu : SM.PALETTE[support.colour];
          if (support.key === 'target') self.layers[2].add(new K.Circle({ x: pos.x + badge + 2, y: pos.y + badge + 2, radius: badge / 2,
            fill: support.active ? SM.PALETTE.wht : '#141923', stroke: SM.PALETTE.wht, strokeWidth: 1, listening: false }));
          else if (support.carrier === 'P') self.layers[2].add(new K.Circle({ x: pos.x + badge + 2, y: pos.y + badge + 2,
            radius: badge / 2, fill: col, stroke: '#090c13', strokeWidth: 1, listening: false, name: 'support-badge' }));
          else if (support.key.indexOf('polarity') === 0) self.layers[2].add(new K.Line({
            points: [pos.x + 3 + badge / 2, pos.y + 3, pos.x + 3 + badge, pos.y + 3 + badge / 2,
              pos.x + 3 + badge / 2, pos.y + 3 + badge, pos.x + 3, pos.y + 3 + badge / 2],
            closed: true, fill: col, stroke: '#090c13', strokeWidth: 1, listening: false }));
          else self.layers[2].add(new K.Rect({ x: pos.x + 3, y: pos.y + 3, width: badge, height: badge,
            fill: support.carrier === 'W' ? '#090c13' : col, stroke: support.carrier === 'W' ? col : '#090c13', strokeWidth: 1, listening: false, name: 'support-badge' }));
          var pipSize = Math.max(2, Math.floor(size / 9));
          if (support.link) for (var p = 0; p < Math.min(4, support.link); p++) self.layers[2].add(new K.Rect({
            x: pos.x + 3 + p * (pipSize + 1), y: pos.y + size - pipSize - 3, width: pipSize, height: pipSize,
            fill: SM.PALETTE.wht, stroke: '#090c13', strokeWidth: 1, listening: false }));
          if (support.link >= 5) self.layers[2].add(new K.Circle({ x: pos.x + size - 3, y: pos.y + size - 3,
            radius: 1.5, fill: SM.PALETTE.wht, stroke: '#090c13', strokeWidth: 1, listening: false }));
        }
      }
    });
    existing.forEach(function (c) { c.remove(); });
    this.groups.forEach(function (record, id) { if (!alive.has(id)) { record.group.destroy(); self.groups.delete(id); } });
    Array.from(this.groups.values()).filter(function (r) { return r.actor; }).sort(function (a, b) { return a.weight - b.weight; })
      .forEach(function (r, index) { r.group.zIndex(index); });
    if (this.stage) {
      (board.rays || []).forEach(function (ray) { ray.cells.forEach(function (c) {
        var p = SM.VISUALS.screenCell(c.x, c.y, board.height, size);
        self.layers[2].add(new K.Line({ points: ray.dir.x ? [p.x, p.y + size / 2, p.x + size, p.y + size / 2] : [p.x + size / 2, p.y, p.x + size / 2, p.y + size],
          stroke: SM.PALETTE.red, strokeWidth: Math.max(2, size / 12), opacity: 0.55, listening: false, name: 'beam' }));
      }); });
      this.stage.draw(); this.start();
    }
    this.host.dataset.pixelFallbacks = String(this.fallbacks);
    if (this.fallbacks) this.host.setAttribute('aria-description', this.fallbacks + ' glyph instances missing pixel art; vector fallback displayed');
    else this.host.removeAttribute('aria-description');
  };
  Surface.prototype.tick = function () {
    if (this.disposed || !this.board || global.document.hidden) return;
    if (this.host.closest('[hidden]')) { this.clock.stop(); if (this.onSuspend) this.onSuspend(); else this.settle(); return; }
    this._ticking = true;
    var now = global.performance.now(), phase = Math.floor(now / 160);
    if (this.onTick) this.onTick(now);
    var terminal = this.board.outcome === 'failed' || this.board.outcome === 'won';
    var motion = !this.options.static && !SM.PRESENTATION.reduced() && !terminal, active = !!this.onTick;
    this.groups.forEach(function (record) {
      if (record.started !== null && record.started !== undefined) {
        var t = Math.min(1, (now - record.started) / 70);
        record.group.position({ x: record.from.x + (record.to.x - record.from.x) * t, y: record.from.y + (record.to.y - record.from.y) * t });
        if (t === 1) record.started = null; else active = true;
      }
      record.group.getChildren().forEach(function (n) {
        if (n._smAnimation) { n.frameIndex(motion ? Math.floor(now / n._smAnimation.frameMs) % n._smAnimation.frames : 0); if (motion) active = true; }
      });
    });
    if (motion) this.layers[2].find('.beam').forEach(function (n) { n.opacity(phase % 2 ? 0.5 : 0.65); active = true; });
    this.phase = phase; if (!active) this.clock.stop(); this._ticking = false;
  };
  Surface.prototype.start = function () {
    if (this.options.static) { if (this.clock) this.clock.stop(); return; }
    if (this.clock && !this.disposed && !global.document.hidden && !this.host.closest('[hidden]')) { this.clock.start(); if (!this._ticking) this.tick(); }
  };
  Surface.prototype.settle = function () {
    this.groups.forEach(function (r) { r.started = null; r.group.position(r.to || { x: r.x, y: r.y }); });
    if (this.stage) this.stage.draw();
  };
  Surface.prototype.resize = function (size) { this.size = Math.max(20, Math.floor(size)); if (this.board) this.update(this.board); };
  Surface.prototype.exportImage = function () { this.settle(); if (!this.stage) throw new Error(this.error); return this.stage.toDataURL({ pixelRatio: 1, imageSmoothingEnabled: this.identity() !== 'pixel' }); };
  Surface.prototype.dispose = function () {
    if (this.disposed) return; this.disposed = true; if (this.clock) this.clock.stop();
    this.unsubscribe(); global.document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.onDispose) this.onDispose();
    if (this.stage) this.stage.destroy(); this.groups.clear(); this.host.textContent = ''; surfaces.delete(this);
  };
  Surface.instances = surfaces;
  SM.Surface = Surface;
  if (global.addEventListener) global.addEventListener('pagehide', function () {
    surfaces.forEach(function (surface) { if (surface.onSuspend) surface.onSuspend(); surface.dispose(); });
  });
  if (global.document) global.document.addEventListener('DOMContentLoaded', function () {
    controls(global.document.querySelector('header') || global.document.body);
  });
})(typeof window !== 'undefined' ? window : globalThis);
