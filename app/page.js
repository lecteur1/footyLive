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
  
  // درع امتصاص النقرات الإعلانية
  const [shieldActive, setShieldActive] = useState(true);

  const playerContainerRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    // 1. حظر فتح أي نوافذ جديدة منبثقة قدر الإمكان
    try {
      window.open = () => null;
    } catch (e) {}

    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
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

  const handleOpenMatch = (match) => {
    setActiveMatch(match);
    const availableStreams = match.streams || (match.url ? [{ title: 'Server 1', url: match.url }] : []);
    setStreams(availableStreams);
    setCurrentStreamIndex(0);
    setShieldActive(true); // إعادة تفعيل الدرع لكل مباراة جديدة
    setIsPlayerOpen(true);
  };

  const handleServerSwitch = (index) => {
    setCurrentStreamIndex(index);
    setShieldActive(true); // إعادة تفعيل الدرع عند تغيير السيرفر
  };

  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error(err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(err);
      });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090e0b', color: '#ffffff', fontFamily: 'sans-serif' }}>
      
      {/* الشريط العلوي */}
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

      {/* المحتوى الرئيسي */}
      <div style={{ maxWidth: '650px', margin: '0 auto', padding: '16px' }}>

        {/* مشغل الفيديو عند فتح مباراة */}
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
            {/* شريط عنوان المباراة المنبثق */}
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
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00cc66', direction: 'ltr' }}>
                {activeMatch?.title || 'Live Stream'}
              </div>
            </div>

            {/* حاوية المشغل مع الدرع الذكي */}
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
              {streams.length > 0 && streams[currentStreamIndex]?.url ? (
                <iframe
                  ref={iframeRef}
                  src={streams[currentStreamIndex].url}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                  جاري تحميل السيرفر أو لا يوجد بث متوفر...
                </div>
              )}

              {/* درع الحماية الذكي لامتصاص النوافذ الإعلانية الخبيثة */}
              {shieldActive && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShieldActive(false); // إزالة الدرع ليظهر زر Play الحقيقي
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 50,
                    backdropFilter: 'blur(3px)',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: '#00853f',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 20px rgba(0, 133, 63, 0.6)',
                      marginBottom: '10px',
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span
                    style={{
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1px solid #00853f',
                    }}
                  >
                    انقر هنا لفك قفل المشغل وبدء البث 🛡️
                  </span>
                </div>
              )}
            </div>

            {/* زر تكبير الشاشة واسم السيرفر */}
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
              <div style={{ fontSize: '12px', color: '#00cc66' }}>
                متصل بالبث (انقر زر التشغيل)
              </div>
            </div>

            {/* سيرفرات البث البديلة */}
            {streams.length > 1 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>اختر سيرفر البث (في حال التقطيع):</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {streams.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleServerSwitch(idx)}
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
                      {s.title || `Server ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* قائمة المباريات */}
        {loadingMatches ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <div>جارِ جلب المباريات المباشرة...</div>
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
            {matches.map((match, idx) => (
              <div
                key={idx}
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
                {/* اسم البطولة والوقت */}
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
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {match.status || 'لم تبدأ بعد'}
                  </span>
                </div>

                {/* تفاصيل الفريقين */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    {match.team1 || 'الفريق 1'}
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
                    {match.team2 || 'الفريق 2'}
                  </div>
                </div>

                {/* زر المشاهدة */}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
