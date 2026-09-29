'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingStream, setLoadingStream] = useState(false);
  const [streams, setStreams] = useState([]);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [activeMatch, setActiveMatch] = useState(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const playerContainerRef = useRef(null);

  useEffect(() => {
    fetchMatches();

    if (typeof window !== 'undefined') {
      const originalOpen = window.open;
      const allowedHosts = [
        window.location.hostname,
        'embed.st',
      ];

      window.open = function (url, target, features) {
        if (!url || typeof url !== 'string') {
          return null;
        }

        try {
          const targetUrl = new URL(url, window.location.href);
          const isAllowed = allowedHosts.some(
            (allowed) =>
              targetUrl.hostname === allowed ||
              targetUrl.hostname.endsWith('.' + allowed)
          );

          if (!isAllowed) {
            console.warn('تم اعتراض نافذة إعلانية:', targetUrl.origin);
            return null;
          }
        } catch (e) {
          return null;
        }

        return originalOpen.call(window, url, target, features);
      };
    }
  }, []);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data?.matches) ? data.matches : []);
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
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
      if (timeStr && timeStr.includes(':')) {
        return timeStr;
      }
    } catch (e) {}
    return '00:00';
  };

  const handleOpenMatch = async (match) => {
    setActiveMatch(match);
    setIsPlayerOpen(true);
    setLoadingStream(true);
    setStreams([]);
    setCurrentStreamIndex(0);

    try {
      const res = await fetch(`/api/streams/${match.id}`);
      const data = await res.json();

      let streamList = [];
      if (Array.isArray(data?.streams) && data.streams.length > 0) {
        streamList = data.streams;
      } else if (Array.isArray(data?.channels) && data.channels.length > 0) {
        streamList = data.channels;
      } else if (data?.defaultUrl) {
        streamList = [{ name: 'Server 1 (Live HD)', url: data.defaultUrl }];
      }

      setStreams(streamList);
    } catch (err) {
      console.error('Failed to load streams', err);
      setStreams([]);
    } finally {
      setLoadingStream(false);
    }
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  const currentUrl = streams[currentStreamIndex]?.url || '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090e0b', color: '#ffffff', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          backgroundColor: '#111813',
          borderBottom: '1px solid #1a271f',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <button
          onClick={fetchMatches}
          disabled={loadingMatches}
          style={{
            backgroundColor: '#00853f',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>تحديث</span>
          <span>↻</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>Saifou Sat</div>
          <div style={{ fontSize: '11px', color: '#00cc66', letterSpacing: '1px' }}>DZ LIVE FOOTBALL</div>
        </div>

        <div style={{ fontSize: '24px' }}>🇩🇿</div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '650px', margin: '0 auto', padding: '16px' }}>

        {/* Video Player */}
        {isPlayerOpen && (
          <div
            style={{
              backgroundColor: '#111813',
              borderRadius: '16px',
              border: '1px solid #1a271f',
              padding: '14px',
              marginBottom: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button
                onClick={() => setIsPlayerOpen(false)}
                style={{
                  backgroundColor: '#e74c3c',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </button>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00cc66' }}>
                {activeMatch?.team1 || activeMatch?.homeTeam?.name || 'الفريق 1'} vs {activeMatch?.team2 || activeMatch?.awayTeam?.name || 'الفريق 2'}
              </div>
            </div>

            <div
              ref={playerContainerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '260px',
                backgroundColor: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {loadingStream ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#00cc66', fontSize: '14px' }}>
                  جاري جلب وتشغيل البث المباشر...
                </div>
              ) : currentUrl ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <iframe
                    key={currentUrl}
                    src={currentUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />

                  {/* زر تشغيل مباشر في المشغل الكامل */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      zIndex: 20,
                    }}
                  >
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: '#00853f',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>تشغيل مباشر في المشغل الكامل</span>
                      <span>▶</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888', padding: '20px', textAlign: 'center', fontSize: '13px' }}>
                  لا يوجد بث مباشر متاح حالياً لهذه المباراة.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button
                onClick={handleToggleFullscreen}
                style={{
                  backgroundColor: '#1f2e24',
                  color: '#fff',
                  border: '1px solid #2d4535',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ⛶ تكبير الشاشة
              </button>

              {currentUrl && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#00cc66',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>فتح في نافذة مستقلة</span>
                  <span>↗</span>
                </a>
              )}
            </div>

            {/* أزرار السيرفرات */}
            {streams.length > 1 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>اختر سيرفر البث:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {streams.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStreamIndex(idx)}
                      style={{
                        flex: 1,
                        minWidth: '100px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: currentStreamIndex === idx ? '#00853f' : '#1a271f',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {s.name || s.title || s.label || `Server ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Matches List */}
        {loadingMatches ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <div>جارِ جلب المباريات المباشرة وجدول اليوم...</div>
          </div>
        ) : matches.length === 0 ? (
          <div
            style={{
              backgroundColor: '#111813',
              borderRadius: '16px',
              padding: '40px 20px',
              textAlign: 'center',
              border: '1px solid #1a271f',
              color: '#888',
            }}
          >
            لا توجد مباريات جارية حالياً.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {matches.map((match, idx) => {
              const teamHome =
                typeof match.homeTeam === 'object'
                  ? match.homeTeam?.name || match.team1
                  : match.team1 || match.homeTeam || 'فريق 1';
              const teamAway =
                typeof match.awayTeam === 'object'
                  ? match.awayTeam?.name || match.team2
                  : match.team2 || match.awayTeam || 'فريق 2';

              return (
                <div
                  key={match.id || idx}
                  style={{
                    backgroundColor: '#111813',
                    borderRadius: '14px',
                    border: '1px solid #1a271f',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        backgroundColor: '#1f2e24',
                        color: '#00cc66',
                        padding: '3px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {match.tournament || 'مباراة مباشرة'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: match.status === 'live' ? '#ff4d4d' : '#888',
                        fontWeight: match.status === 'live' ? 'bold' : 'normal',
                      }}
                    >
                      {match.status === 'live' ? '● مباشر الآن' : match.status || 'لم تبدأ بعد'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                      {teamHome}
                    </div>
                    <div
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#090e0b',
                        borderRadius: '8px',
                        border: '1px solid #1a271f',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: '#00cc66',
                      }}
                    >
                      {formatLocalTime(match.timestamp, match.time)}
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                      {teamAway}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenMatch(match)}
                    style={{
                      width: '100%',
                      padding: '11px',
                      backgroundColor: '#00853f',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    تفاصيل المباراة والسيرفرات
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
