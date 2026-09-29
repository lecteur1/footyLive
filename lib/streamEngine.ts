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

// قاموس ترجمة أسماء الفرق للبحث في سيرفرات البث الأجنبية
const TEAM_TRANSLATIONS: Record<string, string> = {
  'مصر': 'Egypt',
  'جنوب السودان': 'South Sudan',
  'الجزائر': 'Algeria',
  'بوروندي': 'Burundi',
  'المغرب': 'Morocco',
  'ليسوتو': 'Lesotho',
  'السودان': 'Sudan',
  'موزمبيق': 'Mozambique',
  'السنغال': 'Senegal',
  'إثيوبيا': 'Ethiopia',
  'السعودية': 'Saudi Arabia',
  'العراق': 'Iraq',
  'عمان': 'Oman',
  'الكويت': 'Kuwait',
  'إسبانيا': 'Spain',
  'كرواتيا': 'Croatia',
  'إنجلترا': 'England',
  'التشيك': 'Czechia',
};

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
    const arabicProv = providers.find(p => p.id === 'arabic_fixtures') as ArabicFixturesProvider;
    let list: Match[] = [];

    if (arabicProv) {
      list = await arabicProv.fetchMatches();
    }

    return list.sort((a, b) => {
      const aLive = a.status === 'live';
      const bLive = b.status === 'live';
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
  preFetchedMatch: any = null
): Promise<{ url: string; proxiedUrl: string; channels: Channel[]; serverCount: number }> {
  const cache = getCacheManager();
  const cacheKey = `streams_${matchId}`;

  return cache.swr(cacheKey, async () => {
    // استخراج أسماء البحث بالإنجليزية
    const hEn = preFetchedMatch?.homeEn || TEAM_TRANSLATIONS[homeTeam] || homeTeam;
    const aEn = preFetchedMatch?.awayEn || TEAM_TRANSLATIONS[awayTeam] || awayTeam;
    const enTitle = `${hEn} vs ${aEn}`;

    const streamProviders = providers.filter(p => p.id !== 'arabic_fixtures');
    const resolveTasks = streamProviders.map(async provider => {
      try {
        // البحث بالاسم الإنجليزي أولاً لضمان إيجاد السيرفر في المواقع الأجنبية
        const res = await provider.resolveStreams(enTitle, hEn, aEn, matchId, preFetchedMatch);
        if (Array.isArray(res) && res.length > 0) return res;
        // محاولة ثانية بالاسم الأصلي
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

    // إذا لم تتوفر سيرفرات مخصصة للمباراة، نوفر قنوات beIN الرياضية المباشرة كبديل فوري
    if (allServers.length === 0) {
      allServers.push(
        {
          name: 'سيرفر beIN 1 (جودة متعددة)',
          url: 'https://streamed.pk',
          provider: 'streamed',
          quality: 'HD',
        },
        {
          name: 'سيرفر beIN 2 (بث احتياطي)',
          url: 'https://api.cdnlivetv.tv',
          provider: 'cdnlive',
          quality: 'HD',
        }
      );
    }

    const seenUrls = new Set<string>();
    const uniqueServers: Channel[] = [];
    let serverIndex = 1;

    for (const server of allServers) {
      if (!seenUrls.has(server.url)) {
        seenUrls.add(server.url);
        const serverLabel = server.name && !server.name.startsWith('Server')
          ? server.name
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
