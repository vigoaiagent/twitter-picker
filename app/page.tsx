'use client';

import { useState, useCallback, useMemo } from 'react';
import { Participant, InteractionType, FilterOptions } from '@/lib/types';
import { parseTweetUrl } from '@/lib/utils';
import { scrapeFromBrowser } from '@/lib/apify-client';
import TweetInput from '@/components/TweetInput';
import FilterBar from '@/components/FilterBar';
import QualityFilter from '@/components/QualityFilter';
import ParticipantList from '@/components/ParticipantList';
import RandomPicker from '@/components/RandomPicker';
import WinnerCard from '@/components/WinnerCard';
import LoadingState from '@/components/LoadingState';

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [counts, setCounts] = useState<Record<InteractionType, number>>({
    replies: 0,
    retweets: 0,
    quotes: 0,
  });
  const [typeFilters, setTypeFilters] = useState<InteractionType[]>([
    'replies',
    'retweets',
    'quotes',
  ]);
  const [qualityFilters, setQualityFilters] = useState<FilterOptions>({
    minAccountAgeDays: 180,
    minFollowers: 1,
    requireAvatar: true,
  });
  const [picking, setPicking] = useState(false);
  const [winners, setWinners] = useState<Participant[]>([]);
  const [fetched, setFetched] = useState(false);
  const [winnerCount, setWinnerCount] = useState(1);
  const [progress, setProgress] = useState('');
  const handleFetch = async (tweetUrl: string, apiToken: string) => {
    setLoading(true);
    setError(null);
    setAllParticipants([]);
    setWinners([]);
    setFetched(false);
    setProgress('Starting scrape...');
    try {
      const tweetId = parseTweetUrl(tweetUrl);
      if (!tweetId) {
        throw new Error('Invalid Twitter/X URL. Expected: https://x.com/user/status/123456');
      }

      const data = await scrapeFromBrowser(tweetId, typeFilters, apiToken, (type, count) => {
        setProgress(`Fetched ${count} ${type}`);
      });

      setAllParticipants(data.participants);
      setCounts(data.counts);
      setFetched(true);

      if (data.participants.length === 0) {
        setError('No participants found for the selected interaction types.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  // Apply both type and quality filters
  const eligibleParticipants = useMemo(() => {
    return allParticipants.filter((p) => {
      // Type filter
      if (!p.interactionTypes.some((t) => typeFilters.includes(t))) return false;
      // Quality filters
      if (qualityFilters.requireAvatar && !p.hasCustomAvatar) return false;
      if (qualityFilters.minFollowers > 0 && p.followers < qualityFilters.minFollowers) return false;
      if (qualityFilters.minAccountAgeDays > 0 && daysSince(p.createdAt) < qualityFilters.minAccountAgeDays) return false;
      return true;
    });
  }, [allParticipants, typeFilters, qualityFilters]);

  const handleWinners = useCallback((w: Participant[]) => {
    setWinners(w);
    setPicking(false);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 gap-8">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Twitter Giveaway Picker
        </h1>
        <p className="mt-3 text-gray-400 max-w-lg mx-auto">
          Paste a tweet URL, scrape replies / retweets / quotes, filter by account quality, and randomly pick winners.
        </p>
      </div>

      {/* Type filters */}
      <FilterBar
        selected={typeFilters}
        onChange={setTypeFilters}
        counts={counts}
        disabled={loading}
      />

      {/* Tweet input */}
      <TweetInput onSubmit={handleFetch} loading={loading} />

      {/* Quality filters */}
      <QualityFilter
        filters={qualityFilters}
        onChange={setQualityFilters}
        disabled={loading}
      />

      {/* Error */}
      {error && (
        <div className="w-full max-w-2xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingState progress={progress} />}

      {/* Results */}
      {fetched && !loading && allParticipants.length > 0 && (
        <>
          <ParticipantList
            participants={eligibleParticipants}
            activeFilters={typeFilters}
            totalBeforeFilter={allParticipants.length}
          />

          {/* Winner picker */}
          <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
            <div className="flex items-center gap-3">
              <label htmlFor="winner-count" className="text-sm text-gray-300">
                Number of winners:
              </label>
              <input
                id="winner-count"
                type="number"
                min={1}
                max={Math.min(eligibleParticipants.length, 50)}
                value={winnerCount}
                onChange={(e) => setWinnerCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-center text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={picking}
              />
            </div>

            {eligibleParticipants.length > 0 && (
              <RandomPicker
                participants={eligibleParticipants}
                onFinish={handleWinners}
                picking={picking}
                onPickStart={() => {
                  setPicking(true);
                  setWinners([]);
                }}
                winnerCount={winnerCount}
              />
            )}

            {winners.length > 0 && (
              <WinnerCard winners={winners} onPickAgain={() => setWinners([])} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
