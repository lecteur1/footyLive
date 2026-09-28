import { NextResponse } from 'next/server';

// قائمة البطولات والكلمات المفتاحية المهمة للمستخدم العربي والمحلي
const PRIORITY_KEYWORDS = [
  'champions league', 'premier league', 'laliga', 'serie a', 'bundesliga', 
  'ligue 1', 'caf', 'africa', 'algeria', 'morocco', 'egypt', 'saudi', 
  'world cup', 'euro', 'nations league', 'afcon', 'copa'
];

export async function GET() {
  try {
    // 1. جلب المباريات من المصدر المعتمد
    const res = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: {
        'x-apisports-key': process.env.FOOTBALL_API_KEY || '',
        'User-Agent': 'Mozilla/5.0'
      },
      next: { revalidate: 60 }
    });

    // في حال كنت تعتمد على مصدر الـ Scraper المباشر الخاص بالمشروع:
    const data = await res.json();
    let rawMatches = data.response || data.matches || (Array.isArray(data) ? data : []);

    // 2. فلترة صارمة: فقط المباريات التي تملك بثاً حقيقياً أو بطولات ذات أولوية
    const filteredMatches = rawMatches.filter((m) => {
      const tournament = (m.tournament || m.league?.name || '').toLowerCase();
      const hasStreams = (m.streams && m.streams.length > 0) || m.hasStreams === true;

      // استبعاد الدوريات الضعيفة جداً غير المتلفزة عربياً إلا إذا توفر لها سيرفر مؤكد
      const isPriority = PRIORITY_KEYWORDS.some(k => tournament.includes(k));

      return hasStreams || isPriority;
    });

    return NextResponse.json({
      matches: filteredMatches.length > 0 ? filteredMatches : rawMatches.slice(0, 8)
    });

  } catch (error) {
    return NextResponse.json({ matches: [] }, { status: 500 });
  }
}
