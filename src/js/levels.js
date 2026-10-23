/* =========================================================================
 * levels.js  —  STREUPH'S MAZE
 * Level loading and validation for the authored YAML level schema.
 *
 * This is the ONLY module that knows about YAML. It turns a parsed document
 * into a list of normalised levels, or into diagnostics of the shape
 * { level, line, message }.
 *
 * Validation invariants are numbered exactly as in §11.3:
 *   V1  num_level === Object.keys(levels).length          error
 *   V2  exactly one start tile per level                  error
 *   V3  rows equal length; width/height match (if given)  error
 *   V4  width <= 16, height <= 9                          error
 *   V5  every grid integer exists in SM.TILES             error
 *   V6  every overrides key exists in this level's grid   error
 *   V7  level keys are level_1..level_n, contiguous       error
 *   V8  level contains a colour actuator                  warning
 *   V9  colour overrides are in {wht,red,gre,blu}         error
 *   V10 level is solvable                                 warning
 *   V11 exactly one goal tile                             error
 *   V12 every portal has a partner                        warning
 *   V14 initial binary polarity is red-open or blue-open   error
 *
 * The V10 solver is breadth-first over the REAL resolver (SM.RULES), so it
 * can never disagree with play. It reports "unknown" — never a wrong answer
 * — when it hits its state budget, so a pathological level cannot hang the
 * page at load time.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  var MAX_WIDTH = 16;
  var MAX_HEIGHT = 9;
  var MIN_WIDTH = 2;
  var MIN_HEIGHT = 1;
  var MAX_STATES = 250000;
  var MAX_DEPTH = 200;
  var POLARITIES = ['red-open', 'blue-open'];

  var GAMECOLOURS = SM.GAME_COLOURS;

  /* ---------------------------------------------------------------------- */
  /* Diagnostics                                                            */
  /* ---------------------------------------------------------------------- */

  function diag(level, line, message) {
    return { level: level, line: (line || 0), message: message };
  }

  function isInt(v) {
    return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
  }

  function validateWinPicture(value) {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return '"win_picture" must be a PNG data URI string';
    var match = /^data:image\/png;base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
    if (!match || !match[1]) {
      return '"win_picture" must use data:image/png;base64,... encoding';
    }
    var data = match[1];
    if (data.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
      return '"win_picture" contains invalid Base64';
    }
    var decodedSize = Math.floor(data.length * 3 / 4) - (data.slice(-2) === '==' ? 2 : data.slice(-1) === '=' ? 1 : 0);
    if (decodedSize > 2 * 1024 * 1024) return '"win_picture" exceeds the 2 MiB image limit';

    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var bytes = [], accumulator = 0, bits = 0;
    for (var i = 0; i < data.length && bytes.length < 24; i++) {
      if (data.charAt(i) === '=') break;
      var digit = alphabet.indexOf(data.charAt(i));
      if (digit < 0) return '"win_picture" contains invalid Base64';
      accumulator = (accumulator << 6) | digit;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((accumulator >> bits) & 255);
        accumulator &= (1 << bits) - 1;
      }
    }
    var signature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (var s = 0; s < signature.length; s++) {
      if (bytes[s] !== signature[s]) return '"win_picture" is not a PNG file';
    }
    if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== 'IHDR') {
      return '"win_picture" has no PNG IHDR header';
    }
    var width = bytes[16] * 16777216 + bytes[17] * 65536 + bytes[18] * 256 + bytes[19];
    var height = bytes[20] * 16777216 + bytes[21] * 65536 + bytes[22] * 256 + bytes[23];
    if (width !== 250 || height !== 250) {
      return '"win_picture" must be exactly 250x250 pixels (found ' + width + 'x' + height + ')';
    }
    return null;
  }

  /* ---------------------------------------------------------------------- */
  /* Document                                                               */
  /* ---------------------------------------------------------------------- */

  function validate(doc, opts) {
    opts = opts || {};
    var diagnostics = [];
    var problems = [];
    var out = [];

    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      problems.push(diag('(document)', 0,
        'the document must be a mapping at the top level'));
      return finish(out, diagnostics, problems);
    }

    if (typeof doc.name !== 'string' || doc.name === '') {
      problems.push(diag('(document)', 1,
        'the header key "name" is required and must be a non-empty string'));
    }

    var worldId = null;
    if (doc.world_id === undefined && SM.DEFAULT_LEVELS && doc.name === SM.DEFAULT_LEVELS.name) {
      // Keep the shipped Prologue's long-standing document shape intact while
      // giving it a stable identity in normalized runtime levels.
      worldId = 'prologue';
    } else if (typeof doc.world_id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.world_id)) {
      problems.push(diag('(document)', 1,
        '"world_id" is required for world packs and must be a lowercase slug (letters, digits, hyphens)'));
    } else if (doc.world_id === 'prologue') {
      problems.push(diag('(document)', 1,
        '"prologue" is reserved for the built-in Prologue; choose a different stable world_id'));
    } else {
      worldId = doc.world_id;
    }

    var levelsObj = doc.levels;
    if (!levelsObj || typeof levelsObj !== 'object' || Array.isArray(levelsObj)) {
      problems.push(diag('(document)', 0,
        'the header key "levels" is required and must be a mapping of level_1, level_2, ...'));
      return finish(out, diagnostics, problems);
    }

    var inputLevelKeys = Object.keys(levelsObj).filter(function (k) { return /^level_\d+$/.test(k); });
    var levelKeys = inputLevelKeys.slice();
    var strayKeys = Object.keys(levelsObj).filter(function (k) { return !/^level_\d+$/.test(k); });
    levelKeys.sort(function (a, b) {
      return parseInt(a.slice(6), 10) - parseInt(b.slice(6), 10);
    });

    for (var order = 0; order < inputLevelKeys.length; order++) {
      if (inputLevelKeys[order] !== levelKeys[order]) {
        problems.push(diag(inputLevelKeys[order], 0,
          'V7: level keys must be listed in contiguous numeric order (level_1, level_2, ...)'));
        break;
      }
    }

    /* V7 — contiguous, in file order. */
    for (var n = 0; n < levelKeys.length; n++) {
      var want = 'level_' + (n + 1);
      if (levelKeys[n] !== want) {
        problems.push(diag(levelKeys[n], 0,
          'V7: level keys must be level_1, level_2, ... contiguous and in file order; ' +
          'expected "' + want + '" but found "' + levelKeys[n] + '" here'));
        break;
      }
    }
    for (var s3 = 0; s3 < strayKeys.length; s3++) {
      problems.push(diag(strayKeys[s3], 0,
        'V7: "' + strayKeys[s3] + '" is not a level key. Levels must be named level_1, level_2, ...'));
    }

    /* V1 — num_level must agree. */
    if (typeof doc.num_level !== 'number' || !isFinite(doc.num_level)) {
      problems.push(diag('(document)', 0, '"num_level" is required and must be a number'));
    } else if (doc.num_level !== Object.keys(levelsObj).length) {
      problems.push(diag('(document)', 0,
        'V1: num_level is ' + doc.num_level + ' but the document contains ' +
        Object.keys(levelsObj).length + ' level record(s)'));
    }

    if (problems.length) return finish(out, diagnostics, problems);

    var seenGoalText = {};
    for (var i = 0; i < levelKeys.length; i++) {
      var key = levelKeys[i];
      var diagnosticsBeforeLevel = diagnostics.length;
      var res = validateLevel(key, levelsObj[key], diagnostics, seenGoalText, opts);
      if (res.error) {
        problems.push(addWorldContext(res.error, doc.name, worldId, key));
      }
      else {
        res.level.worldId = worldId;
        res.level.worldName = doc.name;
        out.push(res.level);
      }
      for (var di = diagnosticsBeforeLevel; di < diagnostics.length; di++) {
        addWorldContext(diagnostics[di], doc.name, worldId, key);
      }
    }

    return finish(out, diagnostics, problems);
  }

  function finish(levels, diagnostics, problems) {
    return {
      levels: levels,
      diagnostics: diagnostics,
      problems: problems,
      ok: problems.length === 0
    };
  }

  function addWorldContext(diagnostic, worldName, worldId, levelKey) {
    diagnostic.world = worldName || null;
    diagnostic.worldId = worldId || null;
    if (levelKey) {
      diagnostic.message = 'World "' + worldName + '" (' + (worldId || 'unknown id') + '), ' +
        levelKey + ': ' + diagnostic.message;
    }
    return diagnostic;
  }

  /* ---------------------------------------------------------------------- */
  /* One level                                                              */
  /* ---------------------------------------------------------------------- */

  function validateLevel(key, raw, diagnostics, seenGoalText, opts) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { error: diag(key, 0, 'the level must be a mapping') };
    }
    if (typeof raw.name !== 'string' || raw.name === '') {
      return { error: diag(key, 0, '"name" is required and must be a non-empty string') };
    }
    if (raw.initial_polarity !== undefined && POLARITIES.indexOf(raw.initial_polarity) === -1) {
      return { error: diag(key, 0,
        'V14: "initial_polarity" must be "red-open" or "blue-open"') };
    }
    var pictureError = validateWinPicture(raw.win_picture);
    if (pictureError) return { error: diag(key, 0, pictureError) };
    var hint = raw.goal !== undefined ? raw.goal : raw.hint;
    if (typeof hint !== 'string' || hint === '') {
      diagnostics.push(diag(key, 0, 'W: this level has no "goal" text; its tutorial banner will be empty.'));
    } else if (seenGoalText[hint]) {
      diagnostics.push(diag(key, 0,
        'the "goal" text is identical to ' + seenGoalText[hint] +
        '. Distinct levels deserve distinct teaching text.'));
    } else {
      seenGoalText[hint] = key;
    }

    if (!Array.isArray(raw.grid)) {
      return { error: diag(key, 0, '"grid" is required and must be a sequence of rows') };
    }

    /* V3 — rows equal length; width/height inferred if absent. */
    var h = raw.grid.length;
    var w = -1;
    for (var r = 0; r < h; r++) {
      if (!Array.isArray(raw.grid[r])) {
        return { error: diag(key, 0, 'V3: grid row ' + (r + 1) + ' is not a sequence') };
      }
      if (w === -1) w = raw.grid[r].length;
      else if (raw.grid[r].length !== w) {
        return { error: diag(key, 0,
          'V3: grid row ' + (r + 1) + ' has ' + raw.grid[r].length +
          ' cell(s) but row 1 has ' + w + '. Every row must be the same length.') };
      }
    }
    if (raw.width !== undefined && raw.width !== null && raw.width !== w) {
      return { error: diag(key, 0,
        'V3: width is declared as ' + raw.width + ' but the rows are ' + w + ' cells wide') };
    }
    if (raw.height !== undefined && raw.height !== null && raw.height !== h) {
      return { error: diag(key, 0,
        'V3: height is declared as ' + raw.height + ' but the grid has ' + h + ' row(s)') };
    }
    w = raw.width !== undefined && raw.width !== null ? raw.width : w;
    h = raw.height !== undefined && raw.height !== null ? raw.height : h;

    /* V4 — bounds. */
    if (w < MIN_WIDTH || w > MAX_WIDTH) {
      return { error: diag(key, 0, 'V4: width ' + w + ' is out of range (' + MIN_WIDTH + '..' + MAX_WIDTH + ')') };
    }
    if (h < MIN_HEIGHT || h > MAX_HEIGHT) {
      return { error: diag(key, 0, 'V4: height ' + h + ' is out of range (' + MIN_HEIGHT + '..' + MAX_HEIGHT + ')') };
    }

    /* V5 — IDs are resolved through the active catalogue. Validation consumes
       only stable identity/metadata; it never executes tile strategies. */
    var starts = 0, goals = 0, actuators = 0;
    var used = {};
    for (var rr = 0; rr < h; rr++) {
      for (var cc = 0; cc < w; cc++) {
        var id = raw.grid[rr][cc];
        var label = SM.RULES.cellLabel(cc, h - 1 - rr) + ' (grid row ' + (rr + 1) + ', column ' + (cc + 1) + ')';
        if (!isInt(id)) {
          return { error: diag(key, 0,
            'V5: the cell at ' + label + ' is ' + JSON.stringify(id) +
            '; every cell must be an integer tile id') };
        }
        var def = SM.getTile(id);
        if (!def) {
          return { error: diag(key, 0,
            'V5: unknown tile id ' + id + ' at ' + label +
            '. Replace it with a registered, implemented tile ID from the tile catalogue.') };
        }
        if (def.implemented === false) {
          return { error: diag(key, 0,
            'V5: tile id ' + id + ' (' + def.name + ') at ' + label +
            ' is NOT YET IMPLEMENTED. Remove it from this level or implement the tile first.') };
        }
        used[id] = true;
        if (id === 1) starts++;
        if (id === 2) goals++;
        if (def.state && (def.state.writes.indexOf('P') !== -1 || def.state.writes.indexOf('W') !== -1)) {
          actuators++;
        }
      }
    }

    /* V2 / V11 — exactly one start, exactly one goal. */
    if (starts !== 1) {
      return { error: diag(key, 0, 'V2: exactly one start tile (id 1) is required, found ' + starts) };
    }
    if (goals !== 1) {
      return { error: diag(key, 0, 'V11: exactly one goal tile (id 2) is required, found ' + goals) };
    }

    /* V6 — overrides keyed by ids that actually appear. */
    if (raw.overrides !== undefined && raw.overrides !== null) {
      if (typeof raw.overrides !== 'object' || Array.isArray(raw.overrides)) {
        return { error: diag(key, 0, '"overrides" must be a mapping of tile id -> parameters') };
      }
      var okeys = Object.keys(raw.overrides);
      for (var oi = 0; oi < okeys.length; oi++) {
        var oid = okeys[oi];
        if (!/^-?\d+$/.test(oid)) {
          return { error: diag(key, 0,
            'V6: the override key "' + oid + '" is not an integer tile id. ' +
            'Overrides are keyed by the id used in this level\'s grid, so that ' +
            'levels.yaml never has to know what a tile does.') };
        }
        if (!used[Number(oid)]) {
          return { error: diag(key, 0,
            'V6: the override key "' + oid + '" is dangling — tile id ' + oid +
            ' does not appear in this level\'s grid.') };
        }
        var ov = raw.overrides[oid];
        if (ov === null || typeof ov !== 'object' || Array.isArray(ov)) {
          return { error: diag(key, 0,
            'V6: the override for id ' + oid + ' must be a mapping of parameter names') };
        }
        var known = SM.getTile(Number(oid)).params || {};
        var knownNames = Object.keys(known);
        for (var pk in ov) {
          if (!Object.prototype.hasOwnProperty.call(ov, pk)) continue;
          if (knownNames.indexOf(pk) === -1) {
            return { error: diag(key, 0,
              'V6: tile id ' + oid + ' (' + SM.getTile(Number(oid)).name + ') has no parameter "' +
              pk + '". Known: ' + (knownNames.length ? knownNames.join(', ') : '(none)') + '.') };
          }
        }
        // The tile registry owns parameter keys and value shapes. This layer
        // only adds world/level/cell context to its actionable diagnostic.
        var parameterCheck = SM.validateTileParameters(SM.getTile(Number(oid)), ov);
        if (!parameterCheck.ok) {
          return { error: diag(key, 0, 'V6: tile id ' + oid + ' has an invalid parameter override: ' +
            parameterCheck.errors[0]) };
        }
        var overrideTile = SM.getTile(Number(oid));
        if (overrideTile.strategies &&
            overrideTile.strategies.activation === 'crateAdjacencySensor') {
          var receiverLink = ov.link === undefined ? overrideTile.params.link : ov.link;
          var receiverColour = ov.colour === undefined ? overrideTile.params.colour : ov.colour;
          if (!isInt(receiverLink) || receiverLink < 1 || receiverLink > 3) {
            return { error: diag(key, 0,
              'V6: receiver tile id ' + oid + ' link must be one of the configured links 1, 2, or 3') };
          }
          if (GAMECOLOURS.indexOf(receiverColour) === -1) {
            return { error: diag(key, 0,
              'V6: receiver tile id ' + oid + ' colour must be a supported gameplay colour: ' +
              GAMECOLOURS.join(', ')) };
          }
        }
      }
    }

    /* V13 — per-entity movement capabilities use board coordinates. Their
       accepted keys/domains come from the entity's registered profile. */
    var objectOverrideError = validateObjectOverrides(key, raw, w, h);
    if (objectOverrideError) return { error: objectOverrideError };

    /* V9 — colour overrides must be real gameplay colours. */
    var bad = checkColours(key, raw);
    if (bad) return { error: bad };

    /* V8 — a level with no colour actuator is trivially solvable. */
    if (actuators === 0) {
      diagnostics.push(diag(key, 0,
        'V8: this level contains no prism and no colour actuator, so the P === W rule can ' +
        'never bite. That is fine for a movement tutorial, but a late level like this is ' +
        'trivially solvable.'));
    }

    /* V12 — every portal needs a partner. */
    var counts = portalCounts(raw);
    var ckeys = Object.keys(counts);
    for (var pi = 0; pi < ckeys.length; pi++) {
      if (counts[ckeys[pi]] < 2 || counts[ckeys[pi]] % 2 !== 0) {
        diagnostics.push(diag(key, 0,
          'V12: portals with link ' + ckeys[pi] + ' number ' + counts[ckeys[pi]] +
          '. An unpaired portal is a dead end; portals must appear in pairs.'));
      }
    }

    /* §13 — par. */
    var par = raw.golf_score;
    if (par !== undefined && par !== null) {
      if (!isInt(par) || par < 1) {
        return { error: diag(key, 0,
          '"golf_score" (par) must be a positive integer, got ' + JSON.stringify(par)) };
      }
    }

    /* ---- build ------------------------------------------------------- */
    var level;
    try {
      level = SM.RULES.buildLevel(raw, key);
    } catch (e) {
      return { error: diag(key, 0, e.reason || e.message) };
    }

    /* V10 — solvability probe. */
    if (opts.solve !== false) {
      var res = solve(level, { maxStates: opts.maxStates, maxDepth: opts.maxDepth });
      level.solve = res;
      if (res.status === 'unsolvable') {
        diagnostics.push(diag(key, 0,
          'V10: THIS LEVEL CANNOT BE FINISHED. ' + res.explored +
          ' states were explored and none of them reached the goal.'));
      } else if (res.status === 'unknown') {
        diagnostics.push(diag(key, 0,
          'V10: solvability is UNKNOWN — the search gave up after ' + res.explored +
          ' states (budget ' + (opts.maxStates || MAX_STATES) + '). The level may still be fine.'));
      }
      if (level.par !== null && res.optimal !== null && level.par !== res.optimal) {
        diagnostics.push(diag(key, 0, level.par > res.optimal
          ? '§13: the declared par is ' + level.par + ' but the level can be finished in ' +
            res.optimal + '. Par must be the minimum number of entries.'
          : '§13: the declared par is ' + level.par + ' but the computed optimum is ' +
            res.optimal + '. Par is unreachable as written — look for a soft-lock.'));
      }
    }

    return { level: level };
  }

  function validateObjectOverrides(key, raw, width, height) {
    var overrides = raw.object_overrides;
    if (overrides === undefined || overrides === null) return null;
    if (typeof overrides !== 'object' || Array.isArray(overrides)) {
      return diag(key, 0, 'V13: "object_overrides" must be a mapping of board coordinate -> capabilities');
    }

    var coordinates = Object.keys(overrides);
    for (var i = 0; i < coordinates.length; i++) {
      var coordinate = coordinates[i];
      var match = /^([A-P])([1-9])$/.exec(coordinate);
      if (!match) {
        return diag(key, 0, 'V13: object override coordinate "' + coordinate + '" must use board notation such as C2');
      }
      var x = match[1].charCodeAt(0) - 65;
      var y = Number(match[2]) - 1;
      if (x >= width || y >= height) {
        return diag(key, 0, 'V13: object override coordinate "' + coordinate + '" is outside this board');
      }

      var gridId = raw.grid[height - 1 - y][x];
      var def = SM.getTile(gridId);
      if (!def || (def.entityRole !== 'crate' && def.entityRole !== 'target')) {
        return diag(key, 0, 'V13: object override coordinate "' + coordinate + '" does not contain a movable object');
      }

      var profile = overrides[coordinate];
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
        return diag(key, 0, 'V13: object override at ' + coordinate + ' must be a capability mapping');
      }
        var capabilityCheck = SM.validateTileCapabilities(def, profile, coordinate);
      if (!capabilityCheck.ok) return diag(key, 0, 'V13: ' + capabilityCheck.errors[0]);
    }
    return null;
  }

  function checkColours(key, raw) {
    var ids = Object.keys(raw.overrides || {});
    for (var i = 0; i < ids.length; i++) {
      var ov = raw.overrides[ids[i]];
      if (!ov || !Object.prototype.hasOwnProperty.call(ov, 'colour')) continue;
      var v = ov.colour;
      if (GAMECOLOURS.indexOf(v) === -1) {
        return diag(key, 0,
          'V9: "' + String(v) + '" is not a gameplay colour. Valid: ' + GAMECOLOURS.join(', ') +
          '. "blk" is chrome only and is never a tile state.');
      }
    }
    return null;
  }

  function portalCounts(raw) {
    var counts = {};
    for (var r = 0; r < raw.grid.length; r++) {
      for (var c = 0; c < raw.grid[r].length; c++) {
        var def = SM.getTile(raw.grid[r][c]);
        if (!def || !def.strategies || def.strategies.forcedMovement !== 'linkedPortal') continue;
        var ov = (raw.overrides && raw.overrides[raw.grid[r][c]]) || {};
        var link = ov.link !== undefined ? ov.link : def.params.link;
        var kk = String(link);
        counts[kk] = (counts[kk] || 0) + 1;
      }
    }
    return counts;
  }

  /* ---------------------------------------------------------------------- */
  /* V10 — the solvability solver                                           */
  /* Breadth-first over the real rules. Returns                              */
  /*   { status, optimal, explored, path }                                   */
  /* `optimal` is the minimum number of STROKES, which is what par counts.   */
  /* ---------------------------------------------------------------------- */

  var ACTIONS = [
    { type: 'move', dir: 'north' },
    { type: 'move', dir: 'east' },
    { type: 'move', dir: 'south' },
    { type: 'move', dir: 'west' },
    { type: 'pull', dir: 'north' },
    { type: 'pull', dir: 'east' },
    { type: 'pull', dir: 'south' },
    { type: 'pull', dir: 'west' },
    { type: 'act' }
  ];

  function routeMetrics(path) {
    var counts = { up: 0, down: 0, left: 0, right: 0 };
    for (var i = 0; i < path.length; i++) {
      var action = path[i];
      if (action.type !== 'move' && action.type !== 'pull') continue;
      if (action.dir === 'north') counts.up++;
      else if (action.dir === 'south') counts.down++;
      else if (action.dir === 'west') counts.left++;
      else if (action.dir === 'east') counts.right++;
    }
    var total = counts.up + counts.down + counts.left + counts.right;
    var mean = total / 4;
    var score = Math.pow(counts.up - mean, 2) + Math.pow(counts.down - mean, 2) +
      Math.pow(counts.left - mean, 2) + Math.pow(counts.right - mean, 2);
    return { counts: counts, score: score };
  }

  function solve(level, opts) {
    opts = opts || {};
    var maxStates = opts.maxStates || MAX_STATES;
    var maxDepth = opts.maxDepth || MAX_DEPTH;
    var maxRouteLabels = opts.maxRouteLabels || maxStates;

    var start = SM.RULES.newState(level);
    var startSig = SM.RULES.snapshotSig(start);
    var stateDepth = {};
    var labels = {};
    stateDepth[startSig] = 0;
    labels[startSig + '|0,0,0,0'] = true;

    var queue = [{ st: start, depth: 0, path: [], counts: [0, 0, 0, 0] }];
    var head = 0, explored = 0, routeLabels = 1;
    var goalDepth = null, best = null, budgetHit = false;

    function isGoal(st) {
      return st.player.x === st.goal.x && st.player.y === st.goal.y && st.P === st.W;
    }

    function countDirection(counts, action) {
      var next = counts.slice();
      if (action.type !== 'move' && action.type !== 'pull') return next;
      var index = action.dir === 'north' ? 0 : action.dir === 'south' ? 1 :
        action.dir === 'west' ? 2 : 3;
      next[index]++;
      return next;
    }

    function balanceScore(counts) {
      var total = counts[0] + counts[1] + counts[2] + counts[3];
      var mean = total / 4;
      var score = 0;
      for (var i = 0; i < 4; i++) score += Math.pow(counts[i] - mean, 2);
      return score;
    }

    function resultForBest(complete) {
      var metrics = routeMetrics(best.path);
      return {
        status: 'solvable', optimal: best.depth, explored: explored,
        routeLabels: routeLabels, path: best.path,
        routeBalance: {
          counts: metrics.counts,
          score: metrics.score,
          complete: complete
        }
      };
    }

    if (isGoal(start)) {
      best = { depth: 0, path: [], counts: [0, 0, 0, 0], score: 0 };
      return resultForBest(true);
    }

    while (head < queue.length) {
      var node = queue[head];
      /* BFS has expanded every possible predecessor at the winning depth once
         the next queued label is itself at that depth. */
      if (goalDepth !== null && node.depth >= goalDepth) break;
      if (explored >= maxStates) { budgetHit = true; break; }
      node = queue[head++];
      explored++;
      if (node.depth >= maxDepth) continue;

      for (var a = 0; a < ACTIONS.length; a++) {
        var action = ACTIONS[a];
        var next = SM.RULES.cloneState(node.st);
        var r;
        try {
          r = SM.RULES.resolveTurn(next, action);
        } catch (e) {
          continue;                 // never claim about a level we cannot simulate
        }
        if (!r.stroke) continue;

        var nextDepth = node.depth + 1;
        var nextCounts = countDirection(node.counts, action);
        var path = node.path.concat([action]);
        if (isGoal(next)) {
          var score = balanceScore(nextCounts);
          if (goalDepth === null) goalDepth = nextDepth;
          if (nextDepth === goalDepth && (!best || score < best.score)) {
            best = { depth: next.strokes, path: path, counts: nextCounts, score: score };
          }
          continue;
        }

        /* Once an optimum exists, only its predecessor layer can contain
           another equal-length solution. */
        if (goalDepth !== null && nextDepth >= goalDepth) continue;
        var k = SM.RULES.snapshotSig(next);
        if (stateDepth[k] !== undefined && stateDepth[k] < nextDepth) continue;
        if (stateDepth[k] === undefined) stateDepth[k] = nextDepth;
        var labelKey = k + '|' + nextCounts.join(',');
        if (labels[labelKey]) continue;
        if (routeLabels >= maxRouteLabels) { budgetHit = true; break; }
        labels[labelKey] = true;
        routeLabels++;
        queue.push({ st: next, depth: nextDepth, path: path, counts: nextCounts });
      }
      if (budgetHit) break;
    }

    if (best) return resultForBest(!budgetHit);
    if (budgetHit) {
      return { status: 'unknown', optimal: null, explored: explored,
        routeLabels: routeLabels, path: null,
        routeBalance: { counts: null, score: null, complete: false } };
    }
    return { status: 'unsolvable', optimal: null, explored: explored, path: null };
  }

  /* ---------------------------------------------------------------------- */
  /* Export                                                                 */
  /* ---------------------------------------------------------------------- */

  SM.LEVELS = {
    validate: validate,
    solve: solve,
    routeMetrics: routeMetrics,
    MAX_WIDTH: MAX_WIDTH,
    MAX_HEIGHT: MAX_HEIGHT,
    GAMECOLOURS: GAMECOLOURS,
    parse: function (text) { return SM.parseYAML(text); },
    load: function (text, opts) { return validate(SM.parseYAML(text), opts); },
    boot: function (opts) { return validate(SM.DEFAULT_LEVELS, opts || {}); }
  };

})(typeof window !== 'undefined' ? window : globalThis);
