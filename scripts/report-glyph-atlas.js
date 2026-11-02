#!/usr/bin/env node
'use strict';
// Original pixel grammar → deterministic PNG contact sheet. No native canvas.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), zlib = require('node:zlib');
function png(width, height, rgba) {
  function crc(bytes) { let c = -1; for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = c >>> 1 ^ (c & 1 ? 0xedb88320 : 0); } return (c ^ -1) >>> 0; }
  function chunk(type, data) { const tag = Buffer.from(type), out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length); tag.copy(out, 4); data.copy(out, 8); out.writeUInt32BE(crc(Buffer.concat([tag, data])), out.length - 4); return out; }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const scan = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(scan, y * (width * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(scan)), chunk('IEND', Buffer.alloc(0))]);
}
function main() {
  const root = path.join(__dirname, '..');
  for (const f of ['tiles', 'sm-visuals', 'sm-sprites']) vm.runInThisContext(fs.readFileSync(path.join(root, 'src/js/' + f + '.js'), 'utf8'));
  const definitions = Object.values(SM.TILES).concat(SM.DOT_DEFINITION), scale = 3, cols = 9, cell = 36 * scale;
  const width = cols * cell, height = Math.ceil(definitions.length / cols) * cell, rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) rgba.set([20, 25, 35, 255], i);
  definitions.forEach((inst, index) => {
    const d = SM.VISUALS.describe(inst, { P: 'red', W: 'blu', active: true, solid: true });
    const pixels = SM.SPRITES.raster(d, 0), ox = index % cols * cell, oy = Math.floor(index / cols) * cell;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const from = (y * 32 + x) * 4, to = ((oy + y * scale) * width + ox + x * scale + sx + sy * width) * 4;
      if (pixels[from + 3]) rgba.set(pixels.subarray(from, from + 4), to);
    }
  });
  const target = process.argv[2]; if (!target) throw new Error('Usage: node scripts/report-glyph-atlas.js <output.png>');
  fs.writeFileSync(target, png(width, height, rgba));
  console.log(JSON.stringify({ output: target, width, height, definitions: definitions.map(d => ({ id: d.id === undefined ? 'dot' : d.id, name: d.name })) }, null, 2));
}
if (require.main === module) main();
module.exports = { png };
