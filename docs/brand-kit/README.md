# The Sports Binge brand kit

Built 22 Nov 2026 from the page's own posts (INDIA. TWICE ON THE PODIUM., KNOCKED OUT
WITHOUT PLAYING., THIRD STRAIGHT TITLE.), the editor's feedback (headlines with depth, not
"dead"; players bright and never covered) and a study of @sportsgully's formats. Formats are
borrowed from Sports Gully; nothing of their branding is.

## Logo
- **Badge**: the round cream disc (THE / SPORTS / BINGE in copper leaf / ONLINE MAGAZINE),
  `public/studio/brand/tsb-badge.png`. Bottom-right of the footer, 84 px on a 1080 px post
  (120 px on photo-led medal posts). Never over a face or the action.
- **Header lockup**: a 3 px white bar, then THE / SPORTS BINGE in Montserrat caps, top-left of
  every post. The competition sits top-right in spaced caps with a 70 px rule under it.
- **Wordmark**: `public/studio/brand/tsb-wordmark.png` for banners and Reels end cards.

## Colour
| Role | Hex | Use |
| --- | --- | --- |
| Night navy | `#0A0E17` | every background; photos blend into it |
| Panel ink | `#141A26` | tables, boxes |
| Ivory | `#F4EFE6` | headline line 1, body |
| Copper leaf | `#E08A4C` (texture `#F2A066`→`#7A3012`) | the key headline lines, big numbers |
| Gold | `#D4AF37` | box frames, scoreboard, status pills, gold medals |
| Gold leaf | `#E9C46A` | gold-medal headlines (`accent: "goldleaf"`) |
| Silver | `#D9DBE0` | silver medals |
| Live red | `#E3242B` | ● LIVE and BREAKING only |

The project brief's palette (`#0B0E14`, `#1B212B`, `#D4AF37`, `#F7F2E6`) maps onto the same
roles. Copper replaces gold as the headline metal because that is what the page's real posts
use; gold stays for frames and gold medals.

## Type
| Role | Font | Setting |
| --- | --- | --- |
| Headline | Abril Fatface (fat Didone) | ALL CAPS, 2–3 lines each filling the width, tracking −0.028 em, line 1 ivory, the rest copper leaf with a soft shadow, ends with a full stop |
| Labels, kickers | Montserrat Medium / Bold | ALL CAPS, tracking 0.2–0.3 em |
| Names in tables | Noto Serif Display Condensed Black | ALL CAPS |
| Quotes | Noto Serif Display SemiCondensed ExtraBold | sentence case, the key phrase in copper |
| Body (carousel slides) | Montserrat Medium 30 px | sentence case, 2–4 sentences |

The "3D" look is the copper leaf: a hammered foil texture lit from the top left, a darker foot
on each line and a soft cast shadow. No extruded sides (they hurt legibility at grid size).

## Photos
- Real photos first, at least 1080 px wide after the crop, sharpened by `polishHero`.
- Text never covers a face. Only a short blend at the photo's top edge and a dark floor under
  stats. Set `photoPos` ("center 15%", "62% 30%") to keep heads in frame.
- Credit every photo (`credit`) and name the source (`source`) on the post.

## Where the 3D comes from (Sports Gully study, 22 Nov)
Their letters are flat. The depth comes from the athlete cut out and standing in front of the
type, a glow behind them, and big stroked numerals in the back. `tsb-cutout` does this with our
copper leaf, plus a bevel highlight and a short offset shadow on the letters. Use it for the
biggest story of the day; alternate type-led cards with `tsb-photo` so neighbouring grid tiles
differ.

## Captions and collabs
- 40–60 words: the news in line 1, 2–3 short factual lines, then "Status · Source", the photo
  credit, and exactly 5 hashtags ending #TheSportsBinge.
- No collab posts by default. The only exceptions are MUFC for Manchester United topics and
  NXT for esports topics.
- Content ideas: `content-calendar-prompt.md` in the project's brand-kit folder.

## Templates
All 3:4 (1080 × 1440), registered in `lib/studio/templates.js`, so the Studio and
`/api/studio/render?template=…` can use them. Examples: `examples.json` →
`node scripts/brand-kit.mjs docs/brand-kit/examples.json <outDir> <photoDir>`.

| Post | Template | Key `words` fields |
| --- | --- | --- |
| Breaking / news | `tsb-breaking` | headline, kicker, status, flash (pill text) |
| Match result | `tsb-scoreline` | headline, home/away {name, nation, score}, label, detail (fills from a feed match) |
| Pre-match preview | `tsb-matchday` | headline, kicker, home/away, when [{label, value}] (fills from a feed match) |
| Stat card / big-number split | `tsb-split` | headline, split [{value, label, note}] ×2, verdict |
| Data card (scoreline strip, top 5, then v now) | `tsb-facts` | headline, kicker, rows [{tag, label, note, value, hot}] |
| Quote | `tsb-said` | quote (\*phrase\* in copper), name, role, status |
| Transfer / signing / trade | `tsb-signing` | headline, status, from, to, stats ×3 |
| Player spotlight | `tsb-spotlight` | name, label, kicker, stats ×2–4 |
| Medal tally | `tsb-medals` | headline, tableLabel, tally [{label, gold, silver, bronze, total, hot}] |
| LIVE cover | `tsb-live` | headline, updated, updates [{time, text}] |
| Carousel cover | `tsb-breaking` with `swipe: true` | as breaking |
| Carousel inner slide | `tsb-slide` | n, of, label, headline, body, stats |
| Cut-out headline | `tsb-cutout` | headline, eyebrowLine, ghost (big stroked numeral), kicker, stats; needs `assets.cutout` (transparent PNG) |
| Photo-first | `tsb-photo` | headline, kicker, status; the photo fills the frame |
| Series strip | `tsb-strip` | headline, strips [{label, home, away, result or scores}] with one photo per band in `assets.strips` |
| Medal posts (existing) | `tsb-headline` | headline ending GOLD/SILVER/BRONZE, podium |

Every number on a poster comes from `words`; the templates never invent or fill one in.
Status pills: Confirmed (gold), Reported (ivory), Developing (amber), Unverified (grey).
