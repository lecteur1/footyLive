import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SECRET_KEY = process.env.STREAM_SECRET || 'default_stream_hmac_secret_key_123_abc';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const u = searchParams.get('u');
  const expires = searchParams.get('expires');
  const sig = searchParams.get('sig');

  if (!u || !expires || !sig) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const expiresTimestamp = parseInt(expires, 10);
  if (isNaN(expiresTimestamp) || expiresTimestamp < Date.now()) {
    return NextResponse.json({ error: 'Stream link has expired' }, { status: 403 });
  }

  const expectedSig = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${u}:${expires}`)
    .digest('hex');

  if (sig !== expectedSig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  try {
    const decoded = Buffer.from(u, 'base64url').toString('utf-8');
    if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid URL scheme' }, { status: 400 });
    }

    const targetUrl = new URL(decoded);
    const targetOrigin = targetUrl.origin;

    // صفحة عازلة تقوم بمحاكاة النطاق الأصلي لمنع manifestLoadError وحظر الإعلانات
    const html = `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="origin">
  <base href="${targetOrigin}/">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
  <script>
    // 1. شل حركة النوافذ المنبثقة
    window.open = function() { return null; };
    
    // 2. إبطال أي محاولة لإعادة توجيه الصفحة أو فتح علامات تبويب إعلانية
    window.addEventListener('beforeunload', function(e) {
      e.stopImmediatePropagation();
    });

    document.addEventListener('click', function(e) {
      var a = e.target.closest('a');
      if (a) {
        a.removeAttribute('target');
        if (a.href && !a.href.includes(window.location.hostname)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, true);
  </script>
</head>
<body>
  <iframe 
    src="${decoded}" 
    allowfullscreen="true" 
    webkitallowfullscreen="true" 
    mozallowfullscreen="true"
    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
  ></iframe>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        // ترويسة حظر تتبع الإعلانات
        'Cross-Origin-Resource-Policy': 'cross-origin'
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid stream request' }, { status: 400 });
  }
}
