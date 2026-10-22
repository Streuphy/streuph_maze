#!/usr/bin/env node
/* =========================================================================
 * scripts/emit-levels-yaml.js
 *
 * Writes data/levels.yaml from the built-in levels, using the
 * SAME emitter the in-game "Save levels.yaml" button uses. That keeps the
 * shipped file and the runtime file byte-identical in shape, and proves the
 * YAML writer round-trips (§11, N6).
 *
 *   node scripts/emit-levels-yaml.js
 *   node scripts/emit-levels-yaml.js --pars   (rewrite golf_score from the solver)
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
for (const f of ['src/js/sm-yaml.js', 'src/js/tiles.js', 'src/js/levels.default.js', 'src/js/levels.js', 'src/js/sm-rules.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}
const SM = globalThis.SM;

const res = SM.LEVELS.boot({ solve: true });
if (res.problems.length) {
  console.error('Refusing to emit: the built-in levels do not validate.');
  res.problems.forEach(p => console.error('  ' + p.level + ': ' + p.message));
  process.exit(1);
}

const doc = {};
for (const k of Object.keys(SM.DEFAULT_LEVELS)) {
  if (k !== 'levels') { doc[k] = SM.DEFAULT_LEVELS[k]; continue; }
  doc.levels = {};
  for (const lk of Object.keys(SM.DEFAULT_LEVELS.levels)) {
    const src = SM.DEFAULT_LEVELS.levels[lk];
    const out = {};
    // Key order is the schema's, not the object's: name, goal, size, par,
    // win picture, overrides, grid. emitYAML preserves insertion order (N6).
    if (src.name !== undefined) out.name = src.name;
    if (src.goal !== undefined) out.goal = src.goal;
    if (src.width !== undefined) out.width = src.width;
    if (src.height !== undefined) out.height = src.height;
    let par = src.golf_score;
    if (process.argv.includes('--pars')) {
      const lv = res.levels.find(l => l.key === lk);
      if (lv && lv.solve && lv.solve.optimal !== null) par = lv.solve.optimal;
    }
    if (par !== undefined) out.golf_score = par;
    if (src.win_picture !== undefined) out.win_picture = src.win_picture;
    if (src.overrides && Object.keys(src.overrides).length) out.overrides = src.overrides;
    if (src.grid) out.grid = src.grid;
    doc.levels[lk] = out;
  }
}

const out = SM.emitYAML(doc, SM.YAML_HEADER);
fs.writeFileSync(path.join(ROOT, 'data', 'levels.yaml'), out, 'utf8');

// Prove it round-trips before declaring victory.
const back = SM.LEVELS.load(out, { solve: true });
if (back.problems.length) {
  console.error('Emitted YAML does not round-trip:');
  back.problems.forEach(p => console.error('  ' + p.level + ': ' + p.message));
  process.exit(1);
}

const warnings = res.diagnostics.filter(d => /V10|§13/.test(d.message));
console.log('wrote data/levels.yaml — ' + back.levels.length + ' levels, round-trips cleanly.');
if (warnings.length) {
  console.log('warnings from the built-in set:');
  warnings.forEach(w => console.log('  ' + w.level + '  ' + w.message));
} else {
  console.log('no V10/§13 warnings.');
}
