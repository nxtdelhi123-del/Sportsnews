# Example AI prompts

Copied by the newsroom (Copy, Formats → AI prompt) and the Studio (🎨 Copy AI prompt). The Sports Binge prompts use the **update style** (read from the SMRITI MANDHANA, SHAFALI VERMA BREAK WORLD RECORD post) unless the Studio's style menu or Formats → "classic medal style" asks for the classic layouts. Paste into ChatGPT, Gemini or similar and attach, in this order:

1. the real photo,
2. the **style reference** the prompt links — a real post from the page in the same layout (the Studio's ⤓ Style reference button downloads it),
3. the **logo sheet** it links — our wordmark, the competition emblem and the teams' crests or flags (the Studio's ⤓ Logos button downloads it).

Image AIs copy an attached post far more faithfully than any description, so the reference is what makes the result read as the next post in the same grid, and the logo sheet is what puts the real logos on it instead of invented ones. All references: `public/studio/refs/`, contact sheet `docs/style-refs.jpg`.

## The Sports Binge — update style (default)

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image in the page's update style.

STORY (facts only — do not add any): Smriti Mandhana, Shafali Verma break world record — Become first pair to tally 3000 partnership runs in T20Is.
FORMAT: 1080×1350 (4:5 portrait, the page’s post shape), edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo. Extra photos of the same story, if attached, are for the ghost images.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact style: https://sportsnews-delta.vercel.app/studio/refs/tsb-update.jpg
• Image 3 — LOGO SHEET, our real logos for this post: https://sportsnews-delta.vercel.app/api/studio/logos?brand=tsb

STYLE REFERENCE RULES:
• Make it the next post in the same series as the style reference: the same grid, margins, edge bars, logo position, label styles, headline typeface and gold, photo treatment with ghosts, footer and proportions.
• Copy NOTHING else from it: none of its words, people, numbers, kit or logos. All words come from TEXT; the people come from the real photo.

LOGOS (from the logo sheet — copy exactly, never redraw or invent):
• BRAND LOGO: our wordmark (THE / SPORTS in white, BINGE in gold, ONLINE MAGAZINE tiny) top-left, about 165px wide, 62px from the left and 32px from the top.
• COMPETITION LOGO: none — do not add one.
• Do not draw the logo sheet itself: no grey tiles, labels or heading from it.

PHOTO:
• I am attaching a real photo of Smriti Mandhana. Use it EXACTLY as given: do not redraw, retouch, beautify or change any face, body, hair, kit, numbers or logos. You may only cut out, crop, scale, place, colour-grade and make black-and-white ghost copies of it.
• If you cannot keep a real person’s face unchanged, leave the photo area dark rather than generating a lookalike.

LAYOUT — The Sports Binge update post (positions at 1080 wide):
• Background near-black with a soft vignette. A solid yellow bar 18px wide runs down the full left edge; a second yellow bar 18px wide covers only the bottom 10% of the right edge.
• Top-left: the brand logo. Top-right, right-aligned 36px from the edge: the CORNER TAG in two lines of light spaced capitals (~20px, 0.35em tracking) with a 90px yellow rule under it.
• At 16% down, left: the CATEGORY — a 3px yellow vertical tick, then spaced capitals (~20px), with a white hairline under it running ~300px.
• At 20% down: the MATCH LINE in spaced white capitals (~24px, 0.25em tracking).
• From 23% to about 64% down, left-aligned, in a column about half the width: the HEADLINE LINES in order, each in its colour at about the cap height given (short lines bigger), tight leading, no line wider than ~55% of the canvas.
• Under the headline: the SUBLINE in spaced white capitals (~26px, 0.2em tracking, one or two lines within the headline column), then a short yellow rule 130×5px.
• Right side, from about 18% down to the bottom edge: the real photo — the subject(s) cut out cleanly in full colour, filling the right half, their left edge falling off into the black; they may pass behind the end of a long headline line but never cover a letter.
• Behind everything: black-and-white ghost copies of the photo (or the extra photos) at 20–35% opacity — one large and soft in the top-right behind the subject’s head, one in the bottom-left quarter (a wider or back view) fading up into the black.
• Footer, bottom 6%: the CREDIT bottom-left at the left margin — line 1 in regular sans (~22px), "SPORTSBINGE" under it in bold sans (~28px), white; the HANDLE bottom-right in yellow regular sans (~24px), on the same baseline as SPORTSBINGE.

