/* GPL-3.0: two identity factories, one Konva composition path. */
(function (global) {
  'use strict';
  var SM = global.SM || (global.SM = {}), atlases = new Map(), previews = new Map();
  function backend() {
    if (!global.Konva || !global.document) throw new Error('Canvas2D renderer unavailable');
    return global.Konva;
  }
  function vector(d, frame) {
    var K = backend(), group = new K.Group({ listening: false, clipX: 0, clipY: 0, clipWidth: 32, clipHeight: 32 });
    function attributes(p) {
      var opts = { fill: p.fill || undefined, stroke: p.stroke || undefined, strokeWidth: p.sw || 1, listening: false };
      if (p.kind === 'rect') return Object.assign(opts, { x: p.x, y: p.y, width: p.w, height: p.h });
      if (p.kind === 'circle') return Object.assign(opts, { x: p.x, y: p.y, radius: p.r });
      return Object.assign(opts, { points: p.points, closed: p.kind === 'poly', lineJoin: 'miter' });
    }
    SM.SPRITES.commands(d, frame || 0).forEach(function (p) {
      if (p.kind === 'rect') group.add(new K.Rect(attributes(p)));
      else if (p.kind === 'circle') group.add(new K.Circle(attributes(p)));
      else group.add(new K.Line(attributes(p)));
    });
    var m = SM.SPRITES.manifest(d.key);
    if (m.animation.frames.length > 1) {
      group._smAnimation = { frames: m.animation.frames.length, frameMs: m.animation.frameMs };
      var current = frame || 0;
      group.frameIndex = function (next) {
        if (next === undefined) return current;
        if (next !== current) { current = next; var children = group.getChildren();
          SM.SPRITES.commands(d, next).forEach(function (p, index) { children[index].setAttrs(attributes(p)); });
        }
        return group;
      };
    }
    return group;
  }
  function key(d) {
    var copy = Object.assign({}, d); delete copy.id; delete copy.name; delete copy.diagnostic; delete copy.knownState; delete copy.actorId;
    return JSON.stringify(copy);
  }
  function atlas(d) {
    var id = key(d);
    if (atlases.has(id)) { var old = atlases.get(id); atlases.delete(id); atlases.set(id, old); return old; }
    var m = SM.SPRITES.manifest(d.key); SM.SPRITES.validate(m);
    var canvas = global.document.createElement('canvas'); canvas.width = m.width; canvas.height = m.height;
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D renderer unavailable');
    m.animation.frames.forEach(function (name, index) {
      var image = ctx.createImageData(32, 32); image.data.set(SM.SPRITES.raster(d, index));
      ctx.putImageData(image, m.frames[name].x, m.frames[name].y);
    });
    var result = { image: canvas, manifest: m };
    atlases.set(id, result); if (atlases.size > 128) atlases.delete(atlases.keys().next().value);
    return result;
  }
  function pixel(d) {
    var K = backend(), sheet = atlas(d), anim = [], m = sheet.manifest;
    m.animation.frames.forEach(function (name) { var f = m.frames[name]; anim.push(f.x, f.y, f.width, f.height); });
    var node = new K.Sprite({ image: sheet.image, animations: { idle: anim }, animation: 'idle', frameIndex: 0, listening: false });
    if (m.animation.frames.length > 1) node._smAnimation = { frames: m.animation.frames.length, frameMs: m.animation.frameMs };
    return node;
  }
  function node(d, identity) {
    if (identity === 'vector') return vector(d);
    if (SM.SPRITES.keys.indexOf(d.key) < 0) {
      var fallback = vector(d); fallback.setAttr('pixelFallback', true); return fallback;
    }
    try { return pixel(d); }
    catch (error) {
      if (/unavailable/.test(error.message)) throw error;
      var result = vector(d); result.setAttr('pixelFallback', true); return result;
    }
  }
  function stamp(layer, descriptors, identity, x, y, size) {
    var K = backend(), group = new K.Group({ x: x || 0, y: y || 0, scaleX: size / 32, scaleY: size / 32, listening: false });
    descriptors.forEach(function (d) { group.add(node(d, identity)); }); layer.add(group); return group;
  }
  function thumbnail(descriptors, identity, size) {
    size = size || 64;
    var cacheKey = identity + ':' + size + ':' + JSON.stringify(descriptors.map(key));
    if (previews.has(cacheKey)) return previews.get(cacheKey);
    var K = backend(), container = global.document.createElement('div');
    var stage = new K.Stage({ container: container, width: size, height: size }), layer = new K.Layer({ imageSmoothingEnabled: identity !== 'pixel', listening: false });
    try {
      stage.add(layer); stamp(layer, descriptors, identity, 0, 0, size); layer.draw();
      var url = stage.toDataURL({ pixelRatio: 1, imageSmoothingEnabled: identity !== 'pixel' });
      previews.set(cacheKey, url); if (previews.size > 256) previews.delete(previews.keys().next().value);
      return url;
    } finally { stage.destroy(); }
  }
  function mount(host, descriptors, identity, size) {
    while (host.firstChild) host.removeChild(host.firstChild);
    var img = global.document.createElement('img'); img.width = size || 64; img.height = size || 64;
    img.alt = descriptors.map(SM.VISUALS.label).join(' / '); img.style.imageRendering = identity === 'pixel' ? 'pixelated' : 'auto';
    try { img.src = thumbnail(descriptors, identity, size); host.appendChild(img); }
    catch (error) { host.textContent = error.message; host.setAttribute('role', 'status'); }
    return img;
  }
  SM.GRAPHICS = { vector: vector, node: node, stamp: stamp, thumbnail: thumbnail, mount: mount,
    cacheStats: function () { return { atlases: atlases.size, previews: previews.size }; },
    clearCaches: function () { atlases.clear(); previews.clear(); } };
})(typeof window !== 'undefined' ? window : globalThis);
