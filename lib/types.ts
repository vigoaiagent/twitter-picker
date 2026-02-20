export type InteractionType = 'replies' | 'retweets' | 'likes' | 'quotes';

export interface Participant {
  userName: string;
  displayName: string;
  profilePicture: string;
  interactionTypes: InteractionType[];
  tweetText?: string;
}

export interface ScrapeRequest {
  tweetUrl: string;
  types: InteractionType[];
}

export interface ScrapeResponse {
  participants: Participant[];
  counts: Record<InteractionType, number>;
}

export interface DrawResult {
  winner: Participant;
  timestamp: number;
}
