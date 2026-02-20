/**
 * Extract tweet ID from various Twitter/X URL formats.
 * Supports:
 *   https://twitter.com/user/status/123456
 *   https://x.com/user/status/123456
 *   https://twitter.com/user/status/123456?s=20
 */
export function parseTweetUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['twitter.com', 'x.com', 'www.twitter.com', 'www.x.com'].includes(parsed.hostname)) {
      return null;
    }
    const match = parsed.pathname.match(/\/\w+\/status\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Generate a random color with decent contrast for wheel segments.
 */
export function segmentColor(index: number, total: number): string {
  const hue = (index * 360) / total;
  return `hsl(${hue}, 70%, 55%)`;
}

/**
 * Shuffle an array in place (Fisher-Yates).
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick a cryptographically random index from 0..max-1.
 */
export function secureRandomIndex(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}
