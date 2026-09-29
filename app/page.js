'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [streams, setStreams] = useState([]);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [selectedMatchTitle, setSelectedMatchTitle] = useState('');
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [failoverNotice, setFailoverNotice] = useState('');

  const iframeRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    fetchMatches();

    if (typeof window !== 'undefined') {
      window.open = function () {
        return null;
      };
    }
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

      // منع فتح المشغل والشاشة السوداء إذا لم تكن هناك سيرفرات جاهزة
      if (!availableStreams || availableStreams.length === 0) {
        alert('البث المباشر لهذه المباراة غير متوفر حالياً.');
        return;
      }

      setSelectedMatchTitle(match.title);
      setIsPlayerOpen(true);
      setStreams(availableStreams);
      setCurrentStreamIndex(0);
      playStreamAtIndex(0, availableStreams);
    } catch (e) {
      alert('تعذر جلب السيرفرات حالياً، يرجى إعادة المحاولة.');
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
    setFailoverNotice(`يعمل الآن: ${streamName}`);

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    fallbackTimerRef.current = setTimeout(() => {
      if (index + 1 < streamsList.length) {
        const nextIndex = index + 1;
        const nextName = streamsList[nextIndex].name || `Server ${nextIndex + 1}`;
        setFailoverNotice(`السيرفر بطيء، الانتقال التلقائي إلى ${nextName}...`);
        playStreamAtIndex(nextIndex, streamsList);
      }
    }, 7000);
  };

  const handleIframeLoad = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
    const currentName = streams[currentStreamIndex]?.name || `Server ${currentStreamIndex + 1}`;
    setFailoverNotice(`متصل بـ: ${currentName}`);
    setTimeout(() => setFailoverNotice(''), 3000);
  };

  const closePlayer = () => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setIsPlayerOpen(false);
    setStreams([]);
    setFailoverNotice('');
  };

  const currentStream = streams[currentStreamIndex];
  const activeUrl = currentStream ? (currentStream.url || currentStream.streamUrl || currentStream.embedUrl || currentStream.proxiedUrl) : '';

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
      
      {/* شريط العلم الوطني */}
      <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #00853f 33.3%, #ffffff 33.3%, #ffffff 66.6%, #d21034 66.6%)' }}></div>

      {/* الشريط العلوي */}
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

      {/* قائمة المباريات المباشرة */}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.75rem', background: '#09140d', color: '#34d399', padding: '4px 10px', borderRadius: '20px', border: '1px solid #1a3c26', fontWeight: 'bold' }}>
                      {m.tournament || 'مباراة كرة قدم'}
                    </span>
                    {isLive ? (
                      <span style={{ fontSize: '0.75rem', background: '#d21034', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: '900' }}>
                        ● مباشر
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', background: '#1c2820', color: '#9ca3af', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                        لم تبدأ بعد
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px', width: '100%' }}>
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

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                      {isLive ? (
                        <>
                          <div style={{ background: '#050a07', border: '2px solid #00853f', borderRadius: '12px', padding: '6px 16px' }}>
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
                          <div style={{ background: '#050a07', border: '1.5px solid #24412f', borderRadius: '12px', padding: '6px 14px' }}>
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

                  <button style={{ width: '100%', marginTop: '16px', background: 'linear-gradient(90deg, #00853f 0%, #00602e 100%)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}>
                    {isLive ? 'مشاهدة البث المباشر (تشغيل تلقائي)' : 'تفاصيل المباراة والسيرفرات'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* مشغل الفيديو */}
      {isPlayerOpen && (
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
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
              {selectedMatchTitle}
            </span>
            <button
              onClick={closePlayer}
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

          {failoverNotice && (
            <div style={{ background: '#0a2315', color: '#34d399', padding: '6px 14px', fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid #144026' }}>
              {failoverNotice}
            </div>
          )}

          {streams.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 12px', background: '#0b120e', borderBottom: '1px solid #16241a' }}>
              {streams.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => playStreamAtIndex(idx)}
                  style={{
                    background: currentStreamIndex === idx ? '#00853f' : '#17241c',
                    color: '#fff',
                    border: '1px solid #233e2c',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {s.name || `Server ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', background: '#000' }}>
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
          </div>
        </div>
      )}

    </div>
  );
}
