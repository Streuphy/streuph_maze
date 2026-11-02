#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { isDeepStrictEqual } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
const RUNTIME_FILES = [
  'sm-yaml', 'tiles', 'sm-glyphs', 'sm-board', 'sm-entities',
  'levels.default', 'sm-solver', 'levels', 'sm-rules'
];

function loadRuntime(root = ROOT) {
  for (const name of RUNTIME_FILES) {
    const file = path.join(root, 'src/js', name + '.js');
    vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
  }
  return globalThis.SM;
}

// Pure generation: validation, proof, and replay finish before any file write.
function generate(SM, source = SM.DEFAULT_LEVELS, options = {}) {
  const result = SM.LEVELS.validate(source, { solve: true });
  if (!result.ok) throw new Error(result.problems.map(problem => problem.message).join('\n'));
  const document = JSON.parse(JSON.stringify(source));
  for (const level of result.levels) {
    const proof = level.solve;
    if (!proof || proof.status !== 'solvable' || proof.verified !== true || proof.optimal === null) {
      throw new Error(level.key + ': no replay-proven minimum (' + (proof ? proof.status : 'not run') + ')');
    }
    const replay = SM.RULES.newState(level);
    for (const action of proof.path) SM.RULES.resolveTurn(replay, action);
    if (!replay.won || replay.failed || replay.strokes !== proof.optimal) throw new Error(level.key + ': minimum route failed replay');
    if (document.levels[level.key].golf_score !== proof.optimal) {
      throw new Error(level.key + ': reviewed source golf_score must equal proven minimum ' + proof.optimal + ' before generation');
    }
    if (options.pars) document.levels[level.key].golf_score = proof.optimal;
  }
  const text = SM.emitYAML(document, SM.YAML_HEADER);
  const parsed = SM.parseYAML(text);
  if (!isDeepStrictEqual(parsed, document)) throw new Error('emitted authoring lost or changed fields');
  const back = SM.LEVELS.validate(parsed, { solve: false });
  if (!back.ok) throw new Error('emitted YAML fails the shared validator');
  return { text, document, levels: result.levels };
}

function main() {
  const flags = process.argv.slice(2);
  if (flags.some(flag => !['--check', '--pars'].includes(flag))) throw new Error('usage: levels:emit [--check] [--pars]');
  const generated = generate(loadRuntime(), undefined, { pars: flags.includes('--pars') });
  const destination = path.join(ROOT, 'data/levels.yaml');
  if (flags.includes('--check')) {
    const existing = globalThis.SM.parseYAML(fs.readFileSync(destination, 'utf8'));
    if (!isDeepStrictEqual(existing, generated.document)) throw new Error('Prologue JS/YAML authoring is not semantically equivalent');
    console.log('Prologue check passed: ' + generated.levels.length + ' replay-proven levels; no files written.');
    return;
  }
  const temporary = destination + '.' + process.pid + '.tmp';
  let created = false;
  try {
    fs.writeFileSync(temporary, generated.text, { encoding: 'utf8', flag: 'wx' }); created = true;
    fs.renameSync(temporary, destination); created = false;
  } finally {
    if (created) fs.unlinkSync(temporary); // Only a temporary file created by this invocation.
  }
  console.log('Wrote data/levels.yaml: ' + generated.levels.length + ' reviewed, replay-proven levels.');
}

module.exports = { loadRuntime, generate, RUNTIME_FILES };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
