import React, { useState, useRef, useEffect } from 'react';
import { Mic, AlertCircle } from 'lucide-react';

export interface AudioPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title = 'Voice Instruction', className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src) return null;

  return (
    <div className={`bg-gradient-to-r from-brand-50/90 to-purple-50/90 border border-brand-200 p-3 rounded-2xl shadow-sm space-y-2 max-w-md ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-brand-900 tracking-tight flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-brand-600 animate-pulse" /> {title}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
          Cloud Audio
        </span>
      </div>

      {hasError ? (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Unable to play audio format on this device.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* NATIVE CONTROL FOR UNIVERSAL iOS / ANDROID / DESKTOP COMPATIBILITY */}
          <audio
            ref={audioRef}
            src={src}
            controls
            preload="metadata"
            onError={() => setHasError(true)}
            className="w-full h-10 rounded-lg accent-brand-600"
          />
        </div>
      )}
    </div>
  );
};
