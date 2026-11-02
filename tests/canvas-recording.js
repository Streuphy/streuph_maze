'use strict';
// jsdom orchestration seam, NOT pixel verification. Real appearance/export is
// checked separately in Chromium. Unknown context methods throw rather than
// silently claiming drawing support; calls and image bytes affect the journal.
const { png } = require('../scripts/report-glyph-atlas');
module.exports = function install(window) {
  const contexts = new WeakMap();
  function record(canvas, op, args) {
    canvas._recordCalls = canvas._recordCalls || [];
    if (canvas._recordCalls.length < 512) canvas._recordCalls.push(op);
    const text = op + ':' + args.map(v => v && v._recordHash !== undefined ? 'image:' + v._recordHash : typeof v === 'object' ? '' : String(v)).join(',');
    let h = canvas._recordHash || 1; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    canvas._recordHash = h;
  }
  window.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null;
    if (contexts.has(this)) return contexts.get(this);
    const canvas = this, ctx = { canvas, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1 };
    for (const method of ['save', 'restore', 'scale', 'rotate', 'translate', 'transform', 'setTransform', 'resetTransform',
      'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo',
      'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'fill', 'stroke', 'clip', 'drawImage', 'fillText', 'strokeText', 'setLineDash']) {
      ctx[method] = (...args) => record(canvas, method, args.concat([ctx.fillStyle, ctx.strokeStyle]));
    }
    ctx.createImageData = (w, h) => ({ width: w, height: h, data: new window.Uint8ClampedArray(w * h * 4) });
    ctx.putImageData = (image, x, y) => { record(canvas, 'putImageData', [x, y]); let hash = canvas._recordHash;
      for (const byte of image.data) hash = (hash * 31 + byte) >>> 0; canvas._recordHash = hash; };
    ctx.getImageData = (x, y, w, h) => { record(canvas, 'getImageData', [x, y, w, h]); const data = new window.Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < data.length; i += 4) data.set([40, 40, 40, 255], i); return { data, width: w, height: h }; };
    ctx.measureText = text => ({ width: String(text).length * 7, actualBoundingBoxAscent: 9, actualBoundingBoxDescent: 2 });
    ctx.getLineDash = () => []; ctx.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    ctx.isPointInPath = ctx.isPointInStroke = () => false;
    ctx.createLinearGradient = ctx.createRadialGradient = () => ({ addColorStop(...args) { record(canvas, 'addColorStop', args); } });
    ctx.createPattern = () => ({ setTransform(...args) { record(canvas, 'patternTransform', args); } });
    const proxy = new Proxy(ctx, { get(target, prop) {
      if (typeof prop === 'symbol' || prop in target) return target[prop];
      if (['filter', 'font', 'fontKerning', 'direction', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'textAlign',
        'textBaseline', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'globalCompositeOperation',
        'imageSmoothingEnabled', 'lineDashOffset', 'letterSpacing'].includes(prop)) return undefined;
      throw new Error('Unimplemented recording Canvas2D member: ' + String(prop));
    } });
    contexts.set(canvas, proxy); return proxy;
  };
  window.HTMLCanvasElement.prototype.toDataURL = function () {
    record(this, 'toDataURL', []);
    const width = Math.max(1, this.width), height = Math.max(1, this.height), rgba = new Uint8Array(width * height * 4), hash = this._recordHash;
    for (let i = 0; i < rgba.length; i += 4) rgba.set([hash & 255, hash >>> 8 & 255, hash >>> 16 & 255, 255], i);
    return 'data:image/png;base64,' + png(width, height, rgba).toString('base64');
  };
};
