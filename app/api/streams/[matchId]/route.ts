import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const decodedId = decodeURIComponent(matchId).toLowerCase();

  // روابط بث HLS ومفتوحة تقبل التشغيل المباشر داخل المشغلات دون حظر iframe
  const streams = [
    {
      name: 'Server 1 (Direct Stream HD)',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      proxiedUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      quality: '1080p',
    },
    {
      name: 'Server 2 (Backup Web Player)',
      url: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      proxiedUrl: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      quality: '720p',
    }
  ];

  return NextResponse.json({
    matchTitle: decodedId.replace(/[-_]/g, ' '),
    matchStatus: 'live',
    streams: streams,
    channels: streams,
    defaultUrl: streams[0].url,
    proxiedUrl: streams[0].proxiedUrl,
    isDirectHls: true, // إجبار المشغل على استخدام مشغل HLS/Video الأصلي فوراً وتخطي زر الحماية
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json',
    }
  });
}
