// Writes the words of a post pack: headline, eyebrow, explainer, caption, hashtags.
// Formulas work with no API key; Claude (when ANTHROPIC_API_KEY is set) rewrites
// them in the brand's voice, constrained to the facts in the pack.
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { formatDate, resultLine, scoreline, sportOf } from '../../public/js/format.js';

const IST = 'Asia/Kolkata';
const num = (v) => (/^\d+$/.test(String(v ?? '').trim()) ? Number(v) : NaN);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const venueCity = (m) => m.venue?.city || (m.venue?.name || '').split(',')[0] || '';
// "Wembley Stadium" → "Wembley", "Anfield" → "Anfield"; long or sponsored names fall back to the city.
function placeName(m) {
  const short = (m.venue?.name || '').split(',')[0].replace(/\b(stadium|arena|cricket ground|ground|park|stadion|estadio)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (short && short.split(' ').length <= 2 && !/^(the|al|king|sheikh)\b/i.test(short) && short.length <= 16) return short;
  return venueCity(m);
}
const short = (t) => t?.short || t?.name || '';

function outcome(m) {
  const h = m.home || {};
  const a = m.away || {};
  const hn = num(h.score);
  const an = num(a.score);
  if (Number.isNaN(hn) || Number.isNaN(an)) {
    if (h.winner) return { winner: h, loser: a };
    if (a.winner) return { winner: a, loser: h };
    return { draw: true };
  }
  if (hn === an) return { draw: true, hn, an };
  return hn > an ? { winner: h, loser: a, hn, an, away: false } : { winner: a, loser: h, hn, an, away: true };
}

function tsbHeadline(m, type) {
  if (type === 'preview') return `${m.home?.name} vs ${m.away?.name}.`;
  if (type === 'live') {
    const d = (m.status?.detail || '').trim();
    if (m.sport === 'cricket' && d && d.split(' ').length <= 8) return `${d.replace(/[.!]+$/, '')}.`;
    const o = outcome(m);
    return o.draw ? `All square${placeName(m) ? ' at ' + placeName(m) : ''}.` : `${o.winner.name} lead.`;
  }
  if (m.sport === 'cricket') {
    const d = m.status?.detail || '';
    const w = d.match(/^(.*?)\s+won by\s+(.+?)(?:\s*\(|$)/i);
    if (w) return `${w[1].trim()} win by ${w[2].trim()}.`;
    const o = outcome(m);
    return o.winner ? `${o.winner.name} win.` : `${m.home?.name} vs ${m.away?.name}.`;
  }
  const o = outcome(m);
  if (o.draw) return `Honours even${placeName(m) ? ' at ' + placeName(m) : ''}.`;
  const city = placeName(m);
  if (o.away && city) return `${o.winner.name} take ${city}.`;
  if (!o.away && city && o.hn - o.an >= 3) return `${o.winner.name} run riot.`;
  return `${o.winner.name} beat ${o.loser.name}.`;
}

function muscHeadline(m, type, brand) {
  const utd = (t) => brand.team.aliases.test(t?.name || '');
  const us = utd(m.home) ? m.home : utd(m.away) ? m.away : null;
  const them = us === m.home ? m.away : m.home;
  if (type === 'preview') return 'MATCHDAY.';
  if (type === 'live') return 'IT’S ON.';
  if (!us) return `${scoreline(m).toUpperCase()}`;
  const o = outcome(m);
  if (o.draw) return 'ONE POINT. MORE QUESTIONS.';
  if (o.winner === us) return o.hn - o.an >= 3 ? 'STATEMENT MADE.' : 'THREE POINTS. NO DRAMA.';
  return `A NIGHT TO FORGET${them ? ' VS ' + (them.abbr || them.short || them.name).toUpperCase() : ''}.`;
}

function newsHeadline(title, brand) {
  // First clause of the headline, trimmed to six words, brand punctuation.
  let t = title.replace(/\s*[|–—-]\s*[^|–—-]+$/, '').split(/:|\?|!/)[0].trim();
  const words = t.split(/\s+/);
  if (words.length > 6) t = words.slice(0, 6).join(' ');
  t = t.replace(/[.,;]+$/, '');
  return brand.id === 'musc' ? `${t.toUpperCase()}${/\?$/.test(title) ? '?' : '.'}` : `${cap(t)}.`;
}

function accentWords(headline, type) {
  const words = headline.replace(/[.?!]/g, '').split(/\s+/);
  const picks = words.filter((w) => /^\d[\d,.]*$/.test(w) || /^(gold|silver|bronze|record|history|win|wins|take|beat|lead|final|champions?)$/i.test(w));
  return (picks.length ? picks : words.slice(-1)).map((w) => w.toLowerCase());
}

function hashtagsFor(s, brand) {
  const tags = [...(brand.hashtags[s.sport] || []), ...brand.hashtags.base];
  if (s.kind !== 'news' && s.home?.abbr && s.away?.abbr) tags.unshift(`#${s.home.abbr}${s.away.abbr}`.toUpperCase());
  const comp = (s.league?.name || '').replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter((w) => w.length > 2).slice(0, 3).join('');
  if (comp) tags.push(`#${comp}`);
  return [...new Set(tags)].slice(0, 8);
}

export function writeFormula(s, type, brand) {
  const sp = sportOf(s.sport);
  const hashtags = hashtagsFor(s, brand);
  if (s.kind === 'news') {
    const headline = newsHeadline(s.title, brand);
    const explainer = s.summary || s.title;
    const caption = brand.id === 'musc' ? `${s.title}\n\nReds, kya lagta hai? 👇\n\n${hashtags.join(' ')}` : `${s.title}${s.summary ? '\n\n' + s.summary : ''}\n\n${hashtags.join(' ')}`;
    return { headline, eyebrow: `${sp.label.toUpperCase()} · ${(s.source || 'NEWS').toUpperCase()}`, explainer, caption, hashtags, accent: type === 'medal' ? medalAccent(s.title) : 'gold', accentWords: accentWords(headline) };
  }
  const when = formatDate(s.date, IST).replace(/ GMT\+5:30$/, ' IST');
  const comp = [s.league?.name, s.note].filter(Boolean).join(' · ');
  const res = resultLine(s);
  const headline = brand.id === 'musc' ? muscHeadline(s, type, brand) : tsbHeadline(s, type);
  let explainer;
  if (type === 'preview') explainer = `${s.home?.name} vs ${s.away?.name} · ${when}${s.venue?.name ? ' · ' + s.venue.name : ''}.`;
  else if (type === 'live') explainer = `${res}${s.venue?.name ? ' at ' + s.venue.name : ''}.`;
  else {
    const goals = (s.events || []).filter((e) => /goal|try|touchdown/i.test(e.type) && e.player).slice(0, 6).map((e) => `${e.player.replace(/\s*\(.*\)/, '')} ${e.minute}`.trim());
    explainer = `${res}${s.venue?.name ? ' at ' + s.venue.name : ''}.${goals.length ? ' ' + goals.join(', ') + '.' : ''}${s.sport === 'cricket' && s.status?.detail ? ' ' + s.status.detail + '.' : ''}`;
  }
  const eyebrow = comp.toUpperCase().slice(0, 48);
  const caption =
    brand.id === 'musc'
      ? `${headline} ${explainer}\n\n${type === 'preview' ? 'Predictions? 👇' : type === 'result' ? 'Player of the match? 👇' : 'Thoughts so far? 👇'}\n\n${hashtags.join(' ')}`
      : `${headline} ${explainer}\n\n${hashtags.join(' ')}`;
  return { headline, eyebrow, explainer, caption, hashtags, accent: brand.id === 'musc' ? 'red' : type === 'result' ? 'gold' : 'none', accentWords: accentWords(headline, type) };
}

const medalAccent = (t) => (/gold/i.test(t) ? 'gold' : /silver/i.test(t) ? 'silver' : /bronze/i.test(t) ? 'bronze' : 'gold');

// ---------- Claude ----------
const Words = z.object({
  headline: z.string(),
  eyebrow: z.string(),
  explainer: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  accentWords: z.array(z.string()),
});

let client = null;
export const claudeAvailable = () => !!process.env.ANTHROPIC_API_KEY;

function facts(s, type) {
  const f = { type, sport: s.sport, competition: s.league?.name, round: s.note, status: s.status?.detail, date_ist: s.date ? formatDate(s.date, IST) : undefined, venue: s.venue };
  if (s.kind === 'news') Object.assign(f, { headline: s.title, summary: s.summary, source: s.source, published: s.published });
  else Object.assign(f, { home: { name: s.home?.name, score: s.home?.score }, away: { name: s.away?.name, score: s.away?.score }, result: resultLine(s), events: (s.events || []).slice(0, 12), stats: s.details?.stats?.slice(0, 6), innings: s.details?.innings, player_of_the_match: s.details?.playerOfTheMatch });
  return f;
}

export async function writeClaude(s, type, brand, draft) {
  if (!claudeAvailable()) return null;
  client ||= new Anthropic();
  const system = `You write Instagram posts for ${brand.name} (${brand.handle}). ${brand.voice.summary}
Headline rules: ${brand.voice.headlineRules.join('; ')}.
Headline examples from the page: ${brand.voice.examples.map((e) => `"${e}"`).join(', ')}.
Caption style: ${brand.voice.captionStyle}
Hard rules: use only the facts given; never invent a number, name, or result; keep every number exactly as given; English only (Hinglish words allowed only for ${brand.id === 'musc' ? 'this page' : 'nothing'}).
Return accentWords: the 1-3 words of the headline that should be highlighted (lowercase, as they appear).`;
  try {
    const res = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 1200,
      output_config: { effort: 'low', format: zodOutputFormat(Words) },
      system,
      messages: [{ role: 'user', content: `Facts (JSON):\n${JSON.stringify(facts(s, type))}\n\nA first draft by formula (improve it, keep it true):\n${JSON.stringify(draft)}` }],
    });
    const out = res.parsed_output;
    if (!out) return null;
    // Validator: every number in the headline/caption must appear in the facts.
    const factText = JSON.stringify(facts(s, type));
    const nums = `${out.headline} ${out.caption}`.match(/\d[\d,.]*/g) || [];
    if (nums.some((n) => !factText.includes(n.replace(/[.,]$/, '')))) return null;
    return { ...out, hashtags: out.hashtags.length ? out.hashtags.slice(0, 8) : draft.hashtags, accent: draft.accent };
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error('writer: Claude API error', e.status, e.message);
    else console.error('writer:', e?.message || e);
    return null;
  }
}

export async function writeWords(s, type, brand) {
  const draft = writeFormula(s, type, brand);
  const better = await writeClaude(s, type, brand, draft);
  return better ? { ...draft, ...better, by: 'claude' } : { ...draft, by: 'formula' };
}
