import { InteractionType, Participant, ScrapeResponse } from './types';

const BASE_URL = 'https://api.apify.com/v2';

const REPLIES_ACTOR = 'apidojo~tweet-scraper';
const RETWEETERS_ACTOR = 'scrape.badger~twitter-tweets-scraper';
const QUOTES_ACTOR = 'apidojo~tweet-scraper';

const POLL_INTERVAL = 3000;
const MAX_WAIT = 300000; // 5 minutes

function isCustomAvatar(url: string): boolean {
  if (!url) return false;
  return !url.includes('default_profile');
}

// ---- Async run: start actor → poll until done → fetch all items ----

async function startActorRun(
  apiToken: string,
  actorId: string,
  input: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${BASE_URL}/acts/${actorId}/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Start run failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.data.id;
}

async function waitForRun(
  apiToken: string,
  runId: string,
  onStatus?: (status: string) => void
): Promise<{ status: string; datasetId: string }> {
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT) {
    const res = await fetch(`${BASE_URL}/actor-runs/${runId}`, {
      headers: { 'Authorization': `Bearer ${apiToken}` },
    });

    if (!res.ok) throw new Error(`Poll failed (${res.status})`);

    const { data } = await res.json();
    const status = data.status as string;

    onStatus?.(status);

    if (status === 'SUCCEEDED') {
      return { status, datasetId: data.defaultDatasetId };
    }
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor run ${status}: ${data.statusMessage || ''}`);
    }

    // RUNNING or READY — keep polling
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error('Actor run timed out after 5 minutes');
}

async function getDatasetItems(
  apiToken: string,
  datasetId: string
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const res = await fetch(
      `${BASE_URL}/datasets/${datasetId}/items?limit=${limit}&offset=${offset}`,
      { headers: { 'Authorization': `Bearer ${apiToken}` } }
    );

    if (!res.ok) throw new Error(`Dataset fetch failed (${res.status})`);

    const batch: Record<string, unknown>[] = await res.json();
    if (batch.length === 0) break;

    items.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return items;
}

async function runActorAndGetItems(
  apiToken: string,
  actorId: string,
  input: Record<string, unknown>,
  onStatus?: (status: string) => void
): Promise<Record<string, unknown>[]> {
  const runId = await startActorRun(apiToken, actorId, input);
  const { datasetId } = await waitForRun(apiToken, runId, onStatus);
  return getDatasetItems(apiToken, datasetId);
}

// ---- Parsers ----

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

// ---- Fetchers per type ----

async function fetchReplies(
  apiToken: string,
  tweetId: string,
  onStatus?: (s: string) => void
): Promise<Participant[]> {
  const items = await runActorAndGetItems(apiToken, REPLIES_ACTOR, {
    conversationIds: [tweetId],
    maxItems: 1000,
  }, onStatus);

  const participants: Participant[] = [];
  for (const item of items) {
    if (!item.inReplyToId) continue;
    const p = parseParticipantFromApidojo(item, 'replies');
    if (p) participants.push(p);
  }
  return participants;
}

async function fetchRetweeters(
  apiToken: string,
  tweetId: string,
  onStatus?: (s: string) => void
): Promise<Participant[]> {
  const items = await runActorAndGetItems(apiToken, RETWEETERS_ACTOR, {
    mode: 'Get Retweeters',
    id: tweetId,
    maxItems: 1000,
  }, onStatus);

  const participants: Participant[] = [];
  for (const item of items) {
    const p = parseParticipantFromBadger(item, 'retweets');
    if (p) participants.push(p);
  }
  return participants;
}

async function fetchQuotes(
  apiToken: string,
  tweetId: string,
  onStatus?: (s: string) => void
): Promise<Participant[]> {
  const items = await runActorAndGetItems(apiToken, QUOTES_ACTOR, {
    searchTerms: [`quoted_tweet_id:${tweetId}`],
    maxItems: 1000,
  }, onStatus);

  const participants: Participant[] = [];
  for (const item of items) {
    const p = parseParticipantFromApidojo(item, 'quotes');
    if (p) participants.push(p);
  }
  return participants;
}

// ---- Main entry ----

export async function scrapeFromBrowser(
  tweetId: string,
  types: InteractionType[],
  apiToken: string,
  onProgress?: (msg: string) => void
): Promise<ScrapeResponse> {
  const participantMap = new Map<string, Participant>();
  const counts: Record<InteractionType, number> = {
    replies: 0,
    retweets: 0,
    quotes: 0,
  };

  const fetchers: { type: InteractionType; fn: () => Promise<Participant[]> }[] = [];

  if (types.includes('replies')) {
    fetchers.push({
      type: 'replies',
      fn: () => fetchReplies(apiToken, tweetId, (s) => onProgress?.(`Replies: ${s}`)),
    });
  }
  if (types.includes('retweets')) {
    fetchers.push({
      type: 'retweets',
      fn: () => fetchRetweeters(apiToken, tweetId, (s) => onProgress?.(`Retweets: ${s}`)),
    });
  }
  if (types.includes('quotes')) {
    fetchers.push({
      type: 'quotes',
      fn: () => fetchQuotes(apiToken, tweetId, (s) => onProgress?.(`Quotes: ${s}`)),
    });
  }

  const results = await Promise.allSettled(
    fetchers.map(async ({ type, fn }) => {
      const participants = await fn();
      counts[type] = participants.length;
      onProgress?.(`${type}: ${participants.length} found`);
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
