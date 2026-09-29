import { NextRequest, NextResponse } from 'next/server';
import { getMatches } from '@/lib/streamEngine';

export const revalidate = 0; // إيقاف الكاش المؤقت لضمان التحديث اللحظي

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  try {
    const allMatches = await getMatches().catch(() => []);
    const match = allMatches.find(m => m.id === matchId || decodeURIComponent(matchId).includes(m.id)) || null;

    const matchTitle = match?.title || decodeURIComponent(matchId);
    const titleLower = matchTitle.toLowerCase();

    // اختيار سيرفرات البث المتوافقة مع المباراة الحالية
    let server1 = 'https://embedstream.me/bein-sports-1-stream-1';
    let server2 = 'https://embedstream.me/bein-sports-2-stream-1';
    let server3 = 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html';

    if (titleLower.includes('algeria') || titleLower.includes('الجزائر') || titleLower.includes('بوروندي')) {
      server1 = 'https://embedstream.me/bein-sports-2-stream-1'; // beIN Sports 2 HD
      server2 = 'https://embedstream.me/bein-sports-1-stream-1';
    } else if (titleLower.includes('egypt') || titleLower.includes('مصر') || titleLower.includes('السودان')) {
      server1 = 'https://embedstream.me/bein-sports-1-stream-1'; // beIN Sports 1 HD
      server2 = 'https://embedstream.me/bein-sports-6-stream-1';
    } else if (titleLower.includes('saudi') || titleLower.includes('السعودية') || titleLower.includes('العراق')) {
      server1 = 'https://embedstream.me/alkass-one-stream-1';
      server2 = 'https://embedstream.me/ssc-1-stream-1';
    }

    // بناء قائمة السيرفرات بجميع المسميات الممكنة التي قد تطلبها الواجهة
    const channelList = [
      {
        id: 'srv-1',
        name: 'سيرفر beIN 1 (جودة عالية HD)',
        url: server1,
        proxiedUrl: server1,
        quality: '1080p',
        provider: 'bein',
      },
      {
        id: 'srv-2',
        name: 'سيرفر beIN 2 (متعدد الجودات)',
        url: server2,
        proxiedUrl: server2,
        quality: '720p',
        provider: 'bein',
      },
      {
        id: 'srv-3',
        name: 'سيرفر احتياطي مباشر',
        url: server3,
        proxiedUrl: server3,
        quality: 'SD',
        provider: 'direct',
      },
    ];

    // إرجاع كل الحقول المحتملة لتغذية المشغل أياً كان اسمه البرمجي في React
    return NextResponse.json({
      matchTitle: matchTitle,
      matchStatus: 'live',
      url: channelList[0].url,
      proxiedUrl: channelList[0].proxiedUrl,
      defaultUrl: channelList[0].url,
      streamUrl: channelList[0].url,
      channels: channelList, // الحقل الأساسي للمشغل
      streams: channelList,  // الحقل البديل
      serverCount: channelList.length,
    });
  } catch (err: any) {
    // في حال حدوث أي استثناء، لا نترك المشغل فارغاً بل نعيد السيرفرات الأساسية فوراً
    const fallbackList = [
      {
        id: 'fallback-1',
        name: 'بث مباشر 1 (سيرفر الطوارئ)',
        url: 'https://embedstream.me/bein-sports-1-stream-1',
        proxiedUrl: 'https://embedstream.me/bein-sports-1-stream-1',
        quality: 'HD',
        provider: 'fallback',
      },
    ];

    return NextResponse.json({
      matchTitle: 'بث مباشر',
      matchStatus: 'live',
      url: fallbackList[0].url,
      proxiedUrl: fallbackList[0].proxiedUrl,
      channels: fallbackList,
      streams: fallbackList,
      serverCount: 1,
    });
  }
}
