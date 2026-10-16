// Trimmed copies of real upstream payload shapes.

export const soccerScoreboard = {
  events: [
    {
      id: '740001',
      name: 'Chelsea at Arsenal',
      shortName: 'CHE @ ARS',
      date: '2026-10-17T14:00Z',
      links: [{ rel: ['summary', 'desktop', 'event'], href: 'https://www.espn.com/soccer/match/_/gameId/740001' }],
      competitions: [
        {
          id: '740001',
          date: '2026-10-17T14:00Z',
          status: { displayClock: "67'", period: 2, type: { state: 'in', completed: false, detail: "67'", shortDetail: "67'" } },
          venue: { fullName: 'Emirates Stadium', address: { city: 'London', country: 'England' } },
          competitors: [
            { id: '359', homeAway: 'home', score: '2', winner: false, team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png' } },
            { id: '363', homeAway: 'away', score: '1', winner: false, team: { id: '363', displayName: 'Chelsea', abbreviation: 'CHE', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/363.png' } },
          ],
          details: [
            { type: { text: 'Goal' }, clock: { displayValue: "23'" }, team: { id: '359' }, scoringPlay: true, athletesInvolved: [{ displayName: 'Bukayo Saka' }] },
            { type: { text: 'Yellow Card' }, clock: { displayValue: "40'" }, team: { id: '363' }, yellowCard: true, athletesInvolved: [{ displayName: 'Moisés Caicedo' }] },
            { type: { text: 'Goal - Penalty' }, clock: { displayValue: "55'" }, team: { id: '363' }, scoringPlay: true, penaltyKick: true, athletesInvolved: [{ displayName: 'Cole Palmer' }] },
            { type: { text: 'Goal' }, clock: { displayValue: "61'" }, team: { id: '359' }, scoringPlay: true, athletesInvolved: [{ displayName: 'Declan Rice' }] },
          ],
          broadcasts: [{ market: 'national', names: ['Sky Sports'] }],
        },
      ],
    },
    {
      id: '740002',
      name: 'Everton at Liverpool',
      date: '2026-10-18T16:30Z',
      links: [],
      competitions: [
        {
          id: '740002',
          date: '2026-10-18T16:30Z',
          status: { type: { state: 'pre', detail: 'Sat, October 18th at 12:30 PM EDT', shortDetail: '10/18 - 12:30 PM EDT' } },
          venue: { fullName: 'Anfield', address: { city: 'Liverpool', country: 'England' } },
          competitors: [
            { id: '364', homeAway: 'home', score: '0', team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV' } },
            { id: '368', homeAway: 'away', score: '0', team: { id: '368', displayName: 'Everton', abbreviation: 'EVE' } },
          ],
        },
      ],
    },
  ],
};

export const tennisScoreboard = {
  events: [
    {
      id: '900',
      name: 'Shanghai Masters',
      groupings: [
        {
          grouping: { displayName: "Men's Singles" },
          competitions: [
            {
              id: '9001',
              date: '2026-10-16T08:00Z',
              status: { type: { state: 'post', completed: true, detail: 'Final', shortDetail: 'Final' } },
              competitors: [
                { id: 'a', homeAway: 'home', winner: true, athlete: { displayName: 'Jannik Sinner' }, linescores: [{ value: 6 }, { value: 7 }] },
                { id: 'b', homeAway: 'away', winner: false, athlete: { displayName: 'Carlos Alcaraz' }, linescores: [{ value: 4 }, { value: 6 }] },
              ],
            },
            { id: 'old', date: '2026-09-01T08:00Z', status: { type: { state: 'post' } }, competitors: [] },
          ],
        },
      ],
    },
  ],
};

export const golfScoreboard = {
  events: [
    {
      id: '401',
      name: 'Shriners Children’s Open',
      date: '2026-10-16T11:00Z',
      competitions: [
        {
          id: '401',
          date: '2026-10-16T11:00Z',
          status: { type: { state: 'in', detail: 'Round 2 - In Progress', shortDetail: 'Round 2' } },
          competitors: [
            { id: '2', order: 2, score: '-9', athlete: { displayName: 'Tom Kim' } },
            { id: '1', order: 1, score: '-11', athlete: { displayName: 'Ludvig Åberg' } },
            { id: '3', order: 3, score: '-8', athlete: { displayName: 'Max Homa' } },
          ],
        },
      ],
    },
  ],
};

export const cricinfoCurrent = {
  matches: [
    {
      objectId: 1449900,
      slug: 'india-vs-australia-2nd-odi',
      title: '2nd ODI',
      format: 'ODI',
      state: 'LIVE',
      statusText: 'Australia need 120 runs from 90 balls',
      startTime: '2026-10-16T08:30:00.000Z',
      series: { objectId: 1449890, slug: 'australia-tour-of-india-2026', longName: 'Australia tour of India 2026' },
      ground: { name: 'Wankhede Stadium', town: { name: 'Mumbai' }, country: { name: 'India' } },
      teams: [
        { team: { objectId: 6, longName: 'India', abbreviation: 'IND' }, score: '301/7', scoreInfo: '50 ov' },
        { team: { objectId: 2, longName: 'Australia', abbreviation: 'AUS' }, score: '182/4', scoreInfo: '35 ov, T:302' },
      ],
    },
  ],
};

export const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
<channel><title>BBC Sport</title>
<item>
  <title><![CDATA[Arsenal beat Chelsea in London derby]]></title>
  <description><![CDATA[<p>Saka &amp; Rice score as Arsenal go top.</p>]]></description>
  <link>https://www.bbc.co.uk/sport/football/1</link>
  <pubDate>Fri, 16 Oct 2026 18:00:00 GMT</pubDate>
  <media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/a.jpg"/>
</item>
<item>
  <title>India set Australia 302 to win second ODI</title>
  <link>https://www.bbc.co.uk/sport/cricket/2</link>
  <pubDate>Fri, 16 Oct 2026 12:00:00 GMT</pubDate>
</item>
<item>
  <title>Old story</title>
  <link>https://www.bbc.co.uk/sport/3</link>
  <pubDate>Fri, 01 Oct 2026 12:00:00 GMT</pubDate>
</item>
</channel></rss>`;

export const atomFeed = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
  <title type="html">Verstappen takes pole at US Grand Prix</title>
  <link rel="alternate" href="https://example.com/f1/pole"/>
  <updated>2026-10-16T20:00:00Z</updated>
  <summary>Max Verstappen &#8211; pole in Austin.</summary>
</entry>
</feed>`;

export const googleNewsFeed = `<rss><channel>
<item>
  <title>Arsenal beat Chelsea in London derby - The Athletic</title>
  <link>https://news.google.com/rss/articles/abc</link>
  <pubDate>Fri, 16 Oct 2026 18:05:00 GMT</pubDate>
  <source url="https://theathletic.com">The Athletic</source>
</item>
<item>
  <title>Lakers open season with win over Warriors - ESPN</title>
  <link>https://news.google.com/rss/articles/def</link>
  <pubDate>Fri, 16 Oct 2026 17:00:00 GMT</pubDate>
  <source url="https://espn.com">ESPN</source>
</item>
</channel></rss>`;
