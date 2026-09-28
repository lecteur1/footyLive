'use client';

import Link from 'next/link';
import { Play, Clock, ShieldAlert, Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { isTeamFavorited, toggleFavoriteTeam } from '@/lib/utils/favorites';

function TeamBadge({ team, size = 'h-12 w-12' }) {
  const [imgError, setImgError] = useState(false);
  const hasBadge = team.badge && !imgError;
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=042f2e&color=10b981&size=128&bold=true&format=png`;

  if (hasBadge) {
    return (
      <img
        src={team.badge}
        alt={team.name}
        className={`${size} rounded-full object-contain bg-white dark:bg-zinc-950 p-1 ring-2 ring-emerald-500/20 group-hover:ring-emerald-500/60 group-hover:scale-105 transition-all duration-300 shadow-md shrink-0`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <img
      src={fallbackUrl}
      alt={team.name}
      className={`${size} rounded-full object-contain group-hover:scale-105 transition-all duration-300 shadow-md shrink-0`}
      loading="lazy"
    />
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
      className={`group relative flex flex-col rounded-2xl p-5 mb-3 transition-all duration-300 overflow-hidden border shadow-lg ${
        isMatchFavorited 
          ? 'bg-gradient-to-br from-emerald-950/40 via-[#101913] to-[#0c120e] border-emerald-500/50 shadow-[0_4px_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30' 
          : 'bg-[#131915] border-[#1f2d24] hover:border-emerald-600/60 hover:shadow-[0_8px_30px_rgba(0,133,63,0.15)]'
      }`}
    >
      {/* الشريط العلوي بلمسة ألوان الراية الجزائرية */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00853f] via-white to-[#d21034]" />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 mt-1">
        <div className="flex items-center gap-2">
          {status === 'live' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d21034]/15 border border-[#d21034]/30 px-3 py-1 text-xs font-black text-[#ff4d4f] shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              {currentMinute || 'LIVE'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 text-xs font-bold text-emerald-300 shadow-sm">
              <Clock className="h-3.5 w-3.5" />
              {timeStr}
            </span>
          )}

          {isMatchFavorited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-400 tracking-wider uppercase">
              <Star className="h-3 w-3 fill-amber-400" />
              Starred
            </span>
          )}
        </div>

        {tournament && (
          <span className="text-xs font-bold text-zinc-300 truncate max-w-[160px] flex items-center gap-1.5 bg-[#0e1410] border border-[#1f2d24] px-3 py-1 rounded-full shadow-sm" title={tournament}>
            {leagueLogo ? (
              <img src={leagueLogo} alt="" className="h-4 w-4 rounded-full object-contain bg-zinc-950 inline-block shrink-0" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shrink-0" />
            )}
            <span className="truncate">{tournament}</span>
          </span>
        )}
      </div>

      {/* Main scoreboard block بتصميم عريض ومكبر */}
      <div className="space-y-4 py-2">
        {/* Home Team */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <TeamBadge team={homeTeam} />
            <span className="text-[16px] font-extrabold truncate text-zinc-100 group-hover:text-emerald-400 transition-colors">
              {homeTeam.name}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavoriteTeam(homeTeam.name);
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-amber-400 transition-all shrink-0 cursor-pointer"
              title={homeFav ? "Unfavorite Team" : "Favorite Team"}
            >
              <Star className={`h-4 w-4 transition-all ${homeFav ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'text-zinc-600'}`} />
            </button>
          </div>
          {status === 'live' && displayHomeScore !== undefined && (
            <span className="text-2xl font-black text-white tabular-nums shrink-0 bg-[#090d0b] px-3.5 py-1 rounded-xl border border-emerald-900/60 shadow-inner">
              {displayHomeScore}
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <TeamBadge team={awayTeam} />
            <span className="text-[16px] font-extrabold truncate text-zinc-100 group-hover:text-emerald-400 transition-colors">
              {awayTeam.name}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavoriteTeam(awayTeam.name);
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-500 hover:text-amber-400 transition-all shrink-0 cursor-pointer"
              title={awayFav ? "Unfavorite Team" : "Favorite Team"}
            >
              <Star className={`h-4 w-4 transition-all ${awayFav ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'text-zinc-600'}`} />
            </button>
          </div>
          {status === 'live' && displayAwayScore !== undefined && (
            <span className="text-2xl font-black text-white tabular-nums shrink-0 bg-[#090d0b] px-3.5 py-1 rounded-xl border border-emerald-900/60 shadow-inner">
              {displayAwayScore}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-800/40 to-transparent my-3" />

      {/* Footer Info & Watch Action */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-zinc-400 font-bold tracking-wide">
          {sources.length === 0 ? 'Verification only' : `${sources.length} stream server${sources.length !== 1 ? 's' : ''}`}
        </span>

        {sources.length > 0 ? (
          <span className="inline-flex items-center gap-2 text-xs font-black text-emerald-400 bg-emerald-950/50 border border-emerald-700/50 px-3.5 py-1.5 rounded-xl group-hover:bg-[#00853f] group-hover:text-white transition-all shadow-sm">
            <Play className="h-3.5 w-3.5 fill-current" />
            Watch Stream
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
            <ShieldAlert className="h-4 w-4" />
            Pending Link
          </span>
        )}
      </div>

      {status === 'upcoming' && timeLeft && (
        <div className="mt-3.5 rounded-xl bg-[#0b100d] border border-[#1f2d24] px-4 py-2.5 text-center text-xs font-bold text-zinc-300 shadow-inner">
          {timeLeft.toLowerCase().trim().includes('starting soon') ? (
            <span className="text-emerald-400 font-black animate-pulse">Starting soon</span>
          ) : (
            <>
              Kickoff in <span className="text-emerald-400 font-black font-mono text-sm ml-1">{timeLeft}</span>
            </>
          )}
        </div>
      )}
    </Link>
  );
}

function getTimeLeft(timestamp) {
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'Starting soon';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
