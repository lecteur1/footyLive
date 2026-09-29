import { Match } from '../types';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || 'fd_33785d698db65c6c206eb5a3cef0879acf14d99d9c803a34';
const BASE_URL = 'https://api.football-data.org/v4/matches';

export class ArabicFixturesProvider {
  id = 'arabic_fixtures';
  name = 'FootballData';

  async fetchMatches(): Promise<Match[]> {
    const cache = getCacheManager();

    return cache.swr('footballdata_today_matches', async () => {
      try {
        const res = await fetch(BASE_URL, {
          headers: {
            'X-Auth-Token': API_KEY,
          },
          next: { revalidate: 60 },
        });

        if (!res.ok) {
          logger.error(`Football-Data API error: ${res.status}`);
          return [];
        }

        const data = await res.json();
        const matchesList: any[] = data?.matches || [];

        if (!Array.isArray(matchesList) || matchesList.length === 0) {
          return [];
        }

        return matchesList.map((m: any) => {
          const home = m.homeTeam?.name || 'الفريق المستضيف';
          const away = m.awayTeam?.name || 'الفريق الضيف';
          const tournament = m.competition?.name || 'مباراة رسمية';
          const matchTime = m.utcDate ? new Date(m.utcDate).getTime() : Date.now();
          const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED';

          return {
            id: `fd-${m.id}`,
            title: `${home} vs ${away}`,
            team1: home,
            team2: away,
            homeTeam: home,
            awayTeam: away,
            tournament: tournament,
            status: isLive ? 'live' : 'upcoming',
            timestamp: matchTime,
            time: new Date(matchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hasStreams: true,
          } as Match;
        });
      } catch (err) {
        logger.error('Failed fetching matches from Football-Data', err);
        return [];
      }
    }, 60);
  }
}
