# NXT Sports — Global Sports Newsroom

<img src="public/img/og.jpg" alt="NXT" width="480">

Live scores and headlines from around the world, refreshed every 10 minutes, with a one-click **copy code** for every match.

## What it does

- **Scores** from 39 competitions: Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Champions League, MLS, ISL, Saudi Pro League, Brasileirão, Liga MX and more; NBA, NFL, MLB, NHL; ATP and WTA tennis; PGA, LPGA and DP World Tour golf; Formula 1; UFC; and live international and domestic cricket from ESPNcricinfo.
- **Headlines** from 27 feeds: BBC Sport, The Guardian, ESPN, Sky Sports, ESPNcricinfo, Autosport, Yahoo, CBS, NDTV, Times of India, and Google News (US, UK, India and Australia editions). Duplicates are merged and each story is tagged by sport.
- **Copy codes** for each match:
  - **Text**: for WhatsApp, Telegram, X or email
  - **Markdown**: for Discord, Reddit, GitHub or Notion
  - **JSON**: structured data
  - **HTML embed**: an `<iframe>` widget that keeps itself updated
  - **Live API URL**: always-fresh JSON or text
- **Copy all shown** copies every match that matches the current filters in one go.
- Updates every 10 minutes (:00, :10, :20, :30, :40, :50). The page shows a countdown to the next update and refreshes itself.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/scores` | All matches. Filters: `?sport=soccer\|cricket\|basketball\|football\|baseball\|hockey\|tennis\|golf\|racing\|combat`, `?state=in\|pre\|post` |
| `GET /api/news` | Headlines, newest first. Filter: `?sport=` |
| `GET /api/match?l=<league>&id=<id>` | One match. Add `&format=text\|markdown\|embed` and optionally `&tz=Asia/Kolkata` |
| `GET /api/health` | Health check |

Example:

```
curl "https://<your-app>.vercel.app/api/match?l=soccer/eng.1&id=740001&format=text"
```

## How the 10-minute updates work

The API functions cache at Vercel's edge until the next 10-minute mark (`s-maxage`, with `stale-while-revalidate`). Upstream sources are hit at most once every 10 minutes per region, however many people are on the site. Every source is fetched in parallel with a timeout, so one slow or failing feed never breaks the page. The footer shows how many sources are online.

## Development

```
npm test          # unit and API tests with mocked upstreams (no network needed)
npx vercel dev    # run locally
```

There are no runtime dependencies, no build step and no API keys. To add a league or feed, edit `lib/sources.js`.

## Layout

```
api/            Vercel serverless functions (scores, news, match, health)
lib/            data sources, ESPN/Cricinfo normalizers, RSS parser
public/         static site (index.html, embed.html, js/, css/)
public/js/format.js   copy-code formatter shared by the browser and the API
test/           node:test suite with fixtures
```
