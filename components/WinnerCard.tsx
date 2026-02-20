'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Participant } from '@/lib/types';

interface Props {
  winner: Participant;
  onPickAgain: () => void;
}

export default function WinnerCard({ winner, onPickAgain }: Props) {
  useEffect(() => {
    // Fire confetti on mount
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
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent p-8 animate-fadeIn">
      <div className="text-sm font-medium uppercase tracking-wider text-yellow-400">
        Winner
      </div>

      {winner.profilePicture ? (
        <img
          src={winner.profilePicture}
          alt={winner.displayName}
          className="w-24 h-24 rounded-full border-4 border-yellow-400 object-cover"
        />
      ) : (
        <div className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-gray-600 flex items-center justify-center text-3xl font-bold text-white">
          {winner.displayName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="text-center">
        <div className="text-2xl font-bold text-white">{winner.displayName}</div>
        <a
          href={`https://x.com/${winner.userName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          @{winner.userName}
        </a>
      </div>

      <div className="flex gap-2 mt-2">
        <a
          href={`https://x.com/${winner.userName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          View Profile
        </a>
        <button
          onClick={onPickAgain}
          className="rounded-lg bg-gray-600 px-5 py-2 text-sm font-medium text-white hover:bg-gray-500 transition"
        >
          Pick Again
        </button>
      </div>
    </div>
  );
}
