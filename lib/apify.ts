import { ApifyClient } from 'apify-client';
import { InteractionType, Participant } from './types';

const ACTOR_ID = 'scrape.badger~twitter-tweets-scraper';

const MODE_MAP: Record<InteractionType, string> = {
  replies: 'Get Replies',
  retweets: 'Get Retweeters',
  likes: 'Get Favoriters',
  quotes: 'Get Quotes',
};

function getClient(token: string): ApifyClient {
  if (!token) {
    throw new Error('Apify API Token is required');
  }
  return new ApifyClient({ token });
}

// Replies & Quotes return tweet objects
interface TweetItem {
  username?: string;
  user_name?: string;
  text?: string;
  full_text?: string;
}

// Retweeters & Favoriters return user objects
interface UserItem {
  username?: string;
  name?: string;
  profile_image_url?: string;
}

type ApifyItem = TweetItem & UserItem;

// Replies/Quotes are tweet-shaped; Retweeters/Favoriters are user-shaped
const USER_MODES: InteractionType[] = ['retweets', 'likes'];

function extractParticipant(
  item: ApifyItem & { status?: string },
  type: InteractionType
): Participant | null {
  // Skip Apify placeholder items like {"status":"empty","reason":"no_results"}
  if (item.status === 'empty') return null;

  const isUserMode = USER_MODES.includes(type);

  const userName = item.username;
  if (!userName) return null;

  const displayName = isUserMode
    ? item.name || userName
    : item.user_name || userName;

  const profilePicture = item.profile_image_url || '';

  return {
    userName,
    displayName,
    profilePicture,
    interactionTypes: [type],
    tweetText: item.text || item.full_text,
  };
}

export async function scrapeInteractions(
  tweetId: string,
  types: InteractionType[],
  apiToken: string
): Promise<{ participants: Participant[]; counts: Record<InteractionType, number> }> {
  const client = getClient(apiToken);
  const participantMap = new Map<string, Participant>();
  const counts: Record<InteractionType, number> = {
    replies: 0,
    retweets: 0,
    likes: 0,
    quotes: 0,
  };

  const results = await Promise.allSettled(
    types.map(async (type) => {
      const run = await client.actor(ACTOR_ID).call(
        {
          mode: MODE_MAP[type],
          id: tweetId,
          maxItems: 500,
        },
        { waitSecs: 300 }
      );

      if (run.status !== 'SUCCEEDED') {
        throw new Error(`Actor run ${run.status} for ${type}: ${run.statusMessage || ''}`);
      }

      const { items } = await client
        .dataset(run.defaultDatasetId)
        .listItems();

      return { type, items: items as unknown as ApifyItem[] };
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
        // Upgrade profile picture if missing
        if (!existing.profilePicture && p.profilePicture) {
          existing.profilePicture = p.profilePicture;
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
