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

    const targetOrigin = new URL(decoded).origin;

    // جلب كود المشغل من المصدر وحقن درع الحماية الذكي بداخله مباشرة
    let remoteHtml = '';
    try {
      const upstream = await fetch(decoded, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': decoded,
        },
        next: { revalidate: 0 }
      });
      if (upstream.ok) {
        remoteHtml = await upstream.text();
      }
    } catch (e) {
      // في حال تعذر الجلب السيرفري المباشر
    }

    // سكربت الدرع: إيهام المشغل بنجاح الإعلانات مع خنق أي نافذة خارجية
    const shieldScript = `
      <base href="${targetOrigin}/">
      <script>
        (function() {
          // 1. خداع كاشف الساندبوكس: إرجاع كائن وهمي ناجح
          var dummyWindow = {
            closed: false,
            focus: function() {},
            close: function() {},
            location: { href: '' }
          };
          window.open = function() {
            return dummyWindow;
          };
          Object.defineProperty(window, 'open', {
            configurable: false,
            writable: false,
            value: function() { return dummyWindow; }
          });

          // 2. إحباط كل الروابط الإعلانية الخبيثة المنبثقة
          document.addEventListener('click', function(e) {
            var el = e.target;
            while (el && el.tagName !== 'A') {
              el = el.parentNode;
            }
            if (el && el.tagName === 'A') {
              if (el.target === '_blank' || (el.href && !el.href.includes(window.location.hostname))) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }
          }, true);
        })();
      </script>
    `;

    let finalHtml = '';
    if (remoteHtml) {
      // حقن الدرع في أول الرأس مباشرة
      finalHtml = remoteHtml.includes('<head>')
        ? remoteHtml.replace('<head>', '<head>' + shieldScript)
        : shieldScript + remoteHtml;
    } else {
      // كود بديل إذا تعذر السحب المباشر
      finalHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="referrer" content="no-referrer">
            ${shieldScript}
            <style>html, body, iframe { margin: 0; padding: 0; width: 100%; height: 100%; border: 0; background: #000; overflow: hidden; }</style>
          </head>
          <body>
            <iframe src="${decoded}" allowfullscreen="true" allow="autoplay; fullscreen; encrypted-media"></iframe>
          </body>
        </html>
      `;
    }

    return new NextResponse(finalHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid stream request' }, { status: 400 });
  }
}
