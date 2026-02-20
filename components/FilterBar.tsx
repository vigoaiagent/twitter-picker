'use client';

import { InteractionType } from '@/lib/types';

const FILTERS: { type: InteractionType; label: string; icon: string }[] = [
  { type: 'replies', label: 'Replies', icon: '💬' },
  { type: 'retweets', label: 'Retweets', icon: '🔁' },
  { type: 'likes', label: 'Likes', icon: '❤️' },
  { type: 'quotes', label: 'Quotes', icon: '✍️' },
];

interface Props {
  selected: InteractionType[];
  onChange: (types: InteractionType[]) => void;
  counts: Record<InteractionType, number>;
  disabled: boolean;
}

export default function FilterBar({ selected, onChange, counts, disabled }: Props) {
  const toggle = (type: InteractionType) => {
    if (selected.includes(type)) {
      if (selected.length > 1) {
        onChange(selected.filter((t) => t !== type));
      }
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {FILTERS.map(({ type, label, icon }) => {
        const active = selected.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggle(type)}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              active
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } disabled:opacity-50`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            {counts[type] > 0 && (
              <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs">
                {counts[type]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
