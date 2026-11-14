// Poster templates: the registry, which layout suits a story, and the alternatives the
// desk offers. The layouts live in tsb-templates.js and musc-templates.js and follow
// docs/STYLE_SHEETS.md.
import { SIZES, hashPick } from './kit.js';
import { TSB_TEMPLATES, medalTop, medalBottom, phrase, number, quote, verdict, cream } from './tsb-templates.js';
import { MUSC_TEMPLATES, editorial, result as muscResultNew, matchday } from './musc-templates.js';
import { binge } from './binge-template.js';
import { MUSC_MATCH_TEMPLATES } from './musc-match.js';

export { SIZES };

const STOPS = { gold: 1, silver: 1, bronze: 1, red: 1 };
// "PARUL CHAUDHARY BRONZE." → top "PARUL CHAUDHARY", big "BRONZE." when the last word is the accent.
export function splitTiers(words, type) {
  const parts = (words.headline || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 5) return null;
  const last = parts[parts.length - 1];
  const key = last.toLowerCase().replace(/[.,!?’']/g, '');
  const metal = words.accent && STOPS[words.accent] ? words.accent : null;
  if (!metal || !(words.accentWords || []).includes(key) || !['medal', 'stage', 'milestone', 'breaking'].includes(type)) return null;
  if (!/^[A-Z0-9'’.,!?-]+$/.test(last)) return null;
  return { top: parts.slice(0, -1).join(' '), big: last, metal };
}

const METAL_WORD = /^(GOLD|SILVER|BRONZE)\.?$/i;
const lastWord = (w) => String(w?.headline || '').trim().split(/\s+/).pop() || '';
const firstWord = (w) => String(w?.headline || '').trim().split(/\s+/)[0] || '';
const seed = (pack) => hashPick(pack.key || pack.story?.id || pack.words?.headline || '', 1000);

// The dark poster that suits the story (kept as "tsb-dark" for older links and callers).
function tsbDarkFor(pack) {
  const w = pack.words || {};
  if (pack.type === 'quote') return 'tsb-quote';
  if (pack.type === 'breaking') return 'tsb-verdict';
  if (/^\d/.test(firstWord(w)) && pack.type !== 'medal') return 'tsb-number';
  if (METAL_WORD.test(lastWord(w))) return seed(pack) % 2 ? 'tsb-medal-bottom' : 'tsb-medal-top';
  if (pack.type === 'medal') return 'tsb-phrase';
  if (pack.type === 'stage') return seed(pack) % 2 ? 'tsb-medal-bottom' : 'tsb-medal-top';
  return 'tsb-medal-bottom';
}
const tsbDark = (pack, size) => TSB_TEMPLATES[tsbDarkFor(pack)](pack, size);
const muscResultOrNews = (pack, size) => (pack.story?.kind === 'news' ? editorial(pack, size) : muscResultNew(pack, size));

export const TEMPLATES = { 'tsb-binge': binge, ...TSB_TEMPLATES, 'tsb-dark': tsbDark, ...MUSC_TEMPLATES, ...MUSC_MATCH_TEMPLATES, 'musc-result': muscResultOrNews };

// Which template suits a pack. Variants rotate by story so neighbouring posts differ.
export function pickTemplate(pack) {
  const { brand, type, story: s = {}, words = {} } = pack;
  const k = seed(pack);
  if (brand.id === 'musc') {
    // match posts in the page's own designs (MATCHDAY, CONFIRMED XI, FULL TIME)
    if (s.kind !== 'news') {
      const ours = (s.details?.xi || []).find((x) => brand.team?.aliases?.test(x.team || ''));
      if (ours?.players?.length >= 11 && s.status?.state !== 'post') return 'musc-xi';
      return type === 'preview' ? 'musc-matchday-poster' : 'musc-fulltime';
    }
    // every news post in the page's editorial design (POCHETTINO AGREES 2½-YEAR DEAL.)
    return 'musc-editorial';
  }
  // News, medals, records and breaking stories in the page's 2026 design (the owner's
  // references of 13 Nov: INDIA. TWICE ON THE PODIUM., KNOCKED OUT WITHOUT PLAYING., INDIA BRONZE).
  if (!pack.classic && s.kind === 'news' && ['medal', 'milestone', 'stage', 'breaking'].includes(type)) return 'tsb-headline';
  // Everything else in the house post signed off on 12 Nov; the older layouts stay on the desk.
  if (type === 'tally') return words.big || words.stats?.length ? 'tsb-tally' : 'tsb-binge';
  if (!pack.classic) return 'tsb-binge';
  if (type === 'tally') return words.big || words.stats?.length ? 'tsb-tally' : 'tsb-verdict';
  if (s.kind !== 'news') return type === 'preview' ? (k % 2 ? 'tsb-preview' : 'tsb-vs') : 'tsb-cream';
  if (type === 'quote') return 'tsb-quote';
  return tsbDarkFor(pack);
}

// The layouts the desk offers for a pack, best first.
export function templateOptions(pack) {
  const best = pickTemplate(pack);
  const { brand, type, story: s = {} } = pack;
  let list;
  if (brand.id === 'musc') list = s.kind !== 'news' ? (type === 'preview' ? ['musc-matchday-poster', 'musc-xi', 'musc-matchday', 'musc-statement'] : ['musc-fulltime', 'musc-xi', 'musc-result', 'musc-statement', 'musc-head']) : ['musc-editorial', 'musc-head', 'musc-head-left', 'musc-head-slant', 'musc-statement', 'musc-signing'];
  else if (s.kind !== 'news') list = type === 'preview' ? ['tsb-preview', 'tsb-vs', 'tsb-cream'] : ['tsb-cream', 'tsb-result-photo'];
  else if (type === 'tally') list = ['tsb-tally', 'tsb-verdict', 'tsb-cover'];
  else if (type === 'quote') list = ['tsb-quote', 'tsb-verdict', 'tsb-cover'];
  else if (type === 'breaking') list = ['tsb-verdict', 'tsb-medal-bottom', 'tsb-phrase', 'tsb-cover', 'tsb-cream'];
  else list = ['tsb-medal-top', 'tsb-medal-bottom', 'tsb-phrase', 'tsb-number', 'tsb-cover'];
  if (brand.id !== 'musc') list = ['tsb-headline', 'tsb-binge', pickTemplate({ ...pack, classic: true }), ...list];
  return [...new Set([best, ...list])];
}
