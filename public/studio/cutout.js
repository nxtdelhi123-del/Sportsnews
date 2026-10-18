// Cuts the athlete out of a photo in the browser: a salience model (silueta, the
// rembg author's U²-Net variant; u2netp as the small fallback) run with ONNX Runtime
// Web. Nothing leaves the phone. First use downloads the model once (44 MB) and the
// browser keeps it.
const ORT_BASE = window.ORT_BASE || 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
const MODELS = [
  { name: 'silueta', url: '/studio/models/silueta.onnx', size: 44 },
  { name: 'u2netp', url: '/studio/models/u2netp.onnx', size: 5 },
];
const S = 320;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let ortLoading = null;
function loadOrt() {
  if (window.ort) return Promise.resolve(window.ort);
  ortLoading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${ORT_BASE}ort.min.js`;
    s.onload = () => resolve(window.ort);
    s.onerror = () => reject(new Error('Could not load ONNX Runtime'));
    document.head.appendChild(s);
  });
  return ortLoading;
}

// The model file, from the browser's cache when it has it.
async function modelBytes(m, onProgress) {
  const cache = 'caches' in window ? await caches.open('studio-models').catch(() => null) : null;
  const hit = cache && (await cache.match(m.url));
  if (hit) return hit.arrayBuffer();
  const res = await fetch(m.url);
  if (!res.ok) throw new Error(`Model ${m.name}: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || m.size * 1e6;
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.(Math.min(0.99, got / total));
  }
  const buf = new Uint8Array(got);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  if (cache) cache.put(m.url, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } })).catch(() => {});
  return buf.buffer;
}

let session = null;
let sessionName = '';
export async function loadModel(onProgress) {
  if (session) return session;
  const ort = await loadOrt();
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = 1;
  let lastErr;
  for (const m of MODELS) {
    try {
      onProgress?.(0, m);
      const bytes = await modelBytes(m, (p) => onProgress?.(p, m));
      session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
      sessionName = m.name;
      onProgress?.(1, m);
      return session;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('No cut-out model available');
}
export const modelName = () => sessionName;

const canvasOf = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

// Smooth step on the mask so edges are crisp but not jagged.
const curve = (a) => {
  const t = Math.max(0, Math.min(1, (a / 255 - 0.25) / 0.5));
  return Math.round(t * t * (3 - 2 * t) * 255);
};

// Where the subject is: the salience mask at the photo's working size, and its box
// as fractions of the photo. Used for the crop, the headline placement and the cut-out.
export async function findSubject(image, { maxSide = 1600, onProgress } = {}) {
  const sess = await loadModel(onProgress);
  const ort = window.ort;
  const k = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const W = Math.round(image.naturalWidth * k);
  const H = Math.round(image.naturalHeight * k);
  const small = canvasOf(S, S);
  const sctx = small.getContext('2d');
  sctx.drawImage(image, 0, 0, S, S);
  const px = sctx.getImageData(0, 0, S, S).data;
  const input = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) for (let c = 0; c < 3; c++) input[c * S * S + i] = (px[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, S, S]) });
  const pred = out[sess.outputNames[0]].data;
  let mn = Infinity;
  let mx = -Infinity;
  for (const v of pred) {
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const maskImg = sctx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = Math.round(((pred[i] - mn) / (mx - mn || 1)) * 255);
    maskImg.data[i * 4] = maskImg.data[i * 4 + 1] = maskImg.data[i * 4 + 2] = v;
    maskImg.data[i * 4 + 3] = 255;
  }
  const maskSmall = canvasOf(S, S);
  maskSmall.getContext('2d').putImageData(maskImg, 0, 0);
  const maskBig = canvasOf(W, H);
  const mctx = maskBig.getContext('2d');
  mctx.imageSmoothingEnabled = true;
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(maskSmall, 0, 0, W, H);
  const mask = mctx.getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = 0;
  let y1 = 0;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = curve(mask[(y * W + x) * 4]);
      if (a > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        sx += x;
        sy += y;
        n++;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0 || n < W * H * 0.005) return { W, H, mask, box: null, model: sessionName };
  return { W, H, mask, box: { x: x0 / W, y: y0 / H, w: (x1 - x0) / W, h: (y1 - y0) / H, cx: sx / n / W, cy: sy / n / H, touchesBottom: y1 >= H - 2 }, model: sessionName };
}