TEXT (exact words, exact spelling — nothing else; any text spot in the LAYOUT with no line here is left out, never filled with made-up words or numbers):
• CORNER TAG (two lines): "SPORTS / UPDATE"
• CATEGORY: "CRICKET"
• MATCH LINE: "IND-W VS ZIM-W 2026"
• HEADLINE LINE 1: "SMRITI" — WHITE, about 119px cap height
• HEADLINE LINE 2: "MANDHANA," — GOLD, about 92px cap height
• HEADLINE LINE 3: "SHAFALI VERMA" — GOLD, about 74px cap height
• HEADLINE LINE 4: "BREAK" — WHITE, about 135px cap height
• HEADLINE LINE 5: "WORLD RECORD" — WHITE, about 78px cap height
• SUBLINE: "BECOME FIRST PAIR TO TALLY 3000 PARTNERSHIP RUNS IN T20IS"
• CREDIT LINE 1 (source): "India.com"
• CREDIT LINE 2: "SPORTSBINGE"
• HANDLE: "@thesportsbinge"

LOOK:
• TYPE: headline in a heavy condensed grotesque sans, all capitals, flat fill, tight leading (0.95) and tight tracking — like Bebas Neue Bold / Anton / Druk Condensed. Labels, sublines, credit and handle in a clean geometric sans (Poppins / Montserrat): labels medium weight with 0.25–0.35em letter spacing, "SPORTSBINGE" in the credit bold. No serif anywhere except inside our wordmark.
• COLOUR: background near-black #0A0A0A; white #FFFFFF; the gold of the names a soft vertical gradient #F7D98A → #F0B43A; accent yellow #F5B52D for the edge bars, the category tick, the rules and the handle. Nothing else is coloured except the photo.
• PHOTO: the subject in full, natural colour with warm stadium light, contrast slightly up, cut out cleanly with a soft dark falloff where it meets the type; ghosts are black-and-white, low contrast, 20–35% opacity, softly blurred at their edges; the whole canvas carries a soft vignette and very fine grain.
• RHYTHM: lots of black space; everything on the left aligned to one margin (62px at 1080 wide); the headline is the loudest thing, the photo second, all other text small and quiet.

