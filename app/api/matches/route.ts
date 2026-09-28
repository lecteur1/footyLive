import { NextResponse } from 'next/server';

// قائمة البطولات والفرق ذات الأولوية
const PRIORITY_KEYWORDS = [
  'champions league', 'premier league', 'laliga', 'serie a', 'bundesliga', 
  'ligue 1', 'caf', 'africa', 'algeria', 'morocco', 'egypt', 'saudi', 
  'world cup', 'euro', 'nations league', 'afcon', 'copa', 'pro league'
];

export async function GET() {
  try {
    // جلب المباريات من واجهة المشروع الأصلية المعتمدة
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://footylive-api.vercel.app';
    const res = await fetch(`${baseUrl}/api/v1/matches`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 }
    });

    if (!res.ok) {
      // محاولة بديلة من المسار الداخلي إذا كان متوفراً
      return NextResponse.json({ matches: [] });
    }

    const data = await res.json();
    const rawMatches: any[] = Array.isArray(data) ? data : (data.matches || []);

    // فلترة المباريات: استبقاء المباريات المهمة أو التي تملك بثاً مؤكداً فقط
    const filteredMatches = rawMatches.filter((m: any) => {
      const tournament = (m.tournament || m.league || '').toLowerCase();
      const title = (m.title || '').toLowerCase();
      const hasStreams = Boolean(m.hasStreams || (m.streams && m.streams.length > 0));
      const isPriority = PRIORITY_KEYWORDS.some(k => tournament.includes(k) || title.includes(k));

      return hasStreams || isPriority;
    });

    return NextResponse.json({
      matches: filteredMatches.length > 0 ? filteredMatches : rawMatches.slice(0, 10)
    });
  } catch (error) {
    return NextResponse.json({ matches: [] }, { status: 200 });
  }
}
