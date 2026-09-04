export function describeDistance(distance: number): string {
  if (distance < 1) return 'same colors';
  if (distance < 2.3) return 'colors the eye cannot tell apart';
  if (distance < 10) return 'close colors';
  return 'different colors';
}

export const formatDistance = (distance: number) =>
  Number.isFinite(distance) ? distance.toFixed(1) : 'n/a';

export const formatSimilarity = (similarity: number) =>
  `${Math.round(Math.max(0, Math.min(1, similarity)) * 100)}%`;

export const formatCount = (n: number) => n.toLocaleString('en-US');
