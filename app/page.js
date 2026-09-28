'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState(null);
  const [playerTitle, setPlayerTitle] = useState('');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.matches || []);
      setMatches(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openMatchStreams = async (match) => {
    setSelectedMatch(match.title);
    setLoadingStreams(true);
    setStreams([]);
    try {
      const res = await fetch(`/api/streams/${match.id}`);
      const data = await res.json();
      setStreams(data.streams || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStreams(false);
    }
  };

  const startStream = (url, title) => {
    setSelectedMatch(null);
    setPlayerTitle(title);
    const fullUrl = url.startsWith('/') ? window.location.origin + url : url;
    setActiveStreamUrl(fullUrl);
  };

  return (
    <div style={{
      width: '100vw',
      maxWidth: '100%',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
      background: '#090e0b',
      color: '#fff',
      direction: 'rtl',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      
      {/* شريط الراية الوطنية */}
      <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #00853f 33.3%, #ffffff 33.3%, #ffffff 66.6%, #d21034 66.6%)' }}></div>

      {/* شريط التطبيق العلوي */}
      <header style={{
        background: '#111a14',
        borderBottom: '1px solid #1d3324',
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.6rem' }}>🇩🇿</span>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff', margin: 0 }}>الخضرة لايف</h1>
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>DZ LIVE FOOTBALL</span>
          </div>
        </div>
        <button
          onClick={fetchMatches}
          style={{ background: '#00853f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          تحديث ⟳
        </button>
      </header>

      {/* قائمة المباريات */}
      <main style={{ padding: '16px', width: '100%', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#6ee7b7' }}>جارٍ جلب المباريات المباشرة...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#9ca3af' }}>لا توجد مباريات جارية حالياً.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {matches.map((m) => {
              const isLive = m.status === 'live';
              const homeName = m.homeTeam?.name || m.title.split('vs')[0];
              const awayName = m.awayTeam?.name || m.title.split('vs')[1] || '';

              return (
                <div
                  key={m.id}
                  onClick={() => openMatchStreams(m)}
                  style={{
                    background: 'linear-gradient(180deg, #142218 0%, #0c1410 100%)',
                    border: '1.5px solid #1f3a26',
                    borderRadius: '20px',
                    padding: '16px',
                    cursor: 'pointer',
                    width: '100%',
                    boxSizing: 'border-box',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    position: 'relative'
                  }}
                >
                  {/* رأس البطاقة */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.75rem', background: '#09140d', color: '#34d399', padding: '4px 10px', borderRadius: '20px', border: '1px solid #1a3c26', fontWeight: 'bold' }}>
                      {m.tournament || 'مباراة مباشرة'}
                    </span>
                    {isLive ? (
                      <span style={{ fontSize: '0.75rem', background: '#d21034', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: '900' }}>
                        ● مباشر
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>قريباً</span>
                    )}
                  </div>

                  {/* تقابل الفريقين وجهاً لوجه */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px', width: '100%' }}>
                    
                    {/* الفريق الأول */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#0a140e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #1a3c26', padding: '4px' }}>
                        {m.homeTeam?.badge ? (
                          <img src={m.homeTeam.badge} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '1.6rem' }}>⚽</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', marginTop: '8px', color: '#f3f4f6' }}>{homeName}</span>
                    </div>

                    {/* النتيجة في المنتصف */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                      <div style={{ background: '#050a07', border: '2px solid #00853f', borderRadius: '12px', padding: '6px 16px' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', letterSpacing: '2px' }}>
                          {m.homeScore ?? 0} : {m.awayScore ?? 0}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', marginTop: '6px' }}>
                        {m.currentMinute || 'VS'}
                      </span>
                    </div>

                    {/* الفريق الثاني */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#0a140e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #1a3c26', padding: '4px' }}>
                        {m.awayTeam?.badge ? (
                          <img src={m.awayTeam.badge} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '1.6rem' }}>⚽</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', marginTop: '8px', color: '#f3f4f6' }}>{awayName}</span>
                    </div>
                  </div>

                  {/* زر المشاهدة */}
                  <button style={{ width: '100%', marginTop: '16px', background: 'linear-gradient(90deg, #00853f 0%, #00602e 100%)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>
                    مشاهدة البث المباشر (اختيار السيرفر)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* نافذة اختيار السيرفر المنبثقة من أسفل الشاشة */}
      {selectedMatch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          zIndex: 99999
        }}>
          <div style={{
            background: '#121d16',
            width: '100%',
            maxWidth: '500px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '24px 20px',
            borderTop: '3px solid #00853f',
            maxHeight: '75vh',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center', color: '#10b981' }}>{selectedMatch}</h3>
            
            {loadingStreams ? (
              <p style={{ color: '#6ee7b7', textAlign: 'center', padding: '24px' }}>جارٍ جلب السيرفرات المتاحة...</p>
            ) : streams.length === 0 ? (
              <p style={{ color: '#ff4d4f', textAlign: 'center', padding: '24px' }}>لم تبدأ روابط هذه المباراة بعد.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {streams.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => startStream(s.proxiedUrl, `${selectedMatch} - ${s.name}`)}
                    style={{
                      background: '#18271e',
                      color: '#fff',
                      border: '1px solid #284431',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <span>{s.name}</span>
                    <span style={{ background: '#00853f', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>{s.quality}</span>
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setSelectedMatch(null)}
              style={{ width: '100%', background: '#d21034', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', marginTop: '16px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              إلغاء وإغلاق
            </button>
          </div>
        </div>
      )}

      {/* مشغل الفيديو مع زر الإغلاق الدائري ✕ فقط */}
      {activeStreamUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#000',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          width: '100vw',
          height: '100vh'
        }}>
          <div style={{
            background: '#111a14',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1c2e21'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              {playerTitle}
            </span>
            <button
              onClick={() => setActiveStreamUrl(null)}
              style={{
                background: '#d21034',
                color: '#fff',
                border: 'none',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(210, 16, 52, 0.4)'
              }}
            >
              ✕
            </button>
          </div>
          <iframe
            src={activeStreamUrl}
            style={{ width: '100%', height: '100%', border: 'none', flex: 1, background: '#000' }}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
      )}

    </div>
  );
}
