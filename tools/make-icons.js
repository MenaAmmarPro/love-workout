"use strict";

/*
 * love-workout — dependency-free icon generator.
 *
 * Writes assets/apple-touch-icon.png, assets/icons/icon-192.png,
 * assets/icons/icon-512.png and assets/og-image.png using a tiny PNG encoder
 * (zlib + raw RGBA). Run once from the repo root:
 *
 *   node tools/make-icons.js
 */

const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const ty = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([ty, data])), 0);
  return Buffer.concat([len, ty, data, crc]);
}

function png(w, h, fn) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  let o = 0;
  for (let y = 0; y < h; y += 1) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < w; x += 1) {
      const p = fn(x, y, w, h);
      raw[o++] = p[0];
      raw[o++] = p[1];
      raw[o++] = p[2];
      raw[o++] = p[3];
    }
  }
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(w, 0);
  ih.writeUInt32BE(h, 4);
  ih[8] = 8; // bit depth
  ih[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ih),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// Implicit heart curve: inside when (X^2+Y^2-1)^3 - X^2*Y^3 <= 0.
function inHeart(nx, ny) {
  const X = nx * 1.3;
  const Y = ny * 1.3 + 0.1;
  return Math.pow(X * X + Y * Y - 1, 3) - X * X * Math.pow(Y, 3) <= 0;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

const BG_IN = [26, 29, 67];
const BG_OUT = [9, 11, 32];
const PINK = [255, 159, 207];
const PURPLE = [187, 166, 255];

function icon(x, y, w, h) {
  const nx = ((x + 0.5) / w) * 2 - 1;
  const ny = 1 - ((y + 0.5) / h) * 2;
  const d = Math.min(1, Math.sqrt(nx * nx + ny * ny));
  const bg = mix(BG_IN, BG_OUT, d);
  const scale = 0.72;
  if (inHeart(nx / scale, (ny + 0.02) / scale)) {
    return [PINK[0], PINK[1], PINK[2], 255];
  }
  // a couple of little stars
  const stars = [
    [0.62, -0.62, 0.06, PURPLE],
    [-0.66, 0.5, 0.05, PINK]
  ];
  for (const [sx, sy, sr, col] of stars) {
    const dx = nx - sx;
    const dy = ny - sy;
    if (dx * dx + dy * dy <= sr * sr) return [col[0], col[1], col[2], 255];
  }
  return [bg[0], bg[1], bg[2], 255];
}

function ogImage(x, y, w, h) {
  const cx = (x + 0.5) / w - 0.5;
  const cy = (y + 0.5) / h - 0.5;
  const d = Math.min(1, Math.sqrt(cx * cx + cy * cy) * 1.6);
  const bg = mix([36, 30, 74], BG_OUT, d);
  const nx = cx * 3.1;
  const ny = -cy * 3.1;
  if (inHeart(nx, ny)) return [PINK[0], PINK[1], PINK[2], 255];
  // sparkles
  const sparkles = [
    [-0.36, 0.28, 0.012, PURPLE],
    [0.34, -0.24, 0.014, PINK],
    [0.3, 0.3, 0.01, PURPLE],
    [-0.31, -0.3, 0.01, PINK]
  ];
  for (const [sx, sy, sr, col] of sparkles) {
    const dx = cx - sx;
    const dy = cy - sy;
    if (dx * dx + dy * dy <= sr * sr) return [col[0], col[1], col[2], 255];
  }
  return [bg[0], bg[1], bg[2], 255];
}

const root = path.join(__dirname, "..");
const assets = path.join(root, "assets");
fs.mkdirSync(path.join(assets, "icons"), { recursive: true });

fs.writeFileSync(path.join(assets, "apple-touch-icon.png"), png(180, 180, icon));
fs.writeFileSync(path.join(assets, "icons", "icon-192.png"), png(192, 192, icon));
fs.writeFileSync(path.join(assets, "icons", "icon-512.png"), png(512, 512, icon));
fs.writeFileSync(path.join(assets, "og-image.png"), png(1200, 630, ogImage));

console.log("love-workout icons written");
