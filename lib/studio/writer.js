// Writes the words of a post pack: headline, eyebrow, name line, stats, explainer,
// caption, hashtags. Formulas work with no API key and copy the patterns on the pages'
// own grids; Claude (when ANTHROPIC_API_KEY is set) polishes them, constrained to the
// facts in the pack.
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { formatDate, resultLine, scoreline, sportOf } from '../../public/js/format.js';
import { namesIn } from './names.js';

const IST = 'Asia/Kolkata';
const num = (v) => (/^\d+$/.test(String(v ?? '').trim()) ? Number(v) : NaN);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const up = (s) => String(s || '').toUpperCase().replace(/’/g, '’');
const venueCity = (m) => m.venue?.city || (m.venue?.name || '').split(',')[0] || '';
// "Wembley Stadium" → "Wembley", "Anfield" → "Anfield"; long or sponsored names fall back to the city.
function placeName(m) {
  const short = (m.venue?.name || '').split(',')[0].replace(/\b(stadium|arena|cricket ground|ground|park|stadion|estadio)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (short && short.split(' ').length <= 2 && !/^(the|al|king|sheikh)\b/i.test(short) && short.length <= 16) return short;
  return venueCity(m);
}

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

// ---------- reading a headline ----------
// Competition eyebrows and hashtags, as the page writes them.
const COMPETITIONS = [
  [/asian para games/i, 'ASIAN PARA GAMES 2026', ['#AsianParaGames2026', '#TeamIndia']],
  [/asian games|aichi[- ]nagoya/i, 'ASIAN GAMES · AICHI-NAGOYA 2026', ['#AsianGames2026', '#AichiNagoya2026', '#TeamIndia']],
  [/paralympic/i, 'PARALYMPIC GAMES', ['#Paralympics']],
  [/olympic/i, 'OLYMPIC GAMES', ['#Olympics']],
  [/commonwealth games/i, 'COMMONWEALTH GAMES', ['#CommonwealthGames']],
  [/chess olympiad/i, 'CHESS OLYMPIAD', ['#ChessOlympiad']],
  [/nations league/i, 'UEFA NATIONS LEAGUE', ['#NationsLeague']],
  [/champions league/i, 'UEFA CHAMPIONS LEAGUE', ['#UCL', '#ChampionsLeague']],
  [/premier league(?! 2)/i, 'PREMIER LEAGUE', ['#PremierLeague', '#PL']],
  [/\bwpl\b|women'?s premier league/i, 'TATA WPL', ['#WPL', '#TATAWPL']],
  [/\bipl\b|indian premier league/i, 'TATA IPL', ['#IPL', '#TATAIPL']],
  [/world test championship|\bwtc\b/i, 'WORLD TEST CHAMPIONSHIP', ['#WTC']],
  [/t20 world cup/i, 'T20 WORLD CUP', ['#T20WorldCup']],
  [/world cup/i, 'WORLD CUP', ['#WorldCup']],
  [/pro kabaddi|\bpkl\b/i, 'PRO KABADDI LEAGUE', ['#PKL', '#ProKabaddi']],
  [/diamond league/i, 'DIAMOND LEAGUE', ['#DiamondLeague']],
  [/world (athletics |aquatics |archery |shooting )?championships?/i, 'WORLD CHAMPIONSHIPS', ['#WorldChampionships']],
  [/((?:[A-Z][a-zé]+ ){1,2})Grand Prix/, (m) => `${m[1].trim().toUpperCase()} GRAND PRIX`, ['#F1', '#Formula1']],
];
export function competitionOf(text = '') {
  for (const [re, label, tags] of COMPETITIONS) {
    const m = text.match(re);
    if (m) return { eyebrow: typeof label === 'function' ? label(m) : label, tags };
  }
  return { eyebrow: '', tags: [] };
}

// "wins bronze in women's 5000m with a national record" → "WOMEN'S 5000M"
const STOP = /\s+(?:at|in|on|for|with|as|to|after|by|from|final|finals|gold|silver|bronze|medal|medals|event|title|of|and|while|but|before|despite|against|vs)\b|[,.;:!?](?!\d)|\s[–—-]\s|$/;
export function eventOf(text = '') {
  const m = text.match(new RegExp(`\\b((?:men|women)(?:'|’)s|mixed)\\s+(.{2,40}?)(?=${STOP.source})`, 'i'));
  let ev = m ? `${m[1]} ${m[2]}` : (text.match(/\b(marathon|10,?000m|5,?000m|1500m|800m|400m hurdles|100m hurdles|110m hurdles|long jump|high jump|triple jump|pole vault|shot put|discus|javelin|hammer throw|steeplechase|decathlon|heptathlon|20km walk|50m rifle 3 positions|10m air (?:rifle|pistol)|25m pistol|recurve|compound|trap|skeet|\d{2,3}kg)\b/i) || [])[1] || '';
  ev = ev.replace(/\s+/g, ' ').replace(/(\d)\s?(m|km|kg)\b/gi, '$1$2').replace(/\b(\d)\s?[x×]\s?(\d{3})m?\b/gi, '$1×$2M').trim();
  return ev ? up(ev).replace(/’/g, "'") : '';
}

// The performance behind a medal: a time, a distance, a score.
export function markOf(text = '') {
  let m;
  if ((m = text.match(/\b(\d{1,2}:\d{2}:\d{2})\b/))) return { value: m[1], label: 'Time' };
  if ((m = text.match(/\b(\d{1,2}:\d{2}\.\d{1,2})\b/))) return { value: m[1], label: 'Time' };
  if ((m = text.match(/\b(\d{1,2}\.\d{2})\s?s(?:ec(?:onds)?)?\b/i))) return { value: `${m[1]}s`, label: 'Time' };
  if ((m = text.match(/\b(\d{1,3}\.\d{2})\s?m(?:etres?|eters?)?\b/i))) return { value: `${m[1]}m`, label: 'Distance' };
  if ((m = text.match(/\b(\d{3})\s?\/\s?(\d{3})\b/))) return { value: `${m[1]}/${m[2]}`, label: 'Score' };
  if ((m = text.match(/\b(\d{3}(?:\.\d)?)\s?(?:points|pts)\b/i))) return { value: m[1], label: 'Points' };
  if ((m = text.match(/\b(?:beat|beats|defeat(?:ed|s)?|edge[ds]?|downed|thrash(?:ed)?|outplay(?:ed)?)\b[^.]{0,40}?\b(\d{1,3})\s?[-–]\s?(\d{1,3})\b(?!\s?(?:m|kg|am|pm))/i))) return { value: `${m[1]}–${m[2]}`, label: 'Final score' };
  return null;
}

const yearsOf = (text, now) => {
  let m = text.match(/\b(\d{1,3})[- ]year[- ]old (?:\w+ ){0,2}record/i);
  if (m) return Number(m[1]);
  m = text.match(/\b(\d{1,3})[- ]years?\b(?![- ]old)/i);
  if (m && /later|back on|since|wait|drought|gap|first .{0,40}\b(in|after|for)\b|\b(in|after|for) \d{1,3}[- ]years?\b|ends?|ended|again/i.test(text)) return Number(m[1]);
  m = text.match(/\b(?:first|again)\b.{0,40}\bsince\s+((?:19|20)\d\d)\b/i);
  if (m) return new Date(now).getFullYear() - Number(m[1]);
  return 0;
};
const ageOf = (text) => Number((text.match(/\b(\d{1,2})[- ]year[- ]old\b(?! (?:\w+ ){0,2}record)/i) || [])[1]) || 0;
const metalOf = (text) => ((text.match(/\b(gold|silver|bronze)\b/i) || [])[1] || '').toLowerCase();
const INDIA = /\bindia\b|\bindian\b|\bindia's\b/i;
const COUNTRY = /\b(India|Pakistan|China|Japan|South Korea|Korea|Iran|Uzbekistan|Kazakhstan|Thailand|Malaysia|Indonesia|Bahrain|Qatar|Sri Lanka|Bangladesh|Nepal|Australia|England|Spain|France|Germany|Italy|Portugal|Brazil|Argentina|Norway|Netherlands|Belgium|USA|Kenya|Jamaica|Ethiopia)\b/;
const MEDAL_AT_SEMIS = new Set(['combat', 'wrestling', 'badminton', 'squash', 'tabletennis', 'tennis']);
const INDIAN_OUTLET = /hindu|ndtv|times of india|indian express|sportstar|cricinfo|hindustan|india today|news18|firstpost|olympics\.com|the bridge|scroll|mint|telegraph india|deccan|tribune/i;

// The one-line fact the page puts under its headlines: "India's first men's marathon
// medal in 44 years". The first clause or sentence with a number or a first.
const KICKER_WORTH = /\d|first|record|history|historic|only|never|since|years|youngest|oldest|fastest|highest|biggest|maiden|ever\b/i;
export function kickerOf(title = '', summary = '', headline = '', avoid = []) {
  const parts = [...title.split(/\s+[,:–—]\s*|,\s+|\s+-\s+/).slice(1), ...summary.split(/(?<=[.!?])\s+/)];
  let best = null;
  for (let c of parts) {
    c = c.replace(/[.!?]+$/, '').replace(/^(and|as|but|while|with)\s+/i, '').trim();
    if (c.length < 12 || c.length > 90 || !KICKER_WORTH.test(c)) continue;
    const u = c.toUpperCase();
    if (headline && (headline.toUpperCase().includes(u) || u.includes(headline.toUpperCase().replace(/[.]$/, '')))) continue;
    const score = (/first|record|history|historic|only|never|since|years|youngest|oldest|maiden|ever\b/i.test(c) ? 2 : 0) + (/\d/.test(c) ? 1 : 0);
    // A bare number that is already in the stats row says nothing new.
    if (score < 2 && avoid.some((a) => a && u.includes(String(a).toUpperCase()))) continue;
    if (!best || score > best.score) best = { u, score };
  }
  return best ? best.u.replace(/\u2019/g, "'") : '';
}

// ---------- TSB news formulas (copied from the page's grid) ----------
function tsbNews(s, type, now) {
  const title = s.title || '';
  const text = `${title}. ${s.summary || ''}`;
  const names = namesIn(title).slice(0, 2).length ? namesIn(title).slice(0, 2) : namesIn(s.summary || '').slice(0, 2);
  const india = INDIA.test(text);
  const country = india ? 'India' : (text.match(COUNTRY) || [])[1] || (['medal', 'stage', 'tally'].includes(type) && INDIAN_OUTLET.test(s.source || '') ? 'India' : '');
  const metal = metalOf(text);
  const METAL = up(metal || 'medal');
  const asian = /asian games|aichi[- ]nagoya/i.test(text);
  const mark = markOf(text);
  const years = yearsOf(text, now);
  const age = ageOf(text);
  const nr = /national record/i.test(text);
  const gr = /games record|asian games record/i.test(text);
  const wr = /world record/i.test(text);
  const firstEver = /first[- ]ever|first (indian|india's|woman|man|time|medal) (to|ever|in|at|since)|maiden/i.test(text);
  const event = eventOf(title) || eventOf(s.summary || '');
  const stats = [];
  if (mark) stats.push(mark);
  if (nr) stats.push({ value: 'NR', label: 'National record' });
  else if (gr) stats.push({ value: 'GR', label: 'Games record' });
  else if (wr) stats.push({ value: 'WR', label: 'World record' });
  let headline = '';
  let accentWords = [];
  let accent = 'gold';
  if (type === 'medal') {
    accent = metal || 'gold';
    const double = /silver and bronze|silver, bronze|bronze and silver|two medals|double podium|twice on the podium|both on the podium|1-2 finish|one-two/i.test(text) || (/\bsilver\b/i.test(text) && /\bbronze\b/i.test(text) && /\b(and|&)\b/i.test(text));
    if (/two golds|double gold|both golds|two gold medals/i.test(text)) [headline, accentWords, accent] = ['TWO GOLDS.', ['golds'], 'gold'];
    else if (double) [headline, accentWords] = ['DOUBLE PODIUM.', ['podium']];
    else if (firstEver && india) [headline, accentWords] = [`INDIA’S FIRST EVER.`, ['first', 'ever']];
    else if (years >= 5 && /[- ]year[- ]old (?:\w+ ){0,2}record|record .{0,30}(stood|since)/i.test(text)) [headline, accentWords] = [`${years} YEARS. THE RECORD FINALLY FALLS.`, ['finally', 'falls']];
    else if (years >= 5 && /later|back on|since|wait|drought|ends?|again|\b(in|after|for) \d{1,3}[- ]years?\b/i.test(text)) [headline, accentWords] = [`${years} YEARS LATER.`, ['later']];
    else if (names.length === 1) [headline, accentWords] = [`${up(names[0])} ${METAL}.`, [metal || 'medal']];
    else if (names.length >= 2) [headline, accentWords] = [`${METAL}.`, [metal || 'medal']];
    else if (nr && asian) [headline, accentWords] = ['A NATIONAL RECORD. ANOTHER ASIAN MEDAL.', ['record', 'medal']];
    else if (country) [headline, accentWords] = [`${up(country)} ${METAL}.`, [metal || 'medal']];
  } else if (type === 'milestone') {
    const ms = text.match(/\b(\d[\d,]*)\s+((?:odi|t20i?|test|international|ipl|premier league|champions league|f1)\s+)?(runs|wickets|goals|caps|appearances|matches|sixes|centuries|hundreds|wins|titles|points|medals|victories|poles|podiums|dismissals)\b/i);
    const ord = text.match(/\b(\d+(?:th|st|nd|rd))\s+(test|odi|t20i|match|cap|appearance|international|grand prix|title|win)\b/i);
    if (ms) [headline, accentWords] = [up(`${ms[1]} ${ms[2] || ''}${ms[3]}.`).replace(/\s+/g, ' '), [ms[1]]];
    else if (ord) [headline, accentWords] = [up(`${ord[1]} ${ord[2]}.`), [ord[1].toLowerCase()]];
    else if (years >= 5 && /record/i.test(text)) [headline, accentWords] = [`${years} YEARS. THE RECORD FINALLY FALLS.`, ['finally', 'falls']];
    else if (wr) [headline, accentWords] = ['WORLD RECORD.', ['record']];
    else if (gr) [headline, accentWords] = [mark ? `${mark.value}. ASIAN GAMES RECORD.` : 'ASIAN GAMES RECORD.', ['record']];
    else if (nr) [headline, accentWords] = [metal && asian ? 'A NATIONAL RECORD. ANOTHER ASIAN MEDAL.' : 'A NATIONAL RECORD.', ['record']];
    else if (age && /youngest/i.test(text)) [headline, accentWords] = [`${age} YEARS OLD. HISTORY MADE.`, ['history', 'made']];
    else if (firstEver) [headline, accentWords] = [india ? `INDIA’S FIRST EVER.` : 'HISTORY MADE.', ['first', 'ever', 'history', 'made']];
    if (ms) {
      const inn = text.match(/\b(\d{2,3})\s+(innings|matches|games|balls)\b/i);
      if (inn) stats.unshift({ value: inn[1], label: inn[2] });
    }
  } else if (type === 'stage') {
    if (/\bfinal\b/i.test(text) && !/semi/i.test(text)) [headline, accentWords] = ['INTO THE FINAL.', ['final']];
    else if (/semi/i.test(text)) [headline, accentWords] = MEDAL_AT_SEMIS.has(s.sport) ? ['MEDAL ASSURED.', ['assured']] : ['INTO THE SEMIS.', ['semis']];
    else if (/quarter|last eight|last-eight/i.test(text)) [headline, accentWords] = ['INTO THE LAST EIGHT.', ['eight']];
  } else if (type === 'tally') {
    const n = (re) => Number((text.match(re) || [])[1]) || 0;
    const total = n(/\b(\d{1,3})\s*(?:total\s+)?medals\b/i) || n(/medal (?:tally|count|haul)[^0-9]{0,40}\b(\d{1,3})\b/i) || n(/\b(?:rises?|climbs?|goes|takes?|moves?|up) to (\d{1,3})\b/i);
    const gold = n(/\b(\d{1,3})\s*golds?\b/i);
    const silver = n(/\b(\d{1,3})\s*silvers?\b/i);
    const bronze = n(/\b(\d{1,3})\s*bronzes?\b/i);
    const rank = (text.match(/\b(\d{1,2}(?:st|nd|rd|th))\b[^.]{0,20}\b(?:medal )?(?:table|tally|standings)\b/i) || [])[1] || '';
    headline = `${up(country || 'India')} MEDAL COUNT.`;
    accentWords = ['count'];
    stats.length = 0;
    if (gold || silver || bronze) stats.push({ value: String(gold), label: 'Gold' }, { value: String(silver), label: 'Silver' }, { value: String(bronze), label: 'Bronze' });
    if (rank) stats.push({ value: rank, label: 'In the table' });
    return { headline, accentWords, accent: 'gold', stats, big: total || gold + silver + bronze || 0, name: '', names, country };
  } else if (type === 'quote') {
    const q = text.match(/[“"]([^”"]{10,180})[”"]/);
    if (q) {
      const words = q[1].trim().split(/\s+/);
      headline = `“${words.slice(0, 18).join(' ')}${words.length > 18 ? '…' : ''}”`;
      accent = 'none';
    }
  }
  const nameLine = [names.length && !names.some((n) => headline.includes(up(n))) ? up(names.join(' & ')) : '', event].filter(Boolean).join(' · ');
  return { headline, accentWords, accent, stats: stats.slice(0, 3), name: nameLine, names, country, metal, asian };
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
  // First clause of the headline, cut before the first prepositional phrase, at most six words.
  let t = title.replace(/\s+[|–—-]\s+[^|–—-]+$/, '');
  const pre = t.match(/^([^:]{3,40}):\s+/);
  if (pre && pre[1].split(/\s+/).length <= 4 && !/\b(vs?|v)\b/i.test(pre[1])) t = t.slice(pre[0].length);
  t = t.split(/:|\?|!/)[0].trim();
  const clauses = t.split(/,\s+/);
  if (clauses[0].split(/\s+/).length >= 3) t = clauses[0];
  const fixture = t.match(/^([A-Z][\w.'’ ]{2,24}?) (?:vs\.?|v) ([A-Z][\w.'’ ]{2,24}?)(?=[:,]|\s(?:hockey|cricket|football|semi|final|live|preview|match|clash|tie|showdown|set|on|at|in)\b|$)/);
  if (fixture) t = `${fixture[1]} vs ${fixture[2]}`;
  let words = t.split(/\s+/);
  if (words.length > 6) {
    const cut = words.findIndex((w, i) => i >= 2 && /^(at|in|on|as|after|with|to|for|against|over|by|from|despite|amid|ahead|before|following|during)$/i.test(w));
    if (cut > 1) words = words.slice(0, cut);
    if (words.length > 6) words = words.slice(0, 6);
    while (words.length > 2 && /^(without|with|and|or|the|a|an|of|to|in|on|at|for|as|by|but|after|before|from|into)$/i.test(words[words.length - 1])) words.pop();
    t = words.join(' ');
  }
  t = t.replace(/[.,;]+$/, '');
  if (brand.id === 'musc') return `${t.toUpperCase()}${/\?$/.test(title) ? '?' : '.'}`;
  return brand.id === 'tsb' ? `${t.toUpperCase()}.` : `${cap(t)}.`;
}

function accentWords(headline) {
  const words = headline.replace(/[.?!]/g, '').split(/\s+/);
  const picks = words.filter((w) => /^\d[\d,.]*$/.test(w) || /^(gold|silver|bronze|record|history|win|wins|take|beat|lead|final|champions?|guilty|banned|verdict|pole)$/i.test(w));
  return (picks.length ? picks : words.slice(-1)).map((w) => w.toLowerCase());
}

function hashtagsFor(s, brand, extra = []) {
  const tags = [...extra, ...(brand.hashtags[s.sport] || []), ...brand.hashtags.base];
  if (s.kind !== 'news' && s.home?.abbr && s.away?.abbr) tags.unshift(`#${s.home.abbr}${s.away.abbr}`.toUpperCase());
  const comp = (s.league?.name || '').replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter((w) => w.length > 2).slice(0, 3).join('');
  if (comp) tags.push(`#${comp}`);
  return [...new Set(tags)].slice(0, 8);
}

export function writeFormula(s, type, brand, now = Date.now()) {
  const sp = sportOf(s.sport);
  if (s.kind === 'news') {
    const text = `${s.title}. ${s.summary || ''}`;
    const comp = competitionOf(text);
    const hashtags = hashtagsFor(s, brand, [...comp.tags, ...(INDIA.test(text) && !comp.tags.includes('#TeamIndia') ? ['#TeamIndia'] : [])]);
    const eyebrow = comp.eyebrow || (s.sport && s.sport !== 'other' ? sp.label.toUpperCase() : (s.source || 'NEWS').toUpperCase());
    const explainer = s.summary || s.title;
    const base = { eyebrow, explainer, hashtags };
    if (brand.id === 'musc') {
      const headline = newsHeadline(s.title, brand);
      return { ...base, headline, caption: `${s.title}\n\nReds, kya lagta hai? 👇\n\n${hashtags.join(' ')}`, accent: 'red', accentWords: accentWords(headline) };
    }
    const t = tsbNews(s, type, now);
    const headline = t.headline || newsHeadline(s.title, brand);
    const breakingRed = type === 'breaking' && /guilty|verdict|banned|ban\b|sack|charged|charges|suspend|expelled/i.test(text);
    const caption = type === 'quote' && t.headline ? `${t.headline}${t.names[0] ? ' — ' + t.names[0] : ''}\n\n${s.title}\n\n${hashtags.join(' ')}` : `${s.title}${s.summary ? '\n\n' + s.summary : ''}\n\n${hashtags.join(' ')}`;
    const kicker = kickerOf(s.title, s.summary, headline, (t.stats || []).map((x) => x.value)) || undefined;
    return { ...base, headline, caption, accent: t.headline ? t.accent : breakingRed ? 'red' : 'gold', accentWords: t.headline ? t.accentWords : accentWords(headline), name: t.name || undefined, kicker, stats: t.stats?.length ? t.stats : undefined, big: t.big || undefined, country: t.country || undefined };
  }
  const hashtags = hashtagsFor(s, brand);
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
  const eyebrow = (comp.length > 34 && s.league?.name ? s.league.name : comp).toUpperCase().slice(0, 40);
  const caption =
    brand.id === 'musc'
      ? `${headline} ${explainer}\n\n${type === 'preview' ? 'Predictions? 👇' : type === 'result' ? 'Player of the match? 👇' : 'Thoughts so far? 👇'}\n\n${hashtags.join(' ')}`
      : `${headline} ${explainer}\n\n${hashtags.join(' ')}`;
  return { headline, eyebrow, explainer, caption, hashtags, accent: brand.id === 'musc' ? 'red' : type === 'result' ? 'gold' : 'none', accentWords: accentWords(headline), country: INDIA.test(`${s.home?.name} ${s.away?.name}`) ? 'India' : undefined };
}

// ---------- Claude ----------
const Words = z.object({
  headline: z.string(),
  eyebrow: z.string(),
  explainer: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  accentWords: z.array(z.string()),
  kicker: z.string(),
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
If the draft headline already follows one of the page's patterns (NAME METAL., INDIA GOLD., DOUBLE PODIUM., N YEARS LATER., a number and a unit), keep it exactly; only rewrite headlines that read like a newspaper sentence.
Return accentWords: the 1-3 words of the headline that should be highlighted (lowercase, as they appear).
Return kicker: one line of at most 12 words with the single most striking fact that is not already the headline (a first, a gap in years, a record, a margin); empty string if the facts hold none.`;
  try {
    const res = await client.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 1200,
      output_config: { effort: 'low', format: zodOutputFormat(Words) },
      system,
      messages: [{ role: 'user', content: `Facts (JSON):\n${JSON.stringify(facts(s, type))}\n\nA first draft by formula (improve it, keep it true):\n${JSON.stringify({ headline: draft.headline, eyebrow: draft.eyebrow, explainer: draft.explainer, caption: draft.caption, hashtags: draft.hashtags, accentWords: draft.accentWords, kicker: draft.kicker || '' })}` }],
    });
    const out = res.parsed_output;
    if (!out) return null;
    // Validator: every number in the headline/caption must appear in the facts.
    const factText = JSON.stringify(facts(s, type));
    const nums = `${out.headline} ${out.caption} ${out.kicker}`.match(/\d[\d,.]*/g) || [];
    if (nums.some((n) => !factText.includes(n.replace(/[.,]$/, '')))) return null;
    return { ...out, kicker: out.kicker ? out.kicker.toUpperCase().slice(0, 120) : draft.kicker, hashtags: out.hashtags.length ? out.hashtags.slice(0, 8) : draft.hashtags, accent: draft.accent };
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
