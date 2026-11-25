// Renders the Sports Binge brand-kit examples: one filled poster per template, from the
// packs in docs/brand-kit/examples.json. Every fact in those packs was checked against a
// T1/T2 source (listed per example); placeholders are marked SAMPLE.
// Usage: node scripts/brand-kit.mjs <examples.json> <outDir> [photoDir]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { renderPack, badgeData, dataUri } from '../lib/studio/render.js';
import { flagUrl } from '../lib/studio/flags.js';
import { polishHero } from '../lib/studio/sharpen.js';
import { imageSize } from '../lib/studio/photos.js';
import tsb from '../lib/studio/brands/tsb.js';

const [, , input, outDir, photoDir = '.'] = process.argv;
if (!input || !outDir) {
  console.error('Usage: node scripts/brand-kit.mjs <examples.json> <outDir> [photoDir]');
  process.exit(1);
}
const { examples } = JSON.parse(await readFile(input, 'utf8'));
await mkdir(outDir, { recursive: true });
const badge = await badgeData(tsb);

async function hero(file) {
  if (!file) return null;
  if (/^https?:/.test(file)) return polishHero(await dataUri(file, { max: 8_000_000, timeout: 8000 }));
  const buf = await readFile(path.isAbsolute(file) ? file : path.join(photoDir, file));
  const type = /\.png$/i.test(file) ? 'png' : 'jpeg';
  return polishHero(`data:image/${type};base64,${buf.toString('base64')}`);
}
const flagOf = (name) => (name && flagUrl(name) ? dataUri(flagUrl(name, 320)) : null);

const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
for (const ex of examples) {
  if (only && !only.has(ex.id)) continue;
  const w = ex.words;
  const assets = {
    badge,
    hero: await hero(ex.photo),
    credit: w.credit || '',
    homeFlag: await flagOf(w.home?.nation),
    awayFlag: await flagOf(w.away?.nation),
  };
  // a cut-out is a transparent PNG, used as it is (no sharpening, which would flatten its alpha)
  if (ex.cutout) {
    const buf = await readFile(path.isAbsolute(ex.cutout) ? ex.cutout : path.join(photoDir, ex.cutout));
    assets.cutout = `data:image/png;base64,${buf.toString('base64')}`;
    const d = imageSize(assets.cutout);
    assets.cutoutAspect = d ? d.w / d.h : 0.8;
  }
  // series strips: one photo and one pair of flags per band
  if (w.strips) {
    assets.strips = await Promise.all((ex.strips || []).map(hero));
    assets.stripFlags = await Promise.all(w.strips.map(async (b) => [await flagOf(b.home?.nation), await flagOf(b.away?.nation)]));
  }
  const pack = { brand: tsb, type: ex.type || 'news', story: { kind: 'news', title: w.headline }, words: w, assets };
  const { png } = await renderPack(pack, { template: ex.template, size: ex.size || 'tall' });
  const file = path.join(outDir, `${ex.id}.png`);
  await writeFile(file, png);
  console.log(file);
}
