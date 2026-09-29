import { Match, Channel } from '../types';
import { StreamProvider } from './types';
import { fetchWithTimeout } from './baseProvider';
import { teamsMatch } from '../utils/matching';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

const CDN_LIVE_API = 'https://api.cdnlivetv.tv/api/v1/events/sports/?user=cdnlivetv&plan=free';
const TIMEOUT_MS = 5000;

interface CdnliveRawMatch {
  gameID: string;
  homeTeam: string;
  awayTeam: string;
  tournament: string;
  country: string;
  status: string;
  start: string;
  channels: { channel_name: string; url: string }[];
}

export class CdnLiveProvider implements StreamProvider {
  id = 'cdnlive';
  name = 'CDNLiveTV';

  private async fetchRawMatches(): Promise<CdnliveRawMatch[]> {
    const cache = getCacheManager();
    return cache.swr('cdnlive_raw', async () => {
      try {
        const data = await fetchWithTimeout(CDN_LIVE_API, TIMEOUT_MS);
        const sportsData = data?.['cdn-live-tv'] || {};
        const soccerEvents = sportsData['Soccer'] || sportsData['Football'] || [];
        return Array.isArray(soccerEvents) ? soccerEvents : [];
      } catch (err) {
        logger.error('CDNLiveTV API request failed', err);
        return [];
      }
    }, 30);
  }

  // تفعيل الدالة لجلب كل مباريات CDNLive وجدول اليوم
  async fetchMatches(): Promise<Match[]> {
    try {
      const raw = await this.fetchRawMatches();
      const now = Date.now();

      return raw.map((event: CdnliveRawMatch) => {
        const home = String(event.homeTeam || '').trim();
        const away = String(event.awayTeam || '').trim();
        const matchTime = event.start ? new Date(event.start).getTime() : now;
        const validTime = isNaN(matchTime) ? now : matchTime;

        const isLive = String(event.status || '').toLowerCase().includes('live') ||
                       (validTime <= now && (now - validTime) < 130 * 60 * 1000);

        const channelsList = (event.channels || []).map((ch, idx) => ({
          name: ch.channel_name || `Server ${idx + 1}`,
          url: ch.url,
          provider: this.id,
          quality: 'HD',
        }));

        return {
          id: event.gameID || `${home}-vs-${away}`,
          title: `${home} vs ${away}`,
          team1: home || 'الفريق 1',
          team2: away || 'الفريق 2',
          homeTeam: home || 'الفريق 1',
          awayTeam: away || 'الفريق 2',
          tournament: event.tournament || event.country || 'كرة قدم',
          status: isLive ? 'live' : 'upcoming',
          timestamp: validTime,
          time: new Date(validTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasStreams: channelsList.length > 0,
          streams: channelsList,
        } as Match;
      });
    } catch (err) {
      logger.error('CDNLive fetchMatches conversion failed', err);
      return [];
    }
  }

  async resolveStreams(
    matchTitle: string,
    homeTeam: string,
    awayTeam: string,
    matchId: string,
    preFetchedMatch?: Match | null
  ): Promise<Channel[]> {
    try {
      const events = await this.fetchRawMatches();
      const channels: Channel[] = [];
      
      for (const event of events) {
        const eventTitle = `${event.homeTeam || ''} vs ${event.awayTeam || ''}`;
        if (teamsMatch(matchTitle, eventTitle)) {
          const eventChannels = event.channels || [];
          eventChannels.forEach((ch, idx) => {
            if (ch.url) {
              channels.push({
                name: ch.channel_name || `Stream ${idx + 1}`,
                url: ch.url,
                provider: this.id,
                quality: 'HD',
              });
            }
          });
        }
      }
      return channels;
    } catch (err) {
      logger.error('CDNLive streams resolution failed', err, { matchTitle });
      return [];
    }
  }
}
