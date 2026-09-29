import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/streamEngine';

// إيقاف الكاش الساكن لضمان جلب المباريات المباشرة وتحديثها فوراً عند أي طلب
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const matches = await getMatches();

    return NextResponse.json(matches, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch matches: ' + (err?.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
