import { Match } from '../types';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

export class ArabicFixturesProvider {
  id = 'arabic_fixtures';
  name = 'Arabic Fixtures';

  async fetchMatches(): Promise<Match[]> {
    const cache = getCacheManager();

    return cache.swr('arabic_today_matches', async () => {
      try {
        // واجهة سريعة وخفيفة تعود بجدول مباريات اليوم
        const res = await fetch('https://api.filgoal.com/matches/?date=' + new Date().toISOString().split('T')[0], {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          },
          next: { revalidate: 60 }
        });

        if (!res.ok) {
          logger.error(`Arabic fixtures request failed with status: ${res.status}`);
          return [];
        }

        const data = await res.json();
        const matchesList: any[] = Array.isArray(data) ? data : (data?.matches || []);

        return matchesList.map((m: any) => {
          const home = m.HomeTeamName || m.homeTeam?.name || m.team1 || 'الفريق المستضيف';
          const away = m.AwayTeamName || m.awayTeam?.name || m.team2 || 'الفريق الضيف';
          const tournament = m.ChampionshipName || m.tournament || m.league || 'مباراة دولية';
          const matchDate = m.Date ? new Date(m.Date).getTime() : Date.now();
          const channelName = m.ChannelName || m.channel || '';

          const isLive = m.Status === 'Live' || m.status === 'live';

          return {
            id: `ar-${m.Id || `${home}-${away}`}`,
            title: `${home} vs ${away}`,
            team1: home,
            team2: away,
            homeTeam: home,
            awayTeam: away,
            tournament: tournament,
            channel: channelName, // حفظ اسم القناة (مثل beIN Sports 2)
            status: isLive ? 'live' : 'upcoming',
            timestamp: matchDate,
            time: new Date(matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hasStreams: true,
          } as Match;
        });
      } catch (err) {
        logger.error('Failed to fetch Arabic fixtures', err);
        return [];
      }
    }, 60);
  }
}
