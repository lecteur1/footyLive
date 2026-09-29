import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  // روابط بث عالمية مفتوحة لا تفرض حظراً على الـ iframe وتعمل على الهواتف مباشرة
  const globalStreams = [
    {
      id: 'global-srv-1',
      name: 'Server 1 (Global Live HD)',
      url: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      proxiedUrl: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      quality: '1080p',
      provider: 'global_cdn'
    },
    {
      id: 'global-srv-2',
      name: 'Server 2 (Fast Stream)',
      url: 'https://embedme.top/embed/alpha/sports/1',
      proxiedUrl: 'https://embedme.top/embed/alpha/sports/1',
      quality: '720p',
      provider: 'stream_alpha'
    },
    {
      id: 'global-srv-3',
      name: 'Server 3 (Backup Feed)',
      url: 'https://crackstream.io/embed/football-1',
      proxiedUrl: 'https://crackstream.io/embed/football-1',
      quality: 'HD',
      provider: 'backup_cdn'
    }
  ];

  return NextResponse.json({
    matchTitle: 'Live Football Stream',
    matchStatus: 'live',
    url: globalStreams[0].url,
    proxiedUrl: globalStreams[0].proxiedUrl,
    defaultUrl: globalStreams[0].url,
    streamUrl: globalStreams[0].url,
    channels: globalStreams,
    streams: globalStreams,
    serverCount: globalStreams.length,
  });
}
