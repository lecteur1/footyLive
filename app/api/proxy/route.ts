import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// فحص النطاق عبر AdGuard DNS over HTTPS
async function isBlockedByAdGuard(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://dns.adguard-dns.com/resolve?name=${domain}&type=A`, {
      headers: { 'Accept': 'application/dns-json' },
      next: { revalidate: 3600 }
    });
    const data = await res.json();
    // إذا أرجع AdGuard العنوان 0.0.0.0 فهذا يعني أنه نطاق إعلاني محظور
    if (data?.Answer && Array.isArray(data.Answer)) {
      return data.Answer.some((ans: any) => ans.data === '0.0.0.0');
    }
  } catch (e) {
    // في حال تعذر الفحص نمرر الطلب
  }
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('URL parameter missing', { status: 400 });
  }

  try {
    const parsedTarget = new URL(targetUrl);

    // فحص النطاق الأصلي عبر AdGuard
    const blocked = await isBlockedByAdGuard(parsedTarget.hostname);
    if (blocked) {
      return new NextResponse('Blocked by AdGuard DNS', { status: 403 });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': targetUrl,
      },
    });

    const contentType = response.headers.get('content-type') || '';

    // إذا كان المورد صفحة HTML (المشغل)، نقوم بتنقيته وحقن معطل النوافذ المنبثقة
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // سكريبت حماية يحظر window.open ويعطل أدوات النوافذ المنبثقة نهائياً
      const adGuardShield = `
        <script>
          (function() {
            window.open = function() { console.warn('Pop-up blocked by AdGuard Proxy'); return null; };
            window.alert = function() { return null; };
            window.confirm = function() { return false; };
            // منع إعادة توجيه الصفحة الأم
            window.onbeforeunload = null;
          })();
        </script>
      `;

      // إدراج وسم <base> حتى تعمل الروابط النسبية والملفات التابعة للمشغل دون انقطاع
      const baseTag = `<base href="${parsedTarget.origin}${parsedTarget.pathname}">`;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}${adGuardShield}`);
      } else {
        html = `${baseTag}${adGuardShield}${html}`;
      }

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // إزالة أي قيود x-frame-options تمنع عرضه
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // إذا كان ملف فيديو أو HLS أو ملف وسائط مباشر
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    return new NextResponse('Proxy error: ' + error.message, { status: 500 });
  }
}

