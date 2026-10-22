/* =========================================================================
 * sm-render.js  —  STREUPH'S MAZE
 * The display-only view and step playback.
 *
 * This is the ONLY layer that may use a timer. It exists purely to PLAY BACK
 * the step list that sm-rules.js returned; it never decides anything. If the
 * player presses a key during playback, the current turn is finished
 * instantly and the queued animation is dropped — input is never gated
 * (R3, §9.2). "Animation" here means "show the intermediate positions that
 * the rules already committed to"; it can never change the outcome.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  var STEP_MS = 70;        // per free belt hop / push
  var MIN_PLAY_MS = 60;    // floor so a 1-step turn still reads as a turn

  function Renderer(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.board = root.querySelector('#board');
    this.playerEl = root.querySelector('#player');
    if (this.playerEl && SM.PLAYER_PRESENTATION) {
      this.playerEl.dataset.motion = SM.PLAYER_PRESENTATION.motion;
      this.playerEl.style.setProperty('--pulse-half-duration',
        (SM.PLAYER_PRESENTATION.frames * SM.PLAYER_PRESENTATION.frameMs / 2) + 'ms');
    }
    this.banner = root.querySelector('#banner');
    this.cellSize = 0;
    this.queue = null;
    this.timer = null;
    this.view = null;      // display-only mirror of the rules state
    this.resizeObserver = null;
    if (global.ResizeObserver) {
      var self = this;
      this.resizeObserver = new global.ResizeObserver(function () { self.fitBoard(); });
      var main = root.querySelector('main');
      if (main) this.resizeObserver.observe(main);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Board construction                                                  */
  /* ------------------------------------------------------------------ */

  Renderer.prototype.build = function (state) {
    var level = state.level;
    this.state = state;
    this.view = mirror(state);

    var b = this.board;
    b.style.setProperty('--cols', level.width);
    b.style.setProperty('--rows', level.height);

    // Keep the player overlay: it is a child of #board purely so it shares
    // its positioning context, and it is re-appended after the cells.
    var keep = this.playerEl.parentNode === b ? this.playerEl : null;
    b.textContent = '';

    var frag = document.createDocumentFragment();
    for (var y = 0; y < level.height; y++) {
      for (var x = 0; x < level.width; x++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.dataset.label = SM.RULES.cellLabel(x, y);
        frag.appendChild(cell);
      }
    }
    b.appendChild(frag);
    if (keep) b.appendChild(keep);

    this.renderRulers(level);
    this.draw(this.view);
    this.fitBoard();
  };

  Renderer.prototype.renderRulers = function (level) {
    var x = this.root.querySelector('#ruler-x');
    var y = this.root.querySelector('#ruler-y');
    if (!x || !y) return;
    x.textContent = '';
    y.textContent = '';
    for (var i = 0; i < level.width; i++) {
      var sx = document.createElement('span');
      sx.textContent = SM.RULES.colName(i);
      x.appendChild(sx);
    }
    for (var j = 0; j < level.height; j++) {
      var sy = document.createElement('span');
      sy.textContent = String(j + 1);
      y.appendChild(sy);
    }
    x.style.setProperty('--cols', level.width);
    y.style.setProperty('--rows', level.height);
  };

  /** Size the display grid to its viewport; game rules never read this value. */
  Renderer.prototype.fitBoard = function () {
    if (!this.state || !this.board) return;
    var main = this.root.querySelector('main');
    if (!main) return;
    var style = global.getComputedStyle ? global.getComputedStyle(main) : null;
    var left = style ? parseFloat(style.paddingLeft) : 16;
    var right = style ? parseFloat(style.paddingRight) : 16;
    var top = style ? parseFloat(style.paddingTop) : 16;
    var bottom = style ? parseFloat(style.paddingBottom) : 16;
    var padX = (isFinite(left) ? left : 0) + (isFinite(right) ? right : 0);
    var padY = (isFinite(top) ? top : 0) + (isFinite(bottom) ? bottom : 0);
    // Reserve room for coordinate rulers, frame borders and gaps.
    var usableW = Math.max(1, main.clientWidth - padX - 28);
    var usableH = Math.max(1, main.clientHeight - padY - 24);
    var maxCell = Math.min(120, Math.max(80, Math.floor(usableW / 12)));
    var size = Math.floor(Math.min(
      usableW / this.state.level.width,
      usableH / this.state.level.height,
      maxCell
    ));
    size = Math.max(20, size);
    var value = size + 'px';
    this.board.style.setProperty('--cell', value);
    var rulerX = this.root.querySelector('#ruler-x');
    var rulerY = this.root.querySelector('#ruler-y');
    if (rulerX) rulerX.style.setProperty('--cell', value);
    if (rulerY) rulerY.style.setProperty('--cell', value);
    if (this.view) this.placePlayer(this.view, false);
  };

  /* ------------------------------------------------------------------ */
  /* Drawing                                                             */
  /* ------------------------------------------------------------------ */

  Renderer.prototype.cells = function () {
    return this.board.children;
  };

  Renderer.prototype.cellAt = function (x, y) {
    return this.board.children[y * this.state.level.width + x];
  };

  Renderer.prototype.draw = function (view) {
    var lv = this.state.level;
    var w = lv.width;
    for (var y = 0; y < lv.height; y++) {
      for (var x = 0; x < w; x++) {
        var inst = lv.tiles[y][x];
        var cell = this.board.children[y * w + x];
        var ctx = SM.RULES.describeTile(view, x, y);
        var html = SM.glyph(ctx.inst, ctx);
        if (ctx.crate) html += SM.glyph(ctx.crate, ctx);
        if (cell.dataset.mark !== html) {
          cell.innerHTML = html ? wrapSvg(html) : '';
          cell.dataset.mark = html;
        }
        var cls = 'cell' + (ctx.solid ? ' wall' : '');
        if (cell.className !== cls) cell.className = cls;
      }
    }
    var aura = this.playerEl.querySelector('.aura');
    aura.style.background = SM.PALETTE[view.P] || SM.PALETTE.wht;
    aura.style.borderColor = SM.PALETTE[view.W] || SM.PALETTE.wht;
    aura.classList.toggle('matched', view.P === view.W);
  };

  function wrapSvg(inner) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';
  }

  /** A display-only copy of the rules state. The renderer never writes back. */
  function mirror(state) {
    return SM.RULES.cloneState(state);
  }

  Renderer.prototype.placePlayer = function (view, animate) {
    var lv = this.state.level;
    var cell = this.cellAt(view.player.x, view.player.y);
    if (!cell || !this.playerEl.isConnected) return;
    var rect = cell.getBoundingClientRect();
    var boardRect = this.board.getBoundingClientRect();
    var size = rect.width;
    if (this.cellSize !== size && size > 0) this.cellSize = size;
    this.playerEl.style.width = size + 'px';
    this.playerEl.style.height = size + 'px';
    var tx = rect.left - boardRect.left;
    var ty = rect.top - boardRect.top;
    if (!animate) {
      this.playerEl.style.transition = 'none';
      this.playerEl.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      void this.playerEl.offsetWidth;
      this.playerEl.style.transition = '';
    } else {
      this.playerEl.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    }
  };

  /* ------------------------------------------------------------------ */
  /* Step playback                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Play a step list. `done` fires when the animation finishes OR when the
   * player interrupts. Never gates the next input.
   */
  Renderer.prototype.play = function (steps, view, done) {
    this.cancel();
    this.view = view;

    var self = this;
    var i = 0;
    var started = now();
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      if (self.timer) { clearTimeout(self.timer); self.timer = null; }
      self.queue = null;
      done();
    }
    this.queue = finish;

    function tick() {
      if (i >= steps.length) {
        var wait = Math.max(0, MIN_PLAY_MS - (now() - started));
        self.timer = setTimeout(function () { self.timer = null; finish(); }, wait);
        return;
      }
      applyStep(view, steps[i++]);
      self.draw(view);
      self.placePlayer(view, true);
      self.timer = setTimeout(tick, STEP_MS);
    }

    // Always show at least the first frame synchronously so the board is
    // never a turn behind the rules state.
    if (steps.length === 0) { finish(); return; }
    tick();
  };

  Renderer.prototype.cancel = function () {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.queue) { var q = this.queue; this.queue = null; q(); }
  };

  function now() {
    return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
  }

  /** Apply ONE step to the DISPLAY mirror. Purely visual bookkeeping. */
  function applyStep(view, step) {
    switch (step.type) {
      case 'move':
        view.player.x = step.to.x; view.player.y = step.to.y;
        break;
      case 'push':
        view.crates[step.to.y][step.to.x] = view.crates[step.crate.y][step.crate.x];
        view.crates[step.crate.y][step.crate.x] = null;
        break;
      case 'teleport':
        view.player.x = step.to.x; view.player.y = step.to.y;
        break;
      case 'colour':
        if (step.which === 'P') view.P = step.to; else view.W = step.to;
        break;
      case 'switch': {
        for (var i = 0; i < view.switches.length; i++) {
          if (view.switches[i].x === step.x && view.switches[i].y === step.y) {
            view.switches[i].latched = step.latched;
          }
        }
        break;
      }
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------ */

  Renderer.prototype.say = function (text, tone) {
    this.banner.textContent = text || '';
    this.banner.className = tone || '';
  };

  SM.Renderer = Renderer;

})(typeof window !== 'undefined' ? window : globalThis);
