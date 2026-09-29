import './globals.css';

export const metadata = {
  title: 'Saifou Sat | سيفو سات للبث المباشر',
  description: 'بث مباشر للمباريات بجودة عالية وبدون تقطيع على سيفو سات.',
  icons: {
    icon: '/favicon.ico',
  },
};


export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className="dark" style={{ background: '#090e0b', colorScheme: 'dark' }}>
      <head>
        <meta name="theme-color" content="#00853f" />
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
        }}
      >
        <main style={{ width: '100%', flex: 1, margin: 0, padding: 0 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
