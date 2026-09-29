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

    const html = `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="referrer" content="no-referrer">
  <title>Live Stream</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #000;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
  </style>
  <script>
    // 1. شل حركة أي محاولة لفتح نافذة منبثقة أو تبويب جديد نهائياً
    window.open = function() { return null; };
    Object.defineProperty(window, 'open', {
      configurable: false,
      writable: false,
      value: function() { return null; }
    });

    // 2. اعتراض أي نقرة تحاول فتح رابط خارجي target="_blank"
    window.addEventListener('click', function(e) {
      var target = e.target;
      while (target && target.tagName !== 'A') {
        target = target.parentNode;
      }
      if (target && target.tagName === 'A') {
        if (target.target === '_blank' || target.getAttribute('target') === '_blank') {
          target.removeAttribute('target');
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    }, true);
  </script>
</head>
<body>
  <iframe 
    src="${decoded}" 
    sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
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
        // ترويسة حظر الـ Popups على مستوى المتصفح برمجياً
        'Content-Security-Policy': 'sandbox allow-scripts allow-same-origin allow-forms allow-presentation;',
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid encoding' }, { status: 400 });
  }
}
