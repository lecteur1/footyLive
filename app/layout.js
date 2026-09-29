import './globals.css';

export const metadata = {
  title: 'Saifou Sat | سيفو سات للبث المباشر',
  description: 'بث مباشر للمباريات بجودة عالية وبدون تقطيع على سيفو سات.',
  applicationName: 'Saifou Sat',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Saifou Sat',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090e0b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className="dark" style={{ background: '#090e0b', colorScheme: 'dark' }}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');});}" }} />

        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          width: '100%',
          minHeight: '100vh',
          background: '#090e0b',
          color: '#ffffff',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <main style={{ width: '100%', flex: 1, margin: 0, padding: 0 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
