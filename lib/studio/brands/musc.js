// @musc_reddevils — Manchester United fan club, Delhi.
export default {
  id: 'musc',
  name: 'MUSC Red Devils',
  handle: '@musc_reddevils',
  badge: '/studio/brand/musc-crest.png', // owner upload; vector placeholder until then
  language: 'en-hinglish',
  team: { name: 'Manchester United', aliases: /manchester united|man utd|man united|\bmufc\b|\bunited\b|red devils|old trafford/i, abbr: 'MUN', color: '#DA291C' },
  broadcastLine: 'WATCH LIVE ONLY ON FANCODE',
  voice: {
    summary: 'A passionate United fan talking to other fans. Heavy caps headlines, key word in red. Questions and Hinglish are welcome. Provocative, never abusive.',
    headlineRules: ['max 6 words', 'ALL CAPS', 'may end with ? or .', 'Hinglish allowed (tha, kahan, kab, kyun)', 'name the opponent or the player when there is one'],
    examples: ['A RESPONSE. NOT EXCUSES.', 'VAR OFFICIAL AXED?', 'OFFSIDE THA?', 'CONFIRMED XI', 'PREDICTED XI', 'HISTORY FOR SALE?', 'UNITED KA CONTROL KAHAN HAI?', 'THREE POINTS. NO DRAMA.', 'A NEW RED.'],
    captionStyle: 'Fan voice, Hinglish welcome, one or two lines, a question to the fans at the end, then hashtags. #MUFC #GGMU always.',
  },
  palette: { red: '#DA291C', black: '#0B0B0D', white: '#FFFFFF', gold: '#FBE122' },
  interests: {
    sports: { soccer: 1.0 },
    always: [/manchester united|man utd|man united|\bmufc\b|red devils|old trafford/i],
    boost: [
      [/manchester united|man utd|man united|\bmufc\b/i, 3.0],
      [/manchester city|man city|liverpool|arsenal|chelsea|tottenham|spurs|leeds/i, 1.3],
      [/premier league|champions league|europa|fa cup|carabao|efl cup/i, 1.2],
      [/transfer|signs|signing|injur|sack|appoint|derby|var\b|referee|offside|penalty/i, 1.3],
      [/bruno|fernandes|rashford|garnacho|mainoo|hojlund|zirkzee|amad|mbeumo|cunha|sesko|onana|de ligt|yoro|dalot|shaw|maguire|casemiro|ugarte|amorim/i, 1.5],
    ],
    never: [/\bu-?1[5-9]\b|\bu-?2[0-3]\b|under-?\d\d|youth|reserve|academy/i, /women'?s super league/i],
  },
  types: ['preview', 'xi', 'live', 'result', 'breaking', 'nostalgia'],
  threshold: 2.0,
  hashtags: {
    base: ['#MUFC', '#GGMU', '#ManUtd', '#ManchesterUnited', '#RedDevils', '#MUSCRedDevils'],
    soccer: ['#PremierLeague'],
  },
};
