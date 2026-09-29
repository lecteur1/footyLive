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

    // الحالة الأولى: إذا كان الرابط هو ملف بث مباشر HLS (.m3u8) نشغله بمشغل نقي وخالٍ تماماً من الإعلانات
    if (decoded.includes('.m3u8')) {
      const cleanPlayerHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    body, html { margin:0; padding:0; width:100%; height:100%; background:#000; overflow:hidden; }
    video { width:100%; height:100%; object-fit:contain; }
  </style>
</head>
<body>
  <video id="video" controls autoplay playsinline></video>
  <script>
    var video = document.getElementById('video');
    var videoSrc = '${decoded}';
    if (Hls.isSupported()) {
      var hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function() { video.play(); });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', function() { video.play(); });
    }
  </script>
</body>
</html>`;
      return new NextResponse(cleanPlayerHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // الحالة الثانية: رابط Embed خارجي - نجلبه ونحقن بداخله جدار حماية يقتل النوافذ والإعلانات المنبثقة
    const upstream = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': decoded
      },
      next: { revalidate: 0 }
    });

    let htmlContent = await upstream.text();
    const targetOrigin = new URL(decoded).origin;

    // سكربت حقن مضاد للإعلانات والنوافذ المنبثقة:
    const antiAdBlockerScript = `
      <base href="${targetOrigin}/">
      <script>
        (function() {
          // 1. خنق وإبطال دوال النوافذ المنبثقة
          window.open = function() { return { closed: false, focus: function(){}, close: function(){} }; };
          Object.defineProperty(window, 'open', {
            configurable: false,
            writable: false,
            value: function() { return { closed: false, focus: function(){}, close: function(){} }; }
          });

          // 2. إحباط أي نقرة تؤدي إلى تبويب جديد (target="_blank")
          document.addEventListener('click', function(e) {
            var target = e.target;
            while (target && target.tagName !== 'A') {
              target = target.parentNode;
            }
            if (target && target.tagName === 'A') {
              var href = target.getAttribute('href') || '';
              if (target.target === '_blank' || href.startsWith('http')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
            }
          }, true);

          // 3. منع المتصفح من إرسال إشعارات مزعجة
          if (window.Notification) {
            window.Notification.requestPermission = function() {
              return Promise.resolve('denied');
            };
          }
        })();
      </script>
    `;

    // حقن السكربت في أول الصفحة
    if (htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', '<head>' + antiAdBlockerScript);
    } else {
      htmlContent = antiAdBlockerScript + htmlContent;
    }

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err: any) {
    // في حال فشل الجلب، عرض صفحة بديلة آمنة
    return new NextResponse(`
      <html><body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <p>جارٍ تحميل البث...</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
