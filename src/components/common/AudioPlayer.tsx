import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export const AudioPlayer: React.FC<{ src: string; title?: string }> = ({ src, title = 'Voice Note' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-transform active:scale-95"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>
      <span className="flex items-center gap-1">
        <Volume2 className="w-3.5 h-3.5" />
        {title}
      </span>
    </div>
  );
};
