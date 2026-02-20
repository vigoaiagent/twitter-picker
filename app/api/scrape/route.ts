import { NextRequest, NextResponse } from 'next/server';
import { scrapeInteractions } from '@/lib/apify';
import { parseTweetUrl } from '@/lib/utils';
import { InteractionType, ScrapeRequest } from '@/lib/types';

const VALID_TYPES: InteractionType[] = ['replies', 'retweets', 'likes', 'quotes'];

export async function POST(req: NextRequest) {
  try {
    const body: ScrapeRequest = await req.json();
    const { tweetUrl, types } = body;

    if (!tweetUrl || typeof tweetUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing tweetUrl' },
        { status: 400 }
      );
    }

    const tweetId = parseTweetUrl(tweetUrl);
    if (!tweetId) {
      return NextResponse.json(
        { error: 'Invalid Twitter/X URL. Expected format: https://x.com/user/status/123456' },
        { status: 400 }
      );
    }

    const selectedTypes = (types || []).filter((t): t is InteractionType =>
      VALID_TYPES.includes(t as InteractionType)
    );
    if (selectedTypes.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one interaction type' },
        { status: 400 }
      );
    }

    const result = await scrapeInteractions(tweetId, selectedTypes);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Scrape error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
