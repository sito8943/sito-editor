import type { FuzzyMatch } from "../types";

const BOUNDARIES = new Set(["/", "\\", "_", "-", ".", " "]);

const SCORE = {
  MATCH: 1,
  CONSECUTIVE: 5,
  BOUNDARY: 8,
  IN_FILE_NAME: 2,
  FILE_NAME_PREFIX: 20,
  LENGTH_PENALTY: 0.01,
} as const;

const isBoundary = (path: string, index: number): boolean => {
  if (index === 0) return true;
  const previous = path[index - 1];
  if (BOUNDARIES.has(previous)) return true;
  // camelCase hump: "fooBar" → "B"
  const current = path[index];
  return (
    current !== current.toLowerCase() && previous === previous.toLowerCase()
  );
};

/** Greedy left-to-right subsequence match starting at `from`. */
const matchFrom = (
  lowerPath: string,
  query: string,
  from: number,
): number[] | null => {
  const indices: number[] = [];
  let queryIndex = 0;
  for (
    let index = from;
    index < lowerPath.length && queryIndex < query.length;
    index++
  ) {
    if (lowerPath[index] === query[queryIndex]) {
      indices.push(index);
      queryIndex++;
    }
  }
  return queryIndex === query.length ? indices : null;
};

/**
 * Case-insensitive fuzzy match of `query` against a `/`-separated path.
 * Prefers matches inside the file name, at word boundaries and in runs.
 */
export const fuzzyMatch = (query: string, path: string): FuzzyMatch | null => {
  const normalized = query.toLowerCase().replace(/\s+/g, "");
  if (!normalized) return { path, score: 0, indices: [] };

  const lowerPath = path.toLowerCase();
  const nameStart = path.lastIndexOf("/") + 1;
  const indices =
    matchFrom(lowerPath, normalized, nameStart) ??
    matchFrom(lowerPath, normalized, 0);
  if (!indices) return null;

  let score = 0;
  indices.forEach((index, position) => {
    score += SCORE.MATCH;
    if (position > 0 && indices[position - 1] === index - 1) {
      score += SCORE.CONSECUTIVE;
    }
    if (isBoundary(path, index)) score += SCORE.BOUNDARY;
    if (index >= nameStart) score += SCORE.IN_FILE_NAME;
  });
  if (lowerPath.startsWith(normalized, nameStart)) {
    score += SCORE.FILE_NAME_PREFIX;
  }
  score -= path.length * SCORE.LENGTH_PENALTY;

  return { path, score, indices };
};

/** Ranks `paths` against `query`, best first, capped at `limit`. */
export const rankPaths = (
  query: string,
  paths: readonly string[],
  limit: number,
): FuzzyMatch[] => {
  if (!query.trim()) {
    return paths.slice(0, limit).map((path) => ({
      path,
      score: 0,
      indices: [],
    }));
  }

  const matches: FuzzyMatch[] = [];
  for (const path of paths) {
    const match = fuzzyMatch(query, path);
    if (match) matches.push(match);
  }
  matches.sort(
    (left, right) =>
      right.score - left.score || left.path.length - right.path.length,
  );
  return matches.slice(0, limit);
};
