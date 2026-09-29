import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const decodedId = decodeURIComponent(matchId).toLowerCase();

  // تحديد القناة المناسبة حسب المباراة
  let mainStream = 'https://topembed.pw/channel/beIN_Sports_1_HD';
  let altStream = 'https://topembed.pw/channel/beIN_Sports_2_HD';

  if (decodedId.includes('algeria') || decodedId.includes('الجزائر') || decodedId.includes('burundi') || decodedId.includes('بوروندي')) {
    mainStream = 'https://topembed.pw/channel/beIN_Sports_2_HD';
    altStream = 'https://topembed.pw/channel/beIN_Sports_1_HD';
  } else if (decodedId.includes('egypt') || decodedId.includes('مصر') || decodedId.includes('sudan') || decodedId.includes('السودان')) {
    mainStream = 'https://topembed.pw/channel/beIN_Sports_1_HD';
    altStream = 'https://topembed.pw/channel/beIN_Sports_6_HD';
  }

  const channels = [
    {
      id: 'srv-1',
      name: 'سيرفر beIN 1 (جودة فائقة HD)',
      url: mainStream,
      proxiedUrl: mainStream,
      quality: '1080p',
      provider: 'bein',
    },
    {
      id: 'srv-2',
      name: 'سيرفر beIN 2 (متعدد الجودات)',
      url: altStream,
      proxiedUrl: altStream,
      quality: '720p',
      provider: 'bein',
    },
    {
      id: 'srv-3',
      name: 'سيرفر بديل بدون تقطيع',
      url: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      proxiedUrl: 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html',
      quality: 'SD',
      provider: 'direct',
    }
  ];

  return NextResponse.json({
    matchTitle: 'بث مباشر',
    matchStatus: 'live',
    url: channels[0].url,
    proxiedUrl: channels[0].proxiedUrl,
    defaultUrl: channels[0].url,
    streamUrl: channels[0].url,
    channels: channels,
    streams: channels,
    serverCount: channels.length,
  });
}
