/**
 * Generates PWA image assets from the existing brand artwork in public/512.png.
 *
 * Outputs:
 *   - public/icons/maskable-512.png  (Android adaptive "maskable" icon, artwork in safe zone)
 *   - app/apple-icon.png             (180x180 full-bleed icon for iOS home screen)
 *   - app/favicon.ico                (32px + 48px favicon derived from the brand icon)
 *
 * Pure Node implementation (PNG decode/encode + bilinear resize), no image libraries.
 * Run with: npm run icons
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "public", "512.png");
const FALLBACK_BG = [15, 23, 42, 255]; // #0f172a (matches theme_color)

// ---------------------------------------------------------------- PNG decode
function decodePNG(buf) {
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Not a PNG file");
  }
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    off += 4;
    const type = buf.toString("ascii", off, off + 4);
    off += 4;
    const data = buf.subarray(off, off + len);
    off += len + 4; // skip data + CRC
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (interlace !== 0) throw new Error("Interlaced PNGs are not supported");
  if (bitDepth !== 8) throw new Error(`Unsupported bit depth: ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`Unsupported color type: ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  if (raw.length < (stride + 1) * height) throw new Error("Truncated PNG data");

  const rgba = Buffer.alloc(width * height * 4);
  const bpp = channels;
  const prev = Buffer.alloc(stride);
  const recon = Buffer.alloc(stride);
  let pos = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;

    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? recon[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) {
        v = (v + a) & 0xff;
      } else if (filter === 2) {
        v = (v + b) & 0xff;
      } else if (filter === 3) {
        v = (v + ((a + b) >> 1)) & 0xff;
      } else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      recon[i] = v;
    }

    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (colorType === 6) {
        rgba[o] = recon[x * 4];
        rgba[o + 1] = recon[x * 4 + 1];
        rgba[o + 2] = recon[x * 4 + 2];
        rgba[o + 3] = recon[x * 4 + 3];
      } else if (colorType === 2) {
        rgba[o] = recon[x * 3];
        rgba[o + 1] = recon[x * 3 + 1];
        rgba[o + 2] = recon[x * 3 + 2];
        rgba[o + 3] = 255;
      } else if (colorType === 0) {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = recon[x];
        rgba[o + 3] = 255;
      } else if (colorType === 4) {
        rgba[o] = rgba[o + 1] = rgba[o + 2] = recon[x * 2];
        rgba[o + 3] = recon[x * 2 + 1];
      }
    }

    prev.set(recon);
  }

  return { width, height, rgba };
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- resize
/** Premultiplied-alpha bilinear resize of an RGBA buffer. */
function resizeRGBA(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  const sample = (x, y) => {
    const o = (y * sw + x) * 4;
    const a = src[o + 3] / 255;
    return [src[o] * a, src[o + 1] * a, src[o + 2] * a, src[o + 3]];
  };
  const lerp = (p, q, t) => p + (q - p) * t;

  for (let dy = 0; dy < dh; dy++) {
    const fy = ((dy + 0.5) * sh) / dh - 0.5;
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = Math.min(1, Math.max(0, fy - Math.floor(fy)));
    for (let dx = 0; dx < dw; dx++) {
      const fx = ((dx + 0.5) * sw) / dw - 0.5;
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = Math.min(1, Math.max(0, fx - Math.floor(fx)));

      const p00 = sample(x0, y0);
      const p10 = sample(x1, y0);
      const p01 = sample(x0, y1);
      const p11 = sample(x1, y1);

      const o = (dy * dw + dx) * 4;
      const a = lerp(lerp(p00[3], p10[3], tx), lerp(p01[3], p11[3], tx), ty);
      out[o + 3] = Math.round(a);
      const alpha = a / 255;
      for (let i = 0; i < 3; i++) {
        const pm = lerp(lerp(p00[i], p10[i], tx), lerp(p01[i], p11[i], tx), ty);
        out[o + i] = alpha > 0.00001 ? Math.min(255, Math.round(pm / alpha)) : 0;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- composites
/** Corner pixel of an RGBA buffer. */
function pixelAt(rgba, w, x, y) {
  const o = (y * w + x) * 4;
  return [rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]];
}

/** Background color sampled from the source image corners. */
function bgColor(src, sw, sh) {
  const corners = [
    pixelAt(src, sw, 0, 0),
    pixelAt(src, sw, sw - 1, 0),
    pixelAt(src, sw, 0, sh - 1),
    pixelAt(src, sw, sw - 1, sh - 1),
  ];
  const opaque = corners.filter((c) => c[3] > 200);
  if (!opaque.length) return FALLBACK_BG;
  const sum = opaque.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]);
  return [Math.round(sum[0] / opaque.length), Math.round(sum[1] / opaque.length), Math.round(sum[2] / opaque.length), 255];
}

/** Opaque square canvas with the artwork scaled to `scale` and centered on top. */
function composeSquare(src, sw, sh, size, scale) {
  const bg = bgColor(src, sw, sh);
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    canvas[i * 4] = bg[0];
    canvas[i * 4 + 1] = bg[1];
    canvas[i * 4 + 2] = bg[2];
    canvas[i * 4 + 3] = 255;
  }
  const inner = Math.max(1, Math.round(size * scale));
  const art = resizeRGBA(src, sw, sh, inner, inner);
  const off = Math.round((size - inner) / 2);
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const s = (y * inner + x) * 4;
      const d = ((y + off) * size + (x + off)) * 4;
      const a = art[s + 3] / 255;
      if (a >= 1) {
        canvas[d] = art[s];
        canvas[d + 1] = art[s + 1];
        canvas[d + 2] = art[s + 2];
      } else if (a > 0) {
        canvas[d] = Math.round(art[s] * a + canvas[d] * (1 - a));
        canvas[d + 1] = Math.round(art[s + 1] * a + canvas[d + 1] * (1 - a));
        canvas[d + 2] = Math.round(art[s + 2] * a + canvas[d + 2] * (1 - a));
      }
    }
  }
  return canvas;
}

