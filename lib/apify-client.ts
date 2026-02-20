import { InteractionType, Participant, ScrapeResponse } from './types';

const BASE_URL = 'https://api.apify.com/v2';

// Replies: apidojo/tweet-scraper with conversationIds (rich author data)
const REPLIES_ACTOR = 'apidojo~tweet-scraper';
// Retweets: scrape.badger (returns user objects with profile data)
const RETWEETERS_ACTOR = 'scrape.badger~twitter-tweets-scraper';
// Quotes: apidojo/tweet-scraper with search
const QUOTES_ACTOR = 'apidojo~tweet-scraper';

function isCustomAvatar(url: string): boolean {
  if (!url) return false;
  return !url.includes('default_profile');
}

function parseParticipantFromApidojo(item: Record<string, unknown>, type: InteractionType): Participant | null {
  const author = item.author as Record<string, unknown> | undefined;
  if (!author) return null;

  const userName = author.userName as string;
  if (!userName) return null;

  const profilePicture = (author.profilePicture as string) || '';

  return {
    userName,
    displayName: (author.name as string) || userName,
    profilePicture,
    interactionTypes: [type],
    tweetText: (item.fullText as string) || (item.text as string),
    followers: (author.followers as number) || 0,
    createdAt: (author.createdAt as string) || '',
    isBlueVerified: (author.isBlueVerified as boolean) || false,
    hasCustomAvatar: isCustomAvatar(profilePicture),
  };
}

function parseParticipantFromBadger(item: Record<string, unknown>, type: InteractionType): Participant | null {
  if (item.status === 'empty') return null;

  const userName = item.username as string;
  if (!userName) return null;

  const profilePicture = (item.profile_image_url as string) || '';

  return {
    userName,
    displayName: (item.name as string) || userName,
    profilePicture,
    interactionTypes: [type],
    followers: (item.followers_count as number) || 0,
    createdAt: (item.created_at as string) || '',
    isBlueVerified: (item.is_blue_verified as boolean) || false,
    hasCustomAvatar: isCustomAvatar(profilePicture),
  };
}

async function fetchReplies(apiToken: string, tweetId: string): Promise<Participant[]> {
  const url = `${BASE_URL}/acts/${REPLIES_ACTOR}/run-sync-get-dataset-items`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      conversationIds: [tweetId],
      maxItems: 500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replies failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const items: Record<string, unknown>[] = await res.json();
  const participants: Participant[] = [];

  for (const item of items) {
    // Skip the original tweet itself
    const author = item.author as Record<string, unknown> | undefined;
    if (author?.userName === undefined) continue;

    // Skip if it's the original tweet (not a reply)
    if (!item.inReplyToId) continue;

    const p = parseParticipantFromApidojo(item, 'replies');
    if (p) participants.push(p);
  }

  return participants;
}

async function fetchRetweeters(apiToken: string, tweetId: string): Promise<Participant[]> {
  const url = `${BASE_URL}/acts/${RETWEETERS_ACTOR}/run-sync-get-dataset-items`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      mode: 'Get Retweeters',
      id: tweetId,
      maxItems: 500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Retweeters failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const items: Record<string, unknown>[] = await res.json();
  const participants: Participant[] = [];

  for (const item of items) {
    const p = parseParticipantFromBadger(item, 'retweets');
    if (p) participants.push(p);
  }

  return participants;
}

async function fetchQuotes(apiToken: string, tweetId: string): Promise<Participant[]> {
  const url = `${BASE_URL}/acts/${QUOTES_ACTOR}/run-sync-get-dataset-items`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      searchTerms: [`quoted_tweet_id:${tweetId}`],
      maxItems: 500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Quotes failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const items: Record<string, unknown>[] = await res.json();
  const participants: Participant[] = [];

  for (const item of items) {
    const p = parseParticipantFromApidojo(item, 'quotes');
    if (p) participants.push(p);
  }

  return participants;
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
    quotes: 0,
  };

  const fetchers: { type: InteractionType; fn: () => Promise<Participant[]> }[] = [];

  if (types.includes('replies')) {
    fetchers.push({ type: 'replies', fn: () => fetchReplies(apiToken, tweetId) });
  }
  if (types.includes('retweets')) {
    fetchers.push({ type: 'retweets', fn: () => fetchRetweeters(apiToken, tweetId) });
  }
  if (types.includes('quotes')) {
    fetchers.push({ type: 'quotes', fn: () => fetchQuotes(apiToken, tweetId) });
  }

  const results = await Promise.allSettled(
    fetchers.map(async ({ type, fn }) => {
      const participants = await fn();
      counts[type] = participants.length;
      onProgress?.(type, participants.length);
      return { type, participants };
    })
  );

  const errors: string[] = [];
  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(String(result.reason));
      continue;
    }

    const { participants } = result.value;
    for (const p of participants) {
      const key = p.userName.toLowerCase();
      const existing = participantMap.get(key);
      if (existing) {
        for (const t of p.interactionTypes) {
          if (!existing.interactionTypes.includes(t)) {
            existing.interactionTypes.push(t);
          }
        }
        if (!existing.profilePicture && p.profilePicture) {
          existing.profilePicture = p.profilePicture;
        }
        if (!existing.followers && p.followers) {
          existing.followers = p.followers;
        }
      } else {
        participantMap.set(key, p);
      }
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
