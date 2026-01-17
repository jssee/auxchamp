/**
 * Returns ordinal suffix for rank (1st, 2nd, 3rd, 4th...)
 * Only handles positive integers correctly.
 */
export function getRankLabel(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

/**
 * Assigns ranks with ties to a pre-sorted array.
 * Items with equal scores get the same rank.
 *
 * @param items - Array already sorted by score descending
 * @param getScore - Function to extract the score from each item
 */
export function assignRanks<T>(
  items: T[],
  getScore: (item: T) => number,
): (T & { rank: number })[] {
  let currentRank = 1;
  let previousScore = -Infinity;

  return items.map((item, index) => {
    const score = getScore(item);
    if (score !== previousScore) {
      currentRank = index + 1;
      previousScore = score;
    }
    return { ...item, rank: currentRank };
  });
}
