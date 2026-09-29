import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const decodedId = decodeURIComponent(matchId).toLowerCase();

  // رابط البث المباشر الفعال
  let streamUrl = 'https://topembed.pw/channel/beIN_Sports_2_HD';
  if (decodedId.includes('egypt') || decodedId.includes('مصر') || decodedId.includes('sudan')) {
    streamUrl = 'https://topembed.pw/channel/beIN_Sports_1_HD';
  }

  const streamsList = [
    {
      name: 'Server 1 (Live HD)',
      url: streamUrl,
      proxiedUrl: streamUrl,
      quality: 'HD',
    },
    {
      name: 'Server 2 (Backup CDN)',
      url: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      proxiedUrl: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      quality: 'SD',
    }
  ];

  return NextResponse.json({
    matchTitle: decodedId.replace(/[-_]/g, ' '),
    matchStatus: 'live',
    streams: streamsList,
    channels: streamsList,
    defaultUrl: streamsList[0].url,
    proxiedUrl: streamsList[0].url,
    isDirectHls: false,
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  });
}
