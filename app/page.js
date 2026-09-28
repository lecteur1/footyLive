'use client';

import { useState, useEffect } from 'react';

// مصادر قنوات beIN Sports العربية الحية والمباشرة
const ARABIC_CHANNELS = [
  { id: 'bein1', name: 'beIN Sports 1 HD', url: 'https://voodc.com/embed/858593898889.html' },
  { id: 'bein2', name: 'beIN Sports 2 HD', url: 'https://voodc.com/embed/858593898888.html' },
  { id: 'bein3', name: 'beIN Sports 3 HD', url: 'https://voodc.com/embed/858593898887.html' },
  { id: 'bein4', name: 'beIN Sports 4 HD', url: 'https://voodc.com/embed/858593898886.html' },
  { id: 'bein-news', name: 'beIN Sports الإخبارية', url: 'https://voodc.com/embed/858593898885.html' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('matches');
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
    <div style={{ background: '#0a0f0c', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: '30px', boxSizing: 'border-box' }}>
      
      {/* شريط الراية الوطنية */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #00853f 33%, #ffffff 33%, #ffffff 66%, #d21034 66%)' }}></div>

      {/* الشريط العلوي الهيدر */}
      <header style={{ background: '#111914', borderBottom: '1px solid #1c2b21', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem' }}>🇩🇿</span>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#fff', margin: 0 }}>الخضرة لايف</h1>
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 'bold' }}>DZ LIVE STREAMS</span>
          </div>
        </div>
        <button onClick={fetchMatches} style={{ background: '#00853f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
          تحديث ⟳
        </button>
      </header>

      {/* أزرار التبديل */}
      <div style={{ display: 'flex', gap: '10px', padding: '12px 16px' }}>
        <button
          onClick={() => setActiveTab('matches')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            background: activeTab === 'matches' ? '#00853f' : '#141e18',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          ⚽ مباريات اليوم
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            background: activeTab === 'channels' ? '#00853f' : '#141e18',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          📺 قنوات beIN العربية
        </button>
      </div>

      {/* المحتوى */}
      <div style={{ padding: '0 16px' }}>
        
        {/* قسم قنوات beIN */}
        {activeTab === 'channels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ARABIC_CHANNELS.map((ch) => (
              <div
                key={ch.id}
                onClick={() => startStream(ch.url, ch.name)}
                style={{
                  background: '#131d17',
                  border: '1.5px solid #1f3527',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#09120d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #00853f', fontSize: '1.2rem' }}>
                    📡
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>{ch.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#10b981' }}>بث مباشر • تعليق عربي</div>
                  </div>
                </div>
                <span style={{ background: '#00853f', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', padding: '6px 14px', borderRadius: '8px' }}>
                  تشغيل ▶
                </span>
              </div>
            ))}
          </div>
        )}

        {/* قسم المباريات */}
        {activeTab === 'matches' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6ee7b7' }}>جارٍ جلب المباريات المباشرة...</div>
            ) : matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>لا توجد مباريات جارية حالياً.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {matches.map((m) => {
                  const isLive = m.status === 'live';
                  const homeName = m.homeTeam?.name || m.title.split('vs')[0];
                  const awayName = m.awayTeam?.name || m.title.split('vs')[1] || '';

                  return (
                    <div
                      key={m.id}
                      onClick={() => openMatchStreams(m)}
                      style={{
                        background: '#131d17',
                        border: '1.5px solid #1f3325',
                        borderRadius: '18px',
                        padding: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* خط الراية الصغيرة فوق كل بطاقة */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #00853f, #ffffff, #d21034)' }}></div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.75rem', background: '#0a140e', color: '#34d399', padding: '3px 10px', borderRadius: '12px', border: '1px solid #193823', fontWeight: 'bold' }}>
                          {m.tournament || 'مباراة مباشرة'}
                        </span>
                        {isLive ? (
                          <span style={{ fontSize: '0.72rem', background: '#d21034', color: '#fff', padding: '3px 9px', borderRadius: '12px', fontWeight: '900' }}>
                            ● مباشر
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>قريباً</span>
                        )}
                      </div>

                      {/* الفريقان وجهاً لوجه */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#0a120d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #1a3c26', padding: '4px' }}>
                            {m.homeTeam?.badge ? (
                              <img src={m.homeTeam.badge} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: '1.4rem' }}>⚽</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '6px', color: '#f3f4f6' }}>{homeName}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px' }}>
                          <div style={{ background: '#050a07', border: '1.5px solid #00853f', borderRadius: '10px', padding: '4px 12px' }}>
                            <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fff', letterSpacing: '1px' }}>
                              {m.homeScore ?? 0} : {m.awayScore ?? 0}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>
                            {m.currentMinute || 'VS'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#0a120d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #1a3c26', padding: '4px' }}>
                            {m.awayTeam?.badge ? (
                              <img src={m.awayTeam.badge} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: '1.4rem' }}>⚽</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '6px', color: '#f3f4f6' }}>{awayName}</span>
                        </div>
                      </div>

                      <button style={{ width: '100%', marginTop: '14px', background: 'linear-gradient(90deg, #00853f 0%, #00602e 100%)', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
                        مشاهدة البث المباشر (اختيار السيرفر)
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* نافذة السيرفرات المتناسقة والمرتبة تماماً في منتصف الهاتف */}
      {selectedMatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div style={{ background: '#121c15', width: '100%', maxWidth: '380px', borderRadius: '20px', padding: '20px', border: '2px solid #00853f', maxHeight: '75vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '14px', textAlign: 'center', color: '#10b981' }}>{selectedMatch}</h3>
            
            {loadingStreams ? (
              <p style={{ color: '#6ee7b7', textAlign: 'center', padding: '20px' }}>جارٍ جلب السيرفرات المتاحة...</p>
            ) : streams.length === 0 ? (
              <p style={{ color: '#ff4d4f', textAlign: 'center', padding: '20px' }}>لم تبدأ روابط هذه المباراة بعد.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {streams.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => startStream(s.proxiedUrl, `${selectedMatch} - ${s.name}`)}
                    style={{
                      background: '#1a2a1f',
                      color: '#fff',
                      border: '1px solid #2a4733',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{s.name}</span>
                    <span style={{ background: '#00853f', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>{s.quality}</span>
                  </button>
                ))}
              </div>
            )}
            
            <button onClick={() => setSelectedMatch(null)} style={{ width: '100%', background: '#d21034', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', marginTop: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              إلغاء وإغلاق
            </button>
          </div>
        </div>
      )}

      {/* شاشة مشغل الفيديو المدمجة */}
      {activeStreamUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#111914', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1c2b21' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#10b981' }}>{playerTitle}</span>
            <button onClick={() => setActiveStreamUrl(null)} style={{ background: '#d21034', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
              إغلاق ✕
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
