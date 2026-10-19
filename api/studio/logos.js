import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { sendJSON } from '../../lib/http.js';
import { loadFonts, dataUri } from '../../lib/studio/render.js';
import { h, text } from '../../lib/studio/kit.js';
import { font } from '../../lib/studio/type.js';
import { flagUrl, isNation } from '../../lib/studio/flags.js';
import { COMP_LOGOS, BRAND_LOGOS } from '../../public/js/prompts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// Crests come only from the feeds' own image hosts.
const LOGO_HOSTS = /(^|\.)(espncdn\.com|sofascore\.com|thesportsdb\.com|flagcdn\.com|hscicdn\.com)$/i;
const str = (v, max = 60) => (typeof v === 'string' ? v.replace(/[^\p{L}\p{N} .,'&()\/-]/gu, '').trim().slice(0, max) : '');

async function local(file) {
  try {
    return `data:image/png;base64,${(await readFile(path.join(here, '..', '..', 'public', file))).toString('base64')}`;
  } catch {
    return null;
  }
}
function remote(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && LOGO_HOSTS.test(u.hostname) ? dataUri(u.href) : Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
}

// GET /api/studio/logos?brand=tsb&c=Asian+Games&t1=India&l1=<crest>&t2=…&l2=…
// One sheet with every real logo a post needs, labelled, to attach to an image AI with
// the prompt so it copies the logos instead of inventing them.
export default async function handler(req, res) {
  const q = req.query || {};
  const brand = q.brand === 'musc' ? 'musc' : 'tsb';
  const comp = COMP_LOGOS.find((c) => c.re.test(str(q.c, 80)));
  const teams = [1, 2].map((i) => ({ name: str(q[`t${i}`]), logo: String(q[`l${i}`] || '').slice(0, 400) })).filter((t) => t.name);
  const tiles = [];
  tiles.push({ label: 'BRAND LOGO', wide: true, src: await local(BRAND_LOGOS[brand].file) });
  if (comp) tiles.push({ label: comp.name, src: await local(comp.file) });
  for (const t of teams) {
    const src = (isNation(t.name) && (await dataUri(flagUrl(t.name, 640)))) || (await remote(t.logo));
    if (src) tiles.push({ label: t.name.toUpperCase(), src, flag: isNation(t.name) });
  }
  const W = 1080;
  const half = (W - 60 * 2 - 40) / 2;
  const tile = (t) =>
    h(
      'div',
      { flexDirection: 'column', width: t.wide ? W - 120 : half, marginBottom: 40, alignItems: 'center' },
      text(t.label, { ...font('montBold'), fontSize: 22, letterSpacing: 4, color: '#9a9a9a', marginBottom: 14 }),
      h('div', { width: '100%', height: t.wide ? 420 : 300, backgroundColor: '#2b2b2b', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, { type: 'img', props: { src: t.src, style: t.flag ? { width: 300, height: 200, objectFit: 'cover' } : { width: t.wide ? 640 : 240, height: t.wide ? 400 : 240, objectFit: 'contain' } } }),
    );
  const rows = Math.ceil((tiles.length - 1) / 2);
  const H = 60 + 120 + 476 + rows * 376 + 40;
  const tree = h(
    'div',
    { width: W, height: H, flexDirection: 'column', backgroundColor: '#1a1a1a', padding: '50px 60px 0' },
    text('LOGO SHEET — copy each logo exactly; do not draw these tiles or labels', { ...font('montBold'), fontSize: 24, color: '#fff', marginBottom: 50 }),
    h('div', { flexWrap: 'wrap', justifyContent: 'space-between', width: W - 120 }, tiles.map(tile)),
  );
  try {
    const svg = await satori(tree, { width: W, height: H, fonts: await loadFonts() });
    const png = new Resvg(svg).render().asPng();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${brand}-logos.png"`);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400');
    res.end(Buffer.from(png));
  } catch (e) {
    sendJSON(res, 500, { error: `Could not draw the logo sheet: ${e.message}` });
  }
}
