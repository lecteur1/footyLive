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
  if (originalUrl.includes('embed') || originalUrl.includes('player') || originalUrl.startsWith('/')) {
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
  const cacheKey = `streams_v4_${matchId || matchTitle}`;

  return cache.swr(cacheKey, async () => {
    const hEn = preFetchedMatch?.homeEn || TEAM_TRANSLATIONS[homeTeam] || homeTeam;
    const aEn = preFetchedMatch?.awayEn || TEAM_TRANSLATIONS[awayTeam] || awayTeam;
    const enTitle = `${hEn} vs ${aEn}`;

    const streamProviders = providers.filter(p => p.id !== 'arabic_fixtures');
    const allServers: Channel[] = [];

    // 1. محاولة جلب السيرفرات الحية من المزودات الخارجية
    for (const provider of streamProviders) {
      try {
        const res = await provider.resolveStreams(enTitle, hEn, aEn, matchId, preFetchedMatch);
        if (Array.isArray(res) && res.length > 0) {
          allServers.push(...res);
        }
      } catch (err) {
        // مواصلة البحث
      }
    }

    // 2. توفير سيرفرات بث مباشرة مخصصة للمباراة لتفادي الشاشة السوداء نهائياً
    const titleLower = `${matchTitle} ${enTitle}`.toLowerCase();
    
    // تخصيص القنوات حسب المباراة المحددة
    let channelEmbed1 = 'https://embedstream.me/bein-sports-1-stream-1';
    let channelEmbed2 = 'https://embedstream.me/bein-sports-2-stream-1';

    if (titleLower.includes('algeria') || titleLower.includes('الجزائر')) {
      channelEmbed1 = 'https://embedstream.me/bein-sports-2-stream-1'; // القناة الناقلة لمباراة الجزائر
      channelEmbed2 = 'https://embedstream.me/bein-sports-1-stream-1';
    } else if (titleLower.includes('egypt') || titleLower.includes('مصر')) {
      channelEmbed1 = 'https://embedstream.me/bein-sports-1-stream-1';
      channelEmbed2 = 'https://embedstream.me/bein-sports-6-stream-1';
    } else if (titleLower.includes('saudi') || titleLower.includes('السعودية')) {
      channelEmbed1 = 'https://embedstream.me/alkass-one-stream-1';
      channelEmbed2 = 'https://embedstream.me/ssc-1-stream-1';
    }

    // إضافة السيرفرات المباشرة القابلة للتشغيل داخل iframe
    allServers.push(
      {
        name: 'سيرفر beIN الرئيسي (HD)',
        url: channelEmbed1,
        provider: 'bein_live',
        quality: '1080p',
      },
      {
        name: 'سيرفر بديل (جودة متعددة)',
        url: channelEmbed2,
        provider: 'bein_alt',
        quality: '720p',
      },
      {
        name: 'سيرفر احتياطي سريع',
        url: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
        provider: 'direct_cdn',
        quality: 'HD',
      }
    );

    const seenUrls = new Set<string>();
    const uniqueServers: Channel[] = [];
    let serverIndex = 1;

    for (const server of allServers) {
      if (!seenUrls.has(server.url)) {
        seenUrls.add(server.url);
        uniqueServers.push({
          ...server,
          name: server.name || `سيرفر ${serverIndex++}`,
          proxiedUrl: server.url,
        });
      }
    }

    return {
      url: uniqueServers[0].url,
      proxiedUrl: uniqueServers[0].proxiedUrl,
      channels: uniqueServers,
      serverCount: uniqueServers.length,
    };
  }, 10);
}
