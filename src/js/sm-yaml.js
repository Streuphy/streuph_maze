/* =========================================================================
 * sm-yaml.js  —  STREUPH'S MAZE
 * A deliberately small, dependency-free YAML subset parser + emitter.
 *
 * Constrained YAML subset used for portable local level files.
 *
 * Supported grammar:
 *   block mappings      key: value
 *   block sequences     - item
 *   flow sequences      [a, b, c]
 *   flow mappings       { a: 1, b: 2 }
 *   scalars             int / float / true / false / null / quoted / bare
 *   comments            # to end of line (line start, or after whitespace)
 *
 * MUST reject, with a precise {line, column, message}:
 *   anchors (&a), aliases (*a), tags (!t), multi-line scalars (| >),
 *   multiple documents (--- / ...), tab indentation, duplicate keys.
 *
 * Loaded as a CLASSIC SCRIPT (never an ES module) so it works under file://.
 * ========================================================================= */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {});

  /* ---------------------------------------------------------------------- */
  /* Error                                                                   */
  /* ---------------------------------------------------------------------- */

  function YAMLError(line, column, message) {
    var e = new Error('YAML line ' + line + ', column ' + column + ': ' + message);
    e.name = 'YAMLError';
    e.line = line;
    e.column = column;
    e.reason = message;
    return e;
  }
  SM.YAMLError = YAMLError;

  /* ---------------------------------------------------------------------- */
  /* Lexing: strip comments, measure indentation, reject forbidden markers   */
  /* ---------------------------------------------------------------------- */

  function stripComment(raw) {
    var out = '';
    var quote = null;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw[i];
      if (quote) {
        out += ch;
        if (ch === quote && raw[i - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; out += ch; continue; }
      if (ch === '#' && (i === 0 || /[\s]/.test(raw[i - 1]))) break;
      out += ch;
    }
    return out;
  }

  function preprocess(text) {
    var rawLines = text.split(/\r\n|\r|\n/);
    var lines = [];
    for (var n = 0; n < rawLines.length; n++) {
      var original = rawLines[n];
      var ln = n + 1;

      if (/^\s*$/.test(original)) continue;

      var lead = original.match(/^[ \t]*/)[0];
      if (lead.indexOf('\t') !== -1) {
        throw YAMLError(ln, lead.indexOf('\t') + 1,
          'tab character in indentation is not allowed (use spaces)');
      }

      var body = stripComment(original).replace(/[ \t]+$/, '');
      if (body.trim() === '') continue;

      var indent = lead.length;
      var text2 = body.slice(indent);
      var trimmed = text2.trim();

      if (/^(---|\.\.\.)(\s|$)/.test(trimmed)) {
        throw YAMLError(ln, indent + 1,
          'multi-document streams are not supported (found "' + trimmed.split(/\s/)[0] + '")');
      }
      if (/^&[^\s]/.test(trimmed)) {
        throw YAMLError(ln, indent + 1, 'anchors are not supported');
      }
      if (/^\*[^\s]/.test(trimmed)) {
        throw YAMLError(ln, indent + 1, 'aliases are not supported');
      }
      if (/^![^\s]/.test(trimmed)) {
        throw YAMLError(ln, indent + 1, 'tags are not supported');
      }

      lines.push({ indent: indent, text: text2, line: ln });
    }
    return lines;
  }

  /* ---------------------------------------------------------------------- */
  /* Scalars                                                                 */
  /* ---------------------------------------------------------------------- */

  function unescapeDouble(s) {
    return s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, function (_, g) {
      if (g.charAt(0) === 'u') return String.fromCharCode(parseInt(g.slice(1), 16));
      return { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '/': '/' }[g] || g;
    });
  }

  function parseScalar(t, ln) {
    if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') {
      return unescapeDouble(t.slice(1, -1));
    }
    if (t.length >= 2 && t[0] === "'" && t[t.length - 1] === "'") {
      return t.slice(1, -1).replace(/''/g, "'");
    }
    if (/^(null|Null|NULL|~)$/.test(t)) return null;
    if (/^(true|True|TRUE|yes|Yes|on|On)$/.test(t)) return true;
    if (/^(false|False|FALSE|no|No|off|Off)$/.test(t)) return false;
    if (/^[+-]?\d+$/.test(t)) {
      var n = parseInt(t, 10);
      if (Number.isSafeInteger(n)) return n;
    }
    if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(t)) {
      var f = parseFloat(t);
      if (isFinite(f)) return f;
    }
    return t;
  }

  function parseKey(raw, ln) {
    var k = raw.trim();
    var v = parseScalar(k, ln);
    if (v === null) throw YAMLError(ln.line, ln.indent + 1, 'empty mapping key');
    if (typeof v === 'object') throw YAMLError(ln.line, ln.indent + 1, 'complex mapping key');
    return String(v);
  }

  /* ---------------------------------------------------------------------- */
  /* Flow collections                                                        */
  /* ---------------------------------------------------------------------- */

  function splitFlow(body, ln, col) {
    var parts = [];
    var cur = '';
    var depth = 0;
    var quote = null;
    for (var i = 0; i < body.length; i++) {
      var ch = body[i];
      if (quote) {
        cur += ch;
        if (ch === quote && body[i - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
      if (ch === '[' || ch === '{') depth++;
      if (ch === ']' || ch === '}') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (quote) throw YAMLError(ln.line, col, 'unterminated quoted string');
    if (depth !== 0) throw YAMLError(ln.line, col, 'unbalanced brackets in flow collection');
    var tail = body.replace(/[ \t]+$/, '');
    if (tail.slice(-1) !== ',') parts.push(cur);
    return parts.map(function (p) { return p.trim(); });
  }

  function findKeyColon(s) {
    var quote = null, depth = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (quote) { if (ch === quote && s[i - 1] !== '\\') quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '[' || ch === '{') depth++;
      else if (ch === ']' || ch === '}') depth--;
      else if (ch === ':' && depth === 0 &&
               (i + 1 >= s.length || /[\s]/.test(s[i + 1]))) {
        return i;
      }
    }
    return -1;
  }

  function parseInline(s, ln, col) {
    var t = s.trim();
    if (t === '') return null;
    if (t.charAt(0) === '[') {
      if (t.charAt(t.length - 1) !== ']') {
        throw YAMLError(ln.line, col, 'unterminated flow sequence (missing "]")');
      }
      return splitFlow(t.slice(1, -1), ln, col).map(function (p) {
        return p === '' ? null : parseInline(p, ln, col);
      });
    }
    if (t.charAt(0) === '{') {
      if (t.charAt(t.length - 1) !== '}') {
        throw YAMLError(ln.line, col, 'unterminated flow mapping (missing "}")');
      }
      var obj = {};
      splitFlow(t.slice(1, -1), ln, col).forEach(function (p) {
        if (p === '') return;
        var ci = findKeyColon(p);
        if (ci < 0) throw YAMLError(ln.line, col, 'expected "key: value" inside flow mapping');
        var k = parseKey(p.slice(0, ci), ln);
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          throw YAMLError(ln.line, col, 'duplicate key "' + k + '"');
        }
        obj[k] = parseInline(p.slice(ci + 1), ln, col);
      });
      return obj;
    }
    if (t === '|' || t === '>' || t.charAt(0) === '|' || t.charAt(0) === '>') {
      throw YAMLError(ln.line, col, 'multi-line scalars are not supported');
    }
    if (t.charAt(0) === '&' || t.charAt(0) === '*' || t.charAt(0) === '!') {
      throw YAMLError(ln.line, col, 'anchors, aliases and tags are not supported');
    }
    return parseScalar(t, ln);
  }

  /* ---------------------------------------------------------------------- */
  /* Block parsing                                                           */
  /* ---------------------------------------------------------------------- */

  var KEY_RE = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:]+?)[ \t]*:(?:[ \t]+(.*)|[ \t]*)$/;

  function Parser(lines) {
    this.lines = lines;
    this.i = 0;
  }
  Parser.prototype.peek = function () { return this.i < this.lines.length ? this.lines[this.i] : null; };

  Parser.prototype.parseNode = function (indent) {
    var ln = this.peek();
    if (!ln || ln.indent < indent) return null;
    if (/^-(\s|$)/.test(ln.text)) return this.parseSeq(ln.indent);
    return this.parseMap(indent);
  };

  Parser.prototype.parseMap = function (indent) {
    var obj = {};
    for (;;) {
      var ln = this.peek();
      if (!ln) break;
      if (ln.indent < indent) break;
      if (ln.indent > indent) {
        throw YAMLError(ln.line, ln.indent + 1,
          'unexpected indentation (expected ' + indent + ' spaces, found ' + ln.indent + ')');
      }
      var m = KEY_RE.exec(ln.text);
      if (!m) {
        throw YAMLError(ln.line, ln.indent + 1, 'expected "key: value", got "' + ln.text + '"');
      }
      var key = parseKey(m[1], ln);
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        throw YAMLError(ln.line, ln.indent + 1, 'duplicate key "' + key + '"');
      }
      var rest = (m[2] || '').trim();
      this.i++;
      if (rest === '') {
        var nxt = this.peek();
        obj[key] = (nxt && nxt.indent > indent) ? this.parseNode(nxt.indent) : null;
      } else {
        obj[key] = parseInline(rest, ln, ln.indent + 1);
      }
    }
    return obj;
  };

  Parser.prototype.parseSeq = function (indent) {
    var arr = [];
    for (;;) {
      var ln = this.peek();
      if (!ln) break;
      if (ln.indent < indent) break;
      if (ln.indent > indent) {
        throw YAMLError(ln.line, ln.indent + 1,
          'unexpected indentation in sequence (expected ' + indent + ', found ' + ln.indent + ')');
      }
      if (!/^-(\s|$)/.test(ln.text)) break;
      var rest = ln.text.replace(/^-\s*/, '');
      var col = ln.indent + (ln.text.length - rest.length) + 1;
      this.i++;
      if (rest === '') {
        var nxt = this.peek();
        arr.push((nxt && nxt.indent > indent) ? this.parseNode(nxt.indent) : null);
      } else if (/^[^\s[\]{}"'][^:]*[ \t]*:([ \t]|$)/.test(rest)) {
        throw YAMLError(ln.line, col,
          'inline mappings inside sequences are not supported (put the mapping on its own line)');
      } else {
        arr.push(parseInline(rest, ln, col));
      }
    }
    return arr;
  };

  /* ---------------------------------------------------------------------- */
  /* Public parse                                                            */
  /* ---------------------------------------------------------------------- */

  function parseYAML(text) {
    if (typeof text !== 'string') {
      throw YAMLError(1, 1, 'input must be a string');
    }
    var lines = preprocess(text);
    if (lines.length === 0) return {};
    var p = new Parser(lines);
    var v = p.parseNode(lines[0].indent);
    if (p.i < lines.length) {
      throw YAMLError(lines[p.i].line, lines[p.i].indent + 1, 'unexpected content after document');
    }
    return v;
  }
  SM.parseYAML = parseYAML;

  /* ---------------------------------------------------------------------- */
  /* Emitter — used by "Save levels.yaml" (N6). Preserves key order.         */
  /* ---------------------------------------------------------------------- */

  function quote(s) {
    return '"' + String(s)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') + '"';
  }

  function scalar(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return isFinite(v) ? String(v) : 'null';
    return quote(v);
  }

  function isScalar(v) {
    return v === null || v === undefined ||
           typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string';
  }

  function flow(v) {
    if (Array.isArray(v)) return '[' + v.map(flow).join(', ') + ']';
    if (v && typeof v === 'object') {
      var pairs = Object.keys(v).map(function (k) {
        return (String(+k) === k ? quote(k) : k) + ': ' + flow(v[k]);
      });
      return '{ ' + pairs.join(', ') + ' }';
    }
    return scalar(v);
  }

  function emitNode(value, indent, lines) {
    var pad = new Array(indent + 1).join(' ');
    if (Array.isArray(value)) {
      if (value.length === 0) { lines.push(pad + '[]'); return; }
      if (value.every(isScalar)) { lines.push(pad + flow(value)); return; }
      value.forEach(function (item) {
        if (isScalar(item)) { lines.push(pad + '- ' + scalar(item)); return; }
        var sub = [];
        emitNode(item, indent + 2, sub);
        lines.push(pad + '- ' + sub[0].slice(indent + 2));
        for (var i = 1; i < sub.length; i++) lines.push(sub[i]);
      });
      return;
    }
    if (value && typeof value === 'object') {
      var keys = Object.keys(value);
      if (keys.length === 0) { lines.push(pad + '{}'); return; }
      keys.forEach(function (k) {
        var v = value[k];
        var key = String(+k) === k ? quote(k) : k;
        if (isScalar(v)) {
          lines.push(pad + key + ': ' + scalar(v));
        } else if (Array.isArray(v) && v.length === 0) {
          lines.push(pad + key + ': []');
        } else if (v && typeof v === 'object' && Object.keys(v).length === 0) {
          lines.push(pad + key + ': {}');
        } else {
          lines.push(pad + key + ':');
          emitNode(v, indent + 2, lines);
        }
      });
      return;
    }
    lines.push(pad + scalar(value));
  }

  function emitYAML(doc, header) {
    var lines = [];
    if (header) {
      String(header).split('\n').forEach(function (l) {
        lines.push(l === '' ? '#' : ('# ' + l));
      });
      lines.push('');
    }
    emitNode(doc, 0, lines);
    return lines.join('\n') + '\n';
  }
  SM.emitYAML = emitYAML;

  SM.YAML_HEADER = [
    'STREUPH\'S MAZE — levels',
    '',
    'CONVENTIONS (read before editing):',
    '  * Columns are A..P left-to-right.  Rows are 1..9 bottom-to-top.',
    '  * grid[0] is the TOP row (the row with the HIGHEST row number).',
    '    Rows are therefore listed top-down.',
    '  * So the cell at grid row 0, column 0 is A<height> (top-left corner).',
    '    A cell commented "C3" is at grid row (height-3), column 2.',
    '  * Every cell is an integer tile id. See src/js/tiles.js for what each id means.',
    '  * Level keys MUST be level_1, level_2, ... contiguous and in file order',
    '    (the gating order).',
    '  * num_level MUST equal the number of level_ keys. The loader enforces it.',
    '  * golf_score is PAR: the minimum number of entries to finish.',
    '  * overrides supplies per-instance tile parameters, keyed by the integer',
    '    tile id used in this level\'s grid.'
  ].join('\n');

})(typeof window !== 'undefined' ? window : globalThis);
