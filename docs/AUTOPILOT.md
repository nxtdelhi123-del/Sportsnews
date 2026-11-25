# Autopilot: from news to Instagram in minutes, with one tap

The autopilot checks the newsroom every 1–2 minutes. When a big new story for
@thesportsbinge appears, it writes the post, draws the poster and sends both to your
phone on Telegram with two buttons:

- **✅ Post now** publishes it to Instagram straight away and replies with the link.
- **✖ Skip** drops it.

Nothing goes to Instagram without your tap, except breaking news an official source has
confirmed (below).

**Expected time from a story appearing in the feeds to the draft on your phone:** about
2–4 minutes. The trigger runs every 1–2 minutes, headlines are cached for 90 seconds and
live scores for 60, and writing plus drawing takes about 10 seconds. Publishing after your tap
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
Google's Gemini with `GEMINI_API_KEY` (free tier; it tries `gemini-3.5-flash`, then `gemini-3.1-flash-lite`, `gemini-3-flash-preview` and `gemini-flash-latest`, skipping any Google has retired, is overloaded or is out of free quota; `GEMINI_MODEL` is tried first when set). It is given the page's guide
(`editor` in `lib/studio/brands/tsb.js`) and the editor's last Post / Skip / "I posted it" taps
(kept in the store as `ap:taste:<brand>`), and returns post or not, P1/P2/P3 and a one-line
reason, which the draft shows as 🧠. Stories it turns down are not asked about again. If
no model answers, only stories scoring 8+ go out on the rules alone and the rest wait for the
next run. Without any AI key the rules decide, and a sport and post type the editor has skipped three
times without ever posting is held back.

## Confirmed breaking news posts on its own (`lib/studio/autopost.js`)

The editor's rule since 24 Nov 2026: breaking news whose facts are **Confirmed by an official
(T1) source** publishes straight away and the bot tells you afterwards ("⚡ Posted on its own",
with the Instagram link). Reported, Developing and Unverified stories still arrive as drafts
for your tap.

**Official sources.** `OFFICIAL_SITES` in `lib/sources.js`: ICC, BCCI, IPL, WPL, Formula 1, FIA,
FIFA, UEFA, Premier League, AIFF, ISL, Manchester United, NBA, FIBA, UFC, ATP, WTA, ITF, the four
Grand Slams, FIH, Hockey India, PPA Tour, USA Pickleball, Major League Pickleball, IOC, OCA,
IOA, World Athletics, BWF, FIDE, ISSF, World Archery, UWW, ITTF, WTT, PSA and Pro Kabaddi. The
newsroom reads them through Formula 1's own feed and Google News searches limited to these
sites (`OFFICIAL_FEEDS`); a story on one of them shows as **Confirmed** and as "Confirmed by …".

**A story posts on its own only when all of these hold:**
- it is on an official site (match results only with `AUTOPOST_RESULTS=1`);
- the editor brain (Gemini, free) chose it as P1 or P2 (`AUTOPOST_PRIORITIES`), never the rules alone;
- the brain wrote a headline in which every name and number is in the story's own words;
- it was published less than `AUTOPOST_MAX_AGE_MIN` (90) minutes ago and is not a preview,
  opinion, list, question, fixture, gallery or section page;
- the photo is sharp and certainly of the story: its own picture, or one captioned with a full
  name from it (a surname-only match is flagged "📷 loose match" on drafts and never auto-posts);
- Instagram is connected, auto-posting is not paused, at most `AUTOPOST_DAILY_CAP` (8) a day and
  `AUTOPOST_GAP_MIN` (20) minutes apart.

If any fails, the story comes as a normal draft with the reason on it.

**In the Telegram chat:** `/pause` stops auto-posting (everything waits for your tap), `/resume`
starts it again, `/status` shows what is on. `AUTOPOST=off` in Vercel switches it off entirely.

**WhatsApp alerts (free, `lib/studio/whatsapp.js`).** Through CallMeBot: on your phone, add
CallMeBot's WhatsApp number (from callmebot.com, WhatsApp page) and send it
"I allow callmebot to send me messages"; it replies with a key. Put `WHATSAPP_PHONE`
(with country code) and `WHATSAPP_APIKEY` in Vercel. `WHATSAPP_ALERTS`: `p1` (default: every
auto-post and every P1 draft), `autopost`, `all` or `off`. Telegram stays the place to tap Post.

**Hundreds and five-fors from the live scorecard (`lib/studio/live-milestones.js`).** Every
minute the autopilot reads ESPN's live scorecard (ESPNcricinfo data) of every cricket match an
Indian side is playing, at any level (India, India A, U19, Women). An Indian batter reaching
100, 150, 200, 250 or 300, or an Indian bowler taking 5+ wickets, becomes a draft at once with
a headline from the numbers ("204 OFF 53 BALLS."). No record is claimed from the scorecard. These
skip the brain and the daily cap, so they always reach you; they post on their own only with
`AUTOPOST_RESULTS=1`. Added after Sooryavanshi's 28-ball hundred and 53-ball 204 (24 Nov) went
without a draft: the headlines about it came late, were judged too junior, and several were
filed under sport "other". Indian cricketers' names and "double ton", "List A" now classify as
cricket, and youth/junior stories with a hundred or record are no longer filtered out.

**Design variety.** News layouts rotate between `tsb-headline`, `tsb-binge` and `tsb-verdict`,
never repeating the last two, so neighbouring posts differ.

`/api/health` shows `autopost: { instagram, whatsapp, brain, off }` as yes/no.

## The content calendar (`lib/studio/calendar.js`)

The same one-minute run also works through the Sports Binge rows of the content calendar
(`lib/studio/calendar-data.js`, made from the spreadsheet by
`python3 -I scripts/calendar-from-xlsx.py calendar.xlsx`; times are IST). Nothing goes to
Instagram without the editor's tap.

- **10 PM the night before** (`CALENDAR_DIGEST_TIME`): a list of tomorrow's posts that need
  something from people (reels, carousels, research pieces, the editor's own slots, anything
  marked "Needs approval"). `/tomorrow` in the chat shows it any time.
- **3 hours before** each of those slots (`CALENDAR_HEADSUP_HOURS`): a heads-up with the brief.
- **30 minutes before every slot** (`CALENDAR_LEAD_MINUTES`): the brief. For result, data-card and
  main-story slots the bot also sends its best fresh story (preferring the one the brief names)
  as a draft with **🕒 Post at 9:00 AM**, **✅ Post now** and **✖ Skip**.
- **At the slot's time**: queued posts publish. Before Instagram is connected, the bot sends
  "Time to post" instead, and the 🕒 button reads **⏰ Remind me at …**.
- **The team's own posts**: send the finished image to the bot as a photo (or a JPEG file for
  full quality) with the caption, as a reply to the slot's brief. It comes back with the same
  buttons. A text reply to it sets or replaces the caption.
- **Match results** don't wait for a slot: they go out the moment the score is final, as
  before, and no longer count against the daily cap (`AUTOPILOT_RESULTS_OVER_CAP=0` to undo).

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
