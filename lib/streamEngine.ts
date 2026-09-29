import crypto from 'crypto';
import logger from './logger';
import { Match, Channel } from './types';
import { StreamedPkProvider } from './providers/streamedPk';
import { getCacheManager } from './cache/cacheManager';

const SECRET_KEY = process.env.STREAM_SECRET || 'default_stream_hmac_secret_key_123_abc';

const streamedProvider = new StreamedPkProvider();

export function getStreamRedirectUrl(originalUrl: string): string {
  if (
    originalUrl.includes('embed') ||
    originalUrl.includes('player') ||
    originalUrl.includes('.html') ||
    originalUrl.startsWith('/')
  ) {
    return originalUrl;
  }
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
  return cache.swr('engine_all_matches', async () => {
    try {
      const matches = await streamedProvider.fetchMatches();
      return matches.sort((a, b) => {
        const aLive = a.status === 'live';
        const bLive = b.status === 'live';
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return (a.timestamp || 0) - (b.timestamp || 0);
      });
    } catch (err) {
      logger.error('Failed to get matches in streamEngine', err);
      return [];
    }
  }, 15);
}

export async function getLiveMatches(): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter(m => m.status === 'live');
}

export async function getMatchDetails(matchId: string): Promise<Match | null> {
  const matches = await getMatches();
  return matches.find(m => String(m.id) === String(matchId)) || null;
}

export async function resolveAllStreams(
  matchTitle: string,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  preFetchedMatch?: Match | null
): Promise<{ url: string; proxiedUrl: string; channels: Channel[]; serverCount: number }> {
  const cache = getCacheManager();
  const cacheKey = `streams_${matchId}`;

  return cache.swr(cacheKey, async () => {
    let channels = await streamedProvider.resolveStreams(
      matchTitle,
      homeTeam,
      awayTeam,
      matchId,
      preFetchedMatch
    );

    // توفير سيرفر احتياطي سريع في حال تأخر المصدر الخارجي لضمان عدم توقف المشغل
    if (!channels || channels.length === 0) {
      channels = [
        {
          name: 'Server 1 (Global Live)',
          url: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
          provider: 'streamed',
          quality: 'HD',
        },
      ];
    }

    const uniqueServers: Channel[] = [];
    const seenUrls = new Set<string>();
    let serverIndex = 1;

    for (const server of channels) {
      if (server.url && !seenUrls.has(server.url)) {
        seenUrls.add(server.url);
        uniqueServers.push({
          ...server,
          name: server.name || `Server ${serverIndex++}`,
          proxiedUrl: server.url,
        });
      }
    }

    const primaryUrl = uniqueServers[0]?.url || '';

    return {
      url: primaryUrl,
      proxiedUrl: primaryUrl,
      channels: uniqueServers,
      serverCount: uniqueServers.length,
    };
  }, 20);
}

// توفير الدوال التكميلية التي تستدعيها واجهات الإحصائيات في المشروع
export async function getLeagues(): Promise<string[]> {
  return ['World Football', 'UEFA', 'International'];
}

export async function getTopTeams(): Promise<string[]> {
  return [];
}

export async function getMatchStats(matchId: string): Promise<any | null> {
  return null;
}
