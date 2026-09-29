import { Match, Channel } from './types';
import { StreamedPkProvider } from './providers/streamedPk';
import { getCacheManager } from './cache/cacheManager';

const streamedProvider = new StreamedPkProvider();

export function getStreamRedirectUrl(originalUrl: string): string {
  return originalUrl;
}

export async function getMatches(): Promise<Match[]> {
  const cache = getCacheManager();
  return cache.swr('engine_live_matches_clean', async () => {
    try {
      const matches = await streamedProvider.fetchMatches();
      return matches;
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
  try {
    const channels = await streamedProvider.resolveStreams(matchTitle, homeTeam, awayTeam, matchId, preFetchedMatch);
    
    if (channels && channels.length > 0) {
      return {
        url: channels[0].url,
        proxiedUrl: channels[0].url,
        channels: channels,
        serverCount: channels.length,
      };
    }
  } catch (e) {}

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
