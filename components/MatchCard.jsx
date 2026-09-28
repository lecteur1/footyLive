'use client';

import Link from 'next/link';
import { Play, Clock, ShieldAlert, Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { isTeamFavorited, toggleFavoriteTeam } from '@/lib/utils/favorites';

function TeamBadge({ team, size = 'h-14 w-14' }) {
  const [imgError, setImgError] = useState(false);
  const hasBadge = team?.badge && !imgError;
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team?.name || 'T')}&background=064e3b&color=34d399&size=128&bold=true&format=png`;

  return (
    <div className="relative flex items-center justify-center">
      <img
        src={hasBadge ? team.badge : fallbackUrl}
        alt={team?.name || ''}
        className={`${size} rounded-2xl object-contain bg-zinc-900/90 p-2 border-2 border-emerald-500/30 shadow-md transition-transform duration-300 group-hover:scale-105`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

export default function MatchCard({ match, tab }) {
  const { id, status, timestamp, homeTeam, awayTeam, sources, tournament, homeScore, awayScore, leagueLogo, currentMinuteNumber } = match;

  const [liveData, setLiveData] = useState(null);
  const [homeFav, setHomeFav] = useState(false);
  const [awayFav, setAwayFav] = useState(false);
  const polling = useRef(null);

  useEffect(() => {
    const checkFavs = () => {
      setHomeFav(isTeamFavorited(homeTeam?.name));
      setAwayFav(isTeamFavorited(awayTeam?.name));
    };
    checkFavs();
    window.addEventListener('favorites-updated', checkFavs);
    return () => {
      window.removeEventListener('favorites-updated', checkFavs);
    };
  }, [homeTeam?.name, awayTeam?.name]);

  useEffect(() => {
    if (status !== 'live') { setLiveData(null); return; }
    const poll = async () => {
      try {
        const res = await fetch(`/api/match/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.match) setLiveData(data.match);
      } catch {}
    };
    poll();
    polling.current = setInterval(poll, 30000);
    return () => { if (polling.current) clearInterval(polling.current); polling.current = null; };
  }, [id, status]);

  const liveMinute = liveData?.currentMinute || match.currentMinute;
  const liveMinuteNumber = liveData?.currentMinuteNumber ?? match.currentMinuteNumber;
  const displayHomeScore = liveData?.homeScore ?? homeScore;
  const displayAwayScore = liveData?.awayScore ?? awayScore;

  const currentMinute = liveMinute || (liveMinuteNumber ? `${liveMinuteNumber}'` : '');
  const timeStr = status === 'live'
    ? (currentMinute ? `${currentMinute}` : 'LIVE')
    : new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const timeLeft = status === 'upcoming' ? getTimeLeft(timestamp) : '';
  const isMatchFavorited = homeFav || awayFav;

  return (
    <Link
      href={`/watch/${id}?tab=${tab || 'live'}`}
      className="group relative flex flex-col rounded-3xl p-5 mb-5 bg-[#0f1712] border-2 border-emerald-900/40 hover:border-emerald-500/70 transition-all duration-300 shadow-xl overflow-hidden"
    >
      {/* الشريط العلوي الثلاثي للعلم الجزائري */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00853f] via-white to-[#d21034]" />

      {/* الرأس: اسم البطولة وحالة المباراة */}
      <div className="flex items-center justify-between mb-4 mt-1">
        <div className="flex items-center gap-2">
          {status === 'live' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d21034]/20 border border-[#d21034]/40 px-3 py-1 text-xs font-black text-[#ff4d4f]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              {currentMinute || 'LIVE'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 px-3 py-1 text-xs font-bold text-emerald-300">
              <Clock className="h-3.5 w-3.5" />
              {timeStr}
            </span>
          )}

          {isMatchFavorited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-[10px] font-black text-amber-400">
              <Star className="h-3 w-3 fill-amber-400" />
            </span>
          )}
        </div>

        {tournament && (
          <span className="text-xs font-bold text-emerald-400/90 truncate max-w-[170px] flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/30 px-3 py-1 rounded-full">
            {leagueLogo && (
              <img src={leagueLogo} alt="" className="h-4 w-4 rounded-full object-contain inline-block shrink-0" />
            )}
            <span className="truncate">{tournament}</span>
          </span>
        )}
      </div>

      {/* التقابل الأفقي: الفريق المضيف [مقابل] الفريق الضيف */}
      <div className="grid grid-cols-5 items-center justify-between my-3 gap-2">
        {/* الفريق الأول (المضيف) */}
        <div className="col-span-2 flex flex-col items-center text-center">
          <TeamBadge team={homeTeam} />
          <span className="text-sm md:text-base font-extrabold text-white mt-2 line-clamp-1">
            {homeTeam?.name}
          </span>
        </div>

        {/* المنتصف: النتيجة أو التوقيت */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {status === 'live' && displayHomeScore !== undefined ? (
            <div className="bg-[#062414] border-2 border-emerald-500/40 px-3.5 py-1.5 rounded-2xl shadow-inner text-center">
              <span className="text-2xl font-black text-white tracking-wider">
                {displayHomeScore} : {displayAwayScore}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-xs font-black text-emerald-500 bg-emerald-950/70 border border-emerald-800/50 px-2.5 py-1 rounded-xl">
                VS
              </span>
              <span className="text-[11px] font-bold text-zinc-400 mt-1">{timeStr}</span>
            </div>
          )}
        </div>

        {/* الفريق الثاني (الضيف) */}
        <div className="col-span-2 flex flex-col items-center text-center">
          <TeamBadge team={awayTeam} />
          <span className="text-sm md:text-base font-extrabold text-white mt-2 line-clamp-1">
            {awayTeam?.name}
          </span>
        </div>
      </div>

      {/* زر المشاهدة العريض في الأسفل */}
      <div className="mt-4 pt-3 border-t border-emerald-900/40 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 font-bold">
          {sources.length > 0 ? `${sources.length} سيرفرات متوفرة` : 'في انتظار الروابط'}
        </span>

        {sources.length > 0 ? (
          <span className="inline-flex items-center gap-2 bg-[#00853f] hover:bg-[#007035] text-white text-xs font-black px-4 py-2 rounded-xl shadow-md shadow-emerald-950 transition-all">
            <Play className="h-3.5 w-3.5 fill-current" />
            مشاهدة البث المباشر
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            قريباً
          </span>
        )}
      </div>

      {status === 'upcoming' && timeLeft && (
        <div className="mt-3 rounded-xl bg-emerald-950/30 border border-emerald-900/30 px-3 py-1.5 text-center text-xs font-bold text-emerald-300">
          تنطلق بعد: <span className="font-mono font-black text-white ml-1">{timeLeft}</span>
        </div>
      )}
    </Link>
  );
}

function getTimeLeft(timestamp) {
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'تنطلق قريباً';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days} يوم ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
}
