// @thesportsbinge — editorial sports news page, India-first, fast.
export default {
  id: 'tsb',
  name: 'The Sports Binge',
  handle: '@thesportsbinge',
  badge: '/studio/brand/tsb-badge.png', // round red SPORTS BINGE badge (owner upload; drawn as a vector placeholder until then)
  language: 'en',
  voice: {
    summary: 'Editorial, proud, precise. Headlines are short declaratives with a full stop. No questions, no exclamation marks, no emoji in headlines.',
    headlineRules: ['max 6 words', 'ends with a full stop', 'no question marks', 'no exclamation marks', 'numbers written as digits', 'sentence case or ALL CAPS, never Title Case'],
    examples: [
      '56 YEARS LATER.',
      'Spain take Wembley.',
      'Portugal silence Oslo.',
      'TWO FINALS. TWO SILVERS.',
      '15,000 ODI RUNS.',
      'KNOCKED OUT WITHOUT PLAYING.',
      'HISTORY. IN. GOLD.',
      'A national record. Another Asian medal.',
    ],
    captionStyle: 'Two to four short sentences: the fact, the context, the meaning. Then a line break and 5-8 hashtags. No "link in bio".',
  },
  palette: { cream: '#F3EEE5', ink: '#121212', red: '#D7191C', gold: ['#F6D27A', '#B8860B'], silver: ['#F2F2F2', '#8A8A8A'], bronze: ['#E2A86B', '#8C4A1E'] },
  // Interest multipliers for scoring. Keys are matched against sport, competition, teams, players, headline.
  interests: {
    sports: { cricket: 1.6, soccer: 1.2, racing: 1.1, tennis: 1.0, athletics: 1.4, badminton: 1.3, fieldhockey: 1.3, kabaddi: 1.1, chess: 1.1, basketball: 0.8, football: 0.6, baseball: 0.4, hockey: 0.4, golf: 0.7, combat: 0.9, rugby: 0.5, esports: 0.8, other: 0.6 },
    always: [/\bindia\b/i, /\bindian\b/i, /team india/i, /\bbcci\b/i, /asian games/i, /olympic/i, /commonwealth games/i, /world cup/i, /champions league/i, /grand prix/i, /\bipl\b/i],
    boost: [
      [/\bindia\b|\bindian\b/i, 2.0],
      [/kohli|rohit|bumrah|gill|pant|hardik|jadeja|suryakumar|smriti|mandhana|harmanpreet/i, 1.6],
      [/neeraj chopra|sindhu|lakshya|satwik|chirag|praggnanandhaa|gukesh|sreeshankar|avinash sable|manu bhaker|hs prannoy/i, 1.6],
      [/real madrid|barcelona|manchester|liverpool|arsenal|bayern|psg|messi|ronaldo|mbapp|haaland|yamal/i, 1.3],
      [/verstappen|hamilton|norris|leclerc|russell|piastri/i, 1.2],
      [/medal|podium|record|fastest|first (indian|woman|man)|youngest|oldest|history/i, 1.5],
      [/final\b|semi-final|title|champion/i, 1.3],
    ],
    never: [/\bu-?1[5-9]\b|\bu-?2[0-3]\b|youth|reserve|academy/i, /practice|\bfp[1-3]\b/i, /fantasy|betting|odds|dream11 tips/i],
  },
  // Which types to draft automatically (owner approves everything in Phase 1).
  types: ['result', 'medal', 'milestone', 'breaking', 'preview', 'tally', 'quote'],
  threshold: 2.0,
  hashtags: {
    base: ['#TheSportsBinge', '#SportsBinge', '#IndianSports'],
    cricket: ['#Cricket', '#TeamIndia', '#BCCI'],
    soccer: ['#Football', '#Soccer'],
    racing: ['#F1', '#Formula1'],
    tennis: ['#Tennis'],
    athletics: ['#Athletics', '#TrackAndField'],
    badminton: ['#Badminton'],
    fieldhockey: ['#Hockey', '#HockeyIndia'],
    basketball: ['#NBA', '#Basketball'],
    combat: ['#UFC', '#MMA'],
    golf: ['#Golf'],
  },
};
