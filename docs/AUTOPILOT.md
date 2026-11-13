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

## The editor's brain

`lib/studio/editor.js` decides which stories are worth a post. The rules in `score.js` are a
first pass. When an AI key is set, the bar drops to a score of 2 and the AI reads up to 15
fresh stories per run like the page's editor would: Claude with `ANTHROPIC_API_KEY`, or
Google's Gemini with `GEMINI_API_KEY` (free tier, `gemini-2.5-flash`; set `GEMINI_MODEL` to change). It is given the page's guide
(`editor` in `lib/studio/brands/tsb.js`) and the editor's last Post / Skip / "I posted it" taps
(kept in the store as `ap:taste:<brand>`), and returns post or not, P1/P2/P3 and a one-line
reason, which the draft shows as 🧠. Stories it turns down are not asked about again. If
the AI is unavailable or out of free quota the rules decide, and a sport and post type the editor has skipped three
times without ever posting is held back.

## One-time setup (about 10 minutes)

1. **Store:** Vercel → Project → Storage → Create → **Upstash for Redis** (free), connected to this
   project. That adds `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
2. **Bot:** in Telegram, message **@BotFather**, send `/newbot`, copy the token.
3. **One setting:** Vercel → Settings → Environment Variables → `TELEGRAM_BOT_TOKEN` = the token. Redeploy.
4. **Say hello:** open your bot in Telegram and send `/start`. The first chat to do this becomes the
   owner (or set `TELEGRAM_CHAT_ID` to pin it). The bot replies "Connected".

That's all. The site registers the bot's webhook itself, `AUTOPILOT_SECRET` is derived from the token
when not set, `PUBLIC_URL` defaults to the production domain, and the GitHub Actions workflow
`.github/workflows/autopilot.yml` wakes the autopilot every 5 minutes (GitHub runs can start a few
minutes late). For one-minute checks, add a free cron-job.org job on
`https://sportsnews-delta.vercel.app/api/cron/studio` (no key needed: a pass only ever messages the
owner, never repeats a story, and runs at most every 45 s). `/check` in the chat runs a pass at once.

Optional: `GEMINI_API_KEY` (free: Gemini picks the stories) or `ANTHROPIC_API_KEY` (paid: Claude picks the stories and writes the words). Rules and formulas otherwise.

### Instagram (later, about 30 minutes)
Follow §6 of `docs/STUDIO_PLAN.md`: Business/Creator account linked to a Facebook Page → Meta app →
long-lived token with `instagram_content_publish` → `IG_TSB_USER_ID` and `IG_TSB_TOKEN` in Vercel.
The long-lived token lasts 60 days; renew it before then. Until it is set, drafts arrive without a
Post button and the owner posts them by hand.

## Files

| File | What it does |
| --- | --- |
| `lib/studio/autopilot.js` | the pass, captions with exactly five hashtags, publish and skip |
| `lib/studio/store.js` | Upstash Redis REST, or memory when not configured |
| `lib/studio/telegram.js` | sending drafts and button handling |
| `lib/studio/instagram.js` | Graph API: container, then status, then publish, then permalink |
| `api/studio/autopilot.js` | one Vercel function for the three routes below (Hobby allows 12 functions); `vercel.json` rewrites them here |
| `lib/studio/routes/cron.js` | `/api/cron/studio`: one pass, protected by the secret |
| `lib/studio/routes/telegram.js` | `/api/telegram`: bot webhook (secret header, owner's chat only) |
| `lib/studio/routes/media.js` | `/api/studio/media`: signed public JPEG of a draft (what Telegram and Instagram fetch) |
| `test/autopilot.test.js` | the flow end to end with mocked Telegram and Instagram |
