import crypto from 'crypto';
import logger from './logger';
import { Match, Channel } from './types';
import { WatchFootyProvider, getMatchDetails, getMatchStats, getLeagues, getTopTeams } from './providers/watchFooty';
import { CdnLiveProvider } from './providers/cdnLive';
import { StreamedPkProvider } from './providers/streamedPk';
import { ArabicFixturesProvider } from './providers/arabicFixtures';
import { getCacheManager } from './cache/cacheManager';

const SECRET_KEY = process.env.STREAM_SECRET || 'default_stream_hmac_secret_key_123_abc';

export { getMatchDetails, getMatchStats, getLeagues, getTopTeams };

const providers = [
  new ArabicFixturesProvider(),
  new WatchFootyProvider(),
  new CdnLiveProvider(),
  new StreamedPkProvider(),
];

// قائمة الحظر الصارم لأي مباريات فئات سنية أو دوريات مغمورة
const BANNED_PATTERNS = [
  /\bu-?17\b/i, /\bu-?18\b/i, /\bu-?19\b/i, /\bu-?20\b/i, /\bu-?21\b/i, /\bu-?23\b/i,
  /under[\s-]?17/i, /under[\s-]?18/i, /under[\s-]?19/i, /under[\s-]?20/i, /under[\s-]?21/i, /under[\s-]?23/i,
  /serie\s+[b-d]/i, /reserves?/i, /women/i, /ladies/i, /youth/i
];

// الكلمات المفتاحية لمباريات القمة والبطولات الرسمية
const PRIORITY_KEYWORDS = [
  'algeria', 'egypt', 'morocco', 'tunisia', 'saudi', 'iraq', 'qatar', 'kuwait', 'oman',
  'africa cup', 'caf', 'nations league', 'gulf cup', 'world cup',
  'spain', 'england', 'croatia', 'france', 'germany', 'italy', 'portugal', 'netherlands'
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

    // 1. استدعاء المزودات بالتتابع
    for (const provider of providers) {
      try {
        if (typeof (provider as any).fetchMatches === 'function') {
          const list = await (provider as any).fetchMatches();
          if (Array.isArray(list)) allMatchesList.push(...list);
        }
      } catch (err) {
        logger.error(`Provider ${provider.name} failed fetching fixtures`, err);
      }
    }

    // 2. توحيد الحقول وتنظيف النصوص
    const seen = new Set<string>();
    const cleanedMatches: any[] = [];

    for (const m of allMatchesList) {
      let t1 = (typeof m.team1 === 'object' ? m.team1?.name : m.team1) ||
               (typeof m.homeTeam === 'object' ? m.homeTeam?.name : m.homeTeam) || '';
      let t2 = (typeof m.team2 === 'object' ? m.team2?.name : m.team2) ||
               (typeof m.awayTeam === 'object' ? m.awayTeam?.name : m.awayTeam) || '';

      if ((!t1 || !t2) && m.title && typeof m.title === 'string') {
        const parts = m.title.split(/\s+(?:vs\.?|-|ضد)\s+/i);
        if (parts.length >= 2) {
          t1 = t1 || parts[0].trim();
          t2 = t2 || parts[1].trim();
        }
      }

      const name1 = String(t1 || 'الفريق 1').trim();
      const name2 = String(t2 || 'الفريق 2').trim();
      const tournament = String(m.tournament || m.league || 'كرة قدم').trim();
      const fullText = `${name1} ${name2} ${tournament}`;

      // حظر مباريات الفئات السنية والدوريات الثانوية تماماً
      const isBanned = BANNED_PATTERNS.some(regex => regex.test(fullText));
      if (isBanned) continue;

      // منع التكرار
      const matchKey = `${name1.toLowerCase()}_vs_${name2.toLowerCase()}`;
      if (seen.has(matchKey)) continue;
      seen.add(matchKey);

      // احتساب رتبة الأهمية
      const lower = fullText.toLowerCase();
      const isTopPriority = PRIORITY_KEYWORDS.some(k => lower.includes(k));

      cleanedMatches.push({
        ...m,
        team1: name1,
        team2: name2,
        homeTeam: name1,
        awayTeam: name2,
        tournament: tournament,
        priorityRank: isTopPriority ? 1 : 2,
      });
    }

    // 3. الترتيب: المباشر أولاً، ثم المباريات الكبرى، ثم حسب التوقيت
    return cleanedMatches.sort((a: any, b: any) => {
      const aLive = a.status === 'live' || a.isLive;
      const bLive = b.status === 'live' || b.isLive;
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;

      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank - b.priorityRank;
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
    const streamProviders = providers.filter(p => p.id !== 'arabic_fixtures');
    const resolveTasks = streamProviders.map(async provider => {
      try {
        return await provider.resolveStreams(matchTitle, homeTeam, awayTeam, matchId, preFetchedMatch);
      } catch (err) {
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

    const seenUrls = new Set<string>();
    const uniqueServers: Channel[] = [];
    let serverIndex = 1;

    for (const server of allServers) {
      if (!seenUrls.has(server.url)) {
        seenUrls.add(server.url);
        const serverLabel = server.name && !server.name.startsWith('Server')
          ? `${server.name}`
          : `سيرفر ${serverIndex++} (بث مباشر)`;

        uniqueServers.push({
          ...server,
          name: serverLabel,
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
