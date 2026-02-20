'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export default function TweetInput({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <label htmlFor="tweet-url" className="block text-sm font-medium text-gray-300 mb-2">
        Tweet URL
      </label>
      <div className="flex gap-3">
        <input
          id="tweet-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/user/status/123456789"
          className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
          required
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Scraping...' : 'Fetch'}
        </button>
      </div>
    </form>
  );
}
