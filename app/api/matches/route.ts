import { NextRequest, NextResponse } from 'next/server';
import { getMatches } from '@/lib/streamEngine';

export const revalidate = 60; // كاش لمدة دقيقة واحدة

// كلمات مفتاحية بالإنجليزية (كما يرجعها المصدر بالضبط) + بالعربية كاحتياط
const PRIORITY_KEYWORDS = [
  // منتخبات وبطولات شمال إفريقيا والخليج
  'algeria', 'egypt', 'morocco', 'tunisia', 'saudi', 'iraq', 'oman', 'kuwait', 'qatar', 'uae',
  'caf', 'africa', 'afcon', 'gulf cup', 'arabian gulf',
  
  // البطولات الأوروبية الكبرى
  'champions league', 'premier league', 'laliga', 'la liga', 'serie a', 'bundesliga', 'ligue 1',
  'nations league', 'uefa', 'euro', 'world cup',
  'spain', 'england', 'france', 'germany', 'italy', 'portugal', 'argentina', 'brazil',

  // كلمات عربية احتياطية في حال كان هناك مصدر معرب
  'الجزائر', 'مصر', 'المغرب', 'تونس', 'السعودية', 'العراق', 'أفريقيا', 'الخليج'
];

export async function GET(request: NextRequest) {
  try {
    const rawMatches = await getMatches();
    const allMatches = Array.isArray(rawMatches) ? rawMatches : [];

    // إذا لم يرجع المصدر أي شيء
    if (allMatches.length === 0) {
      return NextResponse.json([]);
    }

    // 1. فلترة المباريات الهامة
    const priorityMatches = allMatches.filter((match: any) => {
      const tournament = (match.tournament || match.league || '').toLowerCase();
      const title = (match.title || `${match.team1 || ''} ${match.team2 || ''}`).toLowerCase();

      return PRIORITY_KEYWORDS.some((key) => 
        tournament.includes(key) || title.includes(key)
      );
    });

    // 2. إذا وُجدت مباريات مهمة نعرضها، وإذا لم توجد (أو في الصباح الباكر) نعرض كل المباريات المتاحة بدلاً من ترك الشاشة سوداء
    const displayList = priorityMatches.length > 0 ? priorityMatches : allMatches;

    // 3. الترتيب الذكي:
    // المباريات الجارية الآن أولاً، ثم حسب توقيت الانطلاق الزمني
    const sorted = [...displayList].sort((a: any, b: any) => {
      const aIsLive = a.status === 'live' || a.isLive;
      const bIsLive = b.status === 'live' || b.isLive;

      if (aIsLive && !bIsLive) return -1;
      if (!aIsLive && bIsLive) return 1;

      return (a.timestamp ?? 0) - (b.timestamp ?? 0);
    });

    // نرجع مصفوفة مباشرة
    return NextResponse.json(sorted);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve match fixtures: ' + err.message },
      { status: 500 }
    );
  }
}
