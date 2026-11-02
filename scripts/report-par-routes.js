#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { loadRuntime, RUNTIME_FILES } = require('./emit-levels-yaml');
const ROOT = path.resolve(__dirname, '..');
const INVENTORY = [
  { world: 'prologue', count: 13, file: 'data/levels.yaml', builtin: true },
  ...['01-sokoban', '02-lolos-castle', '03-hyrule-flip-flop', '04-pengo-vector', '05-chips-chromatic', '06-goof-proximity']
    .map(suffix => ({ world: 'world-' + suffix, count: 8, file: 'data/worlds/world-' + suffix + '.levels.yaml' }))
];
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function engineFingerprint(root = ROOT) {
  return digest(RUNTIME_FILES.filter(name => name !== 'levels.default' && name !== 'sm-glyphs')
    .map(name => fs.readFileSync(path.join(root, 'src/js', name + '.js'), 'utf8')));
}
function token(action) {
  if (action.type === 'act') return 'ACT';
  return (action.type === 'pull' ? 'P' : '') + ({ north: 'U', east: 'R', south: 'D', west: 'L' }[action.dir]);
}
function reviewEarlyLevel(SM, level, options = {}) {
  const limit = options.maxStates === undefined ? 20000 : options.maxStates;
  if (!Number.isInteger(limit) || limit < 1) return { status: 'unknown', reason: 'review-budget', states: 0, unwinnablePlayingStates: null };
  const start = SM.RULES.newState(level), nodes = [{ state: start, parent: -1, action: null }];
  const ids = new Map([[SM.RULES.snapshotSig(start), 0]]), reverse = [[]], winners = [];
  let head = 0, failures = 0, aborts = 0;
  while (head < nodes.length) {
    const source = head++, node = nodes[source];
    if (node.state.won) { winners.push(source); continue; }
    for (const action of SM.LEVELS.actionsFor()) {
      const next = SM.RULES.cloneState(node.state);
      let result;
      try { result = SM.RULES.resolveTurn(next, action); }
      catch (error) { return { status: 'unknown', reason: 'transition', states: nodes.length, unwinnablePlayingStates: null }; }
      if (result.aborted) {
        aborts++;
        if (!['cycle', 'budget'].includes(result.steps[0].reason)) return { status: 'unknown', reason: 'effect', states: nodes.length, unwinnablePlayingStates: null };
        continue;
      }
      if (!result.stroke && !result.changed) continue;
      if (next.failed) { failures++; continue; }
      const signature = SM.RULES.snapshotSig(next);
      let destination = ids.get(signature);
      if (destination === undefined) {
        if (nodes.length >= limit) return { status: 'unknown', reason: 'review-budget', states: nodes.length, unwinnablePlayingStates: null };
        destination = nodes.length; ids.set(signature, destination);
        nodes.push({ state: next, parent: source, action }); reverse.push([]);
      }
      reverse[destination].push(source);
    }
  }
  const canWin = new Set(winners), pending = winners.slice();
  while (pending.length) for (const previous of reverse[pending.pop()]) if (!canWin.has(previous)) { canWin.add(previous); pending.push(previous); }
  const lost = nodes.map((node, index) => index).filter(index => !nodes[index].state.won && !canWin.has(index));
  const examples = lost.slice(0, 3).map(index => {
    const actions = [];
    for (let cursor = index; nodes[cursor].parent >= 0; cursor = nodes[cursor].parent) actions.push(nodes[cursor].action);
    return actions.reverse().map(token);
  });
  return { status: 'complete', states: nodes.length, maxStates: limit, terminalFailureTransitions: failures,
    diagnosticAborts: aborts, unwinnablePlayingStates: lost.length, allPlayingStatesCanWin: lost.length === 0, examples };
}
function collect(SM, root = ROOT) {
  const groups = [], problems = [];
  const expectedFiles = INVENTORY.filter(item => !item.builtin).map(item => path.basename(item.file));
  const worldsDirectory = path.join(root, 'data/worlds');
  if (!fs.existsSync(worldsDirectory)) problems.push('shipped worlds directory is missing');
  for (const file of (fs.existsSync(worldsDirectory) ? fs.readdirSync(worldsDirectory) : []).filter(file => /\.levels\.ya?ml$/i.test(file))) {
    if (!expectedFiles.includes(file)) problems.push('unexpected shipped pack: ' + file);
  }
  for (const item of INVENTORY) {
    const group = { world: item.world, source: item.file, levels: [], problems: [] };
    try {
      const parsed = SM.parseYAML(fs.readFileSync(path.join(root, item.file), 'utf8'));
      if (item.builtin && !isDeepStrictEqual(parsed, SM.DEFAULT_LEVELS)) group.problems.push('Prologue JS/YAML authoring differs');
      const loaded = SM.LEVELS.validate(item.builtin ? SM.DEFAULT_LEVELS : parsed, { solve: false });
      group.problems.push(...loaded.problems.map(problem => problem.message));
      if (loaded.ok) group.levels = loaded.levels;
      if (loaded.levels.some(level => level.worldId !== item.world)) group.problems.push('world identity differs from shipped manifest');
    } catch (error) { group.problems.push(String(error.message || error)); }
    groups.push(group);
  }
  return { groups, problems };
}
function analyse(SM, groups, options = {}) {
  const inventory = options.inventory || INVENTORY;
  const rows = [], issues = (options.problems || []).slice();
  const budgets = { maxStates: options.maxStates === undefined ? SM.LEVELS.MAX_STATES : options.maxStates,
    maxDepth: options.maxDepth === undefined ? SM.LEVELS.MAX_DEPTH : options.maxDepth,
    maxRouteLabels: options.maxRouteLabels === undefined ? (options.maxStates === undefined ? SM.LEVELS.MAX_STATES : options.maxStates) : options.maxRouteLabels };
  for (const group of groups) {
    const expected = inventory.find(item => item.world === group.world);
    if (!expected) issues.push('unexpected world identity ' + group.world);
    else if (group.levels.length !== expected.count) issues.push(group.world + ': level count differs from manifest');
    issues.push(...(group.problems || []).map(problem => group.source + ': ' + problem));
    if (groups.filter(other => other.world === group.world).length > 1) issues.push('duplicate world ' + group.world);
  }
  for (const item of inventory) {
    const group = groups.find(candidate => candidate.world === item.world);
    for (let index = 1; index <= item.count; index++) {
      const key = 'level_' + index, level = group && group.levels.find(candidate => candidate.key === key);
      const row = { source: group ? group.source : item.file, world: item.world, key,
        name: level ? level.name : key, status: 'invalid', issues: [], optimal: null, replay: false, budgets };
      if (!level || level.worldId !== item.world || (group.problems || []).length) {
        row.issues.push('missing or invalid source level'); rows.push(row); continue;
      }
      row.dimensions = [level.width, level.height]; row.lesson = level.goalText;
      row.levelFingerprint = digest(level.raw);
      row.tileIds = [...new Set(level.raw.grid.flat())].sort((a, b) => a - b);
      row.overrides = level.raw.overrides || {}; row.objectOverrides = level.raw.object_overrides || {};
      row.initialColors = { P: level.initialPlayerColour, W: level.initialWorldColour };
      row.profiles = [{ identity: 'dot', kind: 'dot', color: level.initialPlayerColour,
        capabilities: SM.DOT_DEFINITION.capabilities, vulnerableToRays: SM.DOT_DEFINITION.vulnerableToRays }].concat(
        level.cratesInit.flat().filter(Boolean).map(object => ({ identity: object.entityId,
          kind: 'crate', color: object.params.colour, capabilities: object.capabilities })));
      row.profiles.push(...level.switchesInit.filter(feature => feature.inst.entityRole === 'target').map(feature =>
        ({ identity: feature.entityId, kind: 'target', link: feature.inst.params.link, capabilities: feature.capabilities })));
      row.declared = level.par;
      if (options.earlyReview && index <= 3) {
        row.earlyReview = reviewEarlyLevel(SM, level);
        if (row.earlyReview.status !== 'complete') row.issues.push('early playing-state review is incomplete');
        else if (row.earlyReview.unwinnablePlayingStates > 0) row.issues.push('early level has unwinnable playing states');
      }
      const result = SM.LEVELS.solve(level, budgets);
      row.status = result.status; row.reason = result.reason || null; row.explored = result.explored;
      row.routeLabels = result.routeLabels || 0;
      if (result.status !== 'solvable' || result.verified !== true || result.optimal === null || !Array.isArray(result.path)) {
        row.issues.push('no replay-proven minimum'); rows.push(row); continue;
      }
      row.optimal = result.optimal; row.path = result.path; row.route = result.path.map(token);
      row.counts = SM.LEVELS.routeMetrics(result.path).counts;
      row.balance = result.routeBalance;
      try {
        const replay = SM.RULES.newState(level);
        for (const action of result.path) {
          const transition = SM.RULES.resolveTurn(replay, action);
          if (transition.aborted || replay.failed) throw new Error('route aborted or failed');
        }
        row.replay = replay.won && !replay.failed && replay.strokes === result.optimal;
      } catch (error) { row.issues.push(String(error.message || error)); }
      if (!row.replay) row.issues.push('minimum route replay mismatch');
      if (level.par !== result.optimal) row.issues.push('declared golf_score differs from proven minimum');
      if (!result.routeBalance || !isDeepStrictEqual(result.routeBalance.counts, row.counts)) row.issues.push('route command counts disagree');
      rows.push(row);
    }
  }
  const worlds = inventory.map(item => {
    const levels = rows.filter(row => row.world === item.world), proven = levels.filter(row => row.status === 'solvable' && row.replay);
    return { world: item.world, levels: levels.length, proven: proven.length,
      par: proven.length === item.count ? proven.reduce((sum, row) => sum + row.optimal, 0) : null,
      knownSubtotal: proven.reduce((sum, row) => sum + row.optimal, 0) };
  });
  const ok = issues.length === 0 && rows.every(row => row.issues.length === 0);
  return { generatedBy: 'levels:routes', contract: 'v2-queued', generatedAt: new Date().toISOString(),
    proofComplete: ok, manualReview: 'Required separately in v2-pack-certification.md; this is mathematical evidence only.',
    engineFingerprint: options.engineFingerprint || null, expectedLevels: inventory.reduce((sum, item) => sum + item.count, 0),
    issues, worlds, rows };
}
function main() {
  const options = {};
  for (const flag of process.argv.slice(2)) {
    if (flag === '--json') options.json = true;
    else if (flag === '--early-review') options.earlyReview = true;
    else if (flag.startsWith('--output=')) options.output = flag.slice(9);
    else {
      const match = /^--(max-states|max-depth|max-route-labels)=(\d+)$/.exec(flag);
      if (!match) throw new Error('unsupported route-report flag: ' + flag);
      options[{ 'max-states': 'maxStates', 'max-depth': 'maxDepth', 'max-route-labels': 'maxRouteLabels' }[match[1]]] = Number(match[2]);
    }
  }
  const SM = loadRuntime(), collected = collect(SM);
  options.problems = collected.problems;
  options.engineFingerprint = engineFingerprint();
  const report = analyse(SM, collected.groups, options), json = JSON.stringify(report, null, 2) + '\n';
  if (options.output) {
    const destination = path.resolve(ROOT, options.output), parent = fs.realpathSync(path.dirname(destination));
    const allowed = path.join(ROOT, 'docs/level-design');
    if ((parent !== allowed && !parent.startsWith(allowed + path.sep)) || !destination.endsWith('.json')) throw new Error('report output must be generated JSON under docs/level-design');
    if (fs.existsSync(destination) && JSON.parse(fs.readFileSync(destination, 'utf8')).generatedBy !== 'levels:routes') throw new Error('refusing to overwrite non-generated report');
    const temporary = destination + '.' + process.pid + '.tmp';
    let created = false;
    try { fs.writeFileSync(temporary, json, { encoding: 'utf8', flag: 'wx' }); created = true; fs.renameSync(temporary, destination); created = false; }
    finally { if (created) fs.unlinkSync(temporary); }
  }
  if (options.json) process.stdout.write(json);
  else {
    for (const row of report.rows) {
      console.log(row.world + ' — ' + row.key + ' ' + row.name);
      console.log(row.replay ? '  PAR ' + row.optimal + ' | ' + row.route.join(' ') + ' | counts=' + JSON.stringify(row.counts) +
        ' | comparison=' + (row.balance && row.balance.complete ? 'complete' : 'incomplete') + ' | replay=won' : '  no proven PAR: ' + row.status + (row.reason ? ' (' + row.reason + ')' : ''));
      row.issues.forEach(issue => console.log('  ISSUE ' + issue));
    }
    report.issues.forEach(issue => console.error(issue));
    console.log('Proof coverage: ' + report.rows.filter(row => row.replay).length + '/' + report.expectedLevels + '; manual design review remains separate.');
  }
  if (!report.proofComplete) process.exitCode = 1;
}
module.exports = { INVENTORY, collect, analyse, token, digest, engineFingerprint, reviewEarlyLevel };
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
