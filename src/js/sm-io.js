/* =========================================================================
 * sm-io.js  —  STREUPH'S MAZE
 * Loading, hot-swapping and saving level YAML.
 *
 * Under file:// you cannot fetch() a sibling file, so "Load levels.yaml"
 * means: drop the file on the window, or pick it, or paste its text. All
 * three go through the SAME path — SM.LEVELS.load(text) — so validation is
 * identical no matter where the bytes came from.
 *
 * A validation ERROR must leave the currently loaded levels untouched (§11.4).
 * Nothing is swapped until validate() has returned zero problems.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  function IO(game) {
    this.game = game;
    this.source = SM.DEFAULT_LEVELS;      // what is live right now
    this.sourceName = 'levels.default.js (built in)';
    this.header = SM.YAML_HEADER;
  }

  /* ------------------------------------------------------------------ */

  IO.prototype.bind = function () {
    var self = this;
    var drop = this.game.root.querySelector('#dropzone');
    var picker = this.game.root.querySelector('#file');
    var ta = this.game.root.querySelector('#yaml');
    var diags = this.game.root.querySelector('#diag');

    /* Drag and drop the .yaml anywhere on the window. */
    ['dragenter', 'dragover'].forEach(function (t) {
      document.addEventListener(t, function (e) {
        e.preventDefault();
        if (drop) drop.classList.add('hot');
      });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      document.addEventListener(t, function (e) {
        e.preventDefault();
        if (t === 'dragleave' && e.relatedTarget) return;
        if (drop) drop.classList.remove('hot');
      });
    });
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) self.readFile(f);
    });

    if (picker) {
      picker.addEventListener('change', function () {
        if (picker.files && picker.files[0]) self.readFile(picker.files[0]);
        picker.value = '';
      });
    }

    var applyBtn = this.game.root.querySelector('#btn-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        if (ta) self.applyText(ta.value);
      });
    }

    var reloadBtn = this.game.root.querySelector('#btn-reset-levels');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', function () {
        self.applyObject(SM.DEFAULT_LEVELS, 'levels.default.js (built in)', SM.YAML_HEADER);
      });
    }

    var saveBtn = this.game.root.querySelector('#btn-save');
    if (saveBtn) saveBtn.addEventListener('click', function () { self.save(ta); });

    var loadCurrent = this.game.root.querySelector('#btn-fill');
    if (loadCurrent) {
      loadCurrent.addEventListener('click', function () { if (ta) ta.value = self.currentText(); });
    }

    var expBtn = this.game.root.querySelector('#btn-export');
    var impBtn = this.game.root.querySelector('#btn-import');
    var ioTa = this.game.root.querySelector('#io-text');
    if (expBtn) expBtn.addEventListener('click', function () { ioTa.value = SM.STORE.exportText(); ioTa.select(); });
    if (impBtn) impBtn.addEventListener('click', function () {
      try {
        SM.STORE.importText(ioTa.value);
        self.game.r.say('Progress imported.', 'good');
        self.game.syncAll();
      } catch (e) {
        self.game.r.say('Import failed: ' + e.message, 'warn');
      }
    });

    var wipe = this.game.root.querySelector('#btn-wipe');
    if (wipe) wipe.addEventListener('click', function () {
      SM.STORE.reset();
      self.game.r.say('Progress cleared.', 'warn');
      self.game.syncAll();
      if (ta) ta.value = '';
    });

    this.game.store = SM.STORE;
  };

  /* ------------------------------------------------------------------ */

  IO.prototype.readFile = function (file) {
    var self = this;
    if (!/\.(ya?ml|txt)$/i.test(file.name) && file.type !== 'text/plain') {
      this.report([{ level: file.name, line: 0,
        message: 'that does not look like a YAML file. Drag levels.yaml, or paste the text.' }], true);
      return;
    }
    var fr = new FileReader();
    fr.onload = function () { self.applyText(String(fr.result)); };
    fr.onerror = function () {
      self.report([{ level: file.name, line: 0, message: 'the file could not be read.' }], true);
    };
    fr.readAsText(file);
  };

  IO.prototype.applyText = function (text) {
    var doc;
    try {
      doc = SM.parseYAML(text);
    } catch (e) {
      this.report([{ level: 'levels.yaml', line: e.line || 0, column: e.column || 0,
        message: e.reason || e.message }], true);
      return false;
    }
    var ok = this.applyObject(doc, 'levels.yaml', null, text);
    if (ok) this.game.r.say('Loaded ' + this.game.levels.length + ' level(s) from levels.yaml.', 'good');
    return ok;
  };

  /** The ONE place a new level set is swapped in. Never on a validation error. */
  IO.prototype.applyObject = function (doc, name, header, text) {
    var res = SM.LEVELS.validate(doc, { solve: true });

    this.report(res.problems.concat(res.diagnostics), res.problems.length > 0);

    if (res.problems.length) {
      this.game.r.say(
        res.problems.length + ' problem(s) — the previously loaded levels are untouched.',
        'warn');
      return false;
    }

    var keepKey = this.game.levels[this.game.index].key;
    this.source = doc;
    this.sourceName = name;
    this.header = header || SM.YAML_HEADER;

    this.game.levels = res.levels;
    var i = 0;
    for (var n = 0; n < this.game.levels.length; n++) {
      if (this.game.levels[n].key === keepKey) { i = n; break; }
    }
    // Hot reload MUST preserve progress on the current level where possible (G6).
    this.game.dismissWin();
    this.game.load(i);
    this.game.syncLevels();
    this.game.syncCodex();

    if (text != null) {
      var ta = this.game.root.querySelector('#yaml');
      if (ta) ta.value = text;
    }
    return true;
  };

  IO.prototype.report = function (list, hard) {
    var box = this.game.root.querySelector('#diag');
    if (!box) return;
    if (!list || !list.length) {
      box.innerHTML = '<span style="color:var(--mute)">No problems.</span>';
      return;
    }
    box.innerHTML = list.map(function (d) {
      var where = [];
      if (d.world) where.push('world ' + d.world + (d.worldId ? ' (' + d.worldId + ')' : ''));
      if (d.level) where.push(d.level);
      if (d.line) where.push('line ' + d.line + (d.column ? ', column ' + d.column : ''));
      return '<div class="d' + (hard ? '' : ' warn') + '">' +
        escapeHtml(d.message) +
        '<div class="where">' + escapeHtml(where.join(' · ')) + '</div>' +
        '</div>';
    }).join('');
  };

  IO.prototype.currentText = function () {
    return SM.emitYAML(this.source, this.header);
  };

  /* ------------------------------------------------------------------ */
  /* Save (N6) — opt-in, default OFF.                                    */
  /* Par is design intent; writing a "better" number over it silently would  */
  /* let par drift every time somebody shipped a level. §13 requires a      */
  /* checkbox.                                                             */
  /* ------------------------------------------------------------------ */

  IO.prototype.save = function (ta) {
    var box = this.game.root.querySelector('#save-par');
    var improve = box && box.checked;
    var text = this.currentText();

    if (improve) {
      var doc = SM.LEVELS.validate(this.source, { solve: true });
      if (doc.problems.length) {
        this.game.r.say('Not writing: the live levels have validation errors.', 'warn');
        return;
      }
      var merged = {};
      for (var k in this.source) merged[k] = this.source[k];
      merged.levels = {};
      var levels = doc.levels;
      for (var i = 0; i < levels.length; i++) {
        var lv = levels[i];
        var raw = this.source.levels[lv.key];
        var out = {};
        for (var key in raw) out[key] = raw[key];
        out.golf_score = lv.solve && lv.solve.optimal !== null ? lv.solve.optimal : raw.golf_score;
        merged.levels[lv.key] = out;
      }
      this.source = merged;
      text = SM.emitYAML(merged, this.header);
    }

    this.download(text, 'levels.yaml');
    this.game.r.say(improve
      ? 'Wrote levels.yaml with par replaced by the computed optimum for every solvable level.'
      : 'Wrote levels.yaml exactly as loaded (par untouched).', 'good');
    if (ta) ta.value = text;
  };

  IO.prototype.download = function (text, filename) {
    try {
      var blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) {
      this.game.r.say('This browser refused the download. Select the text and copy it instead.', 'warn');
      var ta = this.game.root.querySelector('#yaml');
      if (ta) { ta.value = text; ta.select(); }
    }
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  SM.IO = IO;

})(typeof window !== 'undefined' ? window : globalThis);
