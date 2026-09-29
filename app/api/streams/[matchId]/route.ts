import { NextRequest, NextResponse } from 'next/server';
import { getMatches, resolveAllStreams } from '@/lib/streamEngine';

export const revalidate = 15;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    // 1. البحث عن المباراة من القائمة الكاملة الحالية
    const allMatches = await getMatches();
    const match = allMatches.find(m => m.id === matchId) || null;

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // 2. قراءة أسماء الفرق بدقة سواء كانت نصوصاً أو كائنات
    const homeTeam = (typeof match.homeTeam === 'object' ? (match.homeTeam as any)?.name : match.homeTeam) || match.team1 || '';
    const awayTeam = (typeof match.awayTeam === 'object' ? (match.awayTeam as any)?.name : match.awayTeam) || match.team2 || '';

    // 3. استدعاء السيرفرات الحية
    const resolved = await resolveAllStreams(match.title, matchId, String(homeTeam), String(awayTeam), match);

    // 4. تسليم السيرفرات الآمنة للمشغل
    const safeStreams = (resolved.channels || []).map((stream) => ({
      ...stream,
      url: stream.proxiedUrl || stream.url,
    }));

    return NextResponse.json({
      matchTitle: match.title,
      matchStatus: match.status,
      streams: safeStreams,
      defaultUrl: resolved.proxiedUrl || resolved.url,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to resolve stream routes: ' + err.message },
      { status: 500 }
    );
  }
}
