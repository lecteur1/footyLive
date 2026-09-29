'use client';

import React from 'react';

interface StreamPlayerProps {
  streamUrl: string;
  onClose?: () => void;
}

export default function StreamPlayer({ streamUrl, onClose }: StreamPlayerProps) {
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
          className="absolute top-3 right-3 z-50 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1.5 transition"
        >
          ✕
        </button>
      )}

      {/* مشغل المصدر الأصلي المباشر بدون أي طبقات حماية إضافية أو أزرار قفل */}
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
