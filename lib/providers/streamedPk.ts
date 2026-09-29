import { Match, Channel } from '../types';
import { StreamProvider } from './types';
import { fetchWithTimeout } from './baseProvider';
import { teamsMatch } from '../utils/matching';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

const STREAMED_API = 'https://streamed.pk/api/matches/football';
const STREAMED_STREAM = 'https://streamed.pk/api/stream';
const TIMEOUT_MS = 5000;
const SHORT_TIMEOUT = 3000;

interface StreamedRawMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  teams?: {
    home?: { name: string };
    away?: { name: string };
  };
  sources?: { source: string; id: string }[];
}

export class StreamedPkProvider implements StreamProvider {
  id = 'streamed';
  name = 'Streamed.pk';

  private async fetchRawMatches(): Promise<StreamedRawMatch[]> {
    const cache = getCacheManager();
    return cache.swr('streamed_raw', async () => {
      try {
        const data = await fetchWithTimeout(STREAMED_API, TIMEOUT_MS);
        return Array.isArray(data) ? data : [];
      } catch (err) {
        logger.error('Streamed.pk API request failed', err);
        return [];
      }
    }, 30);
  }

  // تفعيل الدالة لسحب كل مباريات اليوم بدلاً من إرجاع مصفوفة فارغة
  async fetchMatches(): Promise<Match[]> {
    try {
      const raw = await this.fetchRawMatches();
      const now = Date.now();

      return raw.map((m: StreamedRawMatch) => {
        let home = m.teams?.home?.name || '';
        let away = m.teams?.away?.name || '';

        if ((!home || !away) && m.title) {
          const parts = m.title.split(/\s+(?:vs\.?|-)\s+/i);
          if (parts.length >= 2) {
            home = home || parts[0].trim();
            away = away || parts[1].trim();
          }
        }

        const matchTime = m.date || now;
        // تعتبر المباراة جارية إذا كان وقتها الآن أو مر عليها أقل من ساعتين
        const isLive = matchTime <= now && (now - matchTime) < 130 * 60 * 1000;

        return {
          id: m.id || `${home}-vs-${away}`,
          title: m.title || `${home} vs ${away}`,
          team1: home || 'الفريق 1',
          team2: away || 'الفريق 2',
          homeTeam: home || 'الفريق 1',
          awayTeam: away || 'الفريق 2',
          tournament: m.category || 'كرة قدم',
          status: isLive ? 'live' : 'upcoming',
          timestamp: matchTime,
          time: new Date(matchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasStreams: (m.sources && m.sources.length > 0) || false,
        } as Match;
      });
    } catch (err) {
      logger.error('Streamed.pk fetchMatches conversion failed', err);
      return [];
    }
  }

  private async resolveStreamedStream(source: string, id: string): Promise<{ url: string; quality: string }[]> {
    try {
      const url = `${STREAMED_STREAM}/${source}/${id}`;
      const data = await fetchWithTimeout(url, SHORT_TIMEOUT);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((s: any) => ({
          url: s.embedUrl || s.url || '',
          quality: s.hd ? 'HD' : 'SD',
        }));
      }
      if (data?.url || data?.embedUrl || data?.streamUrl || data?.iframe) {
        return [{
          url: data.url || data.embedUrl || data.streamUrl || data.iframe,
          quality: 'HD',
        }];
      }
      return [];
    } catch (err) {
      return [];
    }
  }

  async resolveStreams(
    matchTitle: string,
    homeTeam: string,
    awayTeam: string,
    matchId: string,
    preFetchedMatch?: Match | null
  ): Promise<Channel[]> {
    try {
      const matches = await this.fetchRawMatches();
      const channels: Channel[] = [];
      const streamTasks: Promise<{ urls: { url: string; quality: string }[]; source: any }>[] = [];
      
      for (const m of matches) {
        if (teamsMatch(matchTitle, m.title)) {
          const sources = m.sources || [];
          for (const src of sources) {
            streamTasks.push(
              this.resolveStreamedStream(src.source, src.id)
                .then(urls => ({ urls, source: src }))
                .catch(() => ({ urls: [], source: src }))
            );
          }
        }
      }
      
      const streamResults = await Promise.allSettled(streamTasks);
      let serverIndex = 1;
      
      for (const r of streamResults) {
        if (r.status === 'fulfilled') {
          for (const su of r.value.urls) {
            if (su.url) {
              channels.push({
                name: `Server ${serverIndex++}`,
                url: su.url,
                provider: this.id,
                quality: su.quality || 'HD',
              });
            }
          }
        }
      }
      
      return channels;
    } catch (err) {
      logger.error('Streamed.pk streams resolution failed', err, { matchTitle });
      return [];
    }
  }
}
