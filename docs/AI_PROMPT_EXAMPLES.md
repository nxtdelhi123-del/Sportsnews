# Example AI prompts

Copied by the newsroom (Copy, Formats → AI prompt) and the Studio (🎨 Copy AI prompt). Paste into ChatGPT, Gemini or similar and attach, in this order:

1. the real photo,
2. the **style reference** the prompt links — a real post from the page in the same layout (the Studio's ⤓ Style reference button downloads it),
3. optionally the badge it links.

Image AIs copy an attached post far more faithfully than any description, so the reference is what makes the result read as the next post in the same grid. All references: `public/studio/refs/`, contact sheet `docs/style-refs.jpg`.

## The Sports Binge — medal

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): Parul Chaudhary wins bronze in women's 5000m at Asian Games — She clocked 15:14.61, a national record.
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact layout: https://sportsnews-delta.vercel.app/studio/refs/tsb-medal-top.jpg
• Image 3 (optional) — our badge: https://sportsnews-delta.vercel.app/studio/brand/tsb-badge.png

STYLE REFERENCE RULES:
• Match the style reference exactly: the same positions, proportions, type sizes, typefaces, letter spacing, colours, metal finish, photo grade, rules and margins. Make it look like the next post in the same series.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

PHOTO:
• I am attaching a real photo of Parul Chaudhary. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Medal post — name on top:
• Background: near-black (#141414) at the top, the photo rising into it from below. Competition logo space top-right (an empty square, I add the Games logo); badge space bottom-left.
• Top 4–7%, left-aligned at a 4% margin: the first name in small widely spaced white serif capitals.
• From 7% to 31% down, left-aligned: the TOP LINE (surname) in white condensed Didone capitals, then the BIG WORD directly under it in brushed metal, both filling the width to a 4% margin; the big word ~1.6x the height of the top line.
• Under it, one row: on the left the EVENT in spaced serif capitals over the competition in tiny caps; a thin vertical white rule; on the right the result (time / distance) in a white condensed serif, right-aligned.
• From 38% down to the bottom: the athlete from the photo, holding the flag wide or celebrating, filling the frame edge to edge; the flag’s colours run across behind them.

TEXT (exact words, exact spelling — nothing else):
• TOP LINE: "PARUL CHAUDHARY"
• BIG WORD: "BRONZE"
• EVENT / NAME LINE: "WOMEN'S 5000M"
• KICKER: "A NATIONAL RECORD"
• STAT: "15:14.61 — Time"
• COMPETITION: "ASIAN GAMES · AICHI-NAGOYA 2026"
• HANDLE: "@thesportsbinge"

LOOK:
• TYPE: an extra-condensed, very high-contrast Didone serif in black weight for the big words (like the condensed display cuts of Bodoni / Didot used by sports magazines), a semi-condensed heavy serif for sentence-case headlines, and a clean geometric sans (Montserrat) in widely spaced capitals for labels. Tight tracking on display words, generous tracking (0.3em) on labels.
• METAL: gold #F7E3A1→#C8962E→#7A5512, silver #FFFFFF→#B9BCC4→#6E7079, bronze #F6C49A→#C77A44→#6E3714 — a brushed-metal fill with a bright band a third of the way down, a darker foot, fine grain, and a soft dark drop shadow so it lifts off the photo. Never glossy 3D chrome.
• COLOUR: ink #121212, cream #F1ECE2, navy #0F1B33, breaking red #D7191C. For India: saffron #FF9933, white, green #138808 as light, paint strokes or a thin rule — never a cartoon flag icon.
• PHOTO GRADE: deep blacks, contrast up slightly, saturation up slightly, the background darkened so the athlete pops, a soft vignette, a dark gradient (to about 85% black) only where text sits. Fine film grain over the whole image.

MUST NOT LOOK AI-GENERATED:
• Make it look like a real post designed in Photoshop by a sports media page and shot by an agency photographer — NOT like AI art.
• Photo: real editorial sports photography (Getty / Reuters / AP style), 70–200mm telephoto look, natural skin texture with pores, real sweat and fabric folds, real stadium light and crowd bokeh, correct hands and fingers, correct kit, correct equipment.
• Do NOT add: plastic or airbrushed skin, glowing outlines, lens flares, sparkles, lightning, smoke, motion streaks, neon, 3D chrome text, bevel/emboss, fantasy backgrounds, extra people, duplicated limbs, warped numbers on shirts, made-up sponsor logos, made-up text anywhere.
• Text: render ONLY the words listed under TEXT, spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos and badges: do NOT draw or imitate any brand badge, club crest, competition logo or sponsor mark. If I attached our badge, place that exact image, unchanged, in the badge space (a circle about 110px across); otherwise leave the badge space as a clean empty circle — I add the real logo myself. Competition logo spaces stay empty.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; the badge space holds only our attached badge or nothing; nothing is cropped at the edges.
```

## The Sports Binge — team medal

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): India's men's 50m rifle 3P team win silver at Asian Games — Aishwary Pratap Singh Tomar, Rudrankksh Patil and Niraj Kumar took silver.
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact layout: https://sportsnews-delta.vercel.app/studio/refs/tsb-team.jpg
• Image 3 (optional) — our badge: https://sportsnews-delta.vercel.app/studio/brand/tsb-badge.png

STYLE REFERENCE RULES:
• Match the style reference exactly: the same positions, proportions, type sizes, typefaces, letter spacing, colours, metal finish, photo grade, rules and margins. Make it look like the next post in the same series.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

PHOTO:
• I am attaching a real photo of the athlete or team in the story. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Team medal — the squad and one huge word:
• Background: dark, the venue blurred behind. Competition in tiny spaced caps top-left; badge space top-right; competition logo space under the competition.
• From 12% to 18%: the EVENT in widely spaced serif capitals, 2 lines, centred.
• From 20% to 72%: the team from the photo standing side by side with their medals, waist up, evenly spaced.
• From 60% to 80%: the BIG WORD huge in brushed metal across the full width (3% margins), overlapping the athletes’ waists, with a soft dark shadow.
• A TOP LINE, if given, sits just above the big word in small white spaced caps.
• Under it: one line of spaced caps saying what happened, then the NAMES ROW — one name per column in tiny spaced caps, the columns split by thin vertical rules.
• Very bottom: a painted sweep of the country’s flag colours across the width.

TEXT (exact words, exact spelling — nothing else):
• TOP LINE: "INDIA"
• BIG WORD: "SILVER"
• EVENT / NAME LINE: "MEN'S 50M RIFLE 3 POSITIONS · TEAM EVENT"
• NAMES ROW (one per column): "AISHWARY PRATAP SINGH TOMAR | RUDRANKKSH PATIL | NIRAJ KUMAR"
• COMPETITION: "ASIAN GAMES 2026 · AICHI-NAGOYA"
• HANDLE: "@thesportsbinge"

LOOK:
• TYPE: an extra-condensed, very high-contrast Didone serif in black weight for the big words (like the condensed display cuts of Bodoni / Didot used by sports magazines), a semi-condensed heavy serif for sentence-case headlines, and a clean geometric sans (Montserrat) in widely spaced capitals for labels. Tight tracking on display words, generous tracking (0.3em) on labels.
• METAL: gold #F7E3A1→#C8962E→#7A5512, silver #FFFFFF→#B9BCC4→#6E7079, bronze #F6C49A→#C77A44→#6E3714 — a brushed-metal fill with a bright band a third of the way down, a darker foot, fine grain, and a soft dark drop shadow so it lifts off the photo. Never glossy 3D chrome.
• COLOUR: ink #121212, cream #F1ECE2, navy #0F1B33, breaking red #D7191C. For India: saffron #FF9933, white, green #138808 as light, paint strokes or a thin rule — never a cartoon flag icon.
• PHOTO GRADE: deep blacks, contrast up slightly, saturation up slightly, the background darkened so the athlete pops, a soft vignette, a dark gradient (to about 85% black) only where text sits. Fine film grain over the whole image.

MUST NOT LOOK AI-GENERATED:
• Make it look like a real post designed in Photoshop by a sports media page and shot by an agency photographer — NOT like AI art.
• Photo: real editorial sports photography (Getty / Reuters / AP style), 70–200mm telephoto look, natural skin texture with pores, real sweat and fabric folds, real stadium light and crowd bokeh, correct hands and fingers, correct kit, correct equipment.
• Do NOT add: plastic or airbrushed skin, glowing outlines, lens flares, sparkles, lightning, smoke, motion streaks, neon, 3D chrome text, bevel/emboss, fantasy backgrounds, extra people, duplicated limbs, warped numbers on shirts, made-up sponsor logos, made-up text anywhere.
• Text: render ONLY the words listed under TEXT, spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos and badges: do NOT draw or imitate any brand badge, club crest, competition logo or sponsor mark. If I attached our badge, place that exact image, unchanged, in the badge space (a circle about 110px across); otherwise leave the badge space as a clean empty circle — I add the real logo myself. Competition logo spaces stay empty.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; the badge space holds only our attached badge or nothing; nothing is cropped at the edges.
```

## The Sports Binge — two finals

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): India's men and women both into the kabaddi finals — Women beat Nepal: India 48-24 Nepal. Men beat Thailand: India 66-28 Thailand.
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact layout: https://sportsnews-delta.vercel.app/studio/refs/tsb-scores.jpg
• Image 3 (optional) — our badge: https://sportsnews-delta.vercel.app/studio/brand/tsb-badge.png

