#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
for (const file of [
  'src/js/sm-yaml.js', 'src/js/tiles.js', 'src/js/sm-glyphs.js',
  'src/js/sm-board.js', 'src/js/sm-entities.js', 'src/js/levels.default.js',
  'src/js/levels.js', 'src/js/sm-rules.js'
]) {
  const fullPath = path.join(ROOT, file);
  vm.runInThisContext(fs.readFileSync(fullPath, 'utf8'), { filename: fullPath });
}

const SM = globalThis.SM;
const reports = [];
let failed = false;

function collect(result, sourceName) {
  if (result.problems.length) {
    for (const problem of result.problems) {
      console.error(sourceName + ': ' + problem.level + ': ' + problem.message);
    }
    failed = true;
    return;
  }
  reports.push(...result.levels);
}

collect(SM.LEVELS.boot({ solve: true }), 'Prologue');

const worldsDir = path.join(ROOT, 'data/worlds');
if (fs.existsSync(worldsDir)) {
  const packs = fs.readdirSync(worldsDir).filter(name => /\.levels\.ya?ml$/i.test(name)).sort();
  for (const pack of packs) {
    const source = fs.readFileSync(path.join(worldsDir, pack), 'utf8');
    collect(SM.LEVELS.load(source, { solve: true }), pack);
  }
}

function replay(level, pathActions, optimal) {
  const state = SM.RULES.newState(level);
  for (const action of pathActions) SM.RULES.resolveTurn(state, action);
  return state.won && state.strokes === optimal;
}

function token(action) {
  const direction = {
    north: 'U', east: 'R', south: 'D', west: 'L'
  }[action.dir];
  if (action.type === 'act') return 'ACT';
  if (action.type === 'pull') return 'P' + direction;
  return direction;
}

for (const level of reports) {
  const solve = level.solve;
  const world = level.worldName || 'Streuph\'s Maze';
  const identity = level.worldId ? world + ' (' + level.worldId + ')' : world;
  const title = identity + ' — ' + level.key + ' ' + level.name;
  if (!solve || solve.status !== 'solvable' || solve.optimal === null) {
    console.log(title + ' — no proven PAR (solver: ' + (solve ? solve.status : 'not run') + ')');
    continue;
  }
  if (!replay(level, solve.path, solve.optimal)) {
    console.error(title + ' — selected route failed replay or stroke/PAR check');
    failed = true;
    continue;
  }

  const counts = solve.routeBalance && solve.routeBalance.counts;
  if (!counts) {
    console.error(title + ' — solver did not provide route-balance counts');
    failed = true;
    continue;
  }
  const route = solve.path.map(token).join(' ') || '(already at goal)';
  const completeness = solve.routeBalance.complete ? 'complete' : 'incomplete';
  console.log(title);
  console.log('  PAR ' + solve.optimal + ' | ' + route);
  console.log('  U=' + counts.up + ' D=' + counts.down + ' L=' + counts.left +
    ' R=' + counts.right + ' | balance=' + solve.routeBalance.score +
    ' | comparison=' + completeness + ' | replay=won');
}

if (failed) process.exitCode = 1;
