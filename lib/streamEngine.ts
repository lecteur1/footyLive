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

// كلمات مفتاحية للمباريات الهامشية التي نريد تنظيف القائمة منها
const EXCLUDE_KEYWORDS = [
  'u17', 'u18', 'u19', 'u20', 'u21', 'u23',
  'under 19', 'under 20', 'under 21', 'under-19', 'under-20', 'under-21',
  'serie b', 'serie c', 'reserve', 'women'
];

// كلمات مفتاحية ذات أولوية عليا (تظهر في رأس القائمة)
const HIGH_PRIORITY_KEYWORDS = [
  'africa cup', 'caf', 'nations league', 'gulf cup', 'arabian gulf',
  'champions league', 'premier league', 'la liga', 'serie a', 'bundesliga',
  'world cup', 'algeria', 'morocco', 'egypt', 'saudi', 'iraq', 'spain', 'england'
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

    // 1. جلب المباريات من WatchFooty
    try {
      const watchFooty = providers.find(p => p.id === 'watchfooty') as WatchFootyProvider;
      if (watchFooty && typeof watchFooty.fetchMatches === 'function') {
        const wfMatches = await watchFooty.fetchMatches();
        if (Array.isArray(wfMatches)) allMatchesList.push(...wfMatches);
      }
    } catch (err) {
      logger.error('WatchFooty fetchMatches failed', err);
    }

    // 2. جلب المباريات من StreamedPk
    try {
      const streamedPk = providers.find(p => p.id === 'streamed') as any;
      if (streamedPk && typeof streamedPk.fetchMatches === 'function') {
        const spkMatches = await streamedPk.fetchMatches();
        if (Array.isArray(spkMatches)) allMatchesList.push(...spkMatches);
      }
    } catch (err) {
      logger.error('StreamedPk fetchMatches failed', err);
    }

    // 3. جلب المباريات وقنوات البث من CdnLive
    try {
      const cdnLive = providers.find(p => p.id === 'cdnlive') as any;
      if (cdnLive && typeof cdnLive.fetchMatches === 'function') {
        const cdnMatches = await cdnLive.fetchMatches();
        if (Array.isArray(cdnMatches)) allMatchesList.push(...cdnMatches);
      }
    } catch (err) {
      logger.error('CdnLive fetchMatches failed', err);
    }

    // 4. توحيد الحقول والفلترة الذكية
    const seen = new Set<string>();
    const normalizedMatches = allMatchesList
      .map((m: any) => {
        let t1 = (typeof m.team1 === 'object' ? m.team1?.name : m.team1) ||
                 (typeof m.homeTeam === 'object' ? m.homeTeam?.name : m.homeTeam) ||
                 (typeof m.home === 'object' ? m.home?.name : m.home) || '';

        let t2 = (typeof m.team2 === 'object' ? m.team2?.name : m.team2) ||
                 (typeof m.awayTeam === 'object' ? m.awayTeam?.name : m.awayTeam) ||
                 (typeof m.away === 'object' ? m.away?.name : m.away) || '';

        if ((!t1 || !t2) && m.title && typeof m.title === 'string') {
          const parts = m.title.split(/\s+(?:vs\.?|-|ضد)\s+/i);
          if (parts.length >= 2) {
            t1 = t1 || parts[0].trim();
            t2 = t2 || parts[1].trim();
          }
        }

        const name1 = String(t1 || 'الفريق 1').trim();
        const name2 = String(t2 || 'الفريق 2').trim();
        const tournament = m.tournament || m.league || m.category || 'كرة قدم';

        // حساب درجة الأهمية للمباراة
        const fullText = `${name1} ${name2} ${tournament}`.toLowerCase();
        const isExcluded = EXCLUDE_KEYWORDS.some(k => fullText.includes(k));
        const isHighPriority = HIGH_PRIORITY_KEYWORDS.some(k => fullText.includes(k));

        let priorityScore = 50;
        if (isHighPriority) priorityScore = 10;
        if (isExcluded) priorityScore = 90;

        return {
          ...m,
          team1: name1,
          team2: name2,
          homeTeam: name1,
          awayTeam: name2,
          tournament: tournament,
          priorityScore: priorityScore,
        };
      })
      .filter((m: any) => {
        // فلترة التكرار
        const key = `${String(m.team1 || '').toLowerCase()}_vs_${String(m.team2 || '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);

        // استبعاد مباريات الشباب والدوريات المغمورة تماماً إلا إذا كان لها بث مباشر الآن
        const isLive = m.status === 'live' || m.isLive;
        if (!isLive && m.priorityScore >= 90) {
          return false;
        }

        return true;
      });

    // 5. الترتيب: المباشر أولاً، ثم البطولات الهامة، ثم حسب التوقيت
    return normalizedMatches.sort((a: any, b: any) => {
      const aLive = a.status === 'live' || a.isLive;
      const bLive = b.status === 'live' || b.isLive;
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;

      if ((a.priorityScore || 50) !== (b.priorityScore || 50)) {
        return (a.priorityScore || 50) - (b.priorityScore || 50);
      }

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
