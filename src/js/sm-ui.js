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
      worldScore: this.root.querySelector('#world-score'),
      tutorial: this.root.querySelector('#tutorial'),
      codex:    this.root.querySelector('#codex'),
      hud:      this.root.querySelector('#hud'),
      strokes:  this.root.querySelector('#v-strokes'),
      par:      this.root.querySelector('#v-par'),
      parKind:  this.root.querySelector('#v-par-kind'),
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
    var self = this;
    SM.PRESENTATION.subscribe(function () { if (self.state) { self.syncCodex(); if (self.state.won) self.showWinPicture(self.state.level); } });
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
    if (!this.levels[i]) return false;
    if (this.levels[i] && this.levels[i].worldId !== 'prologue') return true;
    if (i === 0) return true;
    var entry = SM.STORE.entry(this.levels[i - 1].key, this.levels[i - 1].worldId);
    return !!entry.cleared;
  };

  Game.prototype.load = function (i) {
    i = Math.max(0, Math.min(this.levels.length - 1, i));
    this.dismissWin();
    this.clearWinPicture();
    this.index = i;
    var level = this.levels[i];
    this.state = SM.RULES.newState(level);
    this.history = [];
    this.overParSaid = false;
    this.r.build(this.state);
    SM.STORE.setLastLevel(level.key, level.worldId);
    this.syncAll();
    this.r.say(level.goalText || '');
    return true;
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
    if (this.state.failed) { this.r.say('Attempt failed. Restart (R) or choose another level.', 'warn'); return; }
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
      this.r.view = this.snapshotView();
      this.r.draw(this.r.view);
      this.syncHud();
      return;
    }

    // Undo restores the state immediately before this resolved action.
    this.history.push(before);
    // Publish only the fully resolved canonical result, never an animation
    // callback. A committed win survives immediate navigation/hidden playback.
    var actionState = this.state, actionLevel = actionState.level;
    SM.STORE.noteTiles(actionLevel.key, Object.keys(actionState.seen).map(Number), actionLevel.worldId);
    if (actionState.won && !actionState.failed) SM.STORE.complete(actionLevel.key, actionState.strokes, actionState.turns, actionLevel.worldId);
    this.syncHud();
    this.syncCarriers();

    var self = this;
    this.pending = true;
    this.r.play(result.steps, viewBefore, function () {
      self.pending = false;
      if (self.state !== actionState) return;
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
    this.syncCodex();
    this.syncHud();

    if (s.failed) {
      this.clearWinPicture(); this.dismissWin();
      this.r.say('Attempt failed (' + s.failureReason + '). Restart (R) or choose another level; undo is unavailable.', 'warn');
      return;
    }
    if (s.won) this.onWin();
    else if (scoreInfo(level).proven && s.strokes > scoreInfo(level).value && !this.overParSaid) {
      this.overParSaid = true;
      this.r.say('Over par. Undo (Z) or restart (R) if this run is not the one you want.', 'warn');
    } else {
      this.r.say(level.goalText || '');
    }
  };

  Game.prototype.onWin = function () {
    if (!this.state || !this.state.won || this.state.failed) return;
    var level = this.state.level;
    var strokes = this.state.strokes;

    var info = scoreInfo(level), par = info.value;
    this.el.winTitle.textContent = 'Solved';
    this.el.winScore.textContent = String(strokes);
    this.el.winScore.className = 'score ' + (info.proven && strokes > par ? 'over' : '');
    this.el.winPar.textContent = info.label + ' · ' +
      (!info.proven ? 'minimum not proven' : strokes < par ? 'proof needs review' : strokes === par ? 'at proven PAR' : strokes - par + ' over PAR') +
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
    return level.worldId === 'world-01-sokoban';
  }

  function solvedBoardDataUri(state) {
    var host = document.createElement('div'), surface = new SM.Surface(host, { cellSize: Math.max(20, Math.floor(250 / Math.max(state.width, state.height))) });
    try { surface.update(SM.VISUALS.board(state)); return surface.exportImage(); }
    finally { surface.dispose(); }
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
    if (this.state && this.state.failed) { this.r.say('A failed attempt cannot be undone. Restart (R).', 'warn'); return; }
    if (this.pending) { this.r.cancel(); this.pending = false; }
    if (!this.history.length) { this.r.say('Nothing to undo.', 'warn'); return; }
    var snap = this.history.pop();
    SM.RULES.restore(this.state, snap);
    this.state.won = false;
    this.dismissWin();
    this.clearWinPicture();
    this.overParSaid = false;
    this.r.view = this.snapshotView();
    this.r.draw(this.r.view);
    this.r.placePlayer(this.r.view, false);
    this.syncHud();
    this.syncCarriers();
    this.r.say(this.state.level.goalText || '');
  };

  Game.prototype.flashBlock = function (steps) {
    var s = steps[0];
    if (!s) return;
    if (s.type === 'effect-abort') { this.r.say('Action rolled back (' + s.reason + '). No stroke charged. ' + (s.message || ''), 'warn'); return; }
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
      var target = e.target;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) &&
          !(target.tagName === 'INPUT' && target.type === 'file')) return;
      var dir = KEYMAP[e.key];
      if (dir) {
        e.preventDefault();
        self.act({ type: e.shiftKey ? 'pull' : 'move', dir: dir });
        return;
      }

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
      if (self.pending) { self.r.cancel(); self.pending = false; }
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
    if (!this.unlocked(i)) {
      this.r.say('Solve the level before this one first.', 'warn');
      return;
    }
    this.dismissWin();
    this.load(i);
  };

  Game.prototype.describe = function (x, y) {
    var d = SM.RULES.describeTile(this.state, x, y);
    if (!d) return;
    var n = SM.RULES.cellLabel(x, y);
    var i = d.inst;
    var bits = [n + ' — ' + i.name + ' (id ' + i.id + ')'];
    var description = formatPresentation(i.presentation && i.presentation.inspection,
      d, this.state, x, y);
    if (description) bits.push(description);
    {
      if (d.crate) bits.push(formatPresentation(d.crate.presentation.inspection,
        Object.assign({}, d, { inst: d.crate, capabilities: d.crateCapabilities }), this.state, x, y));
      if (d.dotHere) bits.push(SM.COLOUR_NAMES[this.state.P] + ' dot');
      bits.push('world/goal ' + SM.COLOUR_NAMES[this.state.W],
        'requested ' + (d.requestedSolid ? 'closed' : 'open'), 'effective ' + (d.solid ? 'closed' : 'open'),
        d.pendingClose ? 'pending close until crate leaves' : 'no pending closure',
        'latch ' + (d.latched ? 'on' : 'off'), 'polarity ' + d.polarity, 'outcome ' + d.outcome);
      if (d.target || d.crate) bits.push('supporting terrain ' + d.terrain.name);
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
      var info = scoreInfo(lv);
      b.innerHTML = '<span class="n">' + (i + 1) + '</span>' +
        '<span class="nm">' + escapeHtml(lv.name) + '</span>' +
        '<span class="sc"></span>';
      var sc = b.querySelector('.sc');
      if (entry.best) {
        sc.textContent = 'best ' + entry.best.strokes + ' · ' + info.label;
        sc.className = 'sc ' + (info.proven && entry.best.strokes > info.value ? 'over' : '');
      } else if (!self.unlocked(i)) {
        sc.textContent = 'locked';
      } else {
        sc.textContent = info.label;
      }
      b.addEventListener('click', function () { if (self.unlocked(i)) { self.dismissWin(); self.load(i); } });
      li.appendChild(b);
      ul.appendChild(li);
    });
    if (this.el.worldScore) {
      var summary = SM.LEVELS.worldScores(this.levels, function (level) { return SM.STORE.entry(level.key, level.worldId); });
      this.el.worldScore.textContent = (summary.par === null ? 'World PAR ' + summary.parStatus + ' · ' + summary.proven + '/' + summary.total + ' minima proven' : 'World PAR ' + summary.par) +
        ' · ' + (summary.bestComplete ? 'world best ' + summary.best : 'partial best ' + summary.partialBest + ' · ' + summary.completed + '/' + summary.total + ' cleared');
    }
  };

  Game.prototype.syncHud = function () {
    var s = this.state;
    if (!s) return;
    this.el.strokes.textContent = s.strokes;
    var info = scoreInfo(s.level);
    this.el.par.textContent = info.value === null ? '—' : info.value;
    this.el.par.title = info.label; this.el.par.dataset.proof = info.status;
    if (this.el.parKind) this.el.parKind.textContent = info.proven ? 'par' : info.value === null ? 'par ' + info.status : 'declared · ' + info.status;
    this.el.moves.textContent = s.turns;
    var e = SM.STORE.entry(s.level.key, s.level.worldId);
    this.el.best.textContent = e.best ? e.best.strokes : '—';
    this.root.querySelector('#btn-undo').disabled = this.history.length === 0 || s.failed;
    var act = this.root.querySelector('#btn-act');
    if (act) act.disabled = s.failed || s.won;
    if (this.el.dpad) this.el.dpad.querySelectorAll('button').forEach(function (button) { button.disabled = s.failed || s.won; });
    if (this.el.storage) this.el.storage.textContent = SM.STORE.durable() ? 'Progress is saved in this browser.' : 'Progress is in memory for this session. Export current progress for a durable backup.';
  };

  Game.prototype.syncCarriers = function () {
    var s = this.state;
    var pw = this.root.querySelector('#swatch-P');
    var ww = this.root.querySelector('#swatch-W');
    if (pw) {
      pw.style.background = SM.PALETTE[s.P]; pw.dataset.c = s.P;
      pw.title = SM.COLOUR_NAMES[s.P] + ' dot'; pw.setAttribute('role', 'img'); pw.setAttribute('aria-label', pw.title);
    }
    if (ww) {
      ww.style.background = SM.PALETTE[s.W]; ww.dataset.c = s.W;
      ww.title = SM.COLOUR_NAMES[s.W] + ' world and goal'; ww.setAttribute('role', 'img'); ww.setAttribute('aria-label', ww.title);
    }
  };

  Game.prototype.syncTutorial = function () {
    var lv = this.state.level;
    var actButton = this.root.querySelector('#btn-act');
    if (actButton) actButton.textContent = 'Action / Rest';
    var padAction = this.root.querySelector('#dpad [data-act="act"]');
    if (padAction) padAction.setAttribute('aria-label', 'ACTION / REST');
    var tileTutorial = null;
    lv.tiles.some(function (row) {
      return row.some(function (tile) {
        if (tile.presentation && tile.presentation.tutorial) {
          tileTutorial = tile.presentation.tutorial;
          return true;
        }
        return false;
      });
    });
    this.el.tutorial.innerHTML =
      '<p class="goal-name">' + escapeHtml(lv.name) + '</p>' +
      '<p>' + escapeHtml(lv.goalText || '') + '</p>' +
      (tileTutorial || '') +
      '<p><strong>Tile visuals:</strong> tiles are static unless explicitly marked animated. The player marker pulses through eight display frames, about 250 ms per frame; this never changes moves or game rules.</p>' +
      '<p><strong>Win picture:</strong> omit <code>win_picture</code> for the built-in 250×250 PASS image, or set a level-specific PNG data URI, for example <code>win_picture: "data:image/png;base64,…"</code>. It appears only after the goal is achieved.</p>' +
      '<p style="color:var(--mute);font-size:.78rem">Arrows / WASD / HJKL move · ' +
      'Shift+direction pulls eligible objects · Space: ACTION / REST on the current tile · ' +
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
      var codexText = formatPresentation(def.presentation && def.presentation.codex, ctx, null, null, null);
      var detail = codexText ? '<small class="detail">' + escapeHtml(codexText) + '</small>' : '';
      html += '<div class="row' + (on ? '' : ' unseen') + '"' +
        (on ? '' : ' title="not yet seen in this level"') + '>' +
        SM.GLYPHS.markup(def, ctx) +
        '<span class="nm">' + escapeHtml(def.name) + detail + '</span>' +
        '<span class="id">' + id + '</span>' +
        '</div>';
    });
    this.el.codex.innerHTML = '<div class="row dot-definition">' + SM.GLYPHS.markup(SM.DOT_DEFINITION, { P: this.state.P, W: this.state.W }) +
      '<span class="nm">dot<small class="detail">' + escapeHtml(SM.DOT_DEFINITION.presentation.codex) + '</small></span>' +
      '<span class="id">object</span></div>' + html +
      '<p style="margin:.5rem 0 0;font-size:.72rem;color:var(--mute)">' + count + ' of ' + total +
      ' tile kinds seen in this level. Standing on one logs it.</p>';
  };

  /** Format tile-authored display text from a read-only description. */
  function formatPresentation(template, view, state, x, y) {
    if (!template) return '';
    var inst = view.inst || view;
    var params = inst.params || {};
    var presentation = inst.presentation || {};
    var capabilities = view.capabilities || inst.capabilities || {};
    var mobility = capabilities.pushable ? 'pushable' : 'fixed';
    if (capabilities.pullable) mobility += ', pullable';
    var rayCount = '';
    if (presentation.rayEmitter && state && x !== null && y !== null) {
      rayCount = String(SM.RULES.traceRay(state, x, y).length);
    }
    var values = {
      colour: params.colour || 'white',
      link: params.link === undefined ? '0' : String(params.link | 0),
      mode: params.mode || 'signal',
      scope: params.scope || 'tagged',
      carrierLabel: params.carrier === 'W' ? 'world' : 'player',
      lockLabel: view.pendingClose ? 'pending close' : (view.solid === undefined ? view.locked : view.solid) ? 'closed' : 'open',
      playerColour: state ? SM.COLOUR_NAMES[state.P] : 'White',
      worldColour: state ? SM.COLOUR_NAMES[state.W] : 'White',
      solidLabel: view.solid ? 'closed' : 'open',
      activeLabel: view.active ? 'active' : 'idle',
      latchLabel: view.latched ? 'latched' : 'idle',
      polarityLabel: view.polarity || (state && state.polarity) || 'red-open',
      mobilityLabel: mobility,
      flowKind: params.kind || 'player',
      direction: params.dir ? cardinalDirection(params.dir) : 'in its configured direction',
      rayCount: rayCount
    };
    return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, function (match, key) {
      return values[key] === undefined ? '' : values[key];
    });
  }

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


  function scoreInfo(level) {
    var proof = level.solve, declared = Number.isInteger(level.par) ? level.par : null;
    var proven = !!(proof && proof.status === 'solvable' && proof.verified === true && Number.isInteger(proof.optimal));
    var status = proven ? 'proven' : proof && (proof.status === 'unknown' || proof.status === 'unsolvable') ? proof.status : 'unverified';
    var value = proven ? proof.optimal : declared;
    return { proven: proven, status: status, value: value,
      label: proven ? 'PAR ' + value + (declared !== null && declared !== value ? ' (declared ' + declared + ')' : '') :
        value === null ? 'PAR ' + status : 'declared ' + value + ' (' + status + ')' };
  }
  Game.scoreInfo = scoreInfo;
  SM.Game = Game;

})(typeof window !== 'undefined' ? window : globalThis);
