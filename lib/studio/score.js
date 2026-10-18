// Scores a newsroom story for one brand and decides what kind of post it would be.
import tsb from './brands/tsb.js';
import musc from './brands/musc.js';

export const BRANDS = { tsb, musc };
const TIER_RANK = { vimp: 3, imp: 2, low: 1 };
const HOUR = 3600_000;

export const storyText = (s) =>
  [s.league?.name, s.league?.country, s.home?.name, s.away?.name, s.name, s.note, s.title, s.summary, s.headline, s.tierReason].filter(Boolean).join(' ');

// What kind of post a story makes. Matches: by status. Headlines: by keywords.
export function postType(s, brand) {
  if (s.kind === 'news') {
    const t = `${s.title} ${s.summary || ''}`;
    if (/medal (tally|count|table|haul|standings)|medals so far|total medals|\b\d{1,3} medals\b/i.test(t)) return 'tally';
    const won = /\b(win|wins|won|clinch(?:es|ed)?|bags?|bagged|claims?|claimed|takes?|took|secures?|secured|grabs?|grabbed|settles? for|adds?|earns?|lands?)\b[^.]{0,30}\b(gold|silver|bronze|medal)/i.test(t) || /\b(gold|silver|bronze)\b[^.]{0,12}\b(medal|for india|for)\b/i.test(t) || /\b(gold|silver|bronze) medallist/i.test(t);
    if (!won && /\b(reach|reaches|reached|enter|enters|entered|storm|storms|march|marches|into|through to|advance|advances|book|books|seal|seals|qualif(?:y|ies|ied) for|assure|assures|guarantee|guarantees)\b[^.]{0,40}\b(final|semi-?finals?|last eight|quarter-?finals?|medal)\b|medal assured|assured of a medal|guaranteed? (a|india's) medal/i.test(t)) return 'stage';
    if (/\b(gold|silver|bronze)\b|medal|podium/i.test(t)) return 'medal';
    if (/record|fastest|first (indian|woman|man|ever)|youngest|oldest|milestone|\b\d{1,3},\d{3}\b|century|hundred|five-for|hat-trick/i.test(t)) return 'milestone';
    if (/"|“|says|said|opens up|reveals|reacts/i.test(t)) return 'quote';
    if (/predicted xi|confirmed xi|line-?up|starting xi/i.test(t) && brand?.id === 'musc') return 'xi';
    return 'breaking';
  }
  if (s.status?.state === 'in') return 'live';
  if (s.status?.state === 'pre') return 'preview';
  return 'result';
}

// Hours since the story happened (negative = in the future).
export function ageHours(s, now = Date.now()) {
  if (s.kind === 'news') return (now - (Date.parse(s.published) || now)) / HOUR;
  const t = Date.parse(s.date) || now;
  if (s.status?.state === 'post') return (now - t) / HOUR - (s.sport === 'cricket' ? 7 : 2);
  return (now - t) / HOUR;
}

function freshness(s, type, now) {
  const age = ageHours(s, now);
  if (type === 'preview') return age > 0 ? 0.2 : age > -6 ? 1.1 : age > -30 ? 0.9 : age > -54 ? 0.5 : 0;
  if (type === 'live') return 0.9;
  if (age < 1) return 1.2;
  if (age < 6) return 1;
  if (age < 18) return 0.6;
  if (age < 48) return 0.3;
  return 0;
}

export function scoreStory(s, brand, now = Date.now()) {
  const text = storyText(s);
  const I = brand.interests;
  if (I.never.some((re) => re.test(text))) return { score: 0, reason: 'excluded', type: postType(s, brand) };
  const type = postType(s, brand);
  const reasons = [];
  let score = TIER_RANK[s.tier] || 1;
  const sportMul = I.sports[s.sport] ?? I.sports.other ?? 0.6;
  score *= sportMul;
  let hit = false;
  for (const [re, mul] of I.boost) {
    const m = text.match(re);
    if (m) {
      score *= mul;
      hit = true;
      reasons.push(m[0]);
    }
  }
  const onTopic = I.always.some((re) => re.test(text));
  if (onTopic) score = Math.max(score, 3);
  // A single-subject page (MUSC): its team's matches, or news that at least mentions a rival.
  if (brand.team && !onTopic) score *= s.kind === 'news' && hit ? 0.6 : 0.15;
  score *= freshness(s, type, now);
  if (!brand.types.includes(type)) score *= 0.5;
  return { score: Math.round(Math.min(score, 12) * 100) / 100, reason: reasons.slice(0, 3).join(', ') || s.tierReason || '', type };
}

export function rankStories(stories, brand, now = Date.now()) {
  return stories
    .map((s) => ({ story: s, ...scoreStory(s, brand, now) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}