MUST NOT LOOK AI-GENERATED:
• Make it look like a real post designed in Photoshop by a sports media page and shot by an agency photographer — NOT like AI art.
• Photo: real editorial sports photography (Getty / Reuters / AP style), 70–200mm telephoto look, natural skin texture with pores, real sweat and fabric folds, real stadium light and crowd bokeh, correct hands and fingers, correct kit, correct equipment.
• Do NOT add: plastic or airbrushed skin, glowing outlines, lens flares, sparkles, lightning, smoke, motion streaks, neon, 3D chrome text, bevel/emboss, fantasy backgrounds, extra people, duplicated limbs, warped numbers on shirts, made-up sponsor logos, made-up text anywhere.
• Text: render ONLY the words listed under TEXT (plus the lettering inside the real logos), spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos: only the real ones from the attached logo sheet, each copied exactly — same shapes, colours, letters and proportions, crisp edges, no redrawing. Never invent, approximate or add a logo, and no sponsor marks beyond those already on the real photo.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; the yellow edge bars, wordmark, corner tag, category tick, headline colours and footer are all there; every word matches the TEXT list letter for letter; no extra text; faces untouched; every logo matches the logo sheet exactly; nothing is cropped at the edges.
```

## The Sports Binge — update style, live match

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image in the page's update style.

STORY (facts only — do not add any): South Africa 20/2 (12.2 ov) –  Australia · Australia tour of South Africa · St George's Park
FORMAT: 1080×1350 (4:5 portrait, the page’s post shape), edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo. Extra photos of the same story, if attached, are for the ghost images.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact style: https://sportsnews-delta.vercel.app/studio/refs/tsb-update.jpg
• Image 3 — LOGO SHEET, our real logos for this post: https://sportsnews-delta.vercel.app/api/studio/logos?brand=tsb&t1=South+Africa&t2=Australia

STYLE REFERENCE RULES:
• Make it the next post in the same series as the style reference: the same grid, margins, edge bars, logo position, label styles, headline typeface and gold, photo treatment with ghosts, footer and proportions.
• Copy NOTHING else from it: none of its words, people, numbers, kit or logos. All words come from TEXT; the people come from the real photo.

LOGOS (from the logo sheet — copy exactly, never redraw or invent):
• BRAND LOGO: our wordmark (THE / SPORTS in white, BINGE in gold, ONLINE MAGAZINE tiny) top-left, about 165px wide, 62px from the left and 32px from the top.
• COMPETITION LOGO: none — do not add one.
• FLAGS / CRESTS: SOUTH AFRICA — its real flag; AUSTRALIA — its real flag, from the logo sheet, small (about 44px tall) at the start of each SCORE ROW.
• Do not draw the logo sheet itself: no grey tiles, labels or heading from it.

PHOTO:
• I am attaching a real photo of South Africa and Australia players. Use it EXACTLY as given: do not redraw, retouch, beautify or change any face, body, hair, kit, numbers or logos. You may only cut out, crop, scale, place, colour-grade and make black-and-white ghost copies of it.
• If you cannot keep a real person’s face unchanged, leave the photo area dark rather than generating a lookalike.

LAYOUT — The Sports Binge update post (positions at 1080 wide):
• Background near-black with a soft vignette. A solid yellow bar 18px wide runs down the full left edge; a second yellow bar 18px wide covers only the bottom 10% of the right edge.
• Top-left: the brand logo. Top-right, right-aligned 36px from the edge: the CORNER TAG in two lines of light spaced capitals (~20px, 0.35em tracking) with a 90px yellow rule under it.
• At 16% down, left: the CATEGORY — a 3px yellow vertical tick, then spaced capitals (~20px), with a white hairline under it running ~300px.
• At 20% down: the MATCH LINE in spaced white capitals (~24px, 0.25em tracking).
• From 23% to about 64% down, left-aligned, in a column about half the width: the HEADLINE LINES in order, each in its colour at about the cap height given (short lines bigger), tight leading, no line wider than ~55% of the canvas.
• Under the headline: the SUBLINE in spaced white capitals (~26px, 0.2em tracking, one or two lines within the headline column), then a short yellow rule 130×5px.
• Under the rule: the SCORE ROWS, one per team — flag or crest, the team name in white condensed capitals (~44px), the score in gold condensed (~56px); thin white hairline between the rows. A DATE & TIME line, if given, in spaced white capitals under them.
• Right side, from about 18% down to the bottom edge: the real photo — the subject(s) cut out cleanly in full colour, filling the right half, their left edge falling off into the black; they may pass behind the end of a long headline line but never cover a letter.
• Behind everything: black-and-white ghost copies of the photo (or the extra photos) at 20–35% opacity — one large and soft in the top-right behind the subject’s head, one in the bottom-left quarter (a wider or back view) fading up into the black.
• Footer, bottom 6%: the CREDIT bottom-left at the left margin — line 1 in regular sans (~22px), "SPORTSBINGE" under it in bold sans (~28px), white; the HANDLE bottom-right in yellow regular sans (~24px), on the same baseline as SPORTSBINGE.

TEXT (exact words, exact spelling — nothing else; any text spot in the LAYOUT with no line here is left out, never filled with made-up words or numbers):
• CORNER TAG (two lines): "LIVE / UPDATE"
• CATEGORY: "CRICKET"
• MATCH LINE: "SA VS AUS 2026"
• HEADLINE LINE 1: "SOUTH AFRICA" — GOLD, about 78px cap height
• HEADLINE LINE 2: "VS" — WHITE, about 56px cap height
• HEADLINE LINE 3: "AUSTRALIA" — GOLD, about 92px cap height
• SUBLINE: "ST GEORGE'S PARK"
• SCORE ROW 1: "SOUTH AFRICA — 20/2 (12.2 ov)"
• SCORE ROW 2: "AUSTRALIA"
• CREDIT LINE 2: "SPORTSBINGE"
• HANDLE: "@thesportsbinge"

LOOK:
• TYPE: headline in a heavy condensed grotesque sans, all capitals, flat fill, tight leading (0.95) and tight tracking — like Bebas Neue Bold / Anton / Druk Condensed. Labels, sublines, credit and handle in a clean geometric sans (Poppins / Montserrat): labels medium weight with 0.25–0.35em letter spacing, "SPORTSBINGE" in the credit bold. No serif anywhere except inside our wordmark.
• COLOUR: background near-black #0A0A0A; white #FFFFFF; the gold of the names a soft vertical gradient #F7D98A → #F0B43A; accent yellow #F5B52D for the edge bars, the category tick, the rules and the handle. Nothing else is coloured except the photo.
• PHOTO: the subject in full, natural colour with warm stadium light, contrast slightly up, cut out cleanly with a soft dark falloff where it meets the type; ghosts are black-and-white, low contrast, 20–35% opacity, softly blurred at their edges; the whole canvas carries a soft vignette and very fine grain.
• RHYTHM: lots of black space; everything on the left aligned to one margin (62px at 1080 wide); the headline is the loudest thing, the photo second, all other text small and quiet.

MUST NOT LOOK AI-GENERATED:
• Make it look like a real post designed in Photoshop by a sports media page and shot by an agency photographer — NOT like AI art.
• Photo: real editorial sports photography (Getty / Reuters / AP style), 70–200mm telephoto look, natural skin texture with pores, real sweat and fabric folds, real stadium light and crowd bokeh, correct hands and fingers, correct kit, correct equipment.
• Do NOT add: plastic or airbrushed skin, glowing outlines, lens flares, sparkles, lightning, smoke, motion streaks, neon, 3D chrome text, bevel/emboss, fantasy backgrounds, extra people, duplicated limbs, warped numbers on shirts, made-up sponsor logos, made-up text anywhere.
• Text: render ONLY the words listed under TEXT (plus the lettering inside the real logos), spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos: only the real ones from the attached logo sheet, each copied exactly — same shapes, colours, letters and proportions, crisp edges, no redrawing. Never invent, approximate or add a logo, and no sponsor marks beyond those already on the real photo.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; the yellow edge bars, wordmark, corner tag, category tick, headline colours and footer are all there; every word matches the TEXT list letter for letter; no extra text; faces untouched; every logo matches the logo sheet exactly; nothing is cropped at the edges.
```

