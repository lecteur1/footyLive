import { Match, Channel } from '../types';
import { StreamProvider } from './types';
import { fetchWithTimeout } from './baseProvider';
import { teamsMatch } from '../utils/matching';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

const STREAMED_API = 'https://streamed.pk/api/matches/football';
const STREAMED_STREAM = 'https://streamed.pk/api/stream';
const TIMEOUT_MS = 6000;
const SHORT_TIMEOUT = 3500;

interface StreamedRawMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  teams?: {
    home?: { name: string; badge?: string };
    away?: { name: string; badge?: string };
  };
  sources?: { source: string; id: string }[];
}

export class StreamedPkProvider implements StreamProvider {
  id = 'streamed';
  name = 'Streamed.pk';

  private async fetchRawMatches(): Promise<StreamedRawMatch[]> {
    const cache = getCacheManager();
    return cache.swr('streamed_raw_matches', async () => {
      try {
        const data = await fetchWithTimeout(STREAMED_API, TIMEOUT_MS);
        return Array.isArray(data) ? data : [];
      } catch (err) {
        logger.error('Streamed.pk API request failed', err);
        return [];
      }
    }, 20);
  }

  async fetchMatches(): Promise<Match[]> {
    try {
      const matches = await this.fetchRawMatches();
      const now = Date.now();

      return matches.map((m) => {
        const homeName = m.teams?.home?.name || m.title.split(/vs\.?|-/i)[0]?.trim() || 'Home';
        const awayName = m.teams?.away?.name || m.title.split(/vs\.?|-/i)[1]?.trim() || 'Away';
        const kickoff = m.date ? Number(m.date) : now;
        const diffMinutes = Math.floor((now - kickoff) / 60000);
        const isLive = diffMinutes >= 0 && diffMinutes < 130;

        return {
          id: String(m.id),
          title: m.title || `${homeName} vs ${awayName}`,
          sport: 'football',
          status: isLive ? 'live' : 'upcoming',
          timestamp: kickoff,
          tournament: m.category || 'Football',
          homeTeam: { name: homeName, badge: m.teams?.home?.badge || '' },
          awayTeam: { name: awayName, badge: m.teams?.away?.badge || '' },
          team1: homeName,
          team2: awayName,
          time: new Date(kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasStreams: Array.isArray(m.sources) && m.sources.length > 0,
          sources: (m.sources || []).map((s, idx) => ({
            source: s.source,
            id: s.id,
            label: `Server ${idx + 1}`,
          })),
        } as unknown as Match;
      });
    } catch (err) {
      logger.error('Streamed.pk fetchMatches failed', err);
      return [];
    }
  }

  // فحص ذكي لاستخراج روابط HLS المباشرة وتجنب صفحات embed الإعلانية متى ما توفرت
  private extractBestStreamUrl(item: any): string {
    if (!item) return '';

    // البحث أولاً عن روابط البث المباشر النقية
    const candidates = [
      item.streamUrl,
      item.hlsUrl,
      item.m3u8,
      item.source,
      item.url,
      item.embedUrl,
      item.iframe
    ];

    // 1. أولوية مطلقة لأي رابط ينتهي بـ m3u8 أو mpd أو يحتوي تدفقاً مباشراً
    for (const link of candidates) {
      if (typeof link === 'string' && (link.includes('.m3u8') || link.includes('.mpd'))) {
        return link;
      }
    }

    // 2. إذا لم يتوفر رابط m3u8 صريح، نأخذ الرابط المتاح مع تنظيفه
    for (const link of candidates) {
      if (typeof link === 'string' && link.startsWith('http')) {
        return link;
      }
    }

    return '';
  }

  private async resolveStreamedStream(source: string, id: string): Promise<{ url: string; quality: string }[]> {
    try {
      const url = `${STREAMED_STREAM}/${source}/${id}`;
      const data = await fetchWithTimeout(url, SHORT_TIMEOUT);
      
      if (Array.isArray(data) && data.length > 0) {
        return data
          .map((s: any) => ({
            url: this.extractBestStreamUrl(s),
            quality: s.hd ? 'HD' : 'SD',
          }))
          .filter((s) => Boolean(s.url));
      }

      if (data) {
        const streamUrl = this.extractBestStreamUrl(data);
        if (streamUrl) {
          return [{
            url: streamUrl,
            quality: data.hd ? 'HD' : 'SD',
          }];
        }
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
        const isIdMatch = String(m.id) === String(matchId);
        const isNameMatch = teamsMatch(matchTitle, m.title) || 
                            (homeTeam && m.title.toLowerCase().includes(homeTeam.toLowerCase()));

        if (isIdMatch || isNameMatch) {
          const sources = m.sources || [];
          for (const src of sources) {
            streamTasks.push(
              this.resolveStreamedStream(src.source, src.id)
                .then((urls) => ({ urls, source: src }))
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
              const isDirect = su.url.includes('.m3u8');
              channels.push({
                name: isDirect ? `Server ${serverIndex++} (Direct HD)` : `Server ${serverIndex++} (${su.quality})`,
                url: su.url,
                proxiedUrl: su.url,
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
