/* Generates the PWA icons.
 *
 *   node tools/make-icons.js
 *
 * No dependencies: Node's zlib does the compression and the PNG chunks are
 * assembled by hand. The mark is a small fretboard with three finger dots,
 * drawn 3x oversampled and boxed down so the curves stay smooth.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');

const BG = [14, 17, 22, 255];        // #0e1116
const AMBER = [255, 179, 64, 255];   // #ffb340
const NUT = [232, 236, 242, 255];    // #e8ecf2

/* ---------- tiny canvas ---------- */

function Canvas(w, h) {
  this.w = w; this.h = h;
  this.data = new Uint8Array(w * h * 4);
}
Canvas.prototype.fill = function (c) {
  for (let i = 0; i < this.w * this.h; i++) this.data.set(c, i * 4);
};
Canvas.prototype.px = function (x, y, c) {
  if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
  this.data.set(c, (y * this.w + x) * 4);
};
Canvas.prototype.rect = function (x, y, w, h, c) {
  for (let j = Math.round(y); j < Math.round(y + h); j++)
    for (let i = Math.round(x); i < Math.round(x + w); i++) this.px(i, j, c);
};
Canvas.prototype.roundRect = function (x, y, w, h, r, c) {
  for (let j = Math.round(y); j < Math.round(y + h); j++) {
    for (let i = Math.round(x); i < Math.round(x + w); i++) {
      const dx = Math.max(x + r - i, i - (x + w - r - 1), 0);
      const dy = Math.max(y + r - j, j - (y + h - r - 1), 0);
      if (dx * dx + dy * dy <= r * r) this.px(i, j, c);
    }
  }
};
Canvas.prototype.circle = function (cx, cy, r, c) {
  for (let j = Math.round(cy - r); j <= Math.round(cy + r); j++) {
    for (let i = Math.round(cx - r); i <= Math.round(cx + r); i++) {
      const dx = i - cx, dy = j - cy;
      if (dx * dx + dy * dy <= r * r) this.px(i, j, c);
    }
  }
};
Canvas.prototype.downsample = function (factor) {
  const w = this.w / factor, h = this.h / factor;
  const out = new Canvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < factor; j++) {
        for (let i = 0; i < factor; i++) {
          const o = ((y * factor + j) * this.w + (x * factor + i)) * 4;
          r += this.data[o]; g += this.data[o + 1]; b += this.data[o + 2]; a += this.data[o + 3];
        }
      }
      const n = factor * factor;
      out.px(x, y, [r / n | 0, g / n | 0, b / n | 0, a / n | 0]);
    }
  }
  return out;
};

/* ---------- PNG ---------- */

let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  CRC_TABLE = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    CRC_TABLE[n] = c;
  }
  return CRC_TABLE;
}
function crc32(buf) {
  const t = crcTable();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(canvas) {
  const { w, h, data } = canvas;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    Buffer.from(data.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- the mark ---------- */

function drawIcon(size, maskable) {
  const S = 3;                    // oversample
  const c = new Canvas(size * S, size * S);
  const px = size * S;
  c.fill(BG);

  // Content stays inside the middle 70% so a maskable crop cannot clip it.
  const inset = maskable ? 0.30 : 0.22;
  const gx = px * inset;
  const gw = px * (1 - inset * 2);
  const strings = 4;
  const frets = 3;
  const stepX = gw / (strings - 1);
  const stepY = gw / frets;
  const gy = (px - stepY * frets) / 2 + stepY * 0.18;
  const line = Math.max(2, px * 0.011);

  // nut
  c.roundRect(gx - line, gy - line * 2.2, gw + line * 2, line * 3, line * 1.5, NUT);
  // frets
  for (let f = 1; f <= frets; f++) {
    c.rect(gx, gy + stepY * f - line / 2, gw, line, [109, 123, 141, 255]);
  }
  // strings
  for (let s = 0; s < strings; s++) {
    c.rect(gx + stepX * s - line / 2, gy, line, stepY * frets, [109, 123, 141, 255]);
  }
  // three finger dots, staggered like a real shape and kept inside the grid
  const r = px * 0.049;
  c.circle(gx + stepX * 1, gy + stepY * 1.5, r, AMBER);
  c.circle(gx + stepX * 2, gy + stepY * 1.5, r, AMBER);
  c.circle(gx + stepX * 0, gy + stepY * 2.5, r, AMBER);

  return c.downsample(S);
}

/* ---------- run ---------- */

fs.mkdirSync(OUT, { recursive: true });
const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-512-maskable.png', size: 512, maskable: true }
];
targets.forEach(t => {
  const buf = encodePNG(drawIcon(t.size, t.maskable));
  fs.writeFileSync(path.join(OUT, t.name), buf);
  console.log(`${t.name}  ${t.size}x${t.size}  ${(buf.length / 1024).toFixed(1)} KB`);
});