STYLE REFERENCE RULES:
• Match the style reference exactly: the same positions, proportions, type sizes, typefaces, letter spacing, colours, metal finish, photo grade, rules and margins. Make it look like the next post in the same series.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

PHOTO:
• I am attaching a real photo of the athlete or team in the story. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Two results — two score panels:
• Thin corner brackets in the four corners. Competition in tiny spaced serif caps top-centre.
• Top 0–50%: the team(s) from the photo in action, fading into navy-black.
• From 40% to 66%: the HEADLINE in 2 lines, centred: line 1 white, line 2 brushed gold, each filling the width.
• Under it: the KICKER in 2 lines of spaced white caps.
• Then two panels side by side split by a thin rule: each has a label in gold spaced caps ("WOMEN" / "MEN") over a row "TEAM  48–24  TEAM" with the score in gold.
• Under them: one line of tiny caps, then a thin gold-outlined pill with a date line. Badge space bottom-left, competition logo space bottom-right.

TEXT (exact words, exact spelling — nothing else):
• HEADLINE: "ONE DAY. TWO FINALS."
• KICKER: "INDIA'S MEN & WOMEN ARE BOTH IN THE FINALS"
• SCORE PANEL 1: "WOMEN: INDIA 48–24 NEPAL"
• SCORE PANEL 2: "MEN: INDIA 66–28 THAILAND"
• COMPETITION: "ASIAN GAMES 2026 · AICHI-NAGOYA"
• HANDLE: "@thesportsbinge"

