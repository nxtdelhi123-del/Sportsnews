// Draws the TSB wordmark (public/studio/brand/tsb-wordmark.png) from the shipped fonts:
//   node scripts/make-wordmark.mjs public/studio/brand/tsb-wordmark.png
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';
const F = (f) => readFileSync(new URL('../lib/studio/fonts/', import.meta.url).pathname + f);
const bod = opentype.parse(F('BodoniModa-Black.ttf').buffer.slice(0));
const mont = opentype.parse(F('Montserrat-Medium.ttf').buffer.slice(0));
const fonts = [{ name: 'Bodoni', data: F('BodoniModa-Black.ttf'), weight: 900 }, { name: 'Mont', data: F('Montserrat-Medium.ttf'), weight: 500 }];
const [out, bg = 'transparent'] = process.argv.slice(2);
const BW = 1000; // block width
const track = -0.035; // em
const width = (f, s, size, tr) => f.getAdvanceWidth(s, size) + tr * size * (s.length - 1);
const sizeFor = (f, s, w, tr) => w / (width(f, s, 1, tr));
const sSports = sizeFor(bod, 'SPORTS', BW, track);
const sBinge = sizeFor(bod, 'BINGE', BW, track);
const sThe = sSports * 0.62;
const sub = 'ONLINE MAGAZINE';
const subTr = 0.62;
const sSub = sizeFor(mont, sub, BW * 0.94, subTr);
const theW = width(bod, 'THE', sThe, track);
const t = (s, st) => ({ type: 'div', props: { style: { display: 'flex', flexShrink: 0, whiteSpace: 'nowrap', ...st }, children: s } });
const gold = 'linear-gradient(180deg, #FFE7A0 0%, #F5C451 40%, #D99A26 75%, #B87A16 100%)';
const pad = 40;
const CAP = 0.75, TOP = 0.1125; // Bodoni Moda: cap height and cap-top offset at line-height 1 (em)
const sB = sSports * 1.06, kB = BW / width(bod, 'BINGE', sB, track); // BINGE a touch larger, stretched to the block width
const gap = sSports * 0.1;
let y = pad;
const yThe = y; y += sThe * CAP + gap;
const ySp = y; y += sSports * CAP + gap;
const yBi = y; y += sB * CAP + sSub * 0.9;
const ySub = y; y += sSub * 0.8;
const H = Math.round(y + pad), W = BW + pad * 2;
const at = (x, top, child) => ({ type: 'div', props: { style: { display: 'flex', position: 'absolute', left: x, top }, children: child } });
const word = (s, size, st = {}) => t(s, { fontFamily: 'Bodoni', fontSize: size, lineHeight: 1, letterSpacing: track * size, color: '#fff', ...st });
const tree = { type: 'div', props: { style: { display: 'flex', position: 'relative', width: W, height: H, backgroundColor: bg }, children: [
  at(pad, yThe - TOP * sThe, word('THE', sThe)),
  { type: 'div', props: { style: { position: 'absolute', left: pad + theW + sThe * 0.3, top: yThe + sThe * CAP * 0.18, width: BW - theW - sThe * 0.3, height: Math.max(6, sThe * 0.045), backgroundColor: '#fff' } } },
  at(pad, ySp - TOP * sSports, word('SPORTS', sSports)),
  at(pad, yBi - TOP * sB, { type: 'div', props: { style: { display: 'flex', transform: `scaleX(${kB.toFixed(4)})`, transformOrigin: 'left' }, children: word('BINGE', sB, { backgroundImage: gold, backgroundClip: 'text', color: 'transparent' }) } }),
  at(pad, ySub - sSub * 0.2, t(sub, { fontFamily: 'Mont', fontSize: sSub, lineHeight: 1, letterSpacing: subTr * sSub, color: '#fff' })),
] } };
const svg = await satori(tree, { width: W, height: H, fonts });
writeFileSync(out, new Resvg(svg).render().asPng());
console.log(W, H, sSports.toFixed(0), sBinge.toFixed(0), sThe.toFixed(0), sSub.toFixed(0));
