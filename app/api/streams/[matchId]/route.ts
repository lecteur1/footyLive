import { NextRequest, NextResponse } from 'next/server';
import { getMatches, resolveAllStreams } from '@/lib/streamEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  try {
    const allMatches = await getMatches().catch(() => []);
    const match = allMatches.find(m => String(m.id) === String(matchId)) || null;

    const title = match?.title || decodeURIComponent(matchId);
    const homeTeam = (typeof match?.homeTeam === 'object' ? (match.homeTeam as any)?.name : match?.homeTeam) || match?.team1 || '';
    const awayTeam = (typeof match?.awayTeam === 'object' ? (match.awayTeam as any)?.name : match?.awayTeam) || match?.team2 || '';

    const resolved = await resolveAllStreams(title, matchId, String(homeTeam), String(awayTeam), match);

    return NextResponse.json({
      matchTitle: title,
      matchStatus: match?.status || 'live',
      streams: resolved.channels || [],
      defaultUrl: resolved.url || (resolved.channels && resolved.channels[0]?.url) || '',
      isDirectHls: false,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to resolve stream routes: ' + err.message },
      { status: 500 }
    );
  }
}
