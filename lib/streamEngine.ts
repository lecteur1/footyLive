import crypto from 'crypto';
import logger from './logger';
import { Match, Channel } from './types';
import { WatchFootyProvider, getMatchDetails, getMatchStats, getLeagues, getTopTeams } from './providers/watchFooty';
import { CdnLiveProvider } from './providers/cdnLive';
import { StreamedPkProvider } from './providers/streamedPk';
import { getCacheManager } from './cache/cacheManager';

const SECRET_KEY = process.env.STREAM_SECRET || 'default_stream_hmac_secret_key_123_abc';

export { getMatchDetails, getMatchStats, getLeagues, getTopTeams };

const providers = [
  new WatchFootyProvider(),
  new CdnLiveProvider(),
  new StreamedPkProvider(),
];

export function getStreamRedirectUrl(originalUrl: string): string {
  const encoded = Buffer.from(originalUrl).toString('base64url');
  const expires = Date.now() + 4 * 60 * 60 * 1000;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${encoded}:${expires}`)
    .digest('hex');
  return `/api/stream-redirect?u=${encoded}&expires=${expires}&sig=${signature}`;
}

export async function getMatches(): Promise<Match[]> {
  const cache = getCacheManager();
  return cache.swr('all_matches', async () => {
    const allMatchesList: any[] = [];

    // 1. جلب المباريات المباشرة من WatchFooty
    try {
      const watchFooty = providers.find(p => p.id === 'watchfooty') as WatchFootyProvider;
      if (watchFooty && typeof watchFooty.fetchMatches === 'function') {
        const wfMatches = await watchFooty.fetchMatches();
        if (Array.isArray(wfMatches)) allMatchesList.push(...wfMatches);
      }
    } catch (err) {
      logger.error('WatchFooty fetchMatches failed', err);
    }

    // 2. جلب جدول اليوم الكامل من StreamedPk (معرّف المزود id هو 'streamed')
    try {
      const streamedPk = providers.find(p => p.id === 'streamed') as any;
      if (streamedPk && typeof streamedPk.fetchMatches === 'function') {
        const spkMatches = await streamedPk.fetchMatches();
        if (Array.isArray(spkMatches)) allMatchesList.push(...spkMatches);
      }
    } catch (err) {
      logger.error('StreamedPk fetchMatches failed', err);
    }

    // 3. توحيد واستخراج أسماء الفرق وتنسيق الحقول بدقة
    const seen = new Set<string>();
    const normalizedMatches = allMatchesList
      .map((m: any) => {
        let t1 = m.team1 || m.homeTeam || m.home || '';
        let t2 = m.team2 || m.awayTeam || m.away || '';

        // استخراج أسماء الفرق في حال كانت مدمجة في العنوان (Team A vs Team B)
        if ((!t1 || !t2) && m.title) {
          const parts = m.title.split(/\s+(?:vs\.?|-|ضد)\s+/i);
          if (parts.length >= 2) {
            t1 = t1 || parts[0].trim();
            t2 = t2 || parts[1].trim();
          }
        }

        t1 = t1 || 'الفريق 1';
        t2 = t2 || 'الفريق 2';

        return {
          ...m,
          team1: t1,
          team2: t2,
          homeTeam: t1,
          awayTeam: t2,
          tournament: m.tournament || m.league || m.category || 'كرة قدم',
        };
      })
      .filter((m: any) => {
        // منع تكرار نفس المباراة بين المصدرين
        const key = `${m.team1.trim().toLowerCase()}_vs_${m.team2.trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    // 4. الترتيب: المباريات الجارية الآن أولاً، ثم حسب توقيت الانطلاق
    return normalizedMatches.sort((a: any, b: any) => {
      const aLive = a.status === 'live' || a.isLive;
      const bLive = b.status === 'live' || b.isLive;
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
  }, 15);
}

export async function getLiveMatches(): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter(m => m.status === 'live');
}

export async function resolveAllStreams(
  matchTitle: string,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  preFetchedMatch: Match | null = null
): Promise<{ url: string; proxiedUrl: string; channels: Channel[]; serverCount: number }> {
  const cache = getCacheManager();
  const cacheKey = `streams_${matchId}`;

  return cache.swr(cacheKey, async () => {
    const resolveTasks = providers.map(async provider => {
      try {
        return await provider.resolveStreams(matchTitle, homeTeam, awayTeam, matchId, preFetchedMatch);
      } catch (err) {
        logger.error(`Provider ${provider.name} failed resolving streams`, err, { matchId });
        return [];
      }
    });

    const results = await Promise.allSettled(resolveTasks);
    const allServers: Channel[] = [];

    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allServers.push(...r.value);
      }
    }

    if (allServers.length === 0) {
      throw new Error('No streams available for this match');
    }

    const qualityOrder: Record<string, number> = { 'FHD': 0, 'HD': 0, '1080p': 0, '720p': 1, 'SD': 2 };
    allServers.sort((a, b) => (qualityOrder[a.quality || 'SD'] || 2) - (qualityOrder[b.quality || 'SD'] || 2));

    const seenUrls = new Set<string>();
    const uniqueServers: Channel[] = [];
    let serverIndex = 1;

    for (const server of allServers) {
      if (!seenUrls.has(server.url)) {
        seenUrls.add(server.url);
        uniqueServers.push({
          ...server,
          name: `Server ${serverIndex++}`,
          proxiedUrl: getStreamRedirectUrl(server.url),
        });
      }
    }

    return {
      url: uniqueServers[0].url,
      proxiedUrl: uniqueServers[0].proxiedUrl || getStreamRedirectUrl(uniqueServers[0].url),
      channels: uniqueServers,
      serverCount: uniqueServers.length,
    };
  }, 30);
}
