'use client';

import { useState, useRef, useCallback } from 'react';
import { Participant } from '@/lib/types';
import { secureRandomIndex, shuffle } from '@/lib/utils';

interface Props {
  participants: Participant[];
  onFinish: (winners: Participant[]) => void;
  picking: boolean;
  onPickStart: () => void;
  winnerCount: number;
}

const PICK_DURATION = 2500;
const INITIAL_INTERVAL = 30;

export default function RandomPicker({
  participants,
  onFinish,
  picking,
  onPickStart,
  winnerCount,
}: Props) {
  const [highlight, setHighlight] = useState<Participant | null>(null);
  const [round, setRound] = useState(0);
  const totalRounds = Math.min(winnerCount, participants.length);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const pickOne = useCallback(
    (pool: Participant[], collectedWinners: Participant[], currentRound: number) => {
      const shuffled = shuffle(pool);
      const winnerIdx = secureRandomIndex(pool.length);
      const winner = pool[winnerIdx];

      let step = 0;
      const totalSteps = 30 + Math.floor(Math.random() * 10);
      const startTime = performance.now();

      const tick = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / PICK_DURATION, 1);
        // Exponential slowdown
        const interval = INITIAL_INTERVAL + progress * progress * 300;

        if (step < totalSteps - 1) {
          setHighlight(shuffled[step % shuffled.length]);
          step++;
          timerRef.current = setTimeout(tick, interval);
        } else {
          // Land on winner
          setHighlight(winner);
          const newWinners = [...collectedWinners, winner];
          setRound(currentRound + 1);

          if (currentRound + 1 < totalRounds) {
            // Next round after a pause
            const newPool = pool.filter(
              (p) => p.userName.toLowerCase() !== winner.userName.toLowerCase()
            );
            setTimeout(() => {
              pickOne(newPool, newWinners, currentRound + 1);
            }, 1000);
          } else {
            setTimeout(() => {
              onFinish(newWinners);
            }, 500);
          }
        }
      };

      tick();
    },
    [totalRounds, onFinish]
  );

  const startPick = () => {
    if (picking || participants.length === 0) return;
    onPickStart();
    setRound(0);
    setHighlight(null);
    pickOne(participants, [], 0);
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Slot display */}
      <div className="w-full max-w-md h-24 rounded-xl border-2 border-gray-600 bg-gray-800/80 flex items-center justify-center overflow-hidden">
        {highlight ? (
          <div className="flex items-center gap-3 animate-fadeIn">
            {highlight.profilePicture ? (
              <img
                src={highlight.profilePicture}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-lg font-bold text-white">
                {highlight.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-lg font-bold text-white">{highlight.displayName}</div>
              <div className="text-sm text-gray-400">@{highlight.userName}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Click to pick {totalRounds > 1 ? `${totalRounds} winners` : 'a winner'}</div>
        )}
      </div>

      {/* Progress */}
      {picking && totalRounds > 1 && (
        <div className="text-sm text-gray-400">
          Picking {round + 1} of {totalRounds}...
        </div>
      )}

      <button
        onClick={startPick}
        disabled={picking || participants.length === 0}
        className="rounded-lg bg-green-600 px-8 py-3 text-lg font-bold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {picking
          ? 'Picking...'
          : `Pick ${totalRounds > 1 ? `${totalRounds} Winners` : 'Winner'}!`}
      </button>
    </div>
  );
}
