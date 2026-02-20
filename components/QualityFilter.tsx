'use client';

import { FilterOptions } from '@/lib/types';

interface Props {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  disabled: boolean;
}

export default function QualityFilter({ filters, onChange, disabled }: Props) {
  return (
    <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Participant Filters</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="min-age" className="block text-xs text-gray-400 mb-1">
            Min account age (days)
          </label>
          <input
            id="min-age"
            type="number"
            min={0}
            value={filters.minAccountAgeDays}
            onChange={(e) =>
              onChange({ ...filters, minAccountAgeDays: Math.max(0, parseInt(e.target.value) || 0) })
            }
            className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="min-followers" className="block text-xs text-gray-400 mb-1">
            Min followers
          </label>
          <input
            id="min-followers"
            type="number"
            min={0}
            value={filters.minFollowers}
            onChange={(e) =>
              onChange({ ...filters, minFollowers: Math.max(0, parseInt(e.target.value) || 0) })
            }
            className="w-full rounded border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            disabled={disabled}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.requireAvatar}
              onChange={(e) =>
                onChange({ ...filters, requireAvatar: e.target.checked })
              }
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              disabled={disabled}
            />
            <span className="text-sm text-gray-300">Require avatar</span>
          </label>
        </div>
      </div>
    </div>
  );
}
