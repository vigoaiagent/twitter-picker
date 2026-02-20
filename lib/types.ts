export type InteractionType = 'replies' | 'retweets' | 'quotes';

export interface Participant {
  userName: string;
  displayName: string;
  profilePicture: string;
  interactionTypes: InteractionType[];
  tweetText?: string;
  followers: number;
  createdAt: string;
  isBlueVerified: boolean;
  hasCustomAvatar: boolean;
}

export interface FilterOptions {
  minAccountAgeDays: number;
  minFollowers: number;
  requireAvatar: boolean;
}

export interface ScrapeRequest {
  tweetUrl: string;
  types: InteractionType[];
  apiToken: string;
}

export interface ScrapeResponse {
  participants: Participant[];
  counts: Record<InteractionType, number>;
}
