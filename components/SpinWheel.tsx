'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Participant } from '@/lib/types';
import { segmentColor, shuffle, secureRandomIndex } from '@/lib/utils';

interface Props {
  participants: Participant[];
  onFinish: (winner: Participant) => void;
  spinning: boolean;
  onSpinStart: () => void;
}

const MAX_SEGMENTS = 20;
const SPIN_DURATION = 5000; // ms

export default function SpinWheel({ participants, onFinish, spinning, onSpinStart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [displayList, setDisplayList] = useState<Participant[]>([]);
  const angleRef = useRef(0);

  // Prepare segment list (max 20 random participants)
  useEffect(() => {
    if (participants.length <= MAX_SEGMENTS) {
      setDisplayList(shuffle(participants));
    } else {
      setDisplayList(shuffle(participants).slice(0, MAX_SEGMENTS));
    }
  }, [participants]);

  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas || displayList.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const radius = center - 10;
      const segCount = displayList.length;
      const segAngle = (2 * Math.PI) / segCount;

      ctx.clearRect(0, 0, size, size);

      // Draw segments
      for (let i = 0; i < segCount; i++) {
        const startAngle = rotation + i * segAngle;
        const endAngle = startAngle + segAngle;

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = segmentColor(i, segCount);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(startAngle + segAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, Math.min(14, 200 / segCount))}px sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        const name = displayList[i].userName;
        const truncated = name.length > 12 ? name.slice(0, 11) + '…' : name;
        ctx.fillText(`@${truncated}`, radius - 12, 4);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Center circle
      ctx.beginPath();
      ctx.arc(center, center, 22, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrow pointer (top)
      ctx.beginPath();
      ctx.moveTo(center - 12, 4);
      ctx.lineTo(center + 12, 4);
      ctx.lineTo(center, 28);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },
    [displayList]
  );

  // Static draw
  useEffect(() => {
    drawWheel(angleRef.current);
  }, [drawWheel]);

  const spin = useCallback(() => {
    if (spinning || displayList.length === 0) return;
    onSpinStart();

    // Pick the actual winner from ALL participants
    const winnerIdx = secureRandomIndex(participants.length);
    const winner = participants[winnerIdx];

    // Find the winner in the display list, or swap them in
    let targetSegment = displayList.findIndex(
      (p) => p.userName.toLowerCase() === winner.userName.toLowerCase()
    );
    if (targetSegment === -1) {
      // Replace a random segment with the winner
      targetSegment = secureRandomIndex(displayList.length);
      const newList = [...displayList];
      newList[targetSegment] = winner;
      setDisplayList(newList);
    }

    const segAngle = (2 * Math.PI) / displayList.length;
    // The pointer is at the top (angle = -PI/2 from standard)
    // We want the target segment to end under the pointer
    const targetAngle =
      -targetSegment * segAngle - segAngle / 2 - Math.PI / 2;
    const fullRotations = 5 * 2 * Math.PI; // 5 full spins
    const endAngle = targetAngle - fullRotations;
    const startAngle = angleRef.current;
    const totalDelta = endAngle - startAngle;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / SPIN_DURATION, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const current = startAngle + totalDelta * ease;
      angleRef.current = current;
      drawWheel(current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        angleRef.current = endAngle;
        onFinish(winner);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animRef.current);
  }, [spinning, displayList, participants, drawWheel, onFinish, onSpinStart]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="max-w-full h-auto"
        />
      </div>
      <button
        onClick={spin}
        disabled={spinning || participants.length === 0}
        className="rounded-lg bg-green-600 px-8 py-3 text-lg font-bold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {spinning ? 'Spinning...' : 'Pick Winner!'}
      </button>
    </div>
  );
}
