'use client';

import { useState, useEffect } from 'react';

const TOKEN_KEY = 'apify_api_token';

interface Props {
  onSubmit: (url: string, apiToken: string) => void;
  loading: boolean;
}

export default function TweetInput({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setApiToken(saved);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && apiToken.trim()) {
      localStorage.setItem(TOKEN_KEY, apiToken.trim());
      onSubmit(url.trim(), apiToken.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-3">
      <div>
        <label htmlFor="api-token" className="block text-sm font-medium text-gray-300 mb-1">
          Apify API Token
        </label>
        <div className="relative">
          <input
            id="api-token"
            type={showToken ? 'text' : 'password'}
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="apify_api_xxxxxxxx"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 pr-20 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            disabled={loading}
            required
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200 px-2 py-1"
          >
            {showToken ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Saved in browser locally. Get yours at{' '}
          <a
            href="https://console.apify.com/account/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            console.apify.com
          </a>
        </p>
      </div>

      <div>
        <label htmlFor="tweet-url" className="block text-sm font-medium text-gray-300 mb-1">
          Tweet URL
        </label>
        <div className="flex gap-3">
          <input
            id="tweet-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://x.com/user/status/123456789"
            className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
            required
          />
          <button
            type="submit"
            disabled={loading || !url.trim() || !apiToken.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Scraping...' : 'Fetch'}
          </button>
        </div>
      </div>
    </form>
  );
}
