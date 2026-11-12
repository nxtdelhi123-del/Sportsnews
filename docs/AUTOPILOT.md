# Autopilot: from news to Instagram in minutes, with one tap

The autopilot checks the newsroom every 1–2 minutes. When a big new story for
@thesportsbinge appears, it writes the post, draws the poster and sends both to your
phone on Telegram with two buttons:

- **✅ Post now** publishes it to Instagram straight away and replies with the link.
- **✖ Skip** drops it.

Nothing goes to Instagram without your tap.

**Expected time from a story appearing in the feeds to the draft on your phone:** about
2–6 minutes. The trigger runs every 1–2 minutes, the feeds are cached for up to 4
minutes, and writing plus drawing takes about 10 seconds. Publishing after your tap
takes about 5–15 seconds.

## What gets sent

- Stories ranked by the same rules as `/studio` (`lib/studio/brands/tsb.js`), with a score of at
  least `AUTOPILOT_MIN_SCORE` (default 3, roughly the page's P1/P2).
- Only kinds of post that are news the moment they happen: results, medals, records,
  tallies, "into the final", quotes and breaking headlines. Previews and live scores are
  never sent.
- Only stories less than `AUTOPILOT_MAX_AGE_HOURS` old (default 2).
- One draft per story, however many outlets report it (same dedupe as the Studio). A story
  is claimed atomically, so overlapping runs never send it twice.
- At most `AUTOPILOT_MAX_PER_RUN` (3) per run and `AUTOPILOT_DAILY_CAP` (20) per day.

Each Telegram draft shows:
- the priority (P1/P2), a status, the post type and the source link, so you can check it
  before tapping;
- the exact Instagram caption, ending in exactly five hashtags with #TheSportsBinge last.

The status is **Confirmed** for final scores from the live data, and **Reported** for
headlines.

The poster is 1080×1350 JPEG. Instagram's API rejects the 3:4 grid-tile size, so the
autopilot always posts 4:5.

## One-time setup (about 45 minutes)

### 1. A store (free)
In Vercel, open **Project → Storage → Create → Upstash for Redis** (free plan) and
connect it to this project. That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The
autopilot uses it to remember what it has already sent.

### 2. The Telegram bot (5 minutes)
1. In Telegram, message **@BotFather** and send `/newbot`. Copy the token.
2. Send any message to your new bot. Then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id`.

### 3. Vercel environment variables
Set these in **Project → Settings → Environment Variables**, then redeploy.

| Variable | Value |
| --- | --- |
| `AUTOPILOT_SECRET` | any long random string (e.g. from `openssl rand -hex 24`) |
| `TELEGRAM_BOT_TOKEN` | from BotFather |
| `TELEGRAM_CHAT_ID` | your chat id |
| `PUBLIC_URL` | `https://sportsnews-delta.vercel.app` |
| `ANTHROPIC_API_KEY` | optional, but recommended: Claude writes the words; formulas otherwise |
| `IG_TSB_USER_ID`, `IG_TSB_TOKEN` | from step 5; until then drafts arrive without a Post button |

### 4. Connect the buttons
Open this URL once, with your values filled in:

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://sportsnews-delta.vercel.app/api/telegram&secret_token=<AUTOPILOT_SECRET>
```

### 5. Instagram (about 30 minutes)
Follow §6 of `docs/STUDIO_PLAN.md`:
1. Switch the page to a Business or Creator account and link it to a Facebook Page.
2. Create a Meta app.
3. Get a long-lived token with `instagram_content_publish`.
4. Put the user id and token in `IG_TSB_USER_ID` and `IG_TSB_TOKEN`.

The long-lived token lasts 60 days. Put a reminder in your calendar to renew it.

### 6. Run it every minute
Vercel's free plan only runs crons once a day, so use **cron-job.org** (free):
1. Create a job for the URL `https://sportsnews-delta.vercel.app/api/cron/studio`, every 1 minute.
2. Under Advanced, add the header `Authorization: Bearer <AUTOPILOT_SECRET>`.

On Vercel Pro you can use Vercel Cron instead. Add `"crons": [{ "path": "/api/cron/studio", "schedule": "* * * * *" }]`
to `vercel.json` and set `CRON_SECRET` to the same value.

You can also send `/check` to the bot to run a pass right away.

## Files

| File | What it does |
| --- | --- |
| `lib/studio/autopilot.js` | the pass, captions with exactly five hashtags, publish and skip |
| `lib/studio/store.js` | Upstash Redis REST, or memory when not configured |
| `lib/studio/telegram.js` | sending drafts and button handling |
| `lib/studio/instagram.js` | Graph API: container, then status, then publish, then permalink |
| `api/cron/studio.js` | one pass, protected by the secret |
| `api/telegram.js` | bot webhook (secret header, owner's chat only) |
| `api/studio/media.js` | signed public JPEG of a draft (what Telegram and Instagram fetch) |
| `test/autopilot.test.js` | the flow end to end with mocked Telegram and Instagram |
