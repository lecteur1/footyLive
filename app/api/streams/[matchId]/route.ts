import { NextRequest, NextResponse } from 'next/server';
import { StreamedPkProvider } from '@/lib/providers/streamedPk';

export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const provider = new StreamedPkProvider();

  try {
    const channels = await provider.resolveStreams('', '', '', matchId);

    if (!channels || channels.length === 0) {
      // سيرفر احتياطي سريع إذا تأخرت الاستجابة لضمان تشغيل الفيديو
      const fallbackUrl = 'https://voodc.com/embed/858a9289a089988b87948885978a878484.html';
      return NextResponse.json({
        matchTitle: 'Live Football Stream',
        matchStatus: 'LIVE',
        streams: [
          {
            name: 'Server 1 (Live HD)',
            url: fallbackUrl,
            proxiedUrl: fallbackUrl,
            quality: 'HD',
          }
        ],
        defaultUrl: fallbackUrl,
        isDirectHls: false,
      });
    }

    const defaultUrl = channels[0].proxiedUrl || channels[0].url;

    return NextResponse.json({
      matchTitle: 'Live Football',
      matchStatus: 'LIVE',
      streams: channels,
      defaultUrl: defaultUrl,
      isDirectHls: defaultUrl.includes('.m3u8') || defaultUrl.includes('.mpd') || defaultUrl.includes('.mp4'),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to resolve stream routes: ' + err.message },
      { status: 500 }
    );
  }
}
