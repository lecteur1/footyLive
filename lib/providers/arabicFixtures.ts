import { Match } from '../types';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

export class ArabicFixturesProvider {
  id = 'arabic_fixtures';
  name = 'Arabic Fixtures';

  async fetchMatches(): Promise<Match[]> {
    const cache = getCacheManager();

    return cache.swr('arabic_today_matches', async () => {
      // الحصول على تاريخ اليوم بصيغة YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      const filgoalUrl = `https://api.filgoal.com/matches/?date=${today}`;

      try {
        const res = await fetch(filgoalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.filgoal.com/',
            'Origin': 'https://www.filgoal.com'
          },
          next: { revalidate: 60 }
        });

        if (!res.ok) {
          logger.error(`FilGoal API responded with status: ${res.status}`);
          return [];
        }

        const data = await res.json();
        const rawList: any[] = Array.isArray(data) ? data : (data?.matches || []);

        if (!Array.isArray(rawList) || rawList.length === 0) {
          return [];
        }

        return rawList.map((m: any) => {
          // استخراج أسماء الفرق سواء كانت نصاً مباشراً أو داخل كائن
          const home = m.HomeTeamName || m.homeTeam?.name || m.home?.name || 'الفريق 1';
          const away = m.AwayTeamName || m.awayTeam?.name || m.away?.name || 'الفريق 2';
          const tournament = m.ChampionshipName || m.tournament?.name || m.league || 'مباراة رسمية';
          const channelName = m.ChannelName || m.channel || '';

          const matchTime = m.Date ? new Date(m.Date).getTime() : Date.now();
          const isLive = m.Status === 'Live' || m.status === 'live' || m.StatusId === 2;

          return {
            id: `ar-${m.Id || `${home}-${away}`}`,
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
        logger.error('Failed fetching matches from FilGoal', err);
        return [];
      }
    }, 60);
  }
}
