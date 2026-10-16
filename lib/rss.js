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

function imageOf(block) {
  const candidates = [
    attr(block, /<media:(?:content|thumbnail)[^>]*\burl=["']([^"']+)["']/i),
    attr(block, /<enclosure[^>]*\burl=["']([^"']+)["'][^>]*type=["']image/i),
    attr(block, /<enclosure[^>]*type=["']image[^"']*["'][^>]*\burl=["']([^"']+)["']/i),
    attr(decode(block), /<img[^>]*\bsrc=["']([^"']+)["']/i),
  ];
  return decode(candidates.find(isHttp) || '');
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
  ['cricket', /\bcricket|\bipl\b|test match|\bodi\b|\bt20|wicket|\bashes\b|\bbcci\b|\bbbl\b|\bwpl\b|run[- ]chase|\binnings\b/i],
  ['racing', /formula (1|one)|\bf1\b|grand prix|verstappen|hamilton|leclerc|norris|motogp|nascar|indycar|\brally\b/i],
  ['basketball', /\bnba\b|\bwnba\b|basketball|euroleague|lakers|celtics|warriors|lebron|\bncaa\b.*hoops/i],
  ['football', /\bnfl\b|touchdown|quarterback|super bowl|college football|\bcfp\b|patriots|chiefs|cowboys/i],
  ['baseball', /\bmlb\b|baseball|world series|home run|yankees|dodgers|\balcs\b|\bnlcs\b/i],
  ['hockey', /\bnhl\b|ice hockey|stanley cup|\bhockey\b/i],
  ['tennis', /tennis|\batp\b|\bwta\b|wimbledon|roland[- ]garros|australian open|djokovic|alcaraz|sinner|sabalenka|swiatek/i],
  ['golf', /\bgolf|\bpga\b|\blpga\b|ryder cup|liv golf|the masters|\bdp world tour/i],
  ['combat', /\bufc\b|\bmma\b|boxing|boxer|heavyweight|fight night|\bwwe\b/i],
  ['rugby', /rugby|six nations|all blacks|springboks|wallabies|\bnrl\b|super league/i],
  ['soccer', /football|soccer|premier league|la ?liga|serie a|bundesliga|ligue 1|champions league|europa league|\bfifa\b|\buefa\b|\bmls\b|\bisl\b|world cup|transfer|striker|midfielder|goalkeeper|\bderby\b|arsenal|chelsea|liverpool|tottenham|man (utd|united|city)|manchester (united|city)|real madrid|barcelona|atletico|bayern|juventus|inter milan|\bpsg\b|messi|ronaldo|mbapp|haaland/i],
];

export function classify(text) {
  for (const [sport, re] of RULES) if (re.test(text)) return sport;
  return 'other';
}
