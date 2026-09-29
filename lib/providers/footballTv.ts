import { Match, Channel } from '../types';
import { StreamProvider } from './types';
import { fetchWithTimeout } from './baseProvider';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

const API_BASE = 'https://football-tv-serverless.vercel.app/api';
const TIMEOUT_MS = 6000;

export class FootballTvProvider implements StreamProvider {
  id = 'footballtv';
  name = 'Football TV (Ad-Free)';

  async fetchMatches(): Promise<Match[]> {
    const cache = getCacheManager();
    return cache.swr('football_tv_matches', async () => {
      try {
        const data = await fetchWithTimeout(`${API_BASE}/matches`, TIMEOUT_MS);
        if (!Array.isArray(data)) return [];

        const now = Date.now();

        return data.map((m: any, idx: number) => {
          const homeName = m.homeTeam || m.team1 || m.home || 'Home';
          const awayName = m.awayTeam || m.team2 || m.away || 'Away';
          const kickoff = m.timestamp || (m.date ? new Date(m.date).getTime() : now);
          const isLive = m.isLive || m.status === 'live' || true;

          return {
            id: String(m.id || `ftv_${idx}`),
            title: `${homeName} vs ${awayName}`,
            sport: 'football',
            status: isLive ? 'live' : 'upcoming',
            timestamp: kickoff,
            tournament: m.league || m.tournament || 'Football',
            homeTeam: { name: homeName, badge: m.homeBadge || '' },
            awayTeam: { name: awayName, badge: m.awayBadge || '' },
            team1: homeName,
            team2: awayName,
            time: m.time || new Date(kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hasStreams: true,
          } as unknown as Match;
        });
      } catch (err) {
        logger.error('FootballTvProvider fetchMatches failed', err);
        return [];
      }
    }, 20);
  }

  async resolveStreams(
    matchTitle: string,
    homeTeam: string,
    awayTeam: string,
    matchId: string,
    preFetchedMatch?: Match | null
  ): Promise<Channel[]> {
    try {
      const home = homeTeam || matchTitle.split(/vs\.?|-/i)[0]?.trim() || '';
      const away = awayTeam || matchTitle.split(/vs\.?|-/i)[1]?.trim() || '';

      const url = `${API_BASE}/streams?homeTeam=${encodeURIComponent(home)}&awayTeam=${encodeURIComponent(away)}`;
      const data = await fetchWithTimeout(url, TIMEOUT_MS);

      const channels: Channel[] = [];
      const streamsList = Array.isArray(data) ? data : data?.streams || [];

      streamsList.forEach((s: any, idx: number) => {
        const streamUrl = typeof s === 'string' ? s : (s.url || s.streamUrl || s.embedUrl || s.iframe);
        if (streamUrl) {
          channels.push({
            name: s.name || `Server ${idx + 1} (Clean)`,
            url: streamUrl,
            proxiedUrl: streamUrl,
            provider: this.id,
            quality: s.quality || 'HD',
          });
        }
      });

      return channels;
    } catch (err) {
      logger.error('FootballTvProvider resolveStreams failed', err);
      return [];
    }
  }
}

