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
        const today = new Date().toISOString().split('T')[0];
        // المسار الداخلي الرسمي لـ FilGoal المستخدم عبر AJAX
        const targetUrl = `https://www.filgoal.com/matches/ajax?date=${today}`;

        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.filgoal.com/matches',
          },
          next: { revalidate: 60 },
        });

        if (!res.ok) {
          logger.error(`FilGoal response status: ${res.status}`);
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
          const tournament = String(m.ChampionshipName || m.tournament || m.Championship || 'مباراة رسمية').trim();
          const channelName = String(m.ChannelName || m.channel || '').trim();

          const matchTime = m.Date ? new Date(m.Date).getTime() : now;
          const isLive = m.Status === 'Live' || m.status === 'live' || m.StatusId === 2;

          return {
            id: `ar-${m.Id || m.MatchId || `${home}-${away}`}`,
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
        logger.error('Arabic fixtures extraction error', err);
        return [];
      }
    }, 60);
  }
}
