# NXT Sports — Global Sports Newsroom

<img src="public/img/og.jpg" alt="NXT" width="480">

Live scores and headlines from around the world: live scores refresh every minute, everything else every 10 minutes. Tap any match for its match centre (timeline, stats, line-ups, venue), and copy any match or headline in one click.

## What it does

- **Every sport, worldwide.** Pick a sport to get every match from yesterday to tomorrow, from top leagues down to regional divisions. Sports: football, cricket, basketball, tennis, American football, baseball, ice hockey, rugby, MMA, golf, motorsport, handball, volleyball, beach volleyball, table tennis, badminton, futsal, esports, darts, snooker, Aussie rules, water polo, floorball and bandy. "All sports" shows the top competitions plus every match that is live anywhere in the world.
- **Sources (all free):** ESPN — every soccer competition it carries (about 220) through one all-competitions call per day, plus about 30 leagues of other sports, with venues, TV channels and team colours; ESPN cricket; TheSportsDB (the free key adds a few matches per sport per day); ESPNcricinfo (cricket scorecards); and about 120 news feeds. Sofascore is off by default because it refuses cloud servers (set `SOFASCORE=on` to try it). When the same match comes from two sources, the richer one is kept.
- **Headlines** from about 60 feeds: BBC, Guardian, ESPN, Sky, Cricinfo, Autosport, Motorsport.com, Yahoo, CBS, NDTV, Times of India, The Hindu, Indian Express and Al Jazeera, plus Google News in 9 countries and per-sport searches (kabaddi, badminton, chess, athletics, esports and more).
- **One-tap "Copy details"** on every match. It fetches the full match details when you tap and copies them in the format you picked:
  - **AI Poster / Video** (default): sport, competition, status, date and time (your time zone plus UTC), venue and capacity, score, result line, scorers with assists, cards, match stats, line-ups, coaches, referee, team colours and logo links, followed by a ready-to-use prompt for an image or video AI.
  - **Text**, **Markdown**, **JSON**, **HTML embed** and **Live API URL**.
- **Importance labels.** Every match and headline is tagged **VIMP** (very important: Champions League, World Cup, IPL, internationals between the big cricket nations, Grand Slams, race day in F1, finals, and any match with a marquee club or star), **IMP** (important: top domestic leagues, NBA, NFL, ATP/WTA, UFC and similar) or **Not important**. The VIMP and IMP+ filters show only the big ones, and "Copy all shown" copies them together. Rules live in `lib/importance.js`.
- **Copy on headlines** gives the headline, summary, source and image, plus a "breaking news" poster prompt.
- **Manchester United desk** (`/united`, or the 🔴 MUFC button): United's live or next match with a countdown, the last result, fixtures and results in every competition, the Premier League table, the squad and every United headline. Each match and headline copies with a MUSC prompt and opens in the Studio as a @musc_reddevils post.
- Updates every 10 minutes (:00, :10, :20, :30, :40, :50); while anything is live, scores refresh every minute and a changed score flashes. The page shows a countdown and refreshes itself.

## NXT Studio (Phase 1)

`/studio` turns today's stories into Instagram posts for two pages, @thesportsbinge and @musc_reddevils. For each page it ranks the newsroom's matches and headlines by that page's interests (`lib/studio/brands/*.js`, `lib/studio/score.js`), writes a headline, explainer, caption and hashtags in the page's voice (`lib/studio/writer.js`: formulas, improved by Claude when `ANTHROPIC_API_KEY` is set), and draws a 1080×1350 poster from a template that copies the page's look (`lib/studio/templates.js`, rendered server-side with satori + resvg). Open a story to switch template or size (post, story, square), edit the words, copy the caption and download the PNG. "Not this" records a rejection for the learning loop (Phase 2 stores it). The full plan is in `docs/STUDIO_PLAN.md`.

Brand badges: put `tsb-badge.png` and `musc-crest.png` (transparent PNG, square) in `public/studio/brand/`; until then a vector stand-in is drawn.

| Endpoint | Description |
| --- | --- |
| `GET /api/studio/candidates?brand=tsb\|musc` | Ranked post packs with formula words |
| `GET /api/studio/render?brand=&key=&size=post\|story\|square&template=&w=` | PNG of a pack; `&json=1` returns the pack with Claude-written words |
| `POST /api/studio/feedback` | `{ brand, key, decision: approve\|reject\|edit }` |

## Autopilot (news → phone → Instagram)

Every 1–2 minutes the autopilot sends each big new @thesportsbinge story to the owner's Telegram as a finished poster with its caption (exactly five hashtags) and ✅ Post now / ✖ Skip buttons. One tap publishes it to Instagram through the Graph API. Setup and settings: `docs/AUTOPILOT.md`.

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

The API functions cache at Vercel's edge until the next 10-minute mark, or for a minute while anything is live (`s-maxage`), and the edge keeps serving the last copy for up to 30 minutes while it rebuilds in the background (`stale-while-revalidate`), so a visitor never waits for the sources. The page loads the newest 300 headlines first and a sport's own list when that sport is opened. Upstream sources are hit at most once every 10 minutes per region, however many people are on the site. Every source is fetched in parallel with a timeout and one retry, and a build has a 9-second budget: anything still loading is left out, the response is marked `partial` and cached for only 40 seconds so the next request fills it in. The footer shows how many matches each provider contributed; a banner appears when a major provider is blocked.

## Development

```
npm test          # unit and API tests with mocked upstreams (no network needed)
npx vercel dev    # run locally
```

There are no runtime dependencies, no build step and no API keys. To add a league, sport or feed, edit `lib/sources.js`.

## Layout

```
api/            Vercel serverless functions (scores, news, match, health)
lib/            data sources, ESPN (incl. the all-soccer feed) / Sofascore / Cricinfo normalizers, RSS parser
public/         static site (index.html, embed.html, js/, css/)
public/js/format.js   copy-code formatter shared by the browser and the API
test/           node:test suite with fixtures
```
