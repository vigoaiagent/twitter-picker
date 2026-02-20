'use client';

import { useState, useCallback } from 'react';
import { Participant, InteractionType, ScrapeResponse } from '@/lib/types';
import TweetInput from '@/components/TweetInput';
import FilterBar from '@/components/FilterBar';
import ParticipantList from '@/components/ParticipantList';
import SpinWheel from '@/components/SpinWheel';
import WinnerCard from '@/components/WinnerCard';
import LoadingState from '@/components/LoadingState';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [counts, setCounts] = useState<Record<InteractionType, number>>({
    replies: 0,
    retweets: 0,
    likes: 0,
    quotes: 0,
  });
  const [filters, setFilters] = useState<InteractionType[]>([
    'replies',
    'retweets',
    'likes',
    'quotes',
  ]);
  const [spinning, setSpinning] = useState(false);
  const [winners, setWinners] = useState<Participant[]>([]);
  const [fetched, setFetched] = useState(false);
  const [winnerCount, setWinnerCount] = useState(1);

  const handleFetch = async (tweetUrl: string, apiToken: string) => {
    setLoading(true);
    setError(null);
    setParticipants([]);
    setWinners([]);
    setFetched(false);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetUrl, types: filters, apiToken }),
      });

      const data: ScrapeResponse & { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch participants');
      }

      setParticipants(data.participants);
      setCounts(data.counts);
      setFetched(true);

      if (data.participants.length === 0) {
        setError('No participants found. Try selecting different interaction types.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = participants.filter((p) =>
    p.interactionTypes.some((t) => filters.includes(t))
  );

  const handleWinners = useCallback((w: Participant[]) => {
    setWinners(w);
    setSpinning(false);
  }, []);

  const handlePickAgain = () => {
    setWinners([]);
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 gap-8">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Twitter Giveaway Picker
        </h1>
        <p className="mt-3 text-gray-400 max-w-lg mx-auto">
          Paste a tweet URL, scrape its interactions, and randomly pick winners
          with a spinning wheel.
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        selected={filters}
        onChange={setFilters}
        counts={counts}
        disabled={loading}
      />

      {/* Tweet input */}
      <TweetInput onSubmit={handleFetch} loading={loading} />

      {/* Error */}
      {error && (
        <div className="w-full max-w-2xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingState />}

      {/* Results */}
      {fetched && !loading && participants.length > 0 && (
        <>
          <ParticipantList
            participants={participants}
            activeFilters={filters}
          />

          {/* Winner count + Wheel + Winners */}
          <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
            {/* Winner count selector */}
            <div className="flex items-center gap-3">
              <label htmlFor="winner-count" className="text-sm text-gray-300">
                Number of winners:
              </label>
              <input
                id="winner-count"
                type="number"
                min={1}
                max={Math.min(filteredParticipants.length, 50)}
                value={winnerCount}
                onChange={(e) => setWinnerCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-center text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={spinning}
              />
            </div>

            {filteredParticipants.length > 0 && (
              <SpinWheel
                participants={filteredParticipants}
                onFinish={handleWinners}
                spinning={spinning}
                onSpinStart={() => {
                  setSpinning(true);
                  setWinners([]);
                }}
                winnerCount={winnerCount}
              />
            )}

            {winners.length > 0 && (
              <WinnerCard winners={winners} onPickAgain={handlePickAgain} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