## The Sports Binge — classic medal style

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): Parul Chaudhary wins bronze in women's 5000m at Asian Games — She clocked 15:14.61, a national record.
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact layout: https://sportsnews-delta.vercel.app/studio/refs/tsb-medal-top.jpg
• Image 3 — LOGO SHEET, our real logos for this post: https://sportsnews-delta.vercel.app/api/studio/logos?brand=tsb&c=ASIAN+GAMES+2026

STYLE REFERENCE RULES:
• Match the style reference exactly: the same positions, proportions, type sizes, typefaces, letter spacing, colours, metal finish, photo grade, rules and margins. Make it look like the next post in the same series.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

LOGOS (from the logo sheet — copy exactly, never redraw or invent):
• BRAND LOGO: our wordmark — "THE" in white with a thin white rule running right of it, "SPORTS" in white heavy high-contrast Didone capitals, "BINGE" under it in gold at the same width, "ONLINE MAGAZINE" in tiny widely spaced white capitals under that; a tight flush-left block about 20% of the poster width. It is on the logo sheet; reproduce it exactly where the LAYOUT says "brand logo" (top-left if it doesn't say).
• COMPETITION LOGO: the ASIAN GAMES 2026 emblem from the logo sheet, on a white circle, where the LAYOUT says "competition logo".
• Do not draw the logo sheet itself: no grey tiles, labels or heading from it.

PHOTO:
• I am attaching a real photo of Parul Chaudhary. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Medal post — name and metal on top:
• Background: the photo of the athlete at the moment of the result (arms up, shouting), the venue soft and dark behind, filling the frame; the top 30% darkened so the type reads.
• From 4% to 30% down, centred: the TOP LINE (the name) in white condensed Didone capitals, then the BIG WORD directly under it in a textured metal leaf (copper for bronze, gold leaf for gold, brushed silver for silver), both filling the width to a 4% margin; the big word ~1.4x the height of the name.
• Directly under it: the EVENT in widely spaced white capitals.
• At 45–52% down: the brand logo on the left edge and the competition logo in a white circle on the right edge, both ~11% of the width.
• Bottom-left from 70% down: the result big in a white bold sans ("1.84M"), then 4–5 short lines of white spaced capitals saying what happened, then a short copper/gold rule.
• Bottom-right: a real medal of that metal, angled slightly, ~18% of the width, with the competition name engraved small.

TEXT (exact words, exact spelling — nothing else; any text spot in the LAYOUT with no line here is left out, never filled with made-up words or numbers):
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
• Text: render ONLY the words listed under TEXT (plus the lettering inside the real logos), spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos: only the real ones from the attached logo sheet, each copied exactly — same shapes, colours, letters and proportions, crisp edges, no redrawing. Never invent, approximate or add a logo, and no sponsor marks beyond those already on the real photo.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; every logo matches the logo sheet exactly and none is invented; nothing is cropped at the edges.
```

## The Sports Binge — team medal

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): India's men's 50m rifle 3P team win silver at Asian Games — Aishwary Pratap Singh Tomar, Rudrankksh Patil and Niraj Kumar took silver.
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact layout: https://sportsnews-delta.vercel.app/studio/refs/tsb-team.jpg
• Image 3 — LOGO SHEET, our real logos for this post: https://sportsnews-delta.vercel.app/api/studio/logos?brand=tsb&c=ASIAN+GAMES+2026&t1=India

STYLE REFERENCE RULES:
• Match the style reference exactly: the same positions, proportions, type sizes, typefaces, letter spacing, colours, metal finish, photo grade, rules and margins. Make it look like the next post in the same series.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

LOGOS (from the logo sheet — copy exactly, never redraw or invent):
• BRAND LOGO: our wordmark — "THE" in white with a thin white rule running right of it, "SPORTS" in white heavy high-contrast Didone capitals, "BINGE" under it in gold at the same width, "ONLINE MAGAZINE" in tiny widely spaced white capitals under that; a tight flush-left block about 20% of the poster width. It is on the logo sheet; reproduce it exactly where the LAYOUT says "brand logo" (top-left if it doesn't say).
• COMPETITION LOGO: the ASIAN GAMES 2026 emblem from the logo sheet, on a white circle, where the LAYOUT says "competition logo".
• FLAG: the real INDIA flag from the logo sheet, wherever the LAYOUT shows a flag.
• Do not draw the logo sheet itself: no grey tiles, labels or heading from it.

PHOTO:
• I am attaching a real photo of the athlete or team in the story. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Team medal — the squad, one huge word, the podium row:
• Background: the team from the photo standing side by side in the top 58%, waist up, confident, against the venue under a blue sky; the country name huge and faint, rotated vertically along the left edge.
• Brand logo top-left; competition logo in a white circle top-right.
• In front of each athlete at chest height: their first and last name in small white bold capitals (2 lines), a thin rule, and their score in a white serif under it.
• From 58% to 74%: the BIG WORD huge in brushed metal across the full width (3% margins); under it the PHRASE (if given) in white condensed Didone capitals at the same width; then a thin tricolour hairline.
• Under it: 2 lines of widely spaced white capitals saying what happened, centred.
• Bottom 16%: three columns split by thin vertical rules — each a big white serif score, the country in small caps, and a small metal pill (gold / silver / bronze bar with the word in dark capitals).
• Very bottom: one line of tiny spaced caps with context.

TEXT (exact words, exact spelling — nothing else; any text spot in the LAYOUT with no line here is left out, never filled with made-up words or numbers):
• BIG WORD: "SILVER"
• PHRASE: "INDIA"
• EVENT / NAME LINE: "MEN'S 50M RIFLE 3 POSITIONS · TEAM EVENT"
• NAMES (one in front of each athlete): "AISHWARY PRATAP SINGH TOMAR | RUDRANKKSH PATIL | NIRAJ KUMAR"
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
• Text: render ONLY the words listed under TEXT (plus the lettering inside the real logos), spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos: only the real ones from the attached logo sheet, each copied exactly — same shapes, colours, letters and proportions, crisp edges, no redrawing. Never invent, approximate or add a logo, and no sponsor marks beyond those already on the real photo.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; every logo matches the logo sheet exactly and none is invented; nothing is cropped at the edges.
```

## The Sports Binge — relay with a results table

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): India win women's 4x400m relay gold at Asian Games — India 3:29.69, Bahrain 3:30.21, China 3:31.02.
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact layout: https://sportsnews-delta.vercel.app/studio/refs/tsb-results.jpg
• Image 3 — LOGO SHEET, our real logos for this post: https://sportsnews-delta.vercel.app/api/studio/logos?brand=tsb&c=ASIAN+GAMES+2026&t1=India

