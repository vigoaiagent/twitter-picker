'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Participant } from '@/lib/types';

interface Props {
  winners: Participant[];
  onPickAgain: () => void;
}

export default function WinnerCard({ winners, onPickAgain }: Props) {
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent p-8 animate-fadeIn w-full max-w-2xl">
      <div className="text-sm font-medium uppercase tracking-wider text-yellow-400">
        {winners.length > 1 ? `${winners.length} Winners` : 'Winner'}
      </div>

      <div className={`grid gap-6 w-full ${winners.length === 1 ? 'justify-items-center' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
        {winners.map((winner, idx) => (
          <div key={winner.userName} className="flex flex-col items-center gap-2">
            <div className="text-xs text-yellow-400/70 font-medium">#{idx + 1}</div>
            {winner.profilePicture ? (
              <img
                src={winner.profilePicture}
                alt={winner.displayName}
                className="w-16 h-16 rounded-full border-3 border-yellow-400 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full border-3 border-yellow-400 bg-gray-600 flex items-center justify-center text-xl font-bold text-white">
                {winner.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center">
              <div className="text-sm font-bold text-white truncate max-w-[140px]">
                {winner.displayName}
              </div>
              <a
                href={`https://x.com/${winner.userName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                @{winner.userName}
              </a>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onPickAgain}
        className="rounded-lg bg-gray-600 px-5 py-2 text-sm font-medium text-white hover:bg-gray-500 transition"
      >
        Pick Again
      </button>
    </div>
  );
}
