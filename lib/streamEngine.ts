import crypto from 'crypto';
import logger from './logger';
import { Match, Channel } from './types';
import { WatchFootyProvider, getMatchDetails, getMatchStats, getLeagues, getTopTeams } from './providers/watchFooty';
import { CdnLiveProvider } from './providers/cdnLive';
import { StreamedPkProvider } from './providers/streamedPk';
import { getCacheManager } from './cache/cacheManager';

const SECRET_KEY = process.env.STREAM_SECRET || 'default_stream_hmac_secret_key_123_abc';

export { getMatchDetails, getMatchStats, getLeagues, getTopTeams };

// إعادة ترتيب المزودات: تقديم المزودات ذات الاستقرار العالي وقلة الإعلانات أولاً
const providers = [
  new StreamedPkProvider(),
  new CdnLiveProvider(),
  new WatchFootyProvider(),
];

// قائمة النطاقات الإعلانية المزعجة لاستبعادها تلقائياً من قائمة السيرفرات
const BLOCKED_DOMAINS = [
  'gotrackier.com',
  'pipefulx.com',
  'istod.com',
  'atzonebd.com',
  'princesselizabeth'
];

export function getStreamRedirectUrl(originalUrl: string): string {
  const encoded = Buffer.from(originalUrl).toString('base64url');
  const expires = Date.now() + 4 * 60 * 60 * 1000; // صلاحية الرابط 4 ساعات
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${encoded}:${expires}`)
    .digest('hex');
  return `/api/stream-redirect?u=${encoded}&expires=${expires}&sig=${signature}`;
}

export async function getMatches(): Promise<Match[]> {
  const cache = getCacheManager();
  return cache.swr('all_matches', async () => {
    // محاولة جلب المباريات من المزود الأساسي
    const watchFooty = providers.find(p => p.id === 'watchfooty') as WatchFootyProvider;
    if (!watchFooty) return [];
    
    const matches = await watchFooty.fetchMatches();
    
    // إبقاء المباريات السليمة والتي تملك بيانات صالحة فقط
    return (matches || []).filter((m: Match) => Boolean(m.title && (m.homeTeam || m.awayTeam)));
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
      throw new Error('No streams available from any provider');
    }

    // تصفية السيرفرات: استبعاد أي رابط إعلاني مشبوه
    const safeServers = allServers.filter(server => {
      if (!server.url) return false;
      const lower = server.url.toLowerCase();
      return !BLOCKED_DOMAINS.some(domain => lower.includes(domain));
    });

    const finalServersList = safeServers.length > 0 ? safeServers : allServers;

    // أولوية الترتيب: 
    // 1. روابط البث المباشرة (.m3u8 أو hls)
    // 2. الجودة العالية (FHD, HD, 1080p, 720p)
    const qualityOrder: Record<string, number> = { 'FHD': 0, 'HD': 0, '1080p': 0, '720p': 1, 'SD': 2 };
    
    finalServersList.sort((a, b) => {
      const aIsHls = a.url.includes('.m3u8') ? 0 : 1;
      const bIsHls = b.url.includes('.m3u8') ? 0 : 1;
      if (aIsHls !== bIsHls) return aIsHls - bIsHls;

      const qA = qualityOrder[a.quality || 'SD'] ?? 2;
      const qB = qualityOrder[b.quality || 'SD'] ?? 2;
      return qA - qB;
    });

    const seenUrls = new Set<string>();
    const uniqueServers: Channel[] = [];
    let serverIndex = 1;

    for (const server of finalServersList) {
      if (!seenUrls.has(server.url)) {
        seenUrls.add(server.url);
        const proxied = getStreamRedirectUrl(server.url);
        uniqueServers.push({
          ...server,
          name: `Server ${serverIndex++}`,
          proxiedUrl: proxied,
          // استخدام الرابط المحمي كمعرف أساسي لمنع تسريب الروابط المباشرة
          url: proxied, 
        });
      }
    }

    return {
      url: uniqueServers[0].proxiedUrl || uniqueServers[0].url,
      proxiedUrl: uniqueServers[0].proxiedUrl || getStreamRedirectUrl(uniqueServers[0].url),
      channels: uniqueServers,
      serverCount: uniqueServers.length,
    };
  }, 30);
}
