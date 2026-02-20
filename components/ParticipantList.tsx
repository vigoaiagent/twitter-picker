'use client';

import { Participant, InteractionType } from '@/lib/types';

interface Props {
  participants: Participant[];
  activeFilters: InteractionType[];
}

const TYPE_ICONS: Record<InteractionType, string> = {
  replies: '💬',
  retweets: '🔁',
  likes: '❤️',
  quotes: '✍️',
};

export default function ParticipantList({ participants, activeFilters }: Props) {
  const filtered = participants.filter((p) =>
    p.interactionTypes.some((t) => activeFilters.includes(t))
  );

  if (filtered.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No participants found for the selected filters.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-white mb-3">
        Participants ({filtered.length})
      </h3>
      <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800/50">
        {filtered.map((p) => (
          <div
            key={p.userName}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-700/50 last:border-b-0 hover:bg-gray-700/30"
          >
            {p.profilePicture ? (
              <img
                src={p.profilePicture}
                alt={p.displayName}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white">
                {p.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {p.displayName}
              </div>
              <div className="text-xs text-gray-400">@{p.userName}</div>
            </div>
            <div className="flex gap-1">
              {p.interactionTypes.map((t) => (
                <span key={t} title={t} className="text-sm">
                  {TYPE_ICONS[t]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
