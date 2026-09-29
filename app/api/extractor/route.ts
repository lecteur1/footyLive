import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is missing' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': targetUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const html = await res.text();

    // البحث عن روابط m3u8 أو hls الصافية داخل كود المصدر
    const m3u8Regex = /(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i;
    const match = html.match(m3u8Regex);

    if (match && match[1]) {
      return NextResponse.json({
        success: true,
        streamUrl: match[1],
        type: 'hls'
      });
    }

    // فحص مصادر بديلة مشفرة بـ source: '...' أو file: '...'
    const sourceRegex = /(?:file|source|src)\s*:\s*["'](https?:\/\/[^"']+)["']/i;
    const sourceMatch = html.match(sourceRegex);

    if (sourceMatch && sourceMatch[1] && (sourceMatch[1].includes('m3u8') || sourceMatch[1].includes('live'))) {
      return NextResponse.json({
        success: true,
        streamUrl: sourceMatch[1],
        type: 'hls'
      });
    }

    // إذا كان المصدر يوفر iframe داخلي مباشر
    const innerIframeRegex = /<iframe[^>]+src=["']([^"']+)["']/i;
    const innerIframeMatch = html.match(innerIframeRegex);
    if (innerIframeMatch && innerIframeMatch[1]) {
      let resolvedInner = innerIframeMatch[1];
      if (resolvedInner.startsWith('//')) resolvedInner = 'https:' + resolvedInner;
      return NextResponse.json({
        success: true,
        streamUrl: resolvedInner,
        type: 'iframe'
      });
    }

    return NextResponse.json({ success: false, fallbackUrl: targetUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, fallbackUrl: targetUrl }, { status: 500 });
  }
}

