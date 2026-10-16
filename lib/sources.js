// Every upstream the newsroom pulls from. All are free and keyless.

// ESPN public scoreboard API: site.api.espn.com/apis/site/v2/sports/{path}/scoreboard
// `range: true` asks for yesterday→tomorrow so every time zone sees its matches.
export const ESPN_LEAGUES = [
  // Football (soccer)
  { path: 'soccer/eng.1', name: 'Premier League', sport: 'soccer', range: true },
  { path: 'soccer/eng.2', name: 'EFL Championship', sport: 'soccer', range: true },
  { path: 'soccer/esp.1', name: 'LaLiga', sport: 'soccer', range: true },
  { path: 'soccer/ita.1', name: 'Serie A', sport: 'soccer', range: true },
  { path: 'soccer/ger.1', name: 'Bundesliga', sport: 'soccer', range: true },
  { path: 'soccer/fra.1', name: 'Ligue 1', sport: 'soccer', range: true },
  { path: 'soccer/ned.1', name: 'Eredivisie', sport: 'soccer', range: true },
  { path: 'soccer/por.1', name: 'Primeira Liga', sport: 'soccer', range: true },
  { path: 'soccer/sco.1', name: 'Scottish Premiership', sport: 'soccer', range: true },
  { path: 'soccer/tur.1', name: 'Süper Lig', sport: 'soccer', range: true },
  { path: 'soccer/uefa.champions', name: 'UEFA Champions League', sport: 'soccer', range: true },
  { path: 'soccer/uefa.europa', name: 'UEFA Europa League', sport: 'soccer', range: true },
  { path: 'soccer/uefa.europa.conf', name: 'UEFA Conference League', sport: 'soccer', range: true },
  { path: 'soccer/uefa.nations', name: 'UEFA Nations League', sport: 'soccer', range: true },
  { path: 'soccer/fifa.worldq.uefa', name: 'World Cup Qualifiers (UEFA)', sport: 'soccer', range: true },
  { path: 'soccer/fifa.friendly', name: 'International Friendlies', sport: 'soccer', range: true },
  { path: 'soccer/usa.1', name: 'MLS', sport: 'soccer', range: true },
  { path: 'soccer/mex.1', name: 'Liga MX', sport: 'soccer', range: true },
  { path: 'soccer/bra.1', name: 'Brasileirão', sport: 'soccer', range: true },
  { path: 'soccer/arg.1', name: 'Liga Profesional Argentina', sport: 'soccer', range: true },
  { path: 'soccer/conmebol.libertadores', name: 'Copa Libertadores', sport: 'soccer', range: true },
  { path: 'soccer/sau.1', name: 'Saudi Pro League', sport: 'soccer', range: true },
  { path: 'soccer/ind.1', name: 'Indian Super League', sport: 'soccer', range: true },
  { path: 'soccer/jpn.1', name: 'J1 League', sport: 'soccer', range: true },
  { path: 'soccer/aus.1', name: 'A-League', sport: 'soccer', range: true },
  // US & other team sports
  { path: 'basketball/nba', name: 'NBA', sport: 'basketball', range: true },
  { path: 'basketball/wnba', name: 'WNBA', sport: 'basketball', range: true },
  { path: 'football/nfl', name: 'NFL', sport: 'football', range: true },
  { path: 'football/college-football', name: 'College Football', sport: 'football', range: true },
  { path: 'baseball/mlb', name: 'MLB', sport: 'baseball', range: true },
  { path: 'hockey/nhl', name: 'NHL', sport: 'hockey', range: true },
  // Individual sports (tournament-style scoreboards)
  { path: 'tennis/atp', name: 'ATP', sport: 'tennis' },
  { path: 'tennis/wta', name: 'WTA', sport: 'tennis' },
  { path: 'golf/pga', name: 'PGA Tour', sport: 'golf' },
  { path: 'golf/lpga', name: 'LPGA Tour', sport: 'golf' },
  { path: 'golf/eur', name: 'DP World Tour', sport: 'golf' },
  { path: 'racing/f1', name: 'Formula 1', sport: 'racing' },
  { path: 'mma/ufc', name: 'UFC', sport: 'combat' },
];

export const LEAGUE_BY_PATH = new Map(ESPN_LEAGUES.map((l) => [l.path, l]));

// Cricket comes from ESPNcricinfo (ESPN's own scoreboard API has no global cricket feed).
export const CRICINFO_CURRENT = 'https://hs-consumer-api.espncricinfo.com/v1/pages/matches/current?lang=en&latest=true';
export const CRICINFO_RSS = 'https://static.cricinfo.com/rss/livescores.xml';

// News feeds. `sport: 'general'` items are auto-classified by keywords.
const GN_SPORTS = 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB';
export const NEWS_FEEDS = [
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', sport: 'general' },
  { name: 'BBC Football', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', sport: 'soccer' },
  { name: 'BBC Cricket', url: 'https://feeds.bbci.co.uk/sport/cricket/rss.xml', sport: 'cricket' },
  { name: 'BBC Tennis', url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml', sport: 'tennis' },
  { name: 'BBC F1', url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml', sport: 'racing' },
  { name: 'BBC Golf', url: 'https://feeds.bbci.co.uk/sport/golf/rss.xml', sport: 'golf' },
  { name: 'BBC Rugby', url: 'https://feeds.bbci.co.uk/sport/rugby-union/rss.xml', sport: 'rugby' },
  { name: 'BBC Boxing', url: 'https://feeds.bbci.co.uk/sport/boxing/rss.xml', sport: 'combat' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/sport/rss', sport: 'general' },
  { name: 'The Guardian Football', url: 'https://www.theguardian.com/football/rss', sport: 'soccer' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', sport: 'general' },
  { name: 'ESPN FC', url: 'https://www.espn.com/espn/rss/soccer/news', sport: 'soccer' },
  { name: 'ESPN NBA', url: 'https://www.espn.com/espn/rss/nba/news', sport: 'basketball' },
  { name: 'ESPN NFL', url: 'https://www.espn.com/espn/rss/nfl/news', sport: 'football' },
  { name: 'ESPN MLB', url: 'https://www.espn.com/espn/rss/mlb/news', sport: 'baseball' },
  { name: 'ESPN NHL', url: 'https://www.espn.com/espn/rss/nhl/news', sport: 'hockey' },
  { name: 'ESPNcricinfo', url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', sport: 'cricket' },
  { name: 'Sky Sports', url: 'https://www.skysports.com/rss/12040', sport: 'general' },
  { name: 'Autosport', url: 'https://www.autosport.com/rss/f1/news/', sport: 'racing' },
  { name: 'Yahoo Sports', url: 'https://sports.yahoo.com/rss/', sport: 'general' },
  { name: 'CBS Sports', url: 'https://www.cbssports.com/rss/headlines/', sport: 'general' },
  { name: 'NDTV Sports', url: 'https://feeds.feedburner.com/ndtvsports-latest', sport: 'general' },
  { name: 'Times of India Sports', url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', sport: 'general' },
  { name: 'Google News (US)', url: `${GN_SPORTS}?hl=en-US&gl=US&ceid=US:en`, sport: 'general' },
  { name: 'Google News (UK)', url: `${GN_SPORTS}?hl=en-GB&gl=GB&ceid=GB:en`, sport: 'general' },
  { name: 'Google News (India)', url: `${GN_SPORTS}?hl=en-IN&gl=IN&ceid=IN:en`, sport: 'general' },
  { name: 'Google News (Australia)', url: `${GN_SPORTS}?hl=en-AU&gl=AU&ceid=AU:en`, sport: 'general' },
];
