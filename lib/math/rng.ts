/**
 * Seeded randomness.
 *
 * The original tutor funnels essentially all randomness through two helpers (`rnd` and
 * `pick`) plus ten inline `Math.random() < k` coin flips, every one of them inside a
 * `gen(level)`. Nothing in `build()` or `picture()` is random. That is what makes the
 * port checkable: seed this, seed the oracle's `Math.random` identically, and the two
 * implementations must produce the same problems.
 *
 * Passing an Rng explicitly rather than reaching for a module global also means a game
 * can replay a specific problem later — worth having for "show me that one again".
 */

export interface Rng {
  /** Inclusive integer in [a, b]. */
  int(a: number, b: number): number;
  /** Uniform choice. */
  pick<T>(items: readonly T[]): T;
  /** True with probability p. Mirrors the original's `Math.random() < p`. */
  coin(p?: number): boolean;
  /** Raw float in [0, 1). Present so the oracle and the port can share a stream. */
  next(): number;
}

/**
 * mulberry32 — small, fast, and good enough for problem generation. Chosen over
 * Math.random because it is reproducible from a seed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(source: () => number): Rng {
  return {
    next: source,
    // Deliberately identical arithmetic to the original's
    // `Math.floor(Math.random()*(b-a+1))+a` — any deviation changes the problem stream
    // and the differential test would flag it as a port error rather than a style change.
    int: (a, b) => Math.floor(source() * (b - a + 1)) + a,
    pick: (items) => items[Math.floor(source() * items.length)],
    coin: (p = 0.5) => source() < p,
  };
}

export function seeded(seed: number): Rng {
  return makeRng(mulberry32(seed));
}

/** For real gameplay, where reproducibility does not matter. */
export const systemRng: Rng = makeRng(Math.random);
