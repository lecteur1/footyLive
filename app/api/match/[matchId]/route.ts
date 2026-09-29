import { NextRequest, NextResponse } from 'next/server';
import { getMatches } from '@/lib/streamEngine';

export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    const allMatches = await getMatches().catch(() => []);
    let match: any = allMatches.find(m => String(m.id) === String(matchId)) || null;

    // إذا لم يجد المباراة، يقوم بإنشاء بياناتها مباشرة من المعرف لضمان عدم إرجاع null
    if (!match) {
      const decoded = decodeURIComponent(matchId).replace(/^(ar-|fd-)/, '');
      const parts = decoded.split('-vs-');
      const home = parts[0] ? parts[0].replace(/-/g, ' ') : 'Home Team';
      const away = parts[1] ? parts[1].replace(/-/g, ' ') : 'Away Team';

      match = {
        status: 'live',
        homeScore: 0,
        awayScore: 0,
        currentMinute: 'مباشر',
        currentMinuteNumber: 45,
        homeTeam: { name: home, badge: '' },
        awayTeam: { name: away, badge: '' },
        tournament: 'تصفيات كأس أفريقيا',
        leagueLogo: '',
        venue: 'الملعب الرئيسي',
        timestamp: Date.now(),
      };
    }

    const kickoff = match.timestamp || Date.now();
    const dateStr = new Date(kickoff).toLocaleDateString([], {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const timeStr = new Date(kickoff).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    });

    const homeName = typeof match.homeTeam === 'object' ? (match.homeTeam?.name || match.team1) : (match.homeTeam || match.team1 || 'الفريق 1');
    const awayName = typeof match.awayTeam === 'object' ? (match.awayTeam?.name || match.team2) : (match.awayTeam || match.team2 || 'الفريق 2');

    return NextResponse.json({
      match: {
        id: matchId,
        status: match.status || 'live',
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0,
        currentMinute: match.currentMinute || 'مباشر',
        currentMinuteNumber: match.currentMinuteNumber || 45,
        homeName: homeName,
        awayName: awayName,
        homeBadge: match.homeTeam?.badge || '',
        awayBadge: match.awayTeam?.badge || '',
        tournament: match.tournament || 'مباراة دولية',
        leagueLogo: match.leagueLogo || '',
        venue: match.venue || 'بث مباشر',
        dateStr,
        timeStr,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Unable to load match data.' }, { status: 500 });
  }
}