LOOK:
• TYPE: an extra-condensed, very high-contrast Didone serif in black weight for the big words (like the condensed display cuts of Bodoni / Didot used by sports magazines), a semi-condensed heavy serif for sentence-case headlines, and a clean geometric sans (Montserrat) in widely spaced capitals for labels. Tight tracking on display words, generous tracking (0.3em) on labels.
• METAL: gold #F7E3A1→#C8962E→#7A5512, silver #FFFFFF→#B9BCC4→#6E7079, bronze #F6C49A→#C77A44→#6E3714 — a brushed-metal fill with a bright band a third of the way down, a darker foot, fine grain, and a soft dark drop shadow so it lifts off the photo. Never glossy 3D chrome.
• COLOUR: ink #121212, cream #F1ECE2, navy #0F1B33, breaking red #D7191C. For India: saffron #FF9933, white, green #138808 as light, paint strokes or a thin rule — never a cartoon flag icon.
• PHOTO GRADE: deep blacks, contrast up slightly, saturation up slightly, the background darkened so the athlete pops, a soft vignette, a dark gradient (to about 85% black) only where text sits. Fine film grain over the whole image.

MUST NOT LOOK AI-GENERATED:
• Make it look like a real post designed in Photoshop by a sports media page and shot by an agency photographer — NOT like AI art.
• Photo: real editorial sports photography (Getty / Reuters / AP style), 70–200mm telephoto look, natural skin texture with pores, real sweat and fabric folds, real stadium light and crowd bokeh, correct hands and fingers, correct kit, correct equipment.
• Do NOT add: plastic or airbrushed skin, glowing outlines, lens flares, sparkles, lightning, smoke, motion streaks, neon, 3D chrome text, bevel/emboss, fantasy backgrounds, extra people, duplicated limbs, warped numbers on shirts, made-up sponsor logos, made-up text anywhere.
• Text: render ONLY the words listed under TEXT, spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos and badges: do NOT draw or imitate any brand badge, club crest, competition logo or sponsor mark. If I attached our badge, place that exact image, unchanged, in the badge space (a circle about 110px across); otherwise leave the badge space as a clean empty circle — I add the real logo myself. Competition logo spaces stay empty.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; the badge space holds only our attached badge or nothing; nothing is cropped at the edges.
```

## MUSC — result

```
You are the senior designer of MUSC Red Devils (@musc_reddevils) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): Manchester United 4 – 1 Burnley · Premier League · Old Trafford
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE for type, colour and grade only (a real @musc_reddevils post; the layout below differs): https://sportsnews-delta.vercel.app/studio/refs/musc-matchday.jpg
• Image 3 (optional) — our badge: https://sportsnews-delta.vercel.app/studio/brand/musc-crest.png

