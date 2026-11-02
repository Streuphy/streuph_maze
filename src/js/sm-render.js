/* GPL-3.0: passive shared-board playback of committed state/events. */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});
  function Renderer(root, options) {
    this.root = root; this.opts = options || {};
    this.board = this.opts.board || root.querySelector('#board') || root.querySelector('#test-board');
    this.banner = root.querySelector('#banner') || root.querySelector('#test-banner');
    this.view = null; this.sequence = null; this.generation = 0;
    this.surface = new SM.Surface(this.board, { cellSize: 32 });
    var self = this;
    this.surface.onSuspend = function () { self.cancel(); };
    this.surface.onDispose = function () {
      self.generation++; if (self.sequence) self.sequence.finished = true; self.sequence = null;
      if (self.unsubscribe) self.unsubscribe(); if (self.observer) self.observer.disconnect();
    };
    this.unsubscribe = SM.PRESENTATION.subscribe(function () { self.cancel(); if (self.view) self.draw(self.view); });
    if (global.ResizeObserver) { this.observer = new global.ResizeObserver(function () { self.fitBoard(); }); this.observer.observe(this.board.parentElement); }
  }
  Renderer.prototype.build = function (state) {
    this.cancel(); this.state = state; this.view = SM.RULES.cloneState(state); this.draw(this.view); this.fitBoard();
    var x = this.root.querySelector('#ruler-x'), y = this.root.querySelector('#ruler-y');
    if (x) { x.textContent = ''; for (var i = 0; i < state.width; i++) { var span = global.document.createElement('span'); span.textContent = SM.RULES.colName(i); x.appendChild(span); } x.style.setProperty('--cols', state.width); }
    if (y) { y.textContent = ''; for (var j = state.height; j > 0; j--) { var sy = global.document.createElement('span'); sy.textContent = j; y.appendChild(sy); } y.style.setProperty('--rows', state.height); }
  };
  Renderer.prototype.draw = function (view, animate) {
    this.view = view; if (this.surface) this.surface.update(SM.VISUALS.board(view), animate);
  };
  Renderer.prototype.fitBoard = function () {
    if (!this.state || !this.surface) return;
    var parent = this.board.parentElement, main = this.root.querySelector('main');
    var width = (main || parent).clientWidth || 800;
    // Quick-test containers grow with their child; fitting to that child-driven
    // height creates a ResizeObserver shrink loop. Use the viewport budget.
    var height = main ? main.clientHeight || 600 : Math.max(200, (global.innerHeight || 800) * 0.55);
    var size = Math.max(20, Math.min(96, Math.floor((width - 30) / this.state.width), Math.floor((height - 30) / this.state.height)));
    this.surface.resize(size); this.board.style.setProperty('--cell', size + 'px');
    ['#ruler-x', '#ruler-y'].forEach(function (selector) { var ruler = this.root.querySelector(selector); if (ruler) ruler.style.setProperty('--cell', size + 'px'); }, this);
  };
  Renderer.prototype.cells = function () { return this.surface.grid.children; };
  Renderer.prototype.cellAt = function (x, y) { return this.surface.grid.querySelector('[data-x="' + x + '"][data-y="' + y + '"]'); };
  Renderer.prototype.placePlayer = function () { /* actors are composed by the shared surface */ };
  Renderer.prototype.play = function (steps, view, done) {
    this.cancel(); this.view = view;
    var self = this, generation = ++this.generation;
    var sequence = this.sequence = { frames: SM.VISUALS.frames(steps), index: 0, done: done, finished: false, last: null };
    function finish() {
      if (sequence.finished) return; sequence.finished = true;
      if (self.sequence === sequence) self.sequence = null;
      self.surface.onTick = null; self.surface.settle();
      if (generation === self.generation && typeof done === 'function') done();
    }
    sequence.finish = finish;
    sequence.advance = function (instant) {
      while (sequence.index < sequence.frames.length) {
        var frame = sequence.frames[sequence.index++]; SM.VISUALS.applyFrame(view, frame);
        var portal = frame.some(function (event) { return event.type === 'teleport' || event.type === 'object-teleport'; });
        self.draw(view, !instant && !portal);
        if (frame.some(function (e) { return e.type === 'failed'; })) self.say('Attempt failed. Restart or choose another level.', 'warn');
        if (!instant) break;
      }
      if (sequence.index >= sequence.frames.length && instant) finish();
    };
    if (!sequence.frames.length || SM.PRESENTATION.reduced() || this.surface.error) { sequence.advance(true); return; }
    this.surface.onTick = function (now) {
      if (generation !== self.generation || sequence.finished) return;
      if (sequence.last === null || now - sequence.last >= 70) {
        sequence.last = now;
        if (sequence.index >= sequence.frames.length) finish(); else sequence.advance(false);
      }
    };
    // Seed one frame before waiting; prevent reentrant drawing from consuming two.
    sequence.last = global.performance.now();
    sequence.advance(false); this.surface.start();
  };
  Renderer.prototype.cancel = function () {
    if (this.sequence && !this.sequence.finished) this.sequence.advance(true);
    if (this.surface) this.surface.settle();
  };
  Renderer.prototype.dispose = function () {
    this.generation++; if (this.sequence) this.sequence.finished = true; this.sequence = null;
    if (this.unsubscribe) this.unsubscribe(); if (this.observer) this.observer.disconnect(); if (this.surface) this.surface.dispose();
  };
  Renderer.prototype.say = function (text, tone) { if (this.banner) { this.banner.textContent = text || ''; this.banner.className = tone || ''; } };
  Renderer.applyFrame = function (view, frame) { return SM.VISUALS.applyFrame(view, frame); };
  SM.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
