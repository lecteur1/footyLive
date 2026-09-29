'use client';

import React from 'react';

export default function StreamPlayer({ streamUrl, onClose }) {
  if (!streamUrl) {
    return (
      <div className="w-full aspect-video bg-neutral-900 rounded-xl flex items-center justify-center text-zinc-400">
        جاري تحميل السيرفر...
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-neutral-800">
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="absolute top-3 right-3 z-50 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1.5 transition"
        >
          ✕
        </button>
      )}

      {/* مشغل المصدر النقي والمباشر */}
      <iframe
        src={streamUrl}
        className="w-full h-full border-0"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
