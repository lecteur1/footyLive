import { NextRequest, NextResponse } from 'next/server';
import { getMatches } from '@/lib/streamEngine';

export const revalidate = 10; // short revalidation for live match updates

// قائمة البطولات والكلمات المفتاحية ذات الأولوية
const PRIORITY_KEYWORDS = [
  'champions league', 'premier league', 'laliga', 'serie a', 'bundesliga',
  'ligue 1', 'caf', 'africa', 'algeria', 'morocco', 'egypt', 'saudi',
  'world cup', 'euro', 'nations league', 'afcon', 'copa', 'pro league'
];

export async function GET(request: NextRequest) {
  try {
    const allMatches = await getMatches();

    // 1. فلترة ذكية: إبقاء المباريات التي تملك سيرفرات أو تتبع بطولات مهمة
    const filtered = (allMatches || []).filter((match: any) => {
      // التحقق من وجود سيرفرات أو علامة بث متاح
      const hasStreams = Boolean(
        match.hasStreams ||
        (Array.isArray(match.streams) && match.streams.length > 0)
      );

      const tournament = (match.tournament || match.league || '').toLowerCase();
      const title = (match.title || '').toLowerCase();
      const isPriority = PRIORITY_KEYWORDS.some(
        (key) => tournament.includes(key) || title.includes(key)
      );

      // تظهر المباراة إذا كان لها سيرفر مؤكد، أو كانت بطولة هامة وفي وقتها
      return hasStreams || isPriority;
    });

    // استخدام القائمة المفلترة، وفي حال لم يتبق شيء نرجع القائمة الأصلية لتجنب الصفحة الفارغة
    const finalList = filtered.length > 0 ? filtered : allMatches;

    // 2. الترتيب: المباشر أولاً، ثم حسب الأولوية، ثم حسب التوقيت
    const sorted = [...finalList].sort((a: any, b: any) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      if ((a.priority ?? 99) !== (b.priority ?? 99)) {
        return (a.priority ?? 99) - (b.priority ?? 99);
      }
      return (a.timestamp ?? 0) - (b.timestamp ?? 0);
    });

    return NextResponse.json({ matches: sorted });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve match fixtures: ' + err.message },
      { status: 500 }
    );
  }
}
