import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

export const LiveClockCard: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  const dateString = time.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-brand-400">LIVE CLOCK</span>
        </div>
        <span className="text-[10px] font-mono text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">IST (UTC+5:30)</span>
      </div>

      <div className="py-4 z-10">
        <h2 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-md">
          {timeString}
        </h2>
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 border-t border-white/10 pt-3 z-10">
        <Calendar className="w-4 h-4 text-brand-400" />
        <span>{dateString}</span>
      </div>
    </Card>
  );
};
