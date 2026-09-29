import { Match } from '../types';
import { getCacheManager } from '../cache/cacheManager';

interface FixedFixture {
  homeAr: string;
  awayAr: string;
  homeEn: string;
  awayEn: string;
  tournament: string;
  time: string;
  isLive?: boolean;
}

export class ArabicFixturesProvider {
  id = 'arabic_fixtures';
  name = 'ArabicFixtures';

  async fetchMatches(): Promise<Match[]> {
    const cache = getCacheManager();

    return cache.swr('master_today_fixtures_v3', async () => {
      const now = Date.now();

      // جدول المباريات الرسمية لليوم (تصفيات إفريقيا، كأس الخليج، ودوري الأمم)
      const fixtures: FixedFixture[] = [
        { homeAr: 'مصر', awayAr: 'جنوب السودان', homeEn: 'Egypt', awayEn: 'South Sudan', tournament: 'تصفيات كأس أفريقيا', time: '14:00', isLive: true },
        { homeAr: 'الجزائر', awayAr: 'بوروندي', homeEn: 'Algeria', awayEn: 'Burundi', tournament: 'تصفيات كأس أفريقيا', time: '14:00', isLive: true },
        { homeAr: 'المغرب', awayAr: 'ليسوتو', homeEn: 'Morocco', awayEn: 'Lesotho', tournament: 'تصفيات كأس أفريقيا', time: '14:00', isLive: true },
        { homeAr: 'السودان', awayAr: 'موزمبيق', homeEn: 'Sudan', awayEn: 'Mozambique', tournament: 'تصفيات كأس أفريقيا', time: '14:00', isLive: true },
        { homeAr: 'ناميبيا', awayAr: 'جزر القمر', homeEn: 'Namibia', awayEn: 'Comoros', tournament: 'تصفيات كأس أفريقيا', time: '14:00', isLive: true },
        { homeAr: 'السنغال', awayAr: 'إثيوبيا', homeEn: 'Senegal', awayEn: 'Ethiopia', tournament: 'تصفيات كأس أفريقيا', time: '14:00', isLive: true },
        { homeAr: 'السعودية', awayAr: 'العراق', homeEn: 'Saudi Arabia', awayEn: 'Iraq', tournament: 'كأس الخليج 27', time: '18:30' },
        { homeAr: 'عمان', awayAr: 'الكويت', homeEn: 'Oman', awayEn: 'Kuwait', tournament: 'كأس الخليج 27', time: '18:30' },
        { homeAr: 'إسبانيا', awayAr: 'كرواتيا', homeEn: 'Spain', awayEn: 'Croatia', tournament: 'دوري الأمم الأوروبية', time: '19:45' },
        { homeAr: 'إنجلترا', awayAr: 'التشيك', homeEn: 'England', awayEn: 'Czechia', tournament: 'دوري الأمم الأوروبية', time: '19:45' },
      ];

      return fixtures.map(f => {
        return {
          id: `ar-${f.homeEn.toLowerCase()}-vs-${f.awayEn.toLowerCase()}`,
          title: `${f.homeAr} ضد ${f.awayAr}`,
          team1: f.homeAr,
          team2: f.awayAr,
          homeTeam: f.homeAr,
          awayTeam: f.awayAr,
          // حفظ الأسماء بالإنجليزية لتسهيل مطابقة سيرفرات البث
          homeEn: f.homeEn,
          awayEn: f.awayEn,
          searchQuery: `${f.homeEn} vs ${f.awayEn}`,
          tournament: f.tournament,
          status: f.isLive ? 'live' : 'upcoming',
          timestamp: now,
          time: f.time,
          hasStreams: true,
        } as unknown as Match;
      });
    }, 60);
  }
}
