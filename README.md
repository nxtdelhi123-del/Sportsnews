# NXT Sports — Global Sports Newsroom

<img src="public/img/og.jpg" alt="NXT" width="480">

Live scores and headlines from around the world, refreshed every 10 minutes, with a one-click **copy code** for every match.

## What it does

- **Every sport, worldwide.** Pick a sport to get every match from yesterday to tomorrow, from top leagues down to regional divisions. Sports: football, cricket, basketball, tennis, American football, baseball, ice hockey, rugby, MMA, golf, motorsport, handball, volleyball, beach volleyball, table tennis, badminton, futsal, esports, darts, snooker, Aussie rules, water polo, floorball and bandy. "All sports" shows the top competitions plus every match that is live anywhere in the world.
- **Sources:** Sofascore (global coverage), ESPN (about 110 competitions, with venues, TV channels and team colours), TheSportsDB (the major leagues of 22 sports) and ESPNcricinfo (cricket scorecards). They are independent of each other, so if one is blocked from the server the site still shows the big matches from the others. When the same match comes from two sources, the richer one is kept.
- **Headlines** from about 60 feeds: BBC, Guardian, ESPN, Sky, Cricinfo, Autosport, Motorsport.com, Yahoo, CBS, NDTV, Times of India, The Hindu, Indian Express and Al Jazeera, plus Google News in 9 countries and per-sport searches (kabaddi, badminton, chess, athletics, esports and more).
- **One-tap "Copy details"** on every match. It fetches the full match details when you tap and copies them in the format you picked:
  - **AI Poster / Video** (default): sport, competition, status, date and time (your time zone plus UTC), venue and capacity, score, result line, scorers with assists, cards, match stats, line-ups, coaches, referee, team colours and logo links, followed by a ready-to-use prompt for an image or video AI.
  - **Text**, **Markdown**, **JSON**, **HTML embed** and **Live API URL**.
- **Importance labels.** Every match and headline is tagged **VIMP** (very important: Champions League, World Cup, IPL, internationals between the big cricket nations, Grand Slams, race day in F1, finals, and any match with a marquee club or star), **IMP** (important: top domestic leagues, NBA, NFL, ATP/WTA, UFC and similar) or **Not important**. The VIMP and IMP+ filters show only the big ones, and "Copy all shown" copies them together. Rules live in `lib/importance.js`.
- **Copy on headlines** gives the headline, summary, source and image, plus a "breaking news" poster prompt.
- Updates every 10 minutes (:00, :10, :20, :30, :40, :50). The page shows a countdown and refreshes itself.

## NXT Studio (Phase 1)

`/studio` turns today's stories into Instagram posts for two pages, @thesportsbinge and @musc_reddevils. For each page it ranks the newsroom's matches and headlines by that page's interests (`lib/studio/brands/*.js`, `lib/studio/score.js`), writes a headline, explainer, caption and hashtags in the page's voice (`lib/studio/writer.js`: formulas, improved by Claude when `ANTHROPIC_API_KEY` is set), and draws a 1080×1350 poster from a template that copies the page's look (`lib/studio/templates.js`, rendered server-side with satori + resvg). Open a story to switch template or size (post, story, square), edit the words, copy the caption and download the PNG. "Not this" records a rejection for the learning loop (Phase 2 stores it). The full plan is in `docs/STUDIO_PLAN.md`.

Brand badges: put `tsb-badge.png` and `musc-crest.png` (transparent PNG, square) in `public/studio/brand/`; until then a vector stand-in is drawn.

| Endpoint | Description |
| --- | --- |
| `GET /api/studio/candidates?brand=tsb\|musc` | Ranked post packs with formula words |
| `GET /api/studio/render?brand=&key=&size=post\|story\|square&template=&w=` | PNG of a pack; `&json=1` returns the pack with Claude-written words |
| `POST /api/studio/feedback` | `{ brand, key, decision: approve\|reject\|edit }` |

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/scores` | Overview: top competitions plus every live match worldwide |
| `GET /api/scores?sport=soccer` | Every match of one sport, yesterday to tomorrow. Optional `&state=in\|pre\|post` |
| `GET /api/news` | Headlines, newest first. Filter: `?sport=` |
| `GET /api/match?l=<league>&id=<id>&format=poster` | One match with full details. Formats: `json` (default), `poster`, `text`, `markdown`, `embed`. Optional `&tz=Asia/Kolkata` |
| `GET /api/health?deep=1` | One real request to each data provider from the server, with status codes |
| `/debug` | Human-readable source check: which providers work from this server, and how many matches each contributes |

## How the 10-minute updates work

The API functions cache at Vercel's edge until the next 10-minute mark (`s-maxage`, with `stale-while-revalidate`). Upstream sources are hit at most once every 10 minutes per region, however many people are on the site. Every source is fetched in parallel with a timeout and one retry, and a build has a 9-second budget: anything still loading is left out, the response is marked `partial` and cached for only 40 seconds so the next request fills it in. The footer shows how many matches each provider contributed; a banner appears when a major provider is blocked.

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