STYLE REFERENCE RULES:
• Match the style reference’s typefaces, colours, metal finish, photo grade and finish; follow the LAYOUT below for positions.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

PHOTO:
• I am attaching a real photo of Manchester United and Burnley players. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Result:
• Full-bleed photo of United players celebrating, graded red; left side darkened.
• Left column: crest and the score huge in white condensed capitals, "MAN UTD v OPPONENT" small under it, then scorers as rows "27’ | M. CUNHA" with a thin red bar between minute and name.
• Bottom: the HEADLINE in 2 lines of ultra-condensed heavy capitals, cream, the accent word in red; competition and handle in tiny caps under it. A red "FULL TIME" tag top-right.

TEXT (exact words, exact spelling — nothing else):
• HEADLINE: "STATEMENT MADE."
• TEAM 1: "Manchester United"
• TEAM 2: "Burnley"
• SCORE: "4–1"
• SCORERS UNDER MANCHESTER UNITED: "Matheus Cunha 27', Bruno Fernandes 42'"
• VENUE: "Old Trafford, Manchester"
• COMPETITION: "PREMIER LEAGUE · 2026/27"
• TAG: "FULL TIME"
• HANDLE: "@musc_reddevils"

LOOK:
• TYPE: an ultra-condensed heavy grotesque (like Anton / Bebas Neue / Druk) in capitals for headlines, cream #F3E6D0 with a faint print texture, accent words in Manchester United red #DA291C; condensed bold sans (Oswald) in spaced capitals for labels.
• COLOUR: United red #DA291C, deep maroon shadows, black #0B0B0D, cream #F3E6D0. Yellow #FFD23F only for matchday dates, orange #FF7A1A only for FANCODE.
• PHOTO GRADE: shadows pushed toward maroon, contrast up, a red-to-black fade under the text, a soft vignette, fine grain.

MUST NOT LOOK AI-GENERATED:
• Make it look like a real post designed in Photoshop by a sports media page and shot by an agency photographer — NOT like AI art.
• Photo: real editorial sports photography (Getty / Reuters / AP style), 70–200mm telephoto look, natural skin texture with pores, real sweat and fabric folds, real stadium light and crowd bokeh, correct hands and fingers, correct kit, correct equipment.
• Do NOT add: plastic or airbrushed skin, glowing outlines, lens flares, sparkles, lightning, smoke, motion streaks, neon, 3D chrome text, bevel/emboss, fantasy backgrounds, extra people, duplicated limbs, warped numbers on shirts, made-up sponsor logos, made-up text anywhere.
• Text: render ONLY the words listed under TEXT, spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos and badges: do NOT draw or imitate any brand badge, club crest, competition logo or sponsor mark. If I attached our badge, place that exact image, unchanged, in the badge space (a circle about 110px across); otherwise leave the badge space as a clean empty circle — I add the real logo myself. Competition logo spaces stay empty.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; the badge space holds only our attached badge or nothing; nothing is cropped at the edges.
```
