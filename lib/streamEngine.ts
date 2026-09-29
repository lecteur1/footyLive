import crypto from 'crypto';
import logger from './logger';
import { Match, Channel } from './types';
import { StreamedPkProvider } from './providers/streamedPk';
import { getCacheManager } from './cache/cacheManager';

const SECRET_KEY = process.env.STREAM_SECRET || 'default_stream_hmac_secret_key_123_abc';
const streamedProvider = new StreamedPkProvider();

export function getStreamRedirectUrl(originalUrl: string): string {
  return originalUrl;
}

export async function getMatches(): Promise<Match[]> {
  const cache = getCacheManager();
  return cache.swr('engine_master_matches_all', async () => {
    const now = Date.now();

    // 1. المباريات العربية والإفريقية المباشرة لليوم
    const customMatches: Match[] = [
      {
        id: 'ar-algeria-vs-burundi',
        title: 'الجزائر ضد بوروندي',
        team1: 'الجزائر',
        team2: 'بوروندي',
        homeTeam: { name: 'الجزائر', badge: '' },
        awayTeam: { name: 'بوروندي', badge: '' },
        tournament: 'تصفيات كأس أفريقيا',
        status: 'live',
        timestamp: now,
        time: '15:00',
        hasStreams: true,
      } as unknown as Match,
      {
        id: 'ar-egypt-vs-south-sudan',
        title: 'مصر ضد جنوب السودان',
        team1: 'مصر',
        team2: 'جنوب السودان',
        homeTeam: { name: 'مصر', badge: '' },
        awayTeam: { name: 'جنوب السودان', badge: '' },
        tournament: 'تصفيات كأس أفريقيا',
        status: 'live',
        timestamp: now,
        time: '15:00',
        hasStreams: true,
      } as unknown as Match,
      {
        id: 'ar-morocco-vs-lesotho',
        title: 'المغرب ضد ليسوتو',
        team1: 'المغرب',
        team2: 'ليسوتو',
        homeTeam: { name: 'المغرب', badge: '' },
        awayTeam: { name: 'ليسوتو', badge: '' },
        tournament: 'تصفيات كأس أفريقيا',
        status: 'live',
        timestamp: now,
        time: '15:00',
        hasStreams: true,
      } as unknown as Match,
    ];

    // 2. جلب المباريات العالمية الإضافية من StreamedPk
    try {
      const globalMatches = await streamedProvider.fetchMatches();
      return [...customMatches, ...globalMatches];
    } catch {
      return customMatches;
    }
  }, 10);
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
  const mLower = `${matchTitle} ${matchId}`.toLowerCase();

  let s1 = 'https://topembed.pw/channel/beIN_Sports_2_HD';
  let s2 = 'https://embedstream.me/bein-sports-2-stream-1';

  if (mLower.includes('egypt') || mLower.includes('مصر') || mLower.includes('sudan')) {
    s1 = 'https://topembed.pw/channel/beIN_Sports_1_HD';
    s2 = 'https://embedstream.me/bein-sports-1-stream-1';
  } else if (mLower.includes('england') || mLower.includes('czechia') || mLower.includes('spain')) {
    s1 = 'https://embedstream.me/bein-sports-1-stream-1';
    s2 = 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html';
  }

  const channels: Channel[] = [
    {
      name: 'Server 1 (Live HD)',
      url: s1,
      proxiedUrl: s1,
      quality: 'HD',
      provider: 'bein',
    },
    {
      name: 'Server 2 (Fast Stream)',
      url: s2,
      proxiedUrl: s2,
      quality: '720p',
      provider: 'bein',
    },
    {
      name: 'Server 3 (Backup CDN)',
      url: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      proxiedUrl: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      quality: 'SD',
      provider: 'direct',
    }
  ];

  return {
    url: channels[0].url,
    proxiedUrl: channels[0].url,
    channels,
    serverCount: channels.length,
  };
}

export async function getLeagues(): Promise<string[]> {
  return ['World Football', 'International'];
}

export async function getTopTeams(): Promise<string[]> {
  return [];
}

export async function getMatchStats(matchId: string): Promise<any | null> {
  return null;
}
