export const SEARCH_RANK = {
  exact: 0,
  startsWith: 1,
  contains: 2,
} as const;

type RankableResult = {
  id: number;
  updatedAt: Date;
};

export function getSearchRank(value: string, query: string): number | null {
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (normalizedValue === normalizedQuery) return SEARCH_RANK.exact;
  if (normalizedValue.startsWith(normalizedQuery))
    return SEARCH_RANK.startsWith;
  if (normalizedValue.includes(normalizedQuery)) return SEARCH_RANK.contains;
  return null;
}

export function rankSearchResults<T extends RankableResult>(
  results: readonly T[],
  query: string,
  getMatchText: (result: T) => string
): T[] {
  return [...results].sort((left, right) => {
    const leftRank = getSearchRank(getMatchText(left), query);
    const rightRank = getSearchRank(getMatchText(right), query);

    return (
      (leftRank ?? SEARCH_RANK.contains) -
        (rightRank ?? SEARCH_RANK.contains) ||
      right.updatedAt.getTime() - left.updatedAt.getTime() ||
      right.id - left.id
    );
  });
}
