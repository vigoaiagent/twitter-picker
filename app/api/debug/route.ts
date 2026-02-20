import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { parseTweetUrl } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { tweetUrl, apiToken, mode, inputOverride } = await req.json();

    const tweetId = parseTweetUrl(tweetUrl);
    if (!tweetId) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const client = new ApifyClient({ token: apiToken });

    // Try the provided input or default
    const input = inputOverride || {
      mode: mode || 'Get Replies',
      tweetId,
      maxItems: 5,
    };

    const run = await client.actor('scrape.badger~twitter-tweets-scraper').call(
      input,
      { waitSecs: 300 }
    );

    const { items } = await client
      .dataset(run.defaultDatasetId)
      .listItems();

    // Also get run log for debugging
    const runDetail = await client.run(run.id).get();

    return NextResponse.json({
      runStatus: run.status,
      runStatusMessage: runDetail?.statusMessage,
      inputUsed: input,
      itemCount: items.length,
      sampleItems: items.slice(0, 3),
      allKeys: items.length > 0 ? Object.keys(items[0]) : [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
