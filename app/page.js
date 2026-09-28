'use client';

import { useState, useEffect } from 'react';

// قائمة قنوات beIN Sports العربية المباشرة
const ARABIC_CHANNELS = [
  { id: 'bein1', name: 'beIN Sports 1 HD', url: 'https://sportsembed.su/embed/bein1.php' },
  { id: 'bein2', name: 'beIN Sports 2 HD', url: 'https://sportsembed.su/embed/bein2.php' },
  { id: 'bein3', name: 'beIN Sports 3 HD', url: 'https://sportsembed.su/embed/bein3.php' },
  { id: 'bein4', name: 'beIN Sports 4 HD', url: 'https://sportsembed.su/embed/bein4.php' },
  { id: 'bein-news', name: 'beIN Sports الإخبارية', url: 'https://sportsembed.su/embed/bein-news.php' },
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
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openMatchStreams = async (match) => {
    setSelectedMatch(match.title);
    setLoadingStreams(true);
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
    // إضافة الرابط الأساسي إذا كان المسار نسبياً
    const fullUrl = url.startsWith('/') ? window.location.origin + url : url;
    setActiveStreamUrl(fullUrl);
  };

  return (
    <div style={{ background: '#0a0f0c', color: '#fff', minHeight: '100vh', direction: 'rtl', fontFamily: 'system-ui, sans-serif', paddingBottom: '40px' }}>
      
      {/* شريط العلم الجزائري العلوي */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #00853f 33.3%, #ffffff 33.3%, #ffffff 66.6%, #d21034 66.6%)' }}></div>

      {/* الشريط العلوي */}
      <header style={{ background: '#111914', borderBottom: '1px solid #1c2b21', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.5rem' }}>🇩🇿</span>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', margin: 0 }}>الخضرة لايف</h1>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>DZ LIVE STREAMS</span>
          </div>
        </div>
        <button onClick={fetchMatches} style={{ background: '#00853f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
          تحديث ⟳
        </button>
      </header>

      {/* أزرار التبديل بين المباريات والقنوات */}
      <div style={{ display: 'flex', gap: '10px', padding: '14px 16px 6px' }}>
        <button
          onClick={() => setActiveTab('matches')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.95rem',
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
            fontSize: '0.95rem',
            fontWeight: 'bold',
            background: activeTab === 'channels' ? '#00853f' : '#141e18',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          📺 قنوات beIN العربية
        </button>
      </div>

      {/* محتوى الصفحة */}
      <div style={{ padding: '14px 16px' }}>
        
        {/* قسم قنوات beIN الرياضية */}
        {activeTab === 'channels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ARABIC_CHANNELS.map((ch) => (
              <div
                key={ch.id}
                onClick={() => startStream(ch.url, ch.name)}
                style={{
                  background: 'linear-gradient(135deg, #121c16 0%, #16241c 100%)',
                  border: '1.5px solid #1f3527',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#09120d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #00853f', fontSize: '1.2rem' }}>
                    📡
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{ch.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>بث مباشر • تعليق عربي</div>
                  </div>
                </div>
                <span style={{ background: '#00853f', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', padding: '6px 14px', borderRadius: '8px' }}>
                  تشغيل ▶
                </span>
              </div>
            ))}
          </div>
        )}

        {/* قسم المباريات بتصميم مكبر ومتقابل أفقياً */}
        {activeTab === 'matches' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6ee7b7' }}>جارٍ جلب المباريات المباشرة...</div>
            ) : matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>لا توجد مباريات جارية حالياً.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {matches.map((m) => {
                  const isLive = m.status === 'live';
                  const homeName = m.homeTeam?.name || m.title.split('vs')[0];
                  const awayName = m.awayTeam?.name || m.title.split('vs')[1] || '';

                  return (
                    <div
                      key={m.id}
                      onClick={() => openMatchStreams(m)}
                      style={{
                        background: 'linear-gradient(180deg, #141f18 0%, #0d1410 100%)',
                        border: '1.5px solid #1f3325',
                        borderRadius: '20px',
                        padding: '16px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        position: 'relative'
                      }}
                    >
                      {/* الشريط الصغير للعلم أعلى البطاقة */}
                      <div style={{ position: 'absolute', top: 0, left: '20px', right: '20px', height: '3px', background: 'linear-gradient(90deg, #00853f, #fff, #d21034)', borderRadius: '0 0 4px 4px' }}></div>

                      {/* البطولة وحالة المباراة */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.75rem', background: '#0a140e', color: '#34d399', padding: '4px 10px', borderRadius: '20px', border: '1px solid #193823', fontWeight: 'bold' }}>
                          {m.tournament || 'مباراة مباشرة'}
                        </span>
                        {isLive ? (
                          <span style={{ fontSize: '0.75rem', background: '#d21034', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontWeight: '900' }}>
                            ● مباشر
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>قريباً</span>
                        )}
                      </div>

                      {/* تقابل الفريقين وجهاً لوجه أفقياً */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
                        
                        {/* الفريق الأول */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#0a120d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #1a3c26', overflow: 'hidden', padding: '4px' }}>
                            {m.homeTeam?.badge ? (
                              <img src={m.homeTeam.badge} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: '1.6rem' }}>⚽</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: '800', marginTop: '8px', color: '#f3f4f6' }}>{homeName}</span>
                        </div>

                        {/* النتيجة في المنتصف */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                          <div style={{ background: '#050a07', border: '1.5px solid #00853f', borderRadius: '12px', padding: '6px 14px' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', letterSpacing: '2px' }}>
                              {m.homeScore ?? 0} : {m.awayScore ?? 0}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>
                            {m.currentMinute || 'VS'}
                          </span>
                        </div>

                        {/* الفريق الثاني */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#0a120d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #1a3c26', overflow: 'hidden', padding: '4px' }}>
                            {m.awayTeam?.badge ? (
                              <img src={m.awayTeam.badge} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: '1.6rem' }}>⚽</span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: '800', marginTop: '8px', color: '#f3f4f6' }}>{awayName}</span>
                        </div>
                      </div>

                      {/* زر مشاهدة البث */}
                      <button style={{ width: '100%', marginTop: '16px', background: 'linear-gradient(90deg, #00853f 0%, #00602e 100%)', color: '#fff', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
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

      {/* نافذة اختيار السيرفر المنبثقة */}
      {selectedMatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ background: '#121b15', width: '100%', padding: '20px', borderRadius: '24px 24px 0 0', maxHeight: '70vh', overflowY: 'auto', borderTop: '2px solid #00853f' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '12px' }}>{selectedMatch}</h3>
            {loadingStreams ? (
              <p style={{ color: '#10b981', textAlign: 'center', padding: '20px' }}>جارٍ جلب السيرفرات المتوفرة...</p>
            ) : streams.length === 0 ? (
              <p style={{ color: '#ff4d4f', textAlign: 'center', padding: '20px' }}>عذراً، لم تنطلق روابط هذه المباراة بعد.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {streams.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => startStream(s.proxiedUrl, `${selectedMatch} - ${s.name}`)}
                    style={{ background: '#1a2a1f', color: '#fff', border: '1px solid #2a4733', padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <span>{s.name}</span>
                    <span style={{ background: '#00853f', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>{s.quality}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setSelectedMatch(null)} style={{ width: '100%', background: '#25352b', color: '#d1d5db', border: 'none', padding: '12px', borderRadius: '12px', marginTop: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* شاشة مشغل الفيديو بدون قيود sandbox التي تسبب Embed Blocked */}
      {activeStreamUrl && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#111914', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1c2b21' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981' }}>{playerTitle}</span>
            <button onClick={() => setActiveStreamUrl(null)} style={{ background: '#d21034', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
              إغلاق ✕
            </button>
          </div>
          {/* إزالة قيود الـ Sandbox المشددة لتشغيل البث فوراً وتفادي مشكلة Embed Blocked */}
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
