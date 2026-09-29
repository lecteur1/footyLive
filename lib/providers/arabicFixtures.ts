import { Match } from '../types';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

export class ArabicFixturesProvider {
  id = 'arabic_fixtures';
  name = 'ArabicFixtures';

  async fetchMatches(): Promise<Match[]> {
    const cache = getCacheManager();

    return cache.swr('filgoal_mobile_matches_v2', async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        // الـ Endpoint الرسمي المباشر لموبايل FilGoal (سريع ومفتوح JSON)
        const url = `https://api.filgoal.com/matches/?date=${today}`;

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'FilGoal/5.0 (Android; Mobile)',
            'Accept': 'application/json',
          },
          next: { revalidate: 60 }
        });

        if (!res.ok) {
          logger.error(`FilGoal Mobile API error: ${res.status}`);
          return [];
        }

        const data = await res.json();
        const matchesList: any[] = Array.isArray(data) ? data : (data?.matches || data?.Data || []);

        if (!Array.isArray(matchesList) || matchesList.length === 0) {
          return [];
        }

        const now = Date.now();

        return matchesList.map((m: any) => {
          const home = String(m.HomeTeamName || m.homeTeam?.name || m.HomeTeam || 'الفريق 1').trim();
          const away = String(m.AwayTeamName || m.awayTeam?.name || m.AwayTeam || 'الفريق 2').trim();
          const tournament = String(m.ChampionshipName || m.tournament?.name || m.Championship || 'كرة قدم').trim();
          const channelName = String(m.ChannelName || m.channel || '').trim();

          const matchTime = m.Date ? new Date(m.Date).getTime() : now;
          const isLive = m.Status === 'Live' || m.status === 'live' || m.StatusId === 2;

          return {
            id: `filgoal-${m.Id || `${home}-${away}`}`,
            title: `${home} vs ${away}`,
            team1: home,
            team2: away,
            homeTeam: home,
            awayTeam: away,
            tournament: tournament,
            channel: channelName,
            status: isLive ? 'live' : 'upcoming',
            timestamp: matchTime,
            time: new Date(matchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hasStreams: true,
          } as Match;
        });
      } catch (err) {
        logger.error('Failed fetching matches from FilGoal Mobile', err);
        return [];
      }
    }, 60);
  }
}
