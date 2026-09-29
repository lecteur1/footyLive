import { Match, Channel } from './types';
import { FootballTvProvider } from './providers/footballTv';
import { StreamedPkProvider } from './providers/streamedPk';
import { getCacheManager } from './cache/cacheManager';

// المزود الأول: السيرفر المنقى
const primaryProvider = new FootballTvProvider();
// المزود الاحتياطي
const backupProvider = new StreamedPkProvider();

export function getStreamRedirectUrl(originalUrl: string): string {
  return originalUrl;
}

export async function getMatches(): Promise<Match[]> {
  const cache = getCacheManager();
  return cache.swr('engine_live_matches_clean', async () => {
    // 1. محاولة الجلب من المزود الأول الأساسي
    try {
      const primaryMatches = await primaryProvider.fetchMatches();
      if (Array.isArray(primaryMatches) && primaryMatches.length > 0) {
        return primaryMatches;
      }
    } catch (e) {}

    // 2. الرجوع للمزود الثاني في حال الفشل
    try {
      return await backupProvider.fetchMatches();
    } catch {
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
  preFetchedMatch?: any
): Promise<{ url: string; proxiedUrl: string; channels: Channel[]; serverCount: number }> {
  let channels: Channel[] = [];

  // 1. فحص روابط المزود الأول الأساسي
  try {
    channels = await primaryProvider.resolveStreams(matchTitle, homeTeam, awayTeam, matchId, preFetchedMatch);
  } catch (e) {}

  // 2. إذا لم يعثر على سيرفرات، يتم جلب سيرفرات المزود الاحتياطي
  if (!channels || channels.length === 0) {
    try {
      channels = await backupProvider.resolveStreams(matchTitle, homeTeam, awayTeam, matchId, preFetchedMatch);
    } catch (e) {}
  }

  if (channels && channels.length > 0) {
    return {
      url: channels[0].url,
      proxiedUrl: channels[0].url,
      channels: channels,
      serverCount: channels.length,
    };
  }

  return {
    url: '',
    proxiedUrl: '',
    channels: [],
    serverCount: 0,
  };
}

export async function getMatchStats(matchId: string): Promise<any | null> {
  return null;
}

export async function getLeagues(): Promise<string[]> {
  return ['Football'];
}

export async function getTopTeams(): Promise<string[]> {
  return [];
}
