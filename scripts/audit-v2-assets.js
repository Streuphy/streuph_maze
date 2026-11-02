#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { loadRuntime } = require('./emit-levels-yaml');
const { INVENTORY, collect, digest, engineFingerprint } = require('./report-par-routes');
const { presentationFingerprint } = require('./verify-v2-chromium');
const ROOT = path.resolve(__dirname, '..');
function historical(file) {
  return /^(?:docs\/design-history\/|openspec\/changes\/|\.git\/|node_modules\/|\.opencode\/)/.test(file);
}
function auditDefinitions(SM, guide, usedIds, usageById) {
  const errors = [], rows = [...guide.matchAll(/^\|\s*(\d+)\s*\|\s*`([^`]+)`[^\n]*$/gm)]
    .map(match => [Number(match[1]), match[2], match[0].split('|').slice(1, -1).map(field => field.trim())]);
  const registry = SM.getActiveRegistry(), expected = Object.keys(registry).map(Number);
  if (rows.length !== expected.length || new Set(rows.map(row => row[0])).size !== rows.length) errors.push('catalogue definition count/identity mismatch');
  for (const id of expected) if (!rows.some(row => row[0] === id && row[1] === registry[id].name)) errors.push('missing or stale definition for ID ' + id);
  for (const id of usedIds) if (!registry[id]) errors.push('pack uses unsupported ID ' + id);
  if (!/^## Universal definition template/m.test(guide) || !/^#{2,4}\s+.*(?:the dot|dot object)/im.test(guide)) errors.push('complete uniform template and separate dot definition are required');
  const headers = [...guide.matchAll(/^### ([A-O])\. [^\n]+$/gm)], groups = new Map();
  headers.forEach((header, index) => groups.set(header[1], guide.slice(header.index, index + 1 < headers.length ? headers[index + 1].index : guide.length)));
  const fields = ['Attributes', 'State', 'Triggers/queue', 'Legality/commit', 'Outcomes/events', 'Presentation/lifecycle'];
  for (const group of 'ABCDEFGHIJKLMNO') {
    const body = groups.get(group) || '';
    for (const field of fields) if (!body.includes('**' + field + ':**')) errors.push('definition group ' + group + ' is missing ' + field);
  }
  for (const [id, name, columns] of rows) {
    if (!registry[id]) { errors.push('documented unsupported definition ' + id); continue; }
    if (columns.length !== 6 || !/^[A-O](?:,[A-O])*$/.test(columns[5])) { errors.push('definition ' + id + ' requires attributes/usage and complete behavior references'); continue; }
    if ((columns[4] !== 'unused') !== usedIds.includes(id)) errors.push('definition ' + id + ' has stale used/unused classification');
    if (usageById && columns[4] !== ((usageById[id] || []).join(',') || 'unused')) errors.push('definition ' + id + ' has stale pack usage');
    for (const [key, value] of Object.entries(registry[id].params)) {
      const rendered = value && typeof value === 'object' ? '(' + value.x + ',' + value.y + ')' : String(value);
      if (!columns[3].includes(key + ' ' + rendered)) errors.push('definition ' + id + ' has missing/stale default ' + key);
    }
  }
  const dot = SM.DOT_DEFINITION;
  if (!dot || !dot.state || !Array.isArray(dot.state.hooks) || !dot.capabilities || dot.layer !== 'object') errors.push('dot registry definition lacks the uniform state/profile model');
  return errors;
}
function auditInventory(groups, inventory = INVENTORY) {
  const errors = [];
  for (const item of inventory) {
    const matching = groups.filter(group => group.world === item.world);
    if (matching.length !== 1) { errors.push('missing/duplicate pack ' + item.world); continue; }
    const group = matching[0], keys = group.levels.map(level => level.key);
    if (keys.length !== item.count || new Set(keys).size !== keys.length ||
      Array.from({ length: item.count }, (_, index) => 'level_' + (index + 1)).some(key => !keys.includes(key))) errors.push('incomplete level inventory ' + item.world);
    errors.push(...(group.problems || []).map(problem => group.source + ': ' + problem));
  }
  groups.filter(group => !inventory.some(item => item.world === group.world)).forEach(group => errors.push('unexpected pack ' + group.world));
  return errors;
}
function requirementBlocks(text) {
  const entries = [...text.matchAll(/^### Requirement: ([^\n]+)\n/gm)];
  return new Map(entries.map((entry, index) => [entry[1].trim(), text.slice(entry.index,
    index + 1 < entries.length ? entries[index + 1].index : text.length).split(/^## /m)[0].replace(/\s+/g, ' ').trim()]));
}
function auditSpecSync(deltas, accepted) {
  const pending = [];
  for (const [capability, text] of Object.entries(deltas)) {
    const main = requirementBlocks(accepted[capability] || '');
    const sections = [...text.matchAll(/^## (ADDED|MODIFIED|REMOVED) Requirements\s*$/gm)];
    let differs = sections.length === 0;
    sections.forEach((section, index) => {
      const blocks = requirementBlocks(text.slice(section.index + section[0].length,
        index + 1 < sections.length ? sections[index + 1].index : text.length));
      for (const [name, body] of blocks) {
        if (section[1] === 'REMOVED' ? main.has(name) : main.get(name) !== body) differs = true;
      }
    });
    if (differs) pending.push(capability);
  }
  return pending;
}
function auditFiles(files, options = {}) {
  const errors = [], deferred = [];
  const identifiers = [['LEGACY', 'SCHEMA'], ['FLOOR', 'POLICIES'], ['V2', 'GAME', 'COLOURS']].map(words => words.join('_'))
    .concat(['floor' + 'Support', 'floor' + 'Colour', 'runPlayer' + 'ForceChain', 'runObject' + 'ForceChain']);
  const obsoleteIdentifier = new RegExp('\\b(?:' + identifiers.join('|') + ')\\b');
  for (const file of files) {
    if (historical(file.path)) continue;
    let issue = null;
    if (file.path.startsWith('src/') || file.path.startsWith('scripts/') || file.path.endsWith('.html')) {
      if (/\.ruleset\s*===/.test(file.text) || obsoleteIdentifier.test(file.text) ||
        /(?:var|const)\s+KEY\s*=.*progress\/v1/.test(file.text) || /case\s+['"](?:respawn|caught)['"]/.test(file.text)) issue = 'obsolete executable policy or outcome';
      if (file.path === 'glyphs.html' && /type=['"]module['"]|import\s+\*/.test(file.text)) issue = 'gallery does not use the common classic-script boundary';
    }
    const document = /\.(?:md|txt)$/.test(file.path) && !file.path.startsWith('tests/');
    // A versioned OpenSpec change name is provenance, not a playable policy.
    // Only this explicit reference form is normalized; actual old-rule prose
    // and JSON-schema/recovery guidance remain subject to the checks below.
    const guidance = file.text.replace(/`[a-z][a-z0-9-]*-v\d+`(?= OpenSpec change)/gi, '`change-reference`');
    if (document && (/\bV1\b/i.test(guidance) || /5\s+different\s+colors|Black\s*\(reversed\)/i.test(file.text) ||
      /Black supports normal color matching|Green beneath[\s\S]{0,80}automatic pulling|On\s+ACTION,\s+all/i.test(file.text) ||
      /exposed player returns[\s\S]{0,80}start|caught.player respawn|respawn keeps|strategic respawn/i.test(file.text) ||
      /catch is not a game.over|do not add[\s\S]{0,100}game.over state|final resting tile entry effect once/i.test(file.text) ||
      /JSON Level Schema|<level_name>\.json/.test(file.text))) issue = 'stale authoritative rule/schema guidance';
    if (/^data\/.*\.ya?ml$/.test(file.path) && /caught push|strategic respawn|respawn keeps|crate belt shoves/i.test(file.text)) issue = 'level text teaches an obsolete outcome';
    if (issue) {
      const target = options.preaccept && file.path.startsWith('openspec/specs/') ? deferred : errors;
      target.push(file.path + ': ' + issue);
    }
  }
  return { errors, deferred };
}
function ledgerRows(text) {
  const rows = [];
  for (const block of text.split(/^## /m).slice(1)) {
    const header = block.split('\n')[0], world = /`([^`]+)`/.exec(header);
    if (!world) continue;
    for (const match of block.matchAll(/^\|\s*(level_\d+)\s*\|\s*([^|]+)\|\s*(\d+)\s*\|\s*([^|]+)\|/gm)) {
      rows.push({ world: world[1], key: match[1], name: match[2].trim(), declared: Number(match[3]), status: match[4].trim() });
    }
  }
  return rows;
}
function auditEvidence(report, groups, ledger, fingerprint, inventory = INVENTORY) {
  const errors = [], expected = inventory.flatMap(item => Array.from({ length: item.count }, (_, index) => item.world + '::level_' + (index + 1)));
  if (!report || report.generatedBy !== 'levels:routes' || report.contract !== 'v2-queued' || !report.proofComplete || report.engineFingerprint !== fingerprint) {
    errors.push('missing, incomplete, or stale generated proof evidence');
  }
  const proofs = report && Array.isArray(report.rows) ? report.rows : [], reviews = ledgerRows(ledger);
  if (proofs.length !== expected.length || reviews.length !== expected.length) errors.push('proof/review ledger does not cover every shipped level');
  for (const identity of expected) {
    const [world, key] = identity.split('::'), proof = proofs.filter(row => row.world === world && row.key === key), review = reviews.filter(row => row.world === world && row.key === key);
    const group = groups.find(item => item.world === world), level = group && group.levels.find(item => item.key === key);
    if (!level || proof.length !== 1 || !proof[0].replay || proof[0].status !== 'solvable' || proof[0].declared !== level.par ||
      proof[0].optimal !== level.par || proof[0].levelFingerprint !== digest(level.raw) || (proof[0].issues || []).length) errors.push(identity + ': missing/stale minimum proof');
    if (!level || review.length !== 1 || review[0].name !== level.name || review[0].declared !== level.par ||
      !/^certified\b/i.test(review[0].status) || !/review/i.test(review[0].status)) errors.push(identity + ': design review is not certified/current');
  }
  return errors;
}
function auditBrowserEvidence(report, sources, fingerprint, displayFingerprint, inventory = INVENTORY) {
  const errors = [];
  if (!report || report.generatedBy !== 'verify-v2-chromium' || !report.passed ||
      report.engineFingerprint !== fingerprint || report.presentationFingerprint !== displayFingerprint ||
      !report.browser || !/^Chrome\//.test(report.browser.product || '') ||
      !Array.isArray(report.pageErrors) || report.pageErrors.length ||
      !Array.isArray(report.externalResources) || report.externalResources.length) errors.push('missing, failed, or stale real Chromium evidence');
  const rows = report && Array.isArray(report.packs) ? report.packs : [];
  if (rows.length !== inventory.length) errors.push('Chromium evidence does not cover every shipped pack');
  for (const item of inventory) {
    const matches = rows.filter(row => row.world === item.world), row = matches[0];
    if (matches.length !== 1 || row.levels !== item.count || row.sourceFingerprint !== sources[item.world] ||
        ['filePicker', 'pasteAndYamlRoundTrip', 'invalidLoadAtomic', 'nativeMinimaVerified', 'nonterminalUndo',
          'authoredExportAfterPlay', 'sharedTerminalFixture', 'restart', 'returnToPrologue'].some(key => row[key] !== true)) errors.push(item.world + ': incomplete/stale Chromium pack verification');
  }
  const gallery = report && report.gallery;
  if (!gallery || gallery.definitions !== 63 || gallery.arrows !== 8 || gallery.directions !== 4 ||
      !gallery.inertTint || !gallery.pendingAndFailedSamples) errors.push('missing complete Chromium gallery verification');
  return errors;
}
function managedFiles(root) {
  const files = [];
  function walk(relative) {
    if (historical(relative)) return;
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error('managed symbolic link requires explicit review: ' + relative);
    if (stat.isDirectory()) { fs.readdirSync(absolute).forEach(name => walk(relative + '/' + name)); return; }
    if (/\.(?:js|html|css|md|txt|yaml|yml|json)$/.test(relative)) files.push({ path: relative, text: fs.readFileSync(absolute, 'utf8') });
  }
  ['src', 'data', 'scripts', 'tests', 'docs', 'openspec/specs', 'README.md', 'AGENTS.md', 'index.html', 'glyphs.html', 'package.json', 'package-lock.json'].forEach(walk);
  return files;
}
function auditGraphics(SM, report, root = ROOT) {
  const errors = [];
  for (const name of ['sm-visuals', 'sm-sprites']) vm.runInNewContext(fs.readFileSync(path.join(root, 'src/js/' + name + '.js'), 'utf8'), { SM });
  for (const tile of Object.values(SM.getActiveRegistry()).concat(SM.DOT_DEFINITION)) {
    const d = SM.VISUALS.describe(tile, { P: 'red', W: 'blu' });
    if (!SM.SPRITES.keys.includes(d.key)) errors.push('missing pixel/vector role ' + tile.name);
    try { SM.SPRITES.validate(SM.SPRITES.manifest(d.key)); }
    catch (error) { errors.push(tile.name + ': ' + error.message); }
  }
  for (const identity of ['pixel', 'vector']) {
    const row = report && report.identities && report.identities[identity];
    if (!row || !Array.isArray(row.packs) || row.packs.length !== INVENTORY.length ||
        INVENTORY.some(item => row.packs.filter(pack => pack.world === item.world && pack.levels === item.count &&
          pack.sourceFingerprint === digest(SM.parseYAML(fs.readFileSync(path.join(root, item.file), 'utf8')))).length !== 1) ||
        !row.gallery || row.gallery.definitions !== 63 ||
        !row.editor || !row.editor.sharedBoard || !row.editor.sharedSnapshots || !row.editor.sharedQuickTest ||
        !row.editor.authoredExport || !row.editor.coordinateMatrix || row.editor.coordinateMatrix.length !== 16 ||
        !row.interruptedPlayback || !row.deniedStorage || !row.reducedMotion ||
        !row.performance || !Number.isFinite(row.performance.p95WorkMs) || row.performance.p95WorkMs < 0 || row.performance.samples < 50 ||
        !row.performance.stageCountReturnedToBaseline || row.performance.rebuildCycles !== 100 || row.performance.animatedGlyphs !== 144 ||
        !row.performance.missingPixelFallback || !row.performance.canvasUnavailable || row.performance.p95WorkMs > 16.7) {
      errors.push('incomplete native graphics evidence for ' + identity);
    }
  }
  const vendor = path.join(root, 'src/vendor/konva'), provenance = JSON.parse(fs.readFileSync(path.join(vendor, 'provenance.json'), 'utf8'));
  if (provenance.version !== '10.9.1' || provenance.license !== 'MIT') errors.push('unsupported or unlicensed Canvas backend');
  for (const [file, expected] of Object.entries(provenance.files)) {
    if (crypto.createHash('sha256').update(fs.readFileSync(path.join(vendor, file))).digest('hex') !== expected) errors.push('vendor integrity mismatch: ' + file);
  }
  return errors;
}
function main() {
  const flags = process.argv.slice(2);
  if (flags.some(flag => flag !== '--preaccept')) throw new Error('usage: node scripts/audit-v2-assets.js [--preaccept]');
  const preaccept = flags.includes('--preaccept'), SM = loadRuntime(), collected = collect(SM);
  const guide = fs.readFileSync(path.join(ROOT, 'docs/level-design/tile-mechanics.md'), 'utf8');
  const ledger = fs.readFileSync(path.join(ROOT, 'docs/level-design/v2-pack-certification.md'), 'utf8');
  const used = [...new Set(collected.groups.flatMap(group => group.levels.flatMap(level => level.raw.grid.flat())))];
  const usage = Object.fromEntries(Object.keys(SM.getActiveRegistry()).map(id => [id, collected.groups.filter(group =>
    group.levels.some(level => level.raw.grid.flat().includes(Number(id)))).map(group =>
    group.world === 'prologue' ? 'P' : 'W' + Number(group.world.slice(6, 8)))]));
  let proof = null;
  try { proof = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/level-design/v2-pack-proofs.json'), 'utf8')); } catch (error) { /* Report missing evidence below. */ }
  let browserProof = null;
  try { browserProof = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/level-design/v2-chromium-verification.json'), 'utf8')); } catch (error) { /* Report missing evidence below. */ }
  const sourceFingerprints = Object.fromEntries(INVENTORY.map(item => [item.world,
    digest(SM.parseYAML(fs.readFileSync(path.join(ROOT, item.file), 'utf8')))]));
  const references = auditFiles(managedFiles(ROOT), { preaccept });
  const deltaRoot = path.join(ROOT, 'openspec/changes/v2-global-pack-migration/specs');
  const deltas = {}, accepted = {};
  for (const capability of fs.readdirSync(deltaRoot)) {
    deltas[capability] = fs.readFileSync(path.join(deltaRoot, capability, 'spec.md'), 'utf8');
    const main = path.join(ROOT, 'openspec/specs', capability, 'spec.md');
    accepted[capability] = fs.existsSync(main) ? fs.readFileSync(main, 'utf8') : '';
  }
  const pendingSync = auditSpecSync(deltas, accepted);
  const errors = collected.problems.concat(auditInventory(collected.groups), auditDefinitions(SM, guide, used, usage), references.errors,
    auditEvidence(proof, collected.groups, ledger, engineFingerprint()),
    auditBrowserEvidence(browserProof, sourceFingerprints, engineFingerprint(), presentationFingerprint()),
    auditGraphics(SM, browserProof));
  if (!preaccept) errors.push(...pendingSync.map(capability => 'accepted specification synchronization pending: ' + capability));
  const result = { mode: preaccept ? 'preaccept' : 'release', ok: errors.length === 0,
    releaseReady: errors.length === 0 && references.deferred.length === 0 && pendingSync.length === 0,
    definitions: Object.keys(SM.getActiveRegistry()).length, dot: true, packs: collected.groups.length,
    expectedLevels: INVENTORY.reduce((sum, item) => sum + item.count, 0), errors,
    deferredAcceptedSpecs: references.deferred, pendingAcceptedSpecSync: pendingSync };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
module.exports = { historical, auditDefinitions, auditInventory, auditFiles, auditEvidence, auditBrowserEvidence, auditSpecSync, ledgerRows, managedFiles, auditGraphics };
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
