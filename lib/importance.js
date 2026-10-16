// Labels every match and headline VIMP (very important), IMP (important) or
// "Not important" so the big events stand out and can be filtered or copied together.

export const TIERS = {
  vimp: { label: 'VIMP', long: 'Very important', rank: 3 },
  imp: { label: 'IMP', long: 'Important', rank: 2 },
  low: { label: 'Not important', long: 'Not important', rank: 1 },
};

const YOUTH = /\bu-?(1[5-9]|2[0-3])\b|under[- ]?\d\d|youth|junior|reserves?\b|academy|\bii\b|\bb team\b|primavera|amateur/i;
const SEMI = /semi[- ]?finals?|quarter[- ]?finals?|play[- ]?offs?|knockout|round of 16|last 16|derby|cl[aá]ssico|cl[aá]sico|el cl/i;
const FINAL = /\bfinals?\b|grand final|decider|super bowl|world series|stanley cup final/i;
const PRACTICE = /\bfp\d\b|practice|warm[- ]?up|shootaround/i;
const QUALI = /qualif|sprint|pole/i;

// Competition rules, most specific first. [regex, tier]
const COMPETITIONS = [
  [/uefa champions league|^champions league|club world cup|fifa world cup(?!.*qualif)|world cup(?!.*qualif)|uefa euro(?!.*qualif)|european championship|copa am[eé]rica|africa cup|afcon|asian cup|gold cup|olympic/i, 'vimp'],
  [/indian premier league|\bipl\b|\bashes\b|champions trophy|world test championship|asia cup|t20 world|cricket world cup/i, 'vimp'],
  [/nba (playoffs|finals)|super bowl|nfl playoffs|afc championship|nfc championship|world series|stanley cup|mlb postseason|\balcs\b|\bnlcs\b/i, 'vimp'],
  [/australian open|roland garros|french open|wimbledon|\bus open\b|atp finals|wta finals|davis cup final|laver cup/i, 'vimp'],
  [/masters tournament|^the masters|pga championship|open championship|ryder cup|presidents cup/i, 'vimp'],
  [/six nations|rugby championship|rugby world cup|british (&|and) irish lions/i, 'vimp'],
  [/\bufc \d+/i, 'vimp'],
  [/el cl[aá]sico|north london derby|manchester derby|merseyside derby|derby della madonnina|derby d'italia|old firm|superclásico|superclasico/i, 'vimp'],

  [/^(english |spanish |italian |german |french )?(premier league|la ?liga( ea sports)?|serie a|bundesliga|ligue 1( mcdonald's)?)( england| spain| italy| germany| france)?$/i, 'imp'],
  [/eredivisie|primeira liga|s[üu]per lig|scottish premiership|belgian pro|jupiler|saudi pro|\bmls\b|liga mx|brasileir|liga profesional|libertadores|sudamericana|indian super league|\bisl\b|a-league|j1 league|k league|chinese super|efl championship|^championship( england)?$|fa cup|efl cup|carabao|copa del rey|coppa italia|dfb[- ]pokal|coupe de france|europa league|conference league|nations league|world cup qualif|euro qualif|afc champions|concacaf champions|caf champions|women's super league|nwsl|international friendl/i, 'imp'],
  [/\bnba\b|\bnfl\b|\bmlb\b|\bnhl\b|\bwnba\b|college football|ncaa|euroleague|eurocup|basketball champions/i, 'imp'],
  [/\batp\b|\bwta\b|masters|davis cup|billie jean king|united cup/i, 'imp'],
  [/pga tour|dp world tour|liv golf|lpga|european tour/i, 'imp'],
  [/formula 1|\bf1\b|grand prix|motogp|nascar|indycar|formula e|\bwec\b|le mans|dakar/i, 'imp'],
  [/\bufc\b|\bpfl\b|bellator|boxing|world title|one championship/i, 'imp'],
  [/premiership rugby|united rugby|top 14|super rugby|\bnrl\b|\bafl\b|state of origin|rugby/i, 'imp'],
  [/big bash|\bbbl\b|pakistan super league|\bpsl\b|caribbean premier|\bcpl\b|sa20|the hundred|\bwpl\b|\bilt20\b|major league cricket|\bmlc\b|vitality blast|tour of|tri-series|t20i|\bodi\b|test match|test series/i, 'imp'],
  [/pro kabaddi|\bpkl\b|hockey india league|fih pro league|world championship|world tour|grand slam|diamond league|world series|all england|thomas cup|uber cup|sudirman/i, 'imp'],
];

// Teams, players and nations that make any fixture matter.
const MARQUEE = /real madrid|barcelona|manchester (united|city)|man (utd|city)|liverpool|arsenal|chelsea|tottenham|bayern|dortmund|paris saint|\bpsg\b|juventus|inter milan|^inter$|ac milan|atl[eé]tico madrid|napoli|al[- ]nassr|al[- ]hilal|al[- ]ittihad|inter miami|galatasaray|fenerbah|benfica|porto|ajax|celtic|rangers|boca juniors|river plate|flamengo|palmeiras|lakers|warriors|celtics|knicks|heat\b|bucks|chiefs|cowboys|eagles|49ers|packers|yankees|dodgers|mumbai indians|chennai super kings|royal challengers|kolkata knight|djokovic|alcaraz|sinner|nadal|swiatek|sabalenka|gauff|verstappen|hamilton|leclerc|norris|lebron|curry|messi|ronaldo|mbapp|haaland|kohli|rohit sharma|bumrah|babar|mcilroy|scheffler|scottie|tiger woods|ohtani|mahomes|jokic|doncic|wembanyama|ohtani|bellingham|vinicius|yamal|salah|kane|lewandowski|neymar|suryakumar|gill|pant|rashid khan|starc|cummins|stokes|root|williamson|pereira|makhachev|jones|mcgregor|canelo|fury|usyk|joshua|sindhu|neeraj chopra|carlsen|gukesh/i;

const FULL_MEMBERS = /^(india|australia|england|pakistan|south africa|new zealand|sri lanka|bangladesh|west indies|afghanistan|zimbabwe|ireland)( men)?$/i;
const BIG_NATIONS = /^(brazil|argentina|france|germany|spain|italy|portugal|netherlands|belgium|england|croatia|uruguay|mexico|usa|united states|japan|south korea|morocco|senegal|colombia|india)( men)?$/i;

const up = (t) => (t === 'low' ? 'imp' : 'vimp');

export function matchTier(m) {
  const comp = `${m.league?.name || ''} ${m.league?.country || ''}`.trim();
  const ctx = `${m.name || ''} ${m.note || ''}`;
  const teams = [m.home?.name, m.away?.name].filter(Boolean);
  const all = `${comp} ${ctx} ${teams.join(' ')}`;
  let tier = 'low';
  let reason = '';

  const rule = COMPETITIONS.find(([re]) => re.test(comp) || re.test(ctx));
  if (rule) {
    tier = rule[1];
    reason = m.league?.name || '';
  }

  // Internationals in cricket and football between the big nations.
  if (m.sport === 'cricket' && teams.length === 2 && teams.every((t) => FULL_MEMBERS.test(t.trim()))) {
    tier = 'vimp';
    reason = 'international cricket';
  }
  if (m.sport === 'soccer' && teams.length === 2 && teams.every((t) => BIG_NATIONS.test(t.trim())) && tier !== 'vimp') {
    tier = 'imp';
    reason = 'international football';
  }

  // Motorsport: the race matters, practice doesn't.
  if (m.sport === 'racing') {
    if (PRACTICE.test(ctx)) {
      tier = 'low';
      reason = 'practice session';
    } else if (QUALI.test(ctx)) {
      tier = 'imp';
      reason = 'qualifying';
    } else if (/grand prix|500|cup series|race/i.test(all) && tier !== 'low') {
      tier = 'vimp';
      reason = 'race day';
    }
  }

  // Stage of the competition.
  if (SEMI.test(ctx) && tier !== 'low') {
    tier = up(tier);
    reason = `${reason ? reason + ', ' : ''}${ctx.match(SEMI)[0].toLowerCase()}`;
  } else if (FINAL.test(ctx) && tier !== 'low') {
    tier = 'vimp';
    reason = `${reason ? reason + ', ' : ''}final`;
  }

  // Marquee teams and stars.
  const star = all.match(MARQUEE);
  if (star && tier !== 'vimp') {
    tier = up(tier);
    reason = `${reason ? reason + ', ' : ''}${star[0]}`;
  }

  // Youth and reserve sides are never headline events (a youth World Cup is still worth a look).
  if (YOUTH.test(all)) {
    tier = /world cup/i.test(comp) ? 'imp' : 'low';
    reason = 'youth/reserve side';
  }
  return { tier, reason: reason || (tier === 'low' ? 'lower-tier competition' : '') };
}

// Headlines: what they're about and how strong the news is.
const BIG_NEWS = /breaking|record|historic|champion|title|final|clinch|retire|sack|fired|appoint|\bban\b|banned|suspend|dies|death|dead|transfer|signs|signing|injur|ruled out|stun|shock|thrash|comeback|hat-trick|century|five-for|knockout|\bko\b|crash|wins|beat|defeat|out of|dropped|announce|confirm|resign|arrest|scandal|lawsuit|million|billion|\brow\b|\bpole\b|podium|fastest|debut|captain/i;
const VIMP_EVENTS = /world cup|champions league|\bipl\b|olympic|grand slam|wimbledon|roland garros|australian open|\bus open\b|super bowl|nba finals|el cl[aá]sico|\bashes\b|champions trophy|asia cup|t20 world|world test championship|grand prix/i;
const IMP_EVENTS = /premier league|la ?liga|serie a|bundesliga|ligue 1|europa league|\bnba\b|\bnfl\b|\bmlb\b|\bnhl\b|\bf1\b|formula 1|\bufc\b|world championship|\bodi\b|t20i|test series|test match|\bisl\b|pro kabaddi|\batp\b|\bwta\b|masters|ryder cup|six nations/i;
const NATIONS = /\b(india|team india|pakistan|australia|england|south africa|new zealand|sri lanka|bangladesh|west indies|afghanistan|brazil|argentina|france|germany|spain|italy|portugal|netherlands|team usa|usmnt|uswnt)\b/i;
const TOP_SPORTS = new Set(['soccer', 'cricket', 'basketball', 'tennis', 'football', 'racing', 'combat', 'golf', 'hockey', 'baseball']);

export function newsTier(n) {
  const text = `${n.title || ''} ${n.summary || ''}`;
  const star = MARQUEE.test(text) || NATIONS.test(n.title || '');
  const big = VIMP_EVENTS.test(text);
  const event = big || IMP_EVENTS.test(text);
  const strong = BIG_NEWS.test(n.title || '');
  if ((star && strong) || (big && strong) || (star && big)) return 'vimp';
  if (star || event || (strong && TOP_SPORTS.has(n.sport))) return 'imp';
  return 'low';
}
