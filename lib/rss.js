// Dependency-free RSS 2.0 / Atom parser — good enough for news feeds.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function decode(s = '') {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const stripCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

export function clean(s = '') {
  const once = decode(stripCdata(s)).replace(/<[^>]*>/g, ' ');
  return decode(once).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? stripCdata(m[1]).trim() : '';
}

const attr = (block, re) => block.match(re)?.[1] || '';
const isHttp = (u) => /^https?:\/\//i.test(u);

// BBC serves the same picture at any of its standard widths.
export const upsize = (u) => u.replace(/(ichef\.bbci\.co\.uk\/[^?]*\/)(\d{2,4})(\/)/, (m, a, w, b) => (Number(w) < 976 ? `${a}976${b}` : m)).replace(/(a\.espncdn\.com\/photo\/[^?]*_)(\d+x\d+)(_)/, '$11296x729$3');

function imageOf(block) {
  // Several media:content tags may be offered; prefer the widest.
  const media = [...block.matchAll(/<media:(?:content|thumbnail)\b([^>]*)>/gi)]
    .map((m) => ({ url: attr(m[1], /\burl=["']([^"']+)["']/i), width: Number(attr(m[1], /\bwidth=["'](\d+)["']/i)) || 0 }))
    .filter((m) => isHttp(m.url))
    .sort((a, b) => b.width - a.width);
  const candidates = [
    media[0]?.url,
    attr(block, /<enclosure[^>]*\burl=["']([^"']+)["'][^>]*type=["']image/i),
    attr(block, /<enclosure[^>]*type=["']image[^"']*["'][^>]*\burl=["']([^"']+)["']/i),
    attr(decode(block), /<img[^>]*\bsrc=["']([^"']+)["']/i),
  ];
  return upsize(decode(candidates.find(isHttp) || ''));
}

export function parseFeed(xml = '') {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  const items = [];
  for (const b of blocks) {
    const title = clean(tag(b, 'title'));
    let link = decode(tag(b, 'link'));
    if (!isHttp(link)) link = decode(attr(b, /<link[^>]*\bhref=["']([^"']+)["']/i));
    if (!isHttp(link)) link = decode(tag(b, 'guid'));
    if (!title || !isHttp(link)) continue;
    const date = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date');
    const t = Date.parse(date);
    items.push({
      title,
      link,
      summary: clean(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 280),
      published: Number.isFinite(t) ? new Date(t).toISOString() : null,
      image: imageOf(b),
      origin: clean(tag(b, 'source')),
    });
  }
  return items;
}

const RULES = [
  ['kabaddi', /kabaddi|\bpkl\b/i],
  ['chess', /\bchess\b|grandmaster|\bfide\b|magnus carlsen|gukesh/i],
  ['badminton', /badminton|\bbwf\b|sindhu|lakshya sen|satwik/i],
  ['tabletennis', /table tennis|\bwtt\b|ping pong/i],
  ['esports', /esports|e-sports|valorant|\bcs2\b|league of legends|\bdota\b|\bbgmi\b/i],
  ['athletics', /athletics|diamond league|marathon|sprinter|neeraj chopra|javelin|\b100m\b|world athletics|steeplechase|long jump|high jump|triple jump|pole vault|shot put|discus|hammer throw|hurdles|\b4\s?[x×]\s?[14]00m?\b|\b(?:200|400|800|1500|5000|10,?000)m\b|decathlon|heptathlon|race walk/i],
  ['shooting', /\b(?:air )?(?:rifle|pistol)\b|\bskeet\b|\bissf\b|\bnrai\b|shoot-off|shooting (?:world cup|range|final|championship|federation|team|event|gold|silver|bronze|medal)|\bshooters?\b(?!'?s? guard)|\btrap (?:final|team|event|gold|silver|bronze|shooter|qualification)/i],
  ['archery', /archery|archer\b|recurve|compound\b/i],
  ['squash', /\bsquash\b|\bpsa\b/i],
  ['combat', /\bwwe\b|\baew\b|wrestlemania|royal rumble/i],
  ['wrestling', /wrestl|\bkurash\b|greco-roman|freestyle \d+kg/i],
  ['weightlifting', /weightlift|\bclean and jerk\b|\bsnatch\b|powerlift/i],
  ['swimming', /\bswimm|freestyle relay|butterfly|backstroke|breaststroke|aquatics/i],
  ['cycling', /cycling|tour de france|giro d|vuelta|cyclist/i],
  ['fieldhockey', /field hockey|\bfih\b|hockey india|hockey india league|pro league hockey|hockey.*\b(india|pakistan|asian games|olympic|asia cup|azlan shah|hockey world cup|harmanpreet|penalty corner)\b|\b(india|pakistan|asian games|olympic|women'?s|men'?s)\b.*\bhockey\b/i],
  ['darts', /\bdarts\b|\bpdc\b/i],
  ['snooker', /snooker|ronnie o'sullivan|\bwst\b/i],
  ['volleyball', /volleyball/i],
  ['handball', /handball/i],
  ['cricket', /\bcricket|\bipl\b|test match|\bodi\b|\bt20|wicket|\bashes\b|\bbcci\b|\bbbl\b|\bwpl\b|run[- ]chase|\binnings\b/i],
  ['racing', /formula (1|one)|\bf1\b|grand prix|verstappen|hamilton|leclerc|norris|motogp|nascar|indycar|\brally\b/i],
  ['basketball', /\bnba\b|\bwnba\b|basketball|euroleague|lakers|celtics|warriors|lebron|\bncaa\b.*hoops/i],
  ['football', /\bnfl\b|touchdown|quarterback|super bowl|college football|\bcfp\b|patriots|chiefs|cowboys/i],
  ['baseball', /\bmlb\b|baseball|world series|home run|yankees|dodgers|\balcs\b|\bnlcs\b/i],
  ['hockey', /\bnhl\b|ice hockey|stanley cup|\bhockey\b/i],
  ['tennis', /tennis|\batp\b|\bwta\b|wimbledon|roland[- ]garros|australian open|djokovic|alcaraz|sinner|sabalenka|swiatek/i],
  ['golf', /\bgolf|\bpga\b|\blpga\b|ryder cup|liv golf|the masters|\bdp world tour/i],
  ['combat', /\bufc\b|\bmma\b|boxing|boxer|heavyweight|fight night|\bwwe\b|\bjudo\b|taekwondo|\bkarate\b|\bwushu\b/i],
  ['rugby', /rugby|six nations|all blacks|springboks|wallabies|\bnrl\b|super league/i],
  ['soccer', /football|soccer|premier league|la ?liga|serie a|bundesliga|ligue 1|champions league|europa league|\bfifa\b|\buefa\b|\bmls\b|\bisl\b|world cup|transfer|striker|midfielder|goalkeeper|\bderby\b|arsenal|chelsea|liverpool|tottenham|man (utd|united|city)|manchester (united|city)|real madrid|barcelona|atletico|bayern|juventus|inter milan|\bpsg\b|messi|ronaldo|mbapp|haaland/i],
];

export function classify(text) {
  for (const [sport, re] of RULES) if (re.test(text)) return sport;
  return 'other';
}
