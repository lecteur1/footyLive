'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [streams, setStreams] = useState([]);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [activeMatch, setActiveMatch] = useState(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  const playerContainerRef = useRef(null);
  const iframeRef = useRef(null);

      useEffect(() => {
    // 1. حظر فتح أي نافذة خارجية جديدة نهائياً
    window.open = function () {
      return null;
    };

    // 2. حماية التطبيق من محاولات السيرفر إعادة توجيه الصفحة (Redirect)
    const handleBeforeUnload = (e) => {
      // منع السيرفر من تغيير رابط تطبيقك
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    fetchMatches();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);


  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.matches || []);
      setMatches(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const formatLocalTime = (timestamp, timeStr) => {
    try {
      if (timestamp) {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }
      }
      if (timeStr && timeStr.includes(':')) {
        return timeStr;
      }
    } catch (e) {}
    return 'قريباً';
  };

  const handleWatchMatch = async (match) => {
    setStatusNotice('جارٍ الاتصال بالسيرفرات...');
    try {
      const res = await fetch(`/api/streams/${match.id}`);
      const data = await res.json();
      const availableStreams = data.streams || [];

      if (!availableStreams || availableStreams.length === 0) {
        alert('البث المباشر لهذه المباراة غير متوفر حالياً.');
        return;
      }

      setActiveMatch(match);
      setIsPlayerOpen(true);
      setStreams(availableStreams);
      setCurrentStreamIndex(0);
      playStreamAtIndex(0, availableStreams);
    } catch (e) {
      alert('تعذر جلب السيرفرات حالياً، يرجى المحاولة لاحقاً.');
    }
  };

  const playStreamAtIndex = (index, streamsList = streams) => {
    if (!streamsList || streamsList.length === 0 || index >= streamsList.length) return;
    setCurrentStreamIndex(index);
    const target = streamsList[index];
    const streamName = target.name || `Server ${index + 1}`;
    setStatusNotice(`متصل الآن بـ: ${streamName} (انقر على زر التشغيل)`);
  };

  const closePlayer = () => {
    setIsPlayerOpen(false);
    setStreams([]);
    setStatusNotice('');
  };

  const toggleFullScreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen();
      } else if (playerContainerRef.current.webkitRequestFullscreen) {
        playerContainerRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const currentStream = streams[currentStreamIndex];
  const activeUrl = currentStream ? (currentStream.proxiedUrl || currentStream.url) : '';

  return (
    <div style={{
      width: '100vw',
      maxWidth: '100%',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
      background: '#070b09',
      color: '#fff',
      direction: 'rtl',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      
      {/* شريط العلم الوطني */}
      <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #00853f 33.3%, #ffffff 33.3%, #ffffff 66.6%, #d21034 66.6%)' }}></div>

      {/* الشريط العلوي */}
      <header style={{
        background: '#0d1510',
        borderBottom: '1px solid #16291d',
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
          style={{ background: '#00853f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          تحديث <span>⟳</span>
        </button>
      </header>

      {/* قائمة المباريات المباشرة */}
      <main style={{ padding: '16px', width: '100%', boxSizing: 'border-box' }}>
        {loadingMatches ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#10b981' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #10b981', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <span>جارٍ جلب المباريات...</span>
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', background: '#111e15', borderRadius: '16px', border: '1px dashed #1c3523' }}>
            لا توجد مباريات جارية حالياً.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {matches.map((m) => {
              const isLive = m.status === 'live';
              const homeName = m.homeTeam?.name || m.title.split('vs')[0] || 'فريق 1';
              const awayName = m.awayTeam?.name || m.title.split('vs')[1] || 'فريق 2';
              const matchTime = formatLocalTime(m.timestamp, m.time);

              return (
                <div
                  key={m.id}
                  onClick={() => handleWatchMatch(m)}
                  style={{
                    background: 'linear-gradient(180deg, #111e15 0%, #0a110c 100%)',
                    border: '1.5px solid #1c3523',
                    borderRadius: '20px',
                    padding: '16px',
                    cursor: 'pointer',
                    width: '100%',
                    boxSizing: 'border-box',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.75rem', background: '#07100a', color: '#34d399', padding: '6px 12px', borderRadius: '20px', border: '1px solid #153320', fontWeight: 'bold' }}>
                      {m.tournament || 'مباراة كرة قدم'}
                    </span>
                    {isLive ? (
                      <span style={{ fontSize: '0.75rem', background: '#d21034', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%', display: 'inline-block' }}></span>
                        مباشر
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', background: '#16221a', color: '#9ca3af', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold' }}>
                        لم تبدأ بعد
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#08100b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #163020', padding: '8px' }}>
                        {m.homeTeam?.badge ? (
                          <img src={m.homeTeam.badge} alt={homeName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '1.8rem' }}>⚽</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', marginTop: '10px', color: '#f3f4f6' }}>{homeName}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                      {isLive ? (
                        <>
                          <div style={{ background: '#040805', border: '2px solid #00853f', borderRadius: '14px', padding: '8px 20px' }}>
                            <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', letterSpacing: '3px' }}>
                              {m.homeScore ?? 0} : {m.awayScore ?? 0}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', marginTop: '8px' }}>
                            {m.currentMinute ? `${m.currentMinute}'` : 'جارية الآن'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div style={{ background: '#040805', border: '1.5px solid #1c3324', borderRadius: '14px', padding: '8px 16px' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#34d399', letterSpacing: '1px' }}>
                              {matchTime}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'bold', marginTop: '8px' }}>
                            بتوقيتك المحلي
                          </span>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#08100b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #163020', padding: '8px' }}>
                        {m.awayTeam?.badge ? (
                          <img src={m.awayTeam.badge} alt={awayName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '1.8rem' }}>⚽</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', marginTop: '10px', color: '#f3f4f6' }}>{awayName}</span>
                    </div>
                  </div>

                  <button style={{ width: '100%', marginTop: '20px', background: 'linear-gradient(90deg, #00853f 0%, #005a2b 100%)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                    {isLive ? 'مشاهدة البث المباشر' : 'تفاصيل المباراة والسيرفرات'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* مشغل الفيديو بدون أي sandbox */}
      {isPlayerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#090e0b',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          width: '100vw',
          height: '100vh',
          overflowY: 'auto'
        }}>
          
          <div style={{
            background: '#0d1510',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #192e20'
          }}>
            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              {activeMatch?.title || 'بث مباشر'}
            </span>
            <button
              onClick={closePlayer}
              style={{
                background: '#d21034',
                color: '#fff',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div 
            ref={playerContainerRef}
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              maxHeight: '45vh',
              background: '#000',
              position: 'relative'
            }}
          >
            {activeUrl ? (
              <iframe
  ref={iframeRef}
  src={streams[currentStreamIndex]?.url || ''}
  style={{ width: '100%', height: '100%', border: 'none' }}
  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
  allowFullScreen
/>


            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                جارٍ الاتصال بالسيرفر...
              </div>
            )}

            <button
              onClick={toggleFullScreen}
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(0, 0, 0, 0.75)',
                color: '#fff',
                border: '1px solid rgba(0, 133, 63, 0.5)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⛶ تكبير الشاشة
            </button>
          </div>

          {statusNotice && (
            <div style={{ background: '#0c2718', color: '#34d399', padding: '10px 16px', fontSize: '0.85rem', textAlign: 'center', borderBottom: '1px solid #16472b', fontWeight: 'bold' }}>
              {statusNotice}
            </div>
          )}

          <div style={{ padding: '20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '12px', fontWeight: 'bold' }}>اختر سيرفر البث (في حال التقطيع):</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
                {streams.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => playStreamAtIndex(idx)}
                    style={{
                      background: currentStreamIndex === idx ? 'linear-gradient(135deg, #00853f 0%, #005a2b 100%)' : '#121f17',
                      color: '#fff',
                      border: currentStreamIndex === idx ? '1.5px solid #10b981' : '1px solid #1e3626',
                      padding: '12px 8px',
                      borderRadius: '14px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{s.name || `سيرفر ${idx + 1}`}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.9, background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '6px' }}>
                      {s.quality || 'HD'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: '#101a13', border: '1px solid #1a3021', borderRadius: '16px', padding: '16px' }}>
              <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 'bold', marginBottom: '8px' }}>
                🏆 {activeMatch?.tournament || 'مباراة مباشرة'}
              </div>
              <ul style={{ margin: 0, padding: '0 20px', fontSize: '0.85rem', color: '#d1d5db', lineHeight: '1.8' }}>
                <li>انقر على زر <b>التشغيل (Play)</b> داخل مربع الفيديو لبدء البث.</li>
                <li>استخدم زر <b>⛶ تكبير الشاشة</b> للحصول على عرض أفقي كامل.</li>
                <li>إذا توقف البث أو كان بطيئاً، قم باختيار سيرفر آخر من القائمة أعلاه.</li>
              </ul>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
