# NXT Sports — Global Sports Newsroom

<img src="public/img/og.jpg" alt="NXT" width="480">

Live scores and headlines from around the world, refreshed every 10 minutes, with a one-click **copy code** for every match.

## What it does

- **Every sport, worldwide.** Pick a sport to get every match from yesterday to tomorrow, from top leagues down to regional divisions. Sports: football, cricket, basketball, tennis, American football, baseball, ice hockey, rugby, MMA, golf, motorsport, handball, volleyball, beach volleyball, table tennis, badminton, futsal, esports, darts, snooker, Aussie rules, water polo, floorball and bandy. "All sports" shows the top competitions plus every match that is live anywhere in the world.
- **Sources:** Sofascore (global coverage), ESPN (about 120 competitions, with venues, TV channels and team colours) and ESPNcricinfo (cricket scorecards). When the same match comes from two sources, the richer one is kept.
- **Headlines** from about 60 feeds: BBC, Guardian, ESPN, Sky, Cricinfo, Autosport, Motorsport.com, Yahoo, CBS, NDTV, Times of India, The Hindu, Indian Express and Al Jazeera, plus Google News in 9 countries and per-sport searches (kabaddi, badminton, chess, athletics, esports and more).
- **One-tap "Copy details"** on every match. It fetches the full match details when you tap and copies them in the format you picked:
  - **AI Poster / Video** (default): sport, competition, status, date and time (your time zone plus UTC), venue and capacity, score, result line, scorers with assists, cards, match stats, line-ups, coaches, referee, team colours and logo links, followed by a ready-to-use prompt for an image or video AI.
  - **Text**, **Markdown**, **JSON**, **HTML embed** and **Live API URL**.
- **Copy on headlines** gives the headline, summary, source and image, plus a "breaking news" poster prompt.
- Updates every 10 minutes (:00, :10, :20, :30, :40, :50). The page shows a countdown and refreshes itself.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/scores` | Overview: top competitions plus every live match worldwide |
| `GET /api/scores?sport=soccer` | Every match of one sport, yesterday to tomorrow. Optional `&state=in\|pre\|post` |
| `GET /api/news` | Headlines, newest first. Filter: `?sport=` |
| `GET /api/match?l=<league>&id=<id>&format=poster` | One match with full details. Formats: `json` (default), `poster`, `text`, `markdown`, `embed`. Optional `&tz=Asia/Kolkata` |
| `GET /api/health?deep=1` | Checks each upstream source and reports whether it responds |

## How the 10-minute updates work

The API functions cache at Vercel's edge until the next 10-minute mark (`s-maxage`, with `stale-while-revalidate`). Upstream sources are hit at most once every 10 minutes per region, however many people are on the site. Every source is fetched in parallel with a timeout, so one slow or failing feed never breaks the page. The footer shows how many sources are online.

## Development

```
npm test          # unit and API tests with mocked upstreams (no network needed)
npx vercel dev    # run locally
```

There are no runtime dependencies, no build step and no API keys. To add a league, sport or feed, edit `lib/sources.js`.

## Layout

```
api/            Vercel serverless functions (scores, news, match, health)
lib/            data sources, ESPN / Sofascore / Cricinfo normalizers, RSS parser
public/         static site (index.html, embed.html, js/, css/)
public/js/format.js   copy-code formatter shared by the browser and the API
test/           node:test suite with fixtures
```
