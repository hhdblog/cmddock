/**
 * media/icon.png üretir — bağımlılık kullanmaz.
 * 4x süper örnekleme ile kenar yumuşatma yapılır, sonra 128x128'e indirgenir.
 * Çalıştırma: npm run icon
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 128;
const SS = 4; // süper örnekleme
const W = SIZE * SS;

const BACKGROUND = [31, 36, 48, 255];
const ACCENT = [78, 201, 176, 255]; // VSCode turkuazı
const CORNER_RADIUS = 24 * SS;

const canvas = new Uint8Array(W * W * 4);

function blend(x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= W || y >= W) return;
  const i = (y * W + x) * 4;
  const alpha = a / 255;
  canvas[i] = Math.round(canvas[i] * (1 - alpha) + r * alpha);
  canvas[i + 1] = Math.round(canvas[i + 1] * (1 - alpha) + g * alpha);
  canvas[i + 2] = Math.round(canvas[i + 2] * (1 - alpha) + b * alpha);
  canvas[i + 3] = Math.max(canvas[i + 3], a);
}

/** Yuvarlatılmış dolu dikdörtgen. */
function roundedRect(x0, y0, x1, y1, radius, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const cx = Math.min(Math.max(x, x0 + radius), x1 - 1 - radius);
      const cy = Math.min(Math.max(y, y0 + radius), y1 - 1 - radius);
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        blend(x, y, color);
      }
    }
  }
}

/** Kalın çizgi (uçlar yuvarlak). */
function thickLine(ax, ay, bx, by, thickness, color) {
  const half = thickness / 2;
  const minX = Math.floor(Math.min(ax, bx) - half);
  const maxX = Math.ceil(Math.max(ax, bx) + half);
  const minY = Math.floor(Math.min(ay, by) - half);
  const maxY = Math.ceil(Math.max(ay, by) + half);
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let t = lengthSq === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / lengthSq;
      t = Math.min(Math.max(t, 0), 1);
      const px = ax + t * dx;
      const py = ay + t * dy;
      const ddx = x - px;
      const ddy = y - py;
      if (ddx * ddx + ddy * ddy <= half * half) {
        blend(x, y, color);
      }
    }
  }
}

const s = SS;
roundedRect(0, 0, W, W, CORNER_RADIUS, BACKGROUND);

// ">_" terminal istemi
thickLine(38 * s, 40 * s, 66 * s, 64 * s, 11 * s, ACCENT);
thickLine(66 * s, 64 * s, 38 * s, 88 * s, 11 * s, ACCENT);
roundedRect(78 * s, 80 * s, 100 * s, 91 * s, 5 * s, ACCENT);

// 128x128'e indirge (kutu ortalaması)
const out = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
        const alpha = canvas[i + 3] / 255;
        r += canvas[i] * alpha;
        g += canvas[i + 1] * alpha;
        b += canvas[i + 2] * alpha;
        a += alpha;
      }
    }
    const i = (y * SIZE + x) * 4;
    if (a > 0) {
      out[i] = Math.round(r / a);
      out[i + 1] = Math.round(g / a);
      out[i + 2] = Math.round(b / a);
    }
    out[i + 3] = Math.round((a / (SS * SS)) * 255);
  }
}

// PNG kodlama
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0; // filter: none
  out.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const target = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'media',
  'icon.png'
);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, png);
console.log(`icon üretildi: ${target} (${png.length} bayt, ${SIZE}x${SIZE})`);
