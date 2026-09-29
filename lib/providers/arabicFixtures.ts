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
        // جلب جدول اليوم المباشر من واجهة YSScores المفتوحة
        const res = await fetch('https://www.ysscores.com/api/matches/today', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          next: { revalidate: 60 }
        });

        if (!res.ok) {
          // محاولة بديلة من المسار العام إذا اختلف الـ API
          const fallbackRes = await fetch('https://raw.githubusercontent.com/arab-sports/fixtures/main/today.json').catch(() => null);
          if (!fallbackRes || !fallbackRes.ok) {
            logger.error(`Arabic fixtures API status: ${res.status}`);
            return [];
          }
          const fbData = await fallbackRes.json();
          return this.parseMatches(fbData);
        }

        const data = await res.json();
        const matchesList = Array.isArray(data) ? data : (data?.data || data?.matches || []);

        return this.parseMatches(matchesList);
      } catch (err) {
        logger.error('Failed fetching Arabic fixtures', err);
        return [];
      }
    }, 60);
  }

  private parseMatches(list: any[]): Match[] {
    if (!Array.isArray(list) || list.length === 0) return [];
    const now = Date.now();

    return list.map((m: any) => {
      const home = String(m.home_team || m.team_a || m.HomeTeamName || m.home || 'فريق 1').trim();
      const away = String(m.away_team || m.team_b || m.AwayTeamName || m.away || 'فريق 2').trim();
      const tournament = String(m.championship || m.league || m.tournament || 'مباراة اليوم').trim();
      const channel = String(m.channel || m.tv || '').trim();

      const timeStr = m.time || m.match_time || '';
      let matchTimestamp = now;

      if (m.date || m.timestamp) {
        matchTimestamp = new Date(m.date || m.timestamp).getTime();
      }

      const isLive = String(m.status || '').toLowerCase().includes('live') ||
                     String(m.status || '').includes('مباشر') ||
                     m.is_live === true;

      return {
        id: `ar-${m.id || `${home}-${away}`}`,
        title: `${home} vs ${away}`,
        team1: home,
        team2: away,
        homeTeam: home,
        awayTeam: away,
        tournament: tournament,
        channel: channel,
        status: isLive ? 'live' : 'upcoming',
        timestamp: matchTimestamp,
        time: timeStr || new Date(matchTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasStreams: true,
      } as Match;
    });
  }
}
