import { ApifyClient } from 'apify-client';
import { InteractionType, Participant } from './types';

const ACTOR_ID = 'scrape.badger~twitter-tweets-scraper';

const MODE_MAP: Record<InteractionType, string> = {
  replies: 'Get Replies',
  retweets: 'Get Retweeters',
  likes: 'Get Favoriters',
  quotes: 'Get Quotes',
};

function getClient(): ApifyClient {
  const token = process.env.APIFY_API_TOKEN;
  if (!token || token === 'your_apify_token_here') {
    throw new Error('APIFY_API_TOKEN is not configured');
  }
  return new ApifyClient({ token });
}

interface ApifyTweetItem {
  author?: {
    userName?: string;
    name?: string;
    profilePicture?: string;
  };
  user_name?: string;
  full_name?: string;
  profile_image_url?: string;
  text?: string;
  full_text?: string;
}

function extractParticipant(
  item: ApifyTweetItem,
  type: InteractionType
): Participant | null {
  const userName =
    item.author?.userName || item.user_name;
  const displayName =
    item.author?.name || item.full_name || userName;
  const profilePicture =
    item.author?.profilePicture || item.profile_image_url || '';

  if (!userName) return null;

  return {
    userName,
    displayName: displayName || userName,
    profilePicture,
    interactionTypes: [type],
    tweetText: item.text || item.full_text,
  };
}

export async function scrapeInteractions(
  tweetId: string,
  types: InteractionType[]
): Promise<{ participants: Participant[]; counts: Record<InteractionType, number> }> {
  const client = getClient();
  const participantMap = new Map<string, Participant>();
  const counts: Record<InteractionType, number> = {
    replies: 0,
    retweets: 0,
    likes: 0,
    quotes: 0,
  };

  // Run each interaction type in parallel
  const results = await Promise.allSettled(
    types.map(async (type) => {
      const run = await client.actor(ACTOR_ID).call(
        {
          mode: MODE_MAP[type],
          tweetId,
          maxItems: 500,
        },
        { waitSecs: 300 }
      );

      const { items } = await client
        .dataset(run.defaultDatasetId)
        .listItems();

      return { type, items: items as unknown as ApifyTweetItem[] };
    })
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Apify actor run failed:', result.reason);
      continue;
    }

    const { type, items } = result.value;
    let typeCount = 0;

    for (const item of items) {
      const p = extractParticipant(item, type);
      if (!p) continue;

      typeCount++;
      const key = p.userName.toLowerCase();
      const existing = participantMap.get(key);
      if (existing) {
        if (!existing.interactionTypes.includes(type)) {
          existing.interactionTypes.push(type);
        }
      } else {
        participantMap.set(key, p);
      }
    }

    counts[type] = typeCount;
  }

  return {
    participants: Array.from(participantMap.values()),
    counts,
  };
}
