// Names of people in a headline: "Parul Chaudhary wins bronze" → ["Parul Chaudhary"].
// Capitalised runs of 2–3 words that are not nations, events, places, months or sports.
const NOT_A_NAME = new Set(
  (
    'India Indian Australia Australian England English Pakistan Pakistani South Africa New Zealand Sri Lanka Bangladesh Afghanistan West Indies China Japan Korea Iran Nepal Thailand Malaysia Kuwait Bahrain Qatar Uzbekistan Kazakhstan Indonesia Philippines Vietnam Spain Italy France Germany Portugal Norway Belgium Netherlands Brazil Argentina Scotland Wales Ireland ' +
    'Asian Games Para Olympic Olympics Olympiad Commonwealth World Cup Championship Championships Premier League Nations Champions Trophy Series Grand Prix Slam Open Masters Final Finals Semi Quarter Tour ' +
    'United City Manchester Man Utd Real Madrid Barcelona Liverpool Arsenal Chelsea Tottenham Bayern Munich Juventus Milan Inter Paris Saint Germain Red Devils Bull Royal Challengers Super Kings Knight Riders Mumbai Indians Delhi Capitals Punjab ' +
    'Aichi Nagoya Tokyo Paris London Delhi Mumbai Chennai Kolkata Bengaluru Hyderabad Ahmedabad Lucknow Jaipur Kochi Samarkand Baku Wembley Oslo Lisbon Dubai Doha ' +
    'The Team Men Women Mixed Doubles Singles Relay Squad Day Live Gold Silver Bronze Medal Medals Count Tally Record National History Historic Breaking Report Update Latest Watch Highlights Preview Review Verdict ' +
    'Test ODI T20 IPL WPL ICC BCCI FIFA UEFA FIH BWF ISSF NBA NFL MLB NHL UFC ATP WTA PSA WTT WPL ' +
    'Cricket Football Soccer Hockey Squash Shooting Archery Boxing Wrestling Athletics Badminton Kabaddi Chess Tennis Table Golf Swimming Javelin Marathon Steeplechase Sports Binge Sportstar Times Express Hindu Hindustan NDTV ' +
    'January February March April May June July August September October November December Monday Tuesday Wednesday Thursday Friday Saturday Sunday ' +
    'North South East West Pro Formula Indian Super Big Little Great First Last Next'
  ).split(/\s+/),
);

export function namesIn(text = '') {
  const out = [];
  for (const m of text.matchAll(/\b([A-Z][a-z]+(?:\s(?:[A-Z][a-z]+|de|van|von|bin|da))+)\b/g)) {
    const words = m[1].split(/\s+/);
    if (words.length < 2 || words.length > 3 || words.some((w) => NOT_A_NAME.has(w))) continue;
    out.push(m[1]);
  }
  return [...new Set(out)];
}
