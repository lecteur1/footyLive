'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [streams, setStreams] = useState([]);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [activeMatch, setActiveMatch] = useState(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [failoverNotice, setFailoverNotice] = useState('');

  const playerContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    fetchMatches();
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
      alert('تعذر جلب السيرفرات، يرجى المحاولة لاحقاً.');
    }
  };

  const playStreamAtIndex = (index, streamsList = streams) => {
    if (!streamsList || streamsList.length === 0 || index >= streamsList.length) {
      setFailoverNotice('تم تجربة جميع السيرفرات المتوفرة.');
      return;
    }

    setCurrentStreamIndex(index);
    const target = streamsList[index];
    const streamName = target.name || `Server ${index + 1}`;
    setFailoverNotice(`السيرفر: ${streamName}`);

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    fallbackTimerRef.current = setTimeout(() => {
      if (index + 1 < streamsList.length) {
        const nextIndex = index + 1;
        const nextName = streamsList[nextIndex].name || `Server ${nextIndex + 1}`;
        setFailoverNotice(`السيرفر بطيء، الانتقال التلقائي إلى ${nextName}...`);
        playStreamAtIndex(nextIndex, streamsList);
      }
    }, 8000);
  };

  const handleIframeLoad = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
    const currentName = streams[currentStreamIndex]?.name || `Server ${currentStreamIndex + 1}`;
    setFailoverNotice(`متصل الآن: ${currentName}`);
    setTimeout(() => setFailoverNotice(''), 3000);
  };

  const closePlayer = () => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setIsPlayerOpen(false);
    setStreams([]);
    setFailoverNotice('');
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

  // الأولوية دائماً للرابط المحمي عبر البروكسي لقتل الإعلانات
  const currentStream = streams[currentStreamIndex];
  const activeUrl = currentStream ? (currentStream.proxiedUrl || currentStream.url || currentStream.streamUrl) : '';

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
          style={{ background: '#00853f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          تحديث ⟳
        </button>
      </header>

      {/* قائمة المباريات */}
      <main style={{ padding: '16px', width: '100%', boxSizing: 'border-box' }}>
        {loadingMatches ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#6ee7b7' }}>جارٍ جلب المباريات المباشرة...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#9ca3af' }}>لا توجد مباريات جارية حالياً.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {matches.map((m) => {
              const isLive = m.status === 'live';
              const homeName = m.homeTeam?.name || m.title.split('vs')[0];
              const awayName = m.awayTeam?.name || m.title.split('vs')[1] || '';
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.75rem', background: '#07100a', color: '#34d399', padding: '4px 10px', borderRadius: '20px', border: '1px solid #153320', fontWeight: 'bold' }}>
                      {m.tournament || 'مباراة كرة قدم'}
                    </span>
                    {isLive ? (
                      <span style={{ fontSize: '0.75rem', background: '#d21034', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: '900' }}>
                        ● مباشر
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', background: '#16221a', color: '#9ca3af', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                        لم تبدأ بعد
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#08100b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #163020', padding: '4px' }}>
                        {m.homeTeam?.badge ? (
                          <img src={m.homeTeam.badge} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '1.6rem' }}>⚽</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', marginTop: '8px', color: '#f3f4f6' }}>{homeName}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                      {isLive ? (
                        <>
                          <div style={{ background: '#040805', border: '2px solid #00853f', borderRadius: '12px', padding: '6px 16px' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', letterSpacing: '2px' }}>
                              {m.homeScore ?? 0} : {m.awayScore ?? 0}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', marginTop: '6px' }}>
                            {m.currentMinute || 'مباشر'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div style={{ background: '#040805', border: '1.5px solid #1c3324', borderRadius: '12px', padding: '6px 14px' }}>
                            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#34d399', letterSpacing: '1px' }}>
                              {matchTime}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 'bold', marginTop: '6px' }}>
                            بتوقيتك المحلي
                          </span>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#08100b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #163020', padding: '4px' }}>
                        {m.awayTeam?.badge ? (
                          <img src={m.awayTeam.badge} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '1.6rem' }}>⚽</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', marginTop: '8px', color: '#f3f4f6' }}>{awayName}</span>
                    </div>
                  </div>

                  <button style={{ width: '100%', marginTop: '16px', background: 'linear-gradient(90deg, #00853f 0%, #00602e 100%)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>
                    {isLive ? 'مشاهدة البث المباشر (مشغل ذكي)' : 'تفاصيل المباراة والسيرفرات'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* مشغل الفيديو بنسبة 16:9 وعناصر التحكم العصرية */}
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
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #192e20'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              {activeMatch?.title || 'بث مباشر'}
            </span>
            <button
              onClick={closePlayer}
              style={{
                background: '#d21034',
                color: '#fff',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontSize: '1rem',
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

          {/* حاوية 16:9 بنظام التكبير التلقائي */}
          <div 
            ref={playerContainerRef}
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              maxHeight: '42vh',
              background: '#000',
              position: 'relative'
            }}
          >
            {activeUrl ? (
              <iframe
                ref={iframeRef}
                key={activeUrl}
                src={activeUrl}
                onLoad={handleIframeLoad}
                style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
                allowFullScreen
                loading="eager"
                referrerPolicy="no-referrer"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                جارٍ الاتصال بأسرع سيرفر...
              </div>
            )}

            <button
              onClick={toggleFullScreen}
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(0, 0, 0, 0.75)',
                color: '#fff',
                border: '1px solid #00853f',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                zIndex: 10
              }}
            >
              ⛶ تكبير الشاشة
            </button>
          </div>

          {failoverNotice && (
            <div style={{ background: '#0c2718', color: '#34d399', padding: '8px 16px', fontSize: '0.8rem', textAlign: 'center', borderBottom: '1px solid #16472b', fontWeight: 'bold' }}>
              {failoverNotice}
            </div>
          )}

          {/* بطاقات السيرفرات */}
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold' }}>سيرفرات البث المتاحة:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                {streams.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => playStreamAtIndex(idx)}
                    style={{
                      background: currentStreamIndex === idx ? 'linear-gradient(135deg, #00853f 0%, #005a2b 100%)' : '#121f17',
                      color: '#fff',
                      border: currentStreamIndex === idx ? '1.5px solid #10b981' : '1px solid #1e3626',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{s.name || `سيرفر ${idx + 1}`}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.8, background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                      {s.quality || 'HD'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: '#101a13', border: '1px solid #1a3021', borderRadius: '16px', padding: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', marginBottom: '6px' }}>
                🏆 {activeMatch?.tournament || 'مباراة مباشرة'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#d1d5db', lineHeight: '1.6' }}>
                • تم دمج نظام الحماية التلقائي لمنع فتح علامات التبويب الخارجية.<br />
                • انقر على <b>⛶ تكبير الشاشة</b> لمشاهدة المباراة بالعرض الكامل لهاتفك.
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