STYLE REFERENCE RULES:
• Match the style reference exactly: the same positions, proportions, type sizes, typefaces, letter spacing, colours, metal finish, photo grade, rules and margins. Make it look like the next post in the same series.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

LOGOS (from the logo sheet — copy exactly, never redraw or invent):
• BRAND LOGO: our wordmark — "THE" in white with a thin white rule running right of it, "SPORTS" in white heavy high-contrast Didone capitals, "BINGE" under it in gold at the same width, "ONLINE MAGAZINE" in tiny widely spaced white capitals under that; a tight flush-left block about 20% of the poster width. It is on the logo sheet; reproduce it exactly where the LAYOUT says "brand logo" (top-left if it doesn't say).
• COMPETITION LOGO: the ASIAN GAMES 2026 emblem from the logo sheet, on a white circle, where the LAYOUT says "competition logo".
• FLAG: the real INDIA flag from the logo sheet, wherever the LAYOUT shows a flag.
• Do not draw the logo sheet itself: no grey tiles, labels or heading from it.

PHOTO:
• I am attaching a real photo of the athlete or team in the story. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Medal post with a results table:
• Top 0–55%: the athlete from the photo holding the flag wide behind them, smiling, cropped at the waist. THE SPORTS BINGE in tiny spaced caps with a thin vertical bar top-left, the competition in tiny spaced caps top-right with a short rule under it.
• Brand logo on the left and the competition logo in a white circle on the right at 12–20% down.
• From 46% to 60%: the TOP LINE in white condensed Didone capitals, left, with the EVENT in widely spaced white capitals beside it on the right (2 lines, a short gold rule under).
• From 60% to 82%: the BIG WORD huge in textured gold leaf (or silver / copper), filling the full width (2% margins).
• Bottom 30%: a photo of the race finish (the track, the other athletes), with a short gold rule and 3 lines of white sans on the left saying what happened.
• Bottom-right: a black panel "FINAL RESULTS" in gold spaced caps, three rows split by hairlines — a round medal-coloured number chip (1 gold, 2 silver, 3 bronze), a small real flag, the country in white bold caps, the time right-aligned (the winner’s in gold).

TEXT (exact words, exact spelling — nothing else; any text spot in the LAYOUT with no line here is left out, never filled with made-up words or numbers):
• TOP LINE: "INDIA"
• BIG WORD: "GOLD"
• EVENT / NAME LINE: "WOMEN'S 4×400M RELAY"
• KICKER: "India win the women's 4×400m relay gold at the Asian Games 2026."
• RESULTS ROW 1: "INDIA / GOLD / 3:29.69"
• RESULTS ROW 2: "BAHRAIN / SILVER / 3:30.21"
• RESULTS ROW 3: "CHINA / BRONZE / 3:31.02"
• COMPETITION: "ASIAN GAMES 2026"
• SMALL MASTHEAD: "THE SPORTS BINGE"
• TABLE TITLE: "FINAL RESULTS"
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
• Text: render ONLY the words listed under TEXT (plus the lettering inside the real logos), spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos: only the real ones from the attached logo sheet, each copied exactly — same shapes, colours, letters and proportions, crisp edges, no redrawing. Never invent, approximate or add a logo, and no sponsor marks beyond those already on the real photo.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; every logo matches the logo sheet exactly and none is invented; nothing is cropped at the edges.
```

## The Sports Binge — two finals

```
You are the senior designer of The Sports Binge (@thesportsbinge) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): India's men and women both into the kabaddi finals — Women beat Nepal: India 48-24 Nepal. Men beat Thailand: India 66-28 Thailand.
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE, a real @thesportsbinge post in this exact layout: https://sportsnews-delta.vercel.app/studio/refs/tsb-scores.jpg
• Image 3 — LOGO SHEET, our real logos for this post: https://sportsnews-delta.vercel.app/api/studio/logos?brand=tsb&c=ASIAN+GAMES+2026&t1=India

