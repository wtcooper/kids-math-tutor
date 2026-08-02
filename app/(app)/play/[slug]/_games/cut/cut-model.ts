/**
 * Cut — equivalent fractions, by slicing rather than by rule.
 *
 * A gap in a wall is some fraction of a full brick. You have a brick and a knife: each
 * cut doubles (or triples) how many pieces the brick is in. Fill the gap exactly using
 * pieces of one size.
 *
 * The point: 3/4 and 6/8 are the *same width of wall*. She discovers that by cutting a
 * brick into eighths and finding six of them reach exactly as far as three quarters did.
 * Simplifying is the same discovery run backwards — the fewest pieces that fill the gap.
 */

export interface Gap {
  /** The gap, as a fraction of one brick. Always in lowest terms. */
  n: number;
  d: number;
}

export interface CutProblem {
  gap: Gap;
  /** Denominators reachable by cutting, in order. The first is one whole brick. */
  reachable: number[];
}

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/**
 * The denominators you can reach from 1 by repeatedly halving or thirding.
 *
 * The limit has to leave room *above* the gap's own denominator, not just reach it. At 24
 * a 5/16 gap had exactly one workable slicing — sixteenths — so there was no equivalence
 * to find, which is the entire game.
 */
export function reachableDenoms(target: number, limit = 48): number[] {
  const seen = new Set<number>([1]);
  const queue = [1];
  while (queue.length) {
    const d = queue.shift()!;
    for (const factor of [2, 3]) {
      const next = d * factor;
      if (next <= limit && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  // The target has to be reachable or the puzzle is impossible.
  if (!seen.has(target)) seen.add(target);
  return [...seen].sort((a, b) => a - b);
}

const POOLS: Record<number, Gap[]> = {
  1: [
    { n: 1, d: 2 },
    { n: 1, d: 3 },
    { n: 2, d: 3 },
    { n: 1, d: 4 },
    { n: 3, d: 4 },
  ],
  2: [
    { n: 3, d: 4 },
    { n: 2, d: 3 },
    { n: 5, d: 6 },
    { n: 1, d: 6 },
    { n: 5, d: 8 },
  ],
  3: [
    { n: 5, d: 6 },
    { n: 7, d: 8 },
    { n: 3, d: 8 },
    { n: 5, d: 12 },
    { n: 7, d: 12 },
  ],
  4: [
    { n: 7, d: 12 },
    { n: 11, d: 12 },
    { n: 5, d: 16 },
    { n: 7, d: 18 },
    { n: 13, d: 18 },
  ],
};

export function genCut(level: number, rnd: (a: number, b: number) => number): CutProblem {
  const pool = POOLS[Math.min(4, Math.max(1, level))];
  const gap = pool[rnd(0, pool.length - 1)];
  return { gap, reachable: reachableDenoms(gap.d) };
}

/**
 * Does `count` pieces of size 1/`denom` fill the gap exactly?
 * Exact integer arithmetic — never compare floats here, 1/3 + 1/3 + 1/3 is not 1.
 */
export function fillsExactly(gap: Gap, denom: number, count: number): boolean {
  return count * gap.d === gap.n * denom;
}

/** How many pieces of size 1/denom the gap needs, or null if they do not fit evenly. */
export function piecesNeeded(gap: Gap, denom: number): number | null {
  const exact = (gap.n * denom) / gap.d;
  return Number.isInteger(exact) ? exact : null;
}

/** Every denominator that can tile this gap exactly, smallest first. */
export function workableDenoms(gap: Gap, reachable: number[]): number[] {
  return reachable.filter((d) => piecesNeeded(gap, d) !== null);
}

export function simplify(n: number, d: number): [number, number] {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}
