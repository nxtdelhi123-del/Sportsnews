// Gets a news photo ready for a 1080-wide post the way a photo editor would: shrink it
// with area averaging (never let the rasterizer do a rough rescale), lift contrast and
// colour slightly, and sharpen with an unsharp mask. JPEG only (what news sites serve);
// anything else is returned unchanged.
import jpeg from 'jpeg-js';

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// Area-average downscale of RGBA pixels to `ow` wide.
export function shrink(src, w, h, ow) {
  if (ow >= w) return { data: src, width: w, height: h };
  const oh = Math.max(1, Math.round((h * ow) / w));
  const out = new Uint8ClampedArray(ow * oh * 4);
  const sx = w / ow;
  const sy = h / oh;
  for (let y = 0; y < oh; y++) {
    const y0 = y * sy;
    const y1 = y0 + sy;
    for (let x = 0; x < ow; x++) {
      const x0 = x * sx;
      const x1 = x0 + sx;
      let r = 0, g = 0, b = 0, a = 0;
      for (let yy = Math.floor(y0); yy < Math.ceil(y1) && yy < h; yy++) {
        const wy = Math.min(y1, yy + 1) - Math.max(y0, yy);
        for (let xx = Math.floor(x0); xx < Math.ceil(x1) && xx < w; xx++) {
          const wgt = wy * (Math.min(x1, xx + 1) - Math.max(x0, xx));
          const i = (yy * w + xx) * 4;
          r += src[i] * wgt; g += src[i + 1] * wgt; b += src[i + 2] * wgt; a += wgt;
        }
      }
      const o = (y * ow + x) * 4;
      out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = 255;
    }
  }
  return { data: out, width: ow, height: oh };
}

// Contrast/saturation lift, then unsharp mask with a 3×3 gaussian blur.
export function enhance(px, w, h, { amount = 0.7, contrast = 1.07, saturation = 1.1 } = {}) {
  const n = w * h * 4;
  const base = new Float32Array(n);
  for (let i = 0; i < n; i += 4) {
    let r = (px[i] - 128) * contrast + 128, g = (px[i + 1] - 128) * contrast + 128, b = (px[i + 2] - 128) * contrast + 128;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    base[i] = l + (r - l) * saturation; base[i + 1] = l + (g - l) * saturation; base[i + 2] = l + (b - l) * saturation;
  }
  const out = new Uint8ClampedArray(n);
  const K = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let s = 0, k = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = Math.min(h - 1, Math.max(0, y + dy));
          for (let dx = -1; dx <= 1; dx++) {
            const xx = Math.min(w - 1, Math.max(0, x + dx));
            s += base[(yy * w + xx) * 4 + c] * K[k++];
          }
        }
        out[o + c] = clamp(base[o + c] + amount * (base[o + c] - s / 16));
      }
      out[o + 3] = 255;
    }
  }
  return out;
}

export function polishHero(uri, { width = 1080 } = {}) {
  const m = /^data:image\/jpe?g;base64,(.+)$/i.exec(uri || '');
  if (!m) return uri;
  try {
    const img = jpeg.decode(Buffer.from(m[1], 'base64'), { useTArray: true, maxMemoryUsageInMB: 512 });
    const small = shrink(img.data, img.width, img.height, width);
    const data = enhance(small.data, small.width, small.height);
    const { data: buf } = jpeg.encode({ data, width: small.width, height: small.height }, 93);
    return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return uri;
  }
}