// ---------------------------------------------------------------- ICO encode
/** ICO container with PNG-compressed entries (supported by all modern browsers). */
function encodeICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  const blobs = [];
  let offset = 6 + 16 * entries.length;

  entries.forEach((entry, i) => {
    const o = i * 16;
    dir[o] = entry.size >= 256 ? 0 : entry.size;
    dir[o + 1] = entry.size >= 256 ? 0 : entry.size;
    dir.writeUInt16LE(1, o + 4); // planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(entry.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += entry.png.length;
    blobs.push(entry.png);
  });

  return Buffer.concat([header, dir, ...blobs]);
}

// ---------------------------------------------------------------- main
const src = decodePNG(fs.readFileSync(SRC));
console.log(`Source artwork: public/512.png (${src.width}x${src.height})`);

fs.mkdirSync(path.join(ROOT, "public", "icons"), { recursive: true });

// 1. Maskable icon: artwork at 80% (inside the launcher safe zone) on an
//    opaque background sampled from the artwork's own corners.
const maskable = composeSquare(src.rgba, src.width, src.height, 512, 0.8);
fs.writeFileSync(path.join(ROOT, "public", "icons", "maskable-512.png"), encodePNG(512, 512, maskable));

// 2. Apple touch icon: full-bleed square (iOS applies its own squircle mask).
const appleIcon = composeSquare(src.rgba, src.width, src.height, 180, 1);
fs.writeFileSync(path.join(ROOT, "app", "apple-icon.png"), encodePNG(180, 180, appleIcon));

// 3. Favicon: brand-derived 32px + 48px icons.
const favicon = encodeICO(
  [32, 48].map((size) => ({
    size,
    png: encodePNG(size, size, resizeRGBA(src.rgba, src.width, src.height, size, size)),
  })),
);
fs.writeFileSync(path.join(ROOT, "app", "favicon.ico"), favicon);

console.log("Wrote:");
console.log("  public/icons/maskable-512.png");
console.log("  app/apple-icon.png");
console.log("  app/favicon.ico");
