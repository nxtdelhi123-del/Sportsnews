# NXT Studio — plan for an AI that makes Instagram posts and reels from the newsroom

This document is written for Claude Code sessions. Each phase is self-contained: read
this file, do the phase, run the tests, open a PR. The newsroom site
(`sportsnews-delta.vercel.app`) already collects every big match and headline every
10 minutes with VIMP/IMP labels and full match details. The Studio sits on top of it
and turns that data into posts and reels for two Instagram pages, with the owner
approving each post until the AI has earned the right to post on its own.

## 0. The two pages (read before touching anything)

### @thesportsbinge ("TSB") — a sports news page, India-first, fast
- **Mission:** post the news as soon as it's out, cover everything big.
- **Look:** editorial magazine. Two palettes.
  - *Dark:* moody athlete photo, heavy dark vignette, white headline, metallic accent
    text that matches the story (gold for gold/records/wins, silver, bronze/copper).
  - *Cream newspaper:* off-white paper (#F3EEE5), black high-contrast serif headline,
    thin rules, flags, red SPORTS BINGE badge. Used for results and tallies.
- **Type:** headline in a high-contrast serif (Playfair Display 900 / DM Serif
  Display), uppercase or sentence case, very large; eyebrow line in small spaced-caps
  sans (Inter 600, letter-spacing 0.2em) e.g. `ASIAN GAMES 2026 · AICHI-NAGOYA`;
  athlete name in spaced caps; stats in big numerals; one explainer sentence at the
  bottom in small type.
- **Headline formulas (always end with a full stop):** `56 YEARS LATER.` ·
  `Spain take Wembley.` · `Portugal silence Oslo.` · `TWO FINALS. TWO SILVERS.` ·
  `15,000 ODI RUNS` · `698. ASIAN GAMES RECORD.` · `KNOCKED OUT WITHOUT PLAYING.` ·
  `HISTORY. IN. GOLD.` · `THE MEDALS TELL YOU WHO WON. THESE STORIES TELL YOU WHAT IT TOOK.`
  Short, declarative, often two sentences, never a question, never an exclamation mark.
- **Fixed elements:** round red SPORTS BINGE badge (top-left or bottom-left),
  event logo top-right when there is one, `@thesportsbinge` handle small, flags or
  tricolour motif, medal icons, stat strip (`4 GOLD · 16 SILVER · 17 BRONZE · 12 RANK`).
- **Content mix seen:** India medals and records, Indian athletes' milestones, cricket
  milestones (Kohli 15,000), big football results with flags and score (Nations
  League), F1 race winners, player quotes, verdicts/explainers (Man City charges),
  medal tallies, carousels of "5 stories".
- **Tone:** proud, celebratory, precise. English only.
- **Formats:** 4:5 posts (1080×1350), carousels, reels 9:16 (1080×1920).

### @musc_reddevils ("MUSC") — Manchester United fan club, Delhi
- **Mission:** everything United, from the fan's side, in the fan's voice.
- **Look:** United red (#DA291C) and black, red gradients, player cut-outs, heavy
  condensed uppercase sans (Bebas Neue / Anton / Oswald 700) with key words in red or
  white, MUSC crest. Matchday VS posters: both players face to face, competition
  badge, date and time in IST, `WATCH LIVE ONLY ON FANCODE`. Confirmed XI / Predicted
  XI on a pitch graphic. Occasional editorial serif for signings (`A new Red.`).
- **Headline formulas:** `A RESPONSE. NOT EXCUSES.` · `VAR OFFICIAL AXED?` ·
  `OFFSIDE THA?` · `CONFIRMED XI` · `PREDICTED XI` · `RIVALS UNITED AGAINST A PETTY
  THIEF` · `HISTORY FOR SALE?` · `UNITED KA CONTROL KAHAN HAI?` Questions allowed,
  Hinglish allowed, provocative.
- **Content mix seen:** matchday preview, confirmed/predicted XI, result and goals,
  academy and transfer news, VAR/referee controversy, rival news (City), nostalgia
  (2008), fan meetups, presenter reels with a big caption.
- **Tone:** passionate fan, Hinglish, opinionated. Presenter reels are human-made;
  the Studio writes the script and the caption card, not the video.

## 1. What the Studio produces

For every candidate story the Studio produces a **post pack**:

```
{
  brand: 'tsb' | 'musc',
  type: 'result' | 'preview' | 'live' | 'milestone' | 'medal' | 'tally' | 'breaking' | 'quote' | 'xi' | 'nostalgia',
  headline: 'Spain take Wembley.',            // brand formula applied
  eyebrow: 'UEFA NATIONS LEAGUE 2026/27',
  explainer: 'Full time at Wembley: England 2–3 Spain. League A · Group A2.',
  stats: [{ label: 'FULL TIME', value: '2–3' }],
  palette: 'cream' | 'dark' | 'red',
  accent: 'gold' | 'silver' | 'bronze' | 'red' | 'none',
  images: { hero: url | null, flags: [...], logos: [...] },
  caption: '...',                              // Instagram caption in the brand voice
  hashtags: ['#ENGESP', '#NationsLeague', ...],
  formats: ['post-4x5', 'story-9x16', 'reel-9x16'],
  renders: { 'post-4x5': 'https://.../abc.png', ... },   // filled by the renderer
  schedule: ISO time | 'now',
  score: 0.92,                                 // importance for this brand (see §5)
  reason: 'India medal · national record'
}
```

Posters are **template-rendered, not AI-drawn.** Numbers, names and flags must be
exact; image models can't do that. AI (Claude) writes the words; templates draw the
picture. An image model is only used, optionally, for a background when no photo is
available (§4.4).

## 2. Architecture (all inside this repo)

```
api/studio/candidates.js   GET  ranked stories for a brand (uses /api/scores + /api/news + §5 scoring)
api/studio/pack.js         POST build a post pack from a story (Claude writes headline/caption)
api/studio/render.js       GET  PNG of a pack in a format (satori / @vercel/og)
api/studio/queue.js        GET/POST the review queue (approve, edit, reject, schedule)
api/studio/publish.js      POST publish an approved pack to Instagram (Graph API)
api/studio/feedback.js     POST record approve/reject/engagement for training (§5)
api/cron/studio.js         runs every 10 min: new candidates → packs → queue (Vercel Cron)
lib/studio/brands/tsb.js   brand profile: interests, voice, formulas, palette, badge
lib/studio/brands/musc.js
lib/studio/score.js        importance scoring per brand + learned weights
lib/studio/writer.js       Claude prompts for headline / explainer / caption / reel script
lib/studio/templates/*.jsx satori templates: tsb-cream, tsb-dark, tsb-tally, musc-matchday, musc-xi, musc-result, story, reel-frames
lib/studio/instagram.js    Graph API client (create container → publish; carousel; reels)
lib/studio/store.js        queue + feedback storage (Vercel KV or Neon Postgres)
public/studio.html         the review desk UI
public/studio/*.js|css
```

- **Rendering:** `@vercel/og` (satori + resvg) renders JSX templates to PNG on Vercel
  with no browser. Fonts: Playfair Display, DM Serif Display, Inter, Bebas Neue,
  Oswald from Google Fonts, cached as TTF in `lib/studio/fonts/`. Logos: the owner
  uploads `sportsbinge-badge.png`, `musc-crest.png`, `nxt-mark.png` to
  `public/studio/brand/`.
- **Storage:** Vercel Blob for rendered PNG/MP4 (Instagram needs a public URL);
  Vercel KV (or Neon Postgres) for the queue, packs and feedback.
- **Words:** Claude API (`claude-sonnet-5-5` for speed and cost; `claude-opus-5-5`
  for the weekly review). One call per pack, JSON output, brand profile in the
  system prompt, 6 real past posts from the page as few-shot examples.
- **Secrets (Vercel env):** `ANTHROPIC_API_KEY`, `IG_TSB_USER_ID`, `IG_TSB_TOKEN`,
  `IG_MUSC_USER_ID`, `IG_MUSC_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `KV_*`,
  `STUDIO_PASSWORD` (the review desk is private).

## 2.5 Grid calibration — @thesportsbinge, 18 Oct 2026

Counted from five grid screenshots (54 posts, late Sept to mid Oct 2026):

| What the page posts | Posts | Share |
| --- | --- | --- |
| Indian medals at the Asian Games (athletics 14, shooting 4, squash 4, kabaddi 3, relays 3, javelin 2, TT, boxing, kurash, archery) | 34 | 63% |
| Medal tallies (INDIA MEDAL COUNT 23 / 37 / 45) | 3 | 6% |
| Football: Nations League results (cream), Man City verdict (dark, red) | 6 | 11% |
| Cricket: Kohli 15,000 ODI runs, Kohli quote, WPL retentions, Asian Games rain-out | 4 | 7% |
| F1: Russell pole, Russell win | 2 | 4% |
| Chess: Olympiad three-peat, 11-year-old WGM | 2 | 4% |
| Hockey: India vs Pakistan semi-final preview | 1 | 2% |
| NBA, NFL, MLB, NHL, golf, tennis, UFC | 0 | 0% |

What that changed in the code (PR "Studio: learn the Sports Binge grid"):

- **Ranking** (`lib/studio/brands/tsb.js`): athletics 1.8, cricket 1.6, shooting /
  archery / wrestling / kabaddi 1.5, squash / badminton / hockey / chess 1.4; NBA 0.4,
  NFL / MLB / NHL 0.2. Boosts: India ×2.0, Asian Games ×1.6, any medal ×1.6, records /
  firsts / "N years later" ×1.5, double podiums ×1.3, 60 Indian athletes by name ×1.6,
  India–Pakistan ×1.6, verdicts and bans ×1.4, retentions and auctions ×1.3. Never:
  how-to-watch, live blogs, rumours, fantasy tips, youth sides.
- **Post types** (`lib/studio/score.js`): `stage` (into the final, medal assured) and a
  wider `tally` detector, on top of medal / milestone / quote / breaking.
- **Headline formulas** (`lib/studio/writer.js`), copied from the grid:
  `PARUL CHAUDHARY BRONZE.`, `INDIA GOLD.`, `BRONZE.` + "MANUSH SHAH & DIYA CHITALE",
  `DOUBLE PODIUM.`, `56 YEARS LATER.`, `42 YEARS. THE RECORD FINALLY FALLS.`,
  `INDIA’S FIRST EVER.`, `A NATIONAL RECORD. ANOTHER ASIAN MEDAL.`, `15,000 ODI RUNS.`,
  `11 YEARS OLD. HISTORY MADE.`, `698/720. ASIAN GAMES RECORD.`, `INTO THE FINAL.`,
  `MEDAL ASSURED.`, `INDIA MEDAL COUNT.`, quotes in curly quotes, breaking news in caps
  cut before the first preposition (`MANCHESTER CITY FOUND GUILTY.`).
- **Name line and stats** on the dark poster: event (`WOMEN'S 5000M`), athlete names
  when the headline is only the metal, the time / distance / score, `NR` / `GR` / `WR`.
- **Eyebrows and hashtags** by competition: `ASIAN GAMES · AICHI-NAGOYA 2026`,
  `UEFA NATIONS LEAGUE`, `TATA WPL`, `AZERBAIJAN GRAND PRIX` …
- **`tsb-tally`** template (§4.3): giant total, gold / silver / bronze coins, rank.
- **Newsroom**: shooting, archery, squash, wrestling, weightlifting and swimming are
  sports of their own; "India vs Pakistan hockey" is field hockey; medals and the
  Asian Games count as VIMP; three more Indian feeds (Games medals, Olympic-programme
  sports, Sportstar).
- **Dedupe**: the same medal from several outlets is one candidate (athlete + event +
  metal).

Still manual: the athlete photo (feed image → Wikipedia → "Add photo"), and the
medal tally only appears when an outlet writes the numbers in a headline (no medal
table source yet).

## 2.6 The look — 18 Oct 2026 (PR "Studio: posters that look like the page")

Measured against the grid, the Phase 1 posters lacked the photo, the stacked type,
the layers and the finish. What ships now:

- **Cut-outs on the phone.** `public/studio/cutout.js` runs a salience model
  (silueta, the rembg author's U²-Net, 44 MB, Apache-2.0; u2netp 4.5 MB as the
  fallback) with ONNX Runtime Web. The model is downloaded once from the site and
  kept in the browser's cache. The photo never leaves the phone: the desk sends the
  blurred, dimmed backdrop (canvas blur) and the PNG cut-out to the renderer. The
  athlete stands in front of the headline, like the page's posters.
- **Photo link.** `/api/studio/photo?url=` fetches a pasted picture (http(s) only,
  8 MB cap, no private hosts) so the browser can read its pixels; same pipeline as
  Add photo.
- **tsb-dark v2** (`lib/studio/templates.js`): name line with an accent bar, stacked
  headline (name in Playfair Black, the metal word huge in Bodoni Moda Black with a
  five-stop metallic fill and a soft shadow), kicker with a metal bar, stats row,
  medal with ribbon, competition lockup top-right with the flag, tricolour strip
  along the bottom for India, film grain (a tiled turbulence pattern blended over the
  SVG, ~0.1 s). Cream gets scorers under the score and nation flags; the tally gets
  medals with ribbons and the tricolour; MUSC gets the owner's photo under the red
  and the cut-out beside the score.
- **Context lines.** `words.kicker`: the first clause or sentence with a first, a
  record, a gap in years or a number not already in the stats, in caps. Claude
  writes it too when the key is set (`kicker` in the schema, numbers validated).
- **Editable redraw.** Headline, name line, kicker and stats are fields on the desk;
  Redraw (or Enter) re-renders through `POST /api/studio/render` with `words`
  overrides (`cleanWords`: whitelisted, bounded). Share records `edit` with the
  edited words.
- **Fonts added:** Bodoni Moda Black, Anton, Oswald Bold.

Tested end to end in headless Chromium against the mock server: paste link → fetch →
cut out (silueta) → redraw → edit words → redraw. ~14 s for the first cut-out on a
laptop including the model load; later ones take a few seconds.

## 2.7 Paste a story, Post from the newsroom, the world's feeds — 18 Oct 2026

- **Paste a story** (`lib/studio/paste.js`, the box at the top of `/studio`): the
  newsroom's own Copy details text (match or headline, either format) or any headline
  with a line or two under it becomes a story. Scorelines, HOME/AWAY lines, key
  moments with minutes, venue, date and a picture link are read out of the text; a
  picture link is fetched and cut out like any other photo. `POST /api/studio/render`
  takes `paste` (text) or `story` (the parsed story the desk sends back, checked field
  by field by `cleanStory`). Pasted packs are memoized on the story's content.
- **🎨 Post** on every newsroom card and headline opens `/studio?brand=tsb&key=…`
  straight on that story.
- **Feeds** (`lib/sources.js`): 124 feeds. Google News sports editions for 29
  countries (India, UK, US, Australia, Canada, South Africa, Nigeria, Singapore,
  Pakistan, Ireland, New Zealand, Malaysia, Philippines, Kenya, Ghana, UAE,
  Bangladesh, Sri Lanka, Hong Kong, Japan, Germany, Spain, Italy, France, Brazil,
  Argentina, Mexico, Saudi Arabia, South Korea), 45 Google News searches by sport and
  competition (Olympics, world championships, Europe's leagues, Asian, African and
  South American football, cricket leagues, women's cricket and football, Olympic
  sports, motorsport, rugby, cycling, tennis, multi-sport Games), and outlet feeds
  from the UK, US, Canada, France, Germany, New Zealand, Pakistan, Japan, India and
  Olympics.com. Fetched 28 at a time inside the 9 s budget; slow ones finish on the
  next pass.

## 2.8 Closer to the grid — 18 Oct 2026 (PR "Studio: posters that read as the page's")

Measured again against the grid after §2.6, what still read as "template":

- **The blurred backdrop.** The page's posters use the sharp photo full-bleed with the
  athlete placed on purpose. Now the default: the desk finds the athlete with the
  salience model, crops the photo to the poster's shape with the athlete's centre of
  mass about 38% down and the whole figure inside the frame, grades it a touch
  (contrast, saturation), and re-crops when the shape changes. When the athlete sits
  low in the photo, the headline moves to the top (`layout: 'top'`). "Athlete in
  front" (the cut-out over a blurred backdrop) is now the option, off by default.
- **Clip art.** The medal coin and the flag chip are gone from the dark poster.
  India is a tricolour light (saffron top-left, green bottom-right) over the photo
  and a small tricolour rule in the footer. A vignette darkens the corners.
- **Type.** The metal word spans the measure (up to 300 px on a post), with a bevel
  highlight and a soft shadow (two text shadows). Masthead line "THE SPORTS BINGE"
  beside a small badge top-left; competition lockup top-right.
- **Cream.** Now the page's magazine page: "THE SPORTS BINGE / ONLINE MAGAZINE"
  masthead, competition and status line, centred headline, flags with full team
  names, scorers with minutes under each side, centred explainer, rule, handle.

## 2.9 Photos that already carry text — 18 Oct 2026

The owner often pastes a screenshot of another post, so the photo already has words
on it and the Studio's headline landed on top of them. Now, after the athlete is
found, a text detector (PP-OCRv3 det, 2.4 MB, Apache-2.0, `public/studio/models/
textdet.onnx`, run with the same ONNX Runtime Web) marks the printed text:

- Text in a band at the top or the bottom → the crop uses only the clean rows
  (`cleanBand` + `cropHero({ band })`), as long as the photo does not have to be
  blown up more than 1.9× and the athlete's head stays in.
- Text running through the middle, or too little clean photo left → the athlete is
  cut out and stands on a heavily blurred, dimmed backdrop (blur 36 px, brightness
  0.5), so no printed word survives.
- No athlete found and text in the way → the photo is used as it is, and the toast
  says so.

Printed words are never part of the athlete: every text box is cleared from the
salience mask with feathered edges before the cut-out (small type wholly on the
athlete, a jersey name or number, stays). When the cleared text cut through more than
30% of what is left of the athlete, the photo is used as it is and the toast asks for
a clean photo. Several renders can be in flight (the quick first draw, then the one
with the athlete found); only the latest reaches the screen.

The toast names what happened ("Text on the photo cropped away", "… runs through it:
athlete cut out instead"). Checked in headless Chromium with a poster that carries
text through the middle (athlete cut out, text gone), a photo with a caption band at
the bottom (band cropped away) and a plain photo (unchanged).

## 2.10 Page-matched templates — 18 Oct 2026

Style sheets, annotated references and side-by-side scores: `docs/STYLE_SHEETS.md`.
New type engine (`lib/studio/type.js`: opentype.js measuring, fill-the-measure,
balanced line breaks, brushed-metal textures), shared kit (`lib/studio/kit.js`), 12 TSB
layouts (`lib/studio/tsb-templates.js`) and 7 MUSC layouts (`lib/studio/musc-templates.js`),
chosen per story with variants rotating so neighbours differ; posts default to 3:4
(1080×1440), the grid tile shape. The desk lists every layout that suits the story, and
the photo can be dragged, nudged and zoomed; cut-out edges are choked and de-haloed.

## 3. Phases

### Phase 1 — Posters from live data (1 session) — DONE 2026-10-18 (PR #12)
Done when: `/studio` shows today's top 20 stories for each brand, each with a rendered
4:5 poster, caption and hashtags, and a Copy / Download button.
1. `lib/studio/brands/*.js` with the profiles in §0 as data (interests, teams,
   players, competitions, headline rules, palette, badge path, hashtag sets).
2. `lib/studio/score.js` (§5, rules only, no learning yet).
3. `api/studio/candidates.js`: merge matches (`/api/scores`) and headlines
   (`/api/news`), score per brand, return top N with `type` decided by status
   (pre → preview, in → live, post → result, cricket milestones → milestone,
   medal keywords → medal, headline-only → breaking).
4. `lib/studio/writer.js`: Claude prompt that returns `{headline, eyebrow, explainer,
   caption, hashtags, accent}` in the brand voice. Hard rules in the prompt: TSB
   headlines ≤ 6 words, end with a full stop, no questions; MUSC may ask questions and
   use Hinglish; never invent a fact that is not in the match data; numbers verbatim.
5. Templates: `tsb-cream` (result with flags and score: the "Spain take Wembley."
   layout), `tsb-dark` (headline on hero photo with metallic accent),
   `tsb-tally` (medal count, done 18 Oct), `musc-result`, `musc-matchday` (VS, date/time IST,
   FanCode line), `musc-xi` (pitch with names). Each takes a pack and a size.
6. `api/studio/render.js` with `@vercel/og`; cache by pack hash.
7. `public/studio.html`: brand tabs, list of candidates, poster preview, caption box,
   Copy caption, Download PNG, "Not this" button (records feedback).
8. Tests: scoring cases per brand, writer output validation (schema + rules),
   one render smoke test per template.

### Phase 2 — Review desk and scheduling (1 session)
Done when: the owner can approve, edit (headline/caption/time) and schedule packs
from the phone, and the queue survives reloads.
1. `lib/studio/store.js` on Vercel KV: packs, queue states
   (`candidate → drafted → approved → scheduled → published | rejected`), feedback.
2. `api/cron/studio.js` every 10 minutes: new candidates above the brand threshold
   get drafted automatically; packs expire if not approved within their freshness
   window (result: 6 h, preview: until kick-off, breaking: 2 h).
3. Review desk UI: swipe-like list, edit fields, re-render on edit, schedule picker in
   IST, "post now".
4. Push notification when a VIMP story is drafted (web push, or a Telegram bot message
   with the poster and an Approve link; Telegram is simplest on a phone).

### Phase 3 — Posting automation (½ session + owner's Meta setup)
Done when: an approved pack is published to the right Instagram account at its time,
and the post's permalink and first-24h insights are stored.
- Owner setup (one time, ~30 min, instructions in §6).
- `lib/studio/instagram.js`: image post (`POST /{ig-user-id}/media` with `image_url`,
  then `/media_publish`), carousel (children containers → `media_type=CAROUSEL`),
  reel (`media_type=REELS`, `video_url`, poll `status_code` until `FINISHED`).
- `api/studio/publish.js` called by the cron for `scheduled` packs whose time has
  come. Retries, rate limit (Instagram allows 50 API posts per account per 24 h).
- Fallback when the API isn't set up: Telegram message with the PNG and caption; the
  owner posts from the phone in two taps. Keep this even after the API works.

### Phase 4 — Reels (1–2 sessions)
Done when: a "result" or "medal" pack also produces a 10–15 s 1080×1920 MP4.
- Templated reels only: headline reveal → score/stat cards → explainer → end card with
  the badge. Motion: slow zoom on the hero, text wipes, red/gold sweeps.
- Renderer: Remotion (React video). Vercel can't render video; use Remotion Lambda
  (AWS, pay per render, ~₹1–2 per reel) or a small always-on worker (Railway/Fly)
  that polls the queue. Phase 4a: ffmpeg slideshow from the satori frames (zero
  infrastructure, good enough for a first version). Phase 4b: Remotion.
- Optional voice-over with ElevenLabs from the explainer; captions burned in.
- Presenter reels for MUSC: the Studio writes the script, hook line and caption card;
  a human records.

### Phase 5 — Learning what to post (ongoing, see §5)
Done when: the ranking uses the owner's decisions and Instagram's numbers, and the
weekly report shows precision improving.

## 4. Templates — exact specs

Sizes: post 1080×1350; story/reel 1080×1920; square 1080×1080 for the grid preview.
Safe margins 72 px; keep the bottom 250 px of stories clear for the UI.

### 4.1 `tsb-cream` (results, tallies, schedules)
- Background #F3EEE5 with a faint paper texture; thin black rules top and bottom.
- Top-left: round red SPORTS BINGE badge (160 px). Top-right: competition logo or the
  eyebrow in spaced caps.
- Centre: headline in Playfair Display 900, 150–190 px, black, left-aligned, max 3
  lines, auto-fit; full stop always.
- Below: result line `FULL TIME` eyebrow, then `[flag] 2–3 [flag]` with the score in
  200 px serif; team names in spaced caps under the flags.
- Bottom: explainer (Inter 500, 34 px, #333), `@thesportsbinge` right.

### 4.2 `tsb-dark` (milestones, medals, quotes, breaking)
- Hero photo full-bleed, desaturated 10 %, vignette from the bottom (black 85 % →
  0 %) and from the top (black 40 %).
- Headline Playfair Display 900, white, 170–220 px, with the accent word(s) in a
  metallic gradient: gold `#F6D27A→#B8860B`, silver `#F2F2F2→#8A8A8A`, bronze
  `#E2A86B→#8C4A1E`. Which words get the accent: the medal, the number, or the verb
  ("BRONZE", "15,000", "take").
- Eyebrow top-centre; athlete/team name spaced caps under the headline; stat row
  (value big, label small) when `stats` exist; explainer bottom-left; badge bottom-left;
  flag or tricolour strip bottom-right.

### 4.3 `tsb-tally` (medal tables, league tables, season numbers)
- Cream or dark variant. Giant number (37) centred, label under it (TOTAL MEDALS),
  stat strip of four with icons, "as of" date in the eyebrow.

### 4.4 Photos
- The newsroom's headline items carry an image URL from the source feed; ESPN gives
  team logos and flags; athlete photos are not in any free feed.
- Rule: use a photo only when the pack has one from the feed or the owner uploads
  one in the review desk. Otherwise render the cream template, or the dark template
  with a generated abstract background (team colours, stadium bokeh) from an image
  model. Never put a face on a poster that the system didn't get from a source.
- Rights: the pages already use agency photos as fan pages do; the Studio must keep
  the source URL with every image so it can be credited or swapped.

### 4.5 `musc-matchday`, `musc-result`, `musc-xi`
- Red→black diagonal gradient, grain, MUSC crest top-left, competition badge
  top-right.
- `musc-matchday`: two player cut-outs (owner uploads a library of current-squad PNGs
  once; the template picks the top scorer and the opponent's star by name), big `VS`,
  date in IST (`THU, 17TH SEP, 12:30 AM`), `WATCH LIVE ONLY ON FANCODE` strip.
- `musc-result`: score huge in Bebas Neue, scorers with minutes listed, key stat.
- `musc-xi`: pitch graphic, formation from the match details, 11 names in boxes,
  `CONFIRMED XI` or `PREDICTED XI` header.
- Headline: Bebas Neue 220 px, key word in red (#DA291C) or white; Hinglish allowed.

## 5. Teaching the AI what is worth posting

Three layers, each one overrides the one below.

### 5.1 Rules (day one)
Per brand, in `lib/studio/brands/*.js`:
- **Always:** TSB — any India match, any Indian medal/record, ICC events, Kohli/Rohit/
  Bumrah/Neeraj milestones, finals anywhere, F1 race result. MUSC — every United match
  (preview, XI, result), United transfers/injuries, City charges and rival drama,
  Premier League table changes involving United.
- **Never:** youth/reserve sides (except India U19 World Cup), practice sessions,
  lower divisions, anything older than the freshness window.
- **Score** = newsroom tier (VIMP 3 / IMP 2 / low 1) × brand interest multiplier
  (India ×2, United ×3 for MUSC, marquee ×1.5) × freshness (1 at 0 h → 0.3 at 6 h)
  × type weight (result 1, medal 1.2, preview 0.8, live 0.6).
- Threshold to auto-draft: 2.0. Everything above it is drafted; the owner decides.

### 5.2 The owner's decisions (from week one)
Every Approve / Edit / Reject in the review desk is stored with the story's features
(sport, competition, teams, tier, type, hour of day, headline). Once a week a job:
1. Pulls the last 200 decisions.
2. Asks Claude Opus for a short written rule update ("the owner rejects pre-match
   previews for leagues below the Premier League; approves every Indian medal; prefers
   results posted within 30 minutes of full time") and stores it in
   `brands/*.learned.md`, which the writer and the scorer read.
3. Fits per-feature weights (a plain logistic regression in JS, no ML library needed)
   for the score formula. Minimum 50 decisions before weights are trusted.

### 5.3 What Instagram says (from week two)
After publishing, store reach, likes, saves, shares and comments at 1 h and 24 h
(`GET /{media-id}/insights`). Add an "engagement" feature: stories similar to high
performers rank higher. Report every Monday: posts published, approval rate,
median time from event to post, top and bottom 5 posts, rule changes proposed.

### 5.4 Manual training at the start
For the first two weeks the owner trains by doing their normal job in the desk:
approve what they would post, reject what they wouldn't, edit the headline when it
isn't in their voice. Each edit is a lesson for the writer (the edited headline is
stored as an example). Thirty decisions a day for two weeks is enough for §5.2 to
take over most of the ranking.

## 6. Posting automation — the owner's one-time setup

Instagram only allows automated posting through the official Graph API, and only for
**Professional** accounts (Business or Creator) linked to a Facebook Page.
1. Instagram app → Settings → Account type → switch each page to **Business**
   (Creator also works). Link each to a Facebook Page (create one if needed).
2. developers.facebook.com → My Apps → Create app → type **Business**. Add the
   product **Instagram Graph API** (Instagram → "API setup with Facebook login").
3. In the app's Instagram settings add both Instagram accounts as **testers**, and
   accept the invitations from each account (Instagram app → Settings → Website
   permissions → Tester invites). While the app stays in Development mode this is all
   that's needed to post to your own accounts; App Review is only for other people's
   accounts.
4. Graph API Explorer → select the app → permissions `instagram_basic`,
   `instagram_content_publish`, `instagram_manage_insights`, `pages_show_list`,
   `pages_read_engagement` → Generate token → exchange for a **long-lived token**
   (60 days; the Studio refreshes it before expiry).
5. Get each Instagram account's user id (`GET /me/accounts` → page → `instagram_business_account`).
6. Put `IG_TSB_USER_ID`, `IG_TSB_TOKEN`, `IG_MUSC_USER_ID`, `IG_MUSC_TOKEN` in Vercel
   → Project → Settings → Environment Variables.
7. Limits: 50 published posts per account per 24 h via the API; images JPEG ≤ 8 MB,
   aspect between 4:5 and 1.91:1; reels MP4 H.264, 9:16, 3–90 s, ≤ 1 GB; media must
   be at a public HTTPS URL (Vercel Blob).

Until step 6 is done, the Studio sends each approved pack to a Telegram bot (PNG +
caption); posting takes two taps on the phone. Set `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_CHAT_ID`.

Scheduling runs on **Vercel Cron** (`vercel.json` → `crons`): every 10 minutes
`/api/cron/studio` drafts new candidates and publishes anything whose time has come.
Instagram itself has no "schedule" call; the Studio holds the pack and publishes at
the minute.

## 7. Costs
- Vercel Hobby: free (Cron allowed, 1 job per day on Hobby → use Pro at $20/month for
  10-minute crons, or run the cron from GitHub Actions for free).
- Claude API: ~30 packs/day × ~2k tokens ≈ well under $2/month on Sonnet.
- Vercel Blob: pennies. KV: free tier is enough.
- Reels: ffmpeg route free; Remotion Lambda ~₹1–2 per render.
- ElevenLabs voice-over (optional): $5/month tier.

## 8. Risks and rules
- **Facts:** the writer may only use fields from the pack. A validator rejects any
  number in the headline/caption that isn't in the data.
- **Faces and photos:** only from sources or owner uploads (§4.4).
- **Rate limits and bans:** stay under 20 posts/day/account; never post the same
  story twice; respect Instagram's 50/24 h API limit.
- **Freshness beats polish:** a result poster at FT+10 min in the cream template is
  worth more than a photo poster an hour later. The cron drafts the cream version
  first; the dark version can replace it if a photo arrives.
- **Private desk:** `/studio` behind `STUDIO_PASSWORD`; tokens never leave the server.

## 9. Acceptance test for "it reduces my workload"
Day 1 of use: the owner opens `/studio` on the phone, sees the morning's 10 best
stories per page already written and drawn in the page's style, approves 6, edits 2,
rejects 2, and posts them in under 10 minutes. By week 3 the approval rate is above
80 % and results are posted within 15 minutes of full time without the owner being
asked.