// The photo cropped to the poster's shape with the subject placed well: its centre of
// mass lands around 38% down and the box stays inside the frame. Graded a touch.
export function cropHero(image, subject, aspect, { width = 1080, grade = true, blur = 0 } = {}) {
  const sw = image.naturalWidth;
  const sh = image.naturalHeight;
  const tw = width;
  const th = Math.round(width / aspect);
  const scale = Math.max(tw / sw, th / sh);
  const cw = tw / scale;
  const ch = th / scale;
  const box = subject?.box;
  let cx = box ? box.cx * sw : sw / 2;
  let cy = box ? Math.min(box.cy, box.y + box.h * 0.3) * sh : sh / 2;
  let x = cx - cw / 2;
  let y = cy - ch * 0.4;
  if (box) {
    // Keep the whole subject in the frame when it fits.
    const bx0 = box.x * sw;
    const bx1 = (box.x + box.w) * sw;
    const by0 = box.y * sh;
    if (bx1 - bx0 < cw) x = Math.min(Math.max(x, bx1 - cw), bx0);
    y = Math.min(y, by0 - ch * 0.06);
  }
  x = Math.max(0, Math.min(sw - cw, x));
  y = Math.max(0, Math.min(sh - ch, y));
  const c = canvasOf(tw, th);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (blur) {
    ctx.filter = `blur(${blur}px) saturate(0.85) brightness(0.72)`;
    ctx.drawImage(image, x - cw * 0.06, y - ch * 0.06, cw * 1.12, ch * 1.12, 0, 0, tw, th);
  } else {
    if (grade) ctx.filter = 'contrast(1.08) saturate(1.12) brightness(0.97)';
    ctx.drawImage(image, x, y, cw, ch, 0, 0, tw, th);
  }
  ctx.filter = 'none';
  return { hero: c.toDataURL('image/jpeg', 0.86), subjectY: box ? (cy - y) / ch : 0.5 };
}

// The subject alone, cropped to its box with a little margin, transparent elsewhere.
export function cutoutOf(image, subject) {
  const { W, H, mask, box } = subject;
  if (!box) throw new Error('No subject found in the photo');
  const full = canvasOf(W, H);
  const fctx = full.getContext('2d');
  fctx.drawImage(image, 0, 0, W, H);
  const img = fctx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) img.data[i * 4 + 3] = curve(mask[i * 4]);
  const m = Math.round(Math.max(W, H) * 0.03);
  const cx0 = Math.max(0, Math.round(box.x * W) - m);
  const cy0 = Math.max(0, Math.round(box.y * H) - m);
  const cx1 = Math.min(W, Math.round((box.x + box.w) * W) + m);
  const cy1 = box.touchesBottom ? H : Math.min(H, Math.round((box.y + box.h) * H) + m);
  const tmp = canvasOf(W, H);
  tmp.getContext('2d').putImageData(img, 0, 0);
  const cut = canvasOf(cx1 - cx0, cy1 - cy0);
  cut.getContext('2d').drawImage(tmp, cx0, cy0, cx1 - cx0, cy1 - cy0, 0, 0, cx1 - cx0, cy1 - cy0);
  return { cutout: cut.toDataURL('image/png'), aspect: (cx1 - cx0) / (cy1 - cy0) };
}

// Kept for callers that want everything in one go.
export async function cutOut(image, { maxSide = 1600, onProgress } = {}) {
  const subject = await findSubject(image, { maxSide, onProgress });
  const { cutout, aspect } = cutoutOf(image, subject);
  const { hero } = cropHero(image, subject, image.naturalWidth / image.naturalHeight, { width: Math.min(1600, image.naturalWidth), blur: 22 });
  return { hero, cutout, box: { ...subject.box, w: aspect, h: 1 }, model: subject.model };
}
