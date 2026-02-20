import { InteractionType, Participant, ScrapeResponse } from './types';

const ACTOR_ID = 'scrape.badger~twitter-tweets-scraper';
const BASE_URL = 'https://api.apify.com/v2';

const MODE_MAP: Record<InteractionType, string> = {
  replies: 'Get Replies',
  retweets: 'Get Retweeters',
  likes: 'Get Favoriters',
  quotes: 'Get Quotes',
};

const USER_MODES: InteractionType[] = ['retweets', 'likes'];

interface ApifyItem {
  status?: string;
  username?: string;
  user_name?: string;
  name?: string;
  profile_image_url?: string;
  text?: string;
  full_text?: string;
}

function extractParticipant(item: ApifyItem, type: InteractionType): Participant | null {
  if (item.status === 'empty') return null;

  const userName = item.username;
  if (!userName) return null;

  const isUserMode = USER_MODES.includes(type);
  const displayName = isUserMode ? item.name || userName : item.user_name || userName;
  const profilePicture = item.profile_image_url || '';

  return {
    userName,
    displayName,
    profilePicture,
    interactionTypes: [type],
    tweetText: item.text || item.full_text,
  };
}

async function runActorAndGetItems(
  apiToken: string,
  tweetId: string,
  type: InteractionType
): Promise<{ type: InteractionType; items: ApifyItem[] }> {
  const url = `${BASE_URL}/acts/${ACTOR_ID}/run-sync-get-dataset-items`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      mode: MODE_MAP[type],
      id: tweetId,
      maxItems: 500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify ${type} failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const items: ApifyItem[] = await res.json();
  return { type, items };
}

export async function scrapeFromBrowser(
  tweetId: string,
  types: InteractionType[],
  apiToken: string,
  onProgress?: (type: InteractionType, count: number) => void
): Promise<ScrapeResponse> {
  const participantMap = new Map<string, Participant>();
  const counts: Record<InteractionType, number> = {
    replies: 0,
    retweets: 0,
    likes: 0,
    quotes: 0,
  };

  const results = await Promise.allSettled(
    types.map(async (type) => {
      const result = await runActorAndGetItems(apiToken, tweetId, type);
      let typeCount = 0;

      for (const item of result.items) {
        const p = extractParticipant(item, type);
        if (!p) continue;

        typeCount++;
        const key = p.userName.toLowerCase();
        const existing = participantMap.get(key);
        if (existing) {
          if (!existing.interactionTypes.includes(type)) {
            existing.interactionTypes.push(type);
          }
          if (!existing.profilePicture && p.profilePicture) {
            existing.profilePicture = p.profilePicture;
          }
        } else {
          participantMap.set(key, p);
        }
      }

      counts[type] = typeCount;
      onProgress?.(type, typeCount);
      return result;
    })
  );

  const errors: string[] = [];
  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(String(result.reason));
    }
  }

  if (errors.length > 0 && participantMap.size === 0) {
    throw new Error(errors.join('; '));
  }

  return {
    participants: Array.from(participantMap.values()),
    counts,
  };
}
