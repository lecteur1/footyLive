import { NextRequest, NextResponse } from 'next/server';
import { getMatchDetails, resolveAllStreams } from '@/lib/streamEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    const match = await getMatchDetails(matchId);

    const title = match?.title || decodeURIComponent(matchId).replace(/[-_]/g, ' ');
    const homeTeam = (typeof match?.homeTeam === 'object' ? match?.homeTeam?.name : match?.homeTeam) || match?.team1 || '';
    const awayTeam = (typeof match?.awayTeam === 'object' ? match?.awayTeam?.name : match?.awayTeam) || match?.team2 || '';

    // حل السيرفرات الحقيقية عبر المحرك
    const resolved = await resolveAllStreams(title, matchId, String(homeTeam), String(awayTeam), match);

    const defaultUrl = resolved.proxiedUrl || resolved.url || (resolved.channels && resolved.channels[0]?.url) || '';

    return NextResponse.json({
      matchTitle: title,
      matchStatus: match?.status || 'live',
      streams: resolved.channels || [],
      defaultUrl: defaultUrl,
      isDirectHls: defaultUrl.includes('.m3u8') || defaultUrl.includes('.mpd') || defaultUrl.includes('.mp4')
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to resolve stream routes: ' + err.message },
      { status: 500 }
    );
  }
}
