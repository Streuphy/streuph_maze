/* =========================================================================
 * sm-ui.js  —  STREUPH'S MAZE
 * The game controller: input, the turn loop, progression, and the codex.
 * Input, progression, and presentation controller.
 *
 * The turn loop is deliberately dumb:
 *     rules.resolveTurn(state, action)  ->  steps[]
 *     renderer.play(steps, mirror)      ->  animation
 * Nothing here can change the outcome of a turn. If the player out-runs the
 * animation, the renderer snaps to the truth and the loop continues.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  var KEYMAP = {
    ArrowUp: 'north', ArrowDown: 'south', ArrowLeft: 'west', ArrowRight: 'east',
    Up: 'north', Down: 'south', Left: 'west', Right: 'east',
    w: 'north', W: 'north', s: 'south', S: 'south', a: 'west', A: 'west',
    d: 'east', D: 'east',
    k: 'north', h: 'west', j: 'south', l: 'east',
    K: 'north', H: 'west', J: 'south', L: 'east'
  };

  function queryFromRootOrDocument(root, selector) {
    return root.querySelector(selector) || document.querySelector(selector);
  }

  function Game(root) {
    this.root = root;
    this.levels = [];
    this.index = 0;
    this.state = null;
    this.history = [];      // undo stack of SM.RULES snapshots
    this.pending = false;
    this.r = new SM.Renderer(root, {});
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  Game.prototype.boot = function () {
    this.levels = SM.game.levels;
    this.el = {
      levels:   this.root.querySelector('#levels'),
      worldName: this.root.querySelector('#world-name'),
      tutorial: this.root.querySelector('#tutorial'),
      codex:    this.root.querySelector('#codex'),
      hud:      this.root.querySelector('#hud'),
      strokes:  this.root.querySelector('#v-strokes'),
      par:      this.root.querySelector('#v-par'),
      best:     this.root.querySelector('#v-best'),
      moves:    this.root.querySelector('#v-turns'),
      win:      queryFromRootOrDocument(this.root, '#win'),
      winScore: queryFromRootOrDocument(this.root, '#win-score'),
      winPar:   queryFromRootOrDocument(this.root, '#win-par'),
      winTitle: queryFromRootOrDocument(this.root, '#win-title'),
      winPicturePanel: this.root.querySelector('#win-picture-panel'),
      winPicture: this.root.querySelector('#win-picture'),
      dpad:     this.root.querySelector('#dpad'),
      storage:  this.root.querySelector('#storage-note')
    };
    this.bindInput();
    this.load(SM.game.startLevel || 0);
    if (this.el.storage) {
      this.el.storage.textContent = SM.STORE.durable()
        ? 'Progress is saved in this browser.'
        : 'This browser will not let a file:// page store anything, so progress lasts only until you close the tab. Use Export below.';
    }
  };

  Game.prototype.indexOfKey = function (key) {
    for (var i = 0; i < this.levels.length; i++) if (this.levels[i].key === key) return i;
    return -1;
  };

  /* ------------------------------------------------------------------ */
  /* Level lifecycle                                                     */
  /* ------------------------------------------------------------------ */

  Game.prototype.unlocked = function (i) {
    if (this.levels[i] && this.levels[i].worldId !== 'prologue') return true;
    if (i === 0) return true;
    var entry = SM.STORE.entry(this.levels[i - 1].key, this.levels[i - 1].worldId);
    return !!entry.cleared;
  };

  Game.prototype.load = function (i) {
    this.clearWinPicture();
    i = Math.max(0, Math.min(this.levels.length - 1, i));
    this.index = i;
    var level = this.levels[i];
    this.state = SM.RULES.newState(level);
    this.history = [];
    this.overParSaid = false;
    this.r.build(this.state);
    SM.STORE.setLastLevel(level.key, level.worldId);
    this.syncAll();
    this.r.say(level.goalText || '');
  };

  Game.prototype.restart = function () {
    this.r.cancel();
    this.load(this.index);
  };

  /* ------------------------------------------------------------------ */
  /* The turn loop                                                       */
  /* ------------------------------------------------------------------ */

  Game.prototype.act = function (action) {
    if (!this.state || this.state.won) return;
    // Interrupt: finish any running animation instantly. Input is never gated.
    if (this.pending) { this.r.cancel(); this.pending = false; }

    // Undo history is captured BEFORE the resolver runs, because
    // resolveTurn mutates in place and there is no dry-run mode (R19 needs a
    // real snapshot, not a re-simulation).
    var before = SM.RULES.snapshot(this.state);
    var viewBefore = SM.RULES.cloneState(this.state);

    var result;
    try {
      result = SM.RULES.resolveTurn(this.state, action);
    } catch (e) {
      this.r.say(e.message || String(e), 'warn');
      return;
    }

    if (!result.changed && !result.stroke) {
      // Blocked move: no stroke, no history entry. Still flash a reason.
      this.flashBlock(result.steps);
      this.syncHud();
      return;
    }

    // Undo restores the state immediately before this resolved action.
    this.history.push(before);
    this.syncHud();
    this.syncCarriers();

    var self = this;
    this.pending = true;
    this.r.play(result.steps, viewBefore, function () {
      self.pending = false;
      self.r.view = self.snapshotView();
      self.r.draw(self.r.view);
      self.r.placePlayer(self.r.view, false);
      self.afterTurn();
    });
  };

  /** A copy of the CURRENT state to hand the renderer as a display mirror. */
  Game.prototype.snapshotView = function () {
    return SM.RULES.cloneState(this.state);
  };

  Game.prototype.afterTurn = function () {
    var s = this.state;
    var level = this.state.level;
    SM.STORE.noteTiles(level.key, Object.keys(s.seen).map(Number), level.worldId);
    this.syncCodex();
    this.syncHud();

    if (s.won) this.onWin();
    else if (s.strokes > (level.par || Infinity) && !this.overParSaid) {
      this.overParSaid = true;
      this.r.say('Over par. Undo (Z) or restart (R) if this run is not the one you want.', 'warn');
    } else {
      this.r.say(level.goalText || '');
    }
  };

  Game.prototype.onWin = function () {
    var level = this.state.level;
    var i = this.index;
    var strokes = this.state.strokes;
    SM.STORE.complete(level.key, this.levels[i + 1] && this.levels[i + 1].key,
      strokes, this.state.turns, level.worldId);

    var par = level.par;
    var cls = strokes <= par ? 'under' : strokes === par + 1 ? 'over' : 'over';
    this.el.winTitle.textContent = 'Solved';
    this.el.winScore.textContent = String(strokes);
    this.el.winScore.className = 'score ' + (strokes < par ? 'under' : strokes === par ? '' : 'over');
    this.el.winPar.textContent = 'par ' + par + ' · ' +
      (strokes < par ? 'under par' : strokes === par ? 'exactly par' : strokes - par + ' over par') +
      ' · ' + this.state.turns + ' attempts';
    this.showWinPicture(level);
    this.el.win.classList.add('on');
    this.syncLevels();
    this.syncHud();
  };

  Game.prototype.clearWinPicture = function () {
    if (!this.el || !this.el.winPicturePanel || !this.el.winPicture) return;
    this.imageLoadToken = (this.imageLoadToken || 0) + 1;
    this.el.winPicturePanel.hidden = true;
    this.el.winPicture.onerror = null;
    this.el.winPicture.removeAttribute('src');
    this.el.winPicture.alt = 'PASS';
  };

  function isWorldOneLevel(level) {
    if (level.worldId) return level.worldId === 'world-01-sokoban';
    // Before packs carry normalized world identity, target tiles are the
    // authoritative signature of the World 1 mechanic in its level data.
    for (var y = 0; y < level.tiles.length; y++) {
      for (var x = 0; x < level.tiles[y].length; x++) {
        if (level.tiles[y][x].family === 'target') return true;
      }
    }
    return false;
  }

  function solvedBoardDataUri(state) {
    var level = state.level;
    var cell = Math.min(24, 210 / level.width, 210 / level.height);
    var left = (250 - level.width * cell) / 2;
    var top = (250 - level.height * cell) / 2;
    var parts = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">',
      '<rect width="250" height="250" fill="#0B0B0C"/>'
    ];

    for (var y = 0; y < level.height; y++) {
      for (var x = 0; x < level.width; x++) {
        var px = left + x * cell;
        var py = top + (level.height - 1 - y) * cell;
        var ctx = SM.RULES.describeTile(state, x, y);
        var marks = SM.glyph(ctx.inst, ctx);
        if (ctx.crate) marks += SM.glyph(ctx.crate, ctx);
        parts.push('<rect x="' + px + '" y="' + py + '" width="' + cell +
          '" height="' + cell + '" fill="#141418" stroke="#45454B" stroke-width="0.7"/>');
        if (marks) {
          parts.push('<g transform="translate(' + px + ' ' + py + ') scale(' +
            (cell / 24) + ')">' + marks + '</g>');
        }
      }
    }

    var playerX = left + (state.player.x + 0.5) * cell;
    var playerY = top + (level.height - state.player.y - 0.5) * cell;
    var radius = cell * 0.27;
    parts.push('<circle cx="' + playerX + '" cy="' + playerY + '" r="' + radius +
      '" fill="' + (SM.PALETTE[state.P] || SM.PALETTE.wht) + '" stroke="' +
      (SM.PALETTE[state.W] || SM.PALETTE.wht) + '" stroke-width="' +
      Math.max(1, cell * 0.07) + '"/>');
    parts.push('</svg>');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(parts.join(''));
  }

  Game.prototype.showWinPicture = function (level) {
    var image = this.el.winPicture;
    var panel = this.el.winPicturePanel;
    if (!image || !panel) return;
    var token = this.imageLoadToken = (this.imageLoadToken || 0) + 1;
    var fallback = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250">' +
      '<rect width="250" height="250" fill="#0B0B0C"/>' +
      '<rect x="9" y="9" width="232" height="232" fill="none" stroke="#2FA84F" stroke-width="3"/>' +
      '<text x="125" y="145" text-anchor="middle" font-family="Arial,sans-serif" font-size="58" font-weight="700" fill="#EDEAE3">PASS</text>' +
      '</svg>');
    var generated = !level.winPicture && isWorldOneLevel(level);
    image.alt = level.winPicture ? 'Custom level victory picture' : generated ? 'Solved World 1 board' : 'PASS';
    image.onerror = function () {
      if (token !== this.imageLoadToken) return;
      image.onerror = null;
      image.src = fallback;
      image.alt = 'PASS';
    }.bind(this);
    image.src = level.winPicture || (generated ? solvedBoardDataUri(this.state) : fallback);
    panel.hidden = false;
  };

  Game.prototype.dismissWin = function () {
    this.el.win.classList.remove('on');
  };

  Game.prototype.next = function () {
    this.dismissWin();
    if (this.index < this.levels.length - 1) this.load(this.index + 1);
    else this.dismissWin();
  };

  /* ------------------------------------------------------------------ */
  /* Undo / reset                                                        */
  /* ------------------------------------------------------------------ */

  Game.prototype.undo = function () {
    if (this.pending) { this.r.cancel(); this.pending = false; }
    if (!this.history.length) { this.r.say('Nothing to undo.', 'warn'); return; }
    var snap = this.history.pop();
    SM.RULES.restore(this.state, snap);
    this.state.won = false;
    this.dismissWin();
    this.clearWinPicture();
    this.overParSaid = false;
    this.r.draw(this.state);
    this.r.placePlayer(this.state, false);
    this.syncHud();
    this.syncCarriers();
    this.r.say(this.state.level.goalText || '');
  };

  Game.prototype.flashBlock = function (steps) {
    var s = steps[0];
    if (!s) return;
    if (s.reason === 'colour') {
      this.r.say('The ' + (s.have === 'wht' ? 'white' : s.have) + ' mark will not open that gate; it wants ' +
        (s.need === 'wht' ? 'white' : s.need) + '.', 'warn');
    } else if (s.reason === 'crate') {
      this.r.say('The crate has nowhere to go.', 'warn');
    } else if (s.reason === 'off-board') {
      this.r.say('', '');
    } else {
      this.r.say('Blocked.', 'warn');
    }
    this.blockFlash = { x: s.x, y: s.y, at: Date.now() };
  };

  /* ------------------------------------------------------------------ */
  /* Input                                                               */
  /* ------------------------------------------------------------------ */

  Game.prototype.bindInput = function () {
    var self = this;

    document.addEventListener('keydown', function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var dir = KEYMAP[e.key];
      if (dir) { e.preventDefault(); self.act({ type: 'move', dir: dir }); return; }

      switch (e.key) {
        case ' ': case 'Enter': case 'f': case 'F':
          e.preventDefault(); self.act({ type: 'act' }); return;
        case 'z': case 'Z': case 'u': case 'U':
          e.preventDefault(); self.undo(); return;
        case 'r': case 'R':
          e.preventDefault(); self.restart(); return;
        case 'n': case 'N':
          e.preventDefault(); self.next(); return;
        case 'Escape':
          self.dismissWin(); return;
        case '[':
          self.jump(-1); return;
        case ']':
          self.jump(1); return;
        default: return;
      }
    });

    if (this.el.dpad) {
      this.el.dpad.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-act]');
        if (!b) return;
        var a = b.dataset.act;
        if (a === 'act') self.act({ type: 'act' });
        else self.act({ type: 'move', dir: a });
      });
    }

    // Click a tile to describe it (§9.4 — the codex is the manual).
    this.r.board.addEventListener('click', function (e) {
      var cell = e.target.closest('.cell');
      if (!cell) return;
      self.describe(+cell.dataset.x, +cell.dataset.y);
    });

    // The win overlay is a sibling of #app, so fall back to the document.
    var self$ = self;
    var q = function (sel) {
      return self$.root.querySelector(sel) || document.querySelector(sel);
    };

    q('#btn-undo').addEventListener('click', function () { self.undo(); });
    q('#btn-reset').addEventListener('click', function () { self.restart(); });
    q('#btn-act').addEventListener('click', function () { self.act({ type: 'act' }); });
    q('#btn-next').addEventListener('click', function () { self.next(); });
    q('#btn-win-next').addEventListener('click', function () { self.next(); });
    q('#btn-again').addEventListener('click', function () { self.dismissWin(); self.restart(); });

    document.querySelectorAll('.panel > h2').forEach(function (h) {
      h.addEventListener('click', function () {
        var p = h.parentNode;
        p.dataset.open = p.dataset.open === 'false' ? 'true' : 'false';
      });
    });

    global.addEventListener('resize', function () {
      if (self.state) self.r.fitBoard();
    });
  };

  Game.prototype.jump = function (delta) {
    var i = this.index + delta;
    if (i < 0 || i >= this.levels.length) return;
    if (!this.unlocked(i)) { this.r.say('Solve the level before this one first.', 'warn'); return; }
    this.dismissWin();
    this.load(i);
  };

  Game.prototype.describe = function (x, y) {
    var d = SM.RULES.describeTile(this.state, x, y);
    if (!d) return;
    var n = SM.RULES.cellLabel(x, y);
    var i = d.inst;
    var bits = [n + ' — ' + i.name + ' (id ' + i.id + ')'];
    if (i.family === 'gate') {
      var c = i.params.carrier === 'W' ? 'world' : 'player';
      bits.push('needs the ' + c + ' to be ' + i.params.colour);
      bits.push(d.locked ? 'currently locked' : 'currently open');
    } else if (i.family === 'barrier') {
      bits.push('solid while locked; link ' + i.params.link);
      bits.push(d.locked ? 'currently locked' : 'currently open');
    } else if (i.family === 'switch' || i.family === 'sensor') {
      bits.push(i.params.mode + ', ' + i.params.scope + ', link ' + (i.params.link | 0));
      bits.push(d.active ? 'ACTIVE' : 'idle');
    } else if (i.family === 'crate') {
      bits.push('pushable, colour ' + i.params.colour);
    } else if (i.family === 'flow') {
      bits.push('belt, carries ' + ((i.params.dir.x || 0) > 0 ? 'east' : (i.params.dir.x || 0) < 0 ? 'west' :
        (i.params.dir.y || 0) > 0 ? 'north' : 'south'));
    } else if (i.family === 'aura') {
      bits.push('sets your colour to ' + i.params.colour);
    } else if (i.family === 'actuator') {
      bits.push(i.name === 'cycle_reset' ? 'world colour back to white' : 'changes a colour');
    } else if (i.family === 'hazard') {
      var rayCells = SM.RULES.traceRay(this.state, x, y);
      bits.push('static ray points ' + cardinalDirection(i.params.dir));
      bits.push(rayCells.length + ' unobstructed cells; stops at walls, crates, and closed barriers');
    }
    var rays = SM.RULES.traceRays(this.state);
    for (var ri = 0; ri < rays.length; ri++) {
      var ray = rays[ri];
      var visible = ray.cells.some(function (cell) { return cell.x === x && cell.y === y; });
      if (visible) {
        bits.push('on the active ' + cardinalDirection(ray.dir) + ' ray from ' +
          SM.RULES.cellLabel(ray.x, ray.y));
        if (this.state.player.x === x && this.state.player.y === y) bits.push('player exposed');
      }
      if (d.crate) {
        var last = ray.cells.length ? ray.cells[ray.cells.length - 1] : { x: ray.x, y: ray.y };
        if (last.x + ray.dir.x === x && last.y + ray.dir.y === y) {
          bits.push('crate shields the ' + cardinalDirection(ray.dir) + ' ray from ' +
            SM.RULES.cellLabel(ray.x, ray.y));
        }
      }
    }
    this.r.say(bits.join(' · '));
  };

  /* ------------------------------------------------------------------ */
  /* Panel sync                                                          */
  /* ------------------------------------------------------------------ */

  Game.prototype.syncAll = function () {
    this.syncLevels();
    this.syncHud();
    this.syncCarriers();
    this.syncCodex();
    this.syncTutorial();
  };

  Game.prototype.syncLevels = function () {
    var self = this;
    var ul = this.el.levels;
    if (this.el.worldName) {
      this.el.worldName.textContent = this.levels[0] && this.levels[0].worldName
        ? this.levels[0].worldName : SM.DEFAULT_LEVELS.name;
    }
    ul.textContent = '';
    this.levels.forEach(function (lv, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.disabled = !self.unlocked(i);
      b.setAttribute('aria-current', i === self.index ? 'true' : 'false');
      var entry = SM.STORE.entry(lv.key, lv.worldId);
      b.innerHTML = '<span class="n">' + (i + 1) + '</span>' +
        '<span class="nm">' + escapeHtml(lv.name) + '</span>' +
        '<span class="sc"></span>';
      var sc = b.querySelector('.sc');
      if (entry.best) {
        sc.textContent = entry.best.strokes + '/' + lv.par;
        sc.className = 'sc ' + (entry.best.strokes < lv.par ? 'under' : entry.best.strokes > lv.par ? 'over' : '');
      } else if (!self.unlocked(i)) {
        sc.textContent = 'locked';
      } else {
        sc.textContent = 'par ' + lv.par;
      }
      b.addEventListener('click', function () { if (self.unlocked(i)) { self.dismissWin(); self.load(i); } });
      li.appendChild(b);
      ul.appendChild(li);
    });
  };

  Game.prototype.syncHud = function () {
    var s = this.state;
    if (!s) return;
    this.el.strokes.textContent = s.strokes;
    this.el.par.textContent = s.level.par;
    this.el.moves.textContent = s.turns;
    var e = SM.STORE.entry(s.level.key, s.level.worldId);
    this.el.best.textContent = e.best ? e.best.strokes : '—';
    this.root.querySelector('#btn-undo').disabled = this.history.length === 0;
  };

  Game.prototype.syncCarriers = function () {
    var s = this.state;
    var pw = this.root.querySelector('#swatch-P');
    var ww = this.root.querySelector('#swatch-W');
    if (pw) { pw.style.background = SM.PALETTE[s.P]; pw.dataset.c = s.P; }
    if (ww) { ww.style.background = SM.PALETTE[s.W]; ww.dataset.c = s.W; }
  };

  Game.prototype.syncTutorial = function () {
    var lv = this.state.level;
    var hasRay = lv.tiles.some(function (row) {
      return row.some(function (tile) { return tile.family === 'hazard'; });
    });
    this.el.tutorial.innerHTML =
      '<p class="goal-name">' + escapeHtml(lv.name) + '</p>' +
      '<p>' + escapeHtml(lv.goalText || '') + '</p>' +
      (hasRay ? '<p><strong>Line of sight:</strong> Rays are static and resolve on turns. Push a crate into a ray to shield cells beyond it. If caught after an action, you return to the start for that one stroke; crates and switches remain, and undo restores the turn. There is no timer or sweeping beam.</p>' : '') +
      '<p><strong>Tile visuals:</strong> tiles are static unless explicitly marked animated. The player marker pulses through eight display frames, about 250 ms per frame; this never changes moves or game rules.</p>' +
      '<p><strong>Win picture:</strong> omit <code>win_picture</code> for the built-in 250×250 PASS image, or set a level-specific PNG data URI, for example <code>win_picture: "data:image/png;base64,…"</code>. It appears only after the goal is achieved.</p>' +
      '<p style="color:var(--mute);font-size:.78rem">Arrows / WASD / HJKL move · Space presses (ACT) · ' +
      'Z undo · R restart · N next · click a tile to inspect it.</p>';
  };

  /** The codex is GENERATED from SM.TILES. It is never hand-written (W2). */
  Game.prototype.syncCodex = function () {
    var seen = this.state.seen || {};
    var ids = Object.keys(SM.TILES).map(Number).sort(function (a, b) { return a - b; });
    var html = '';
    var count = 0, total = 0;
    ids.forEach(function (id) {
      var def = SM.TILES[id];
      if (def.implemented === false) return;
      total++;
      var on = !!seen[id];
      if (on) count++;
      var ctx = {
        inst: def,
        locked: def.params ? def.params.defaultLocked !== false : false,
        active: on, latched: false, W: 'wht', lit: {}
      };
      var detail = def.family === 'hazard'
        ? '<small class="detail">Static ' + cardinalDirection(def.params.dir) + ' ray · crates shield it</small>'
        : '';
      html += '<div class="row' + (on ? '' : ' unseen') + '"' +
        (on ? '' : ' title="not yet seen in this level"') + '>' +
        wrapSvg(SM.glyph(def, ctx)) +
        '<span class="nm">' + escapeHtml(def.name) + detail + '</span>' +
        '<span class="id">' + id + '</span>' +
        '</div>';
    });
    this.el.codex.innerHTML = html +
      '<p style="margin:.5rem 0 0;font-size:.72rem;color:var(--mute)">' + count + ' of ' + total +
      ' tile kinds seen in this level. Standing on one logs it.</p>';
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cardinalDirection(dir) {
    if (dir.y > 0) return 'north';
    if (dir.x > 0) return 'east';
    if (dir.y < 0) return 'south';
    return 'west';
  }

  function wrapSvg(inner) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>'; }

  SM.Game = Game;

})(typeof window !== 'undefined' ? window : globalThis);