STYLE REFERENCE RULES:
• Match the style reference exactly: the same positions, proportions, type sizes, typefaces, letter spacing, colours, metal finish, photo grade, rules and margins. Make it look like the next post in the same series.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

LOGOS (from the logo sheet — copy exactly, never redraw or invent):
• BRAND LOGO: our wordmark — "THE" in white with a thin white rule running right of it, "SPORTS" in white heavy high-contrast Didone capitals, "BINGE" under it in gold at the same width, "ONLINE MAGAZINE" in tiny widely spaced white capitals under that; a tight flush-left block about 20% of the poster width. It is on the logo sheet; reproduce it exactly where the LAYOUT says "brand logo" (top-left if it doesn't say).
• COMPETITION LOGO: the ASIAN GAMES 2026 emblem from the logo sheet, on a white circle, where the LAYOUT says "competition logo".
• FLAG: the real INDIA flag from the logo sheet, wherever the LAYOUT shows a flag.
• Do not draw the logo sheet itself: no grey tiles, labels or heading from it.

PHOTO:
• I am attaching a real photo of the athlete or team in the story. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Two results — two score panels:
• Thin corner brackets in the four corners. Competition in tiny spaced serif caps top-centre.
• Top 0–50%: the team(s) from the photo in action, fading into navy-black.
• From 40% to 66%: the HEADLINE in 2 lines, centred: line 1 white, line 2 brushed gold, each filling the width.
• Under it: the KICKER in 2 lines of spaced white caps.
• Then two panels side by side split by a thin rule: each has a label in gold spaced caps ("WOMEN" / "MEN") over a row "TEAM  48–24  TEAM" with the score in gold.
• Under them: one line of tiny caps, then a thin gold-outlined pill with a date line. Brand logo bottom-left, competition logo bottom-right.

TEXT (exact words, exact spelling — nothing else; any text spot in the LAYOUT with no line here is left out, never filled with made-up words or numbers):
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
• Text: render ONLY the words listed under TEXT (plus the lettering inside the real logos), spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos: only the real ones from the attached logo sheet, each copied exactly — same shapes, colours, letters and proportions, crisp edges, no redrawing. Never invent, approximate or add a logo, and no sponsor marks beyond those already on the real photo.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; every logo matches the logo sheet exactly and none is invented; nothing is cropped at the edges.
```

## MUSC — result

```
You are the senior designer of MUSC Red Devils (@musc_reddevils) on Instagram. Design ONE finished post image.

STORY (facts only — do not add any): Manchester United 4 – 1 Burnley · Premier League · Old Trafford
FORMAT: 1080×1440 (3:4, Instagram grid shape), portrait, edge to edge, no border, no mock-up, no phone frame.

ATTACHMENTS (in this order):
• Image 1 — the real photo.
• Image 2 — STYLE REFERENCE for type, colour and grade only (a real @musc_reddevils post; the layout below differs): https://sportsnews-delta.vercel.app/studio/refs/musc-matchday.jpg
• Image 3 — LOGO SHEET, our real logos for this post: https://sportsnews-delta.vercel.app/api/studio/logos?brand=musc&t1=Manchester+United&t2=Burnley

STYLE REFERENCE RULES:
• Match the style reference’s typefaces, colours, metal finish, photo grade and finish; follow the LAYOUT below for positions.
• Copy NOTHING else from it: none of its words, numbers, people, flags or logos. All words come from TEXT; the person comes from the real photo.
• If the reference and this prompt disagree on words, this prompt wins; on look and finish, the reference wins.

LOGOS (from the logo sheet — copy exactly, never redraw or invent):
• BRAND LOGO: our round crest, about 110px across. It is on the logo sheet; reproduce it exactly where the LAYOUT says "brand logo" (top-left if it doesn't say).
• COMPETITION LOGO: the official Premier League logo, only if you can reproduce it exactly; otherwise leave it out (no empty circle).
• MANCHESTER UNITED: its club crest from the logo sheet, wherever the LAYOUT shows that team's flag or crest.
• BURNLEY: its club crest from the logo sheet, wherever the LAYOUT shows that team's flag or crest.
• Do not draw the logo sheet itself: no grey tiles, labels or heading from it.

PHOTO:
• I am attaching a real photo of Manchester United and Burnley players. Use it as the hero image EXACTLY as given: do not redraw, retouch, beautify, age, slim or change the face, body, hair, kit, numbers or logos in it. You may only crop, scale, place, colour-grade and darken it.
• If you cannot keep a real person's face unchanged, leave the photo area as a dark neutral placeholder rather than generating a lookalike.

LAYOUT — Result:
• Full-bleed photo of United players celebrating, graded red; left side darkened.
• Left column: crest and the score huge in white condensed capitals, "MAN UTD v OPPONENT" small under it, then scorers as rows "27’ | M. CUNHA" with a thin red bar between minute and name.
• Bottom: the HEADLINE in 2 lines of ultra-condensed heavy capitals, cream, the accent word in red; competition and handle in tiny caps under it. A red "FULL TIME" tag top-right.

TEXT (exact words, exact spelling — nothing else; any text spot in the LAYOUT with no line here is left out, never filled with made-up words or numbers):
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
• Text: render ONLY the words listed under TEXT (plus the lettering inside the real logos), spelled exactly, in the places described. No other words, no lorem ipsum, no watermark. Every letter crisp and evenly spaced.
• Logos: only the real ones from the attached logo sheet, each copied exactly — same shapes, colours, letters and proportions, crisp edges, no redrawing. Never invent, approximate or add a logo, and no sponsor marks beyond those already on the real photo.
• Grid discipline: keep text inside a 48px safe margin, align everything to a clear grid, vary sizes strongly (one huge word, the rest small) — no evenly-sized blocks of text.

BEFORE YOU FINISH, CHECK: it could sit next to the style reference on the grid and look like the same designer made both; every word matches the TEXT list letter for letter; no extra text; faces untouched; hands and numbers correct; every logo matches the logo sheet exactly and none is invented; nothing is cropped at the edges.
```
