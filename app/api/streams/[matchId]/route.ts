import { NextRequest, NextResponse } from 'next/server';
import { getMatchDetails, resolveAllStreams } from '@/lib/streamEngine';

export const revalidate = 15;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    const match = await getMatchDetails(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const homeTeam = match.homeTeam?.name || '';
    const awayTeam = match.awayTeam?.name || '';

    const resolved = await resolveAllStreams(match.title, matchId, homeTeam, awayTeam, match);

    // التأكد من أن كل سيرفر يمر عبر المسار المعقم والخالي من الإعلانات
    const safeStreams = (resolved.channels || []).map((stream) => ({
      ...stream,
      url: stream.proxiedUrl,
    }));

    return NextResponse.json({
      matchTitle: match.title,
      matchStatus: match.status,
      streams: safeStreams,
      defaultUrl: resolved.proxiedUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to resolve stream routes: ' + err.message },
      { status: 500 }
    );
  }
}
