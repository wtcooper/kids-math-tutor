/**
 * Split the Beam — common denominators as a physical necessity.
 *
 * One beam of light comes in. It passes through a splitter that cuts it into `d` equal
 * strands, and you route whole strands to each machine. A machine wants 1/2 of the beam;
 * another wants 1/3. Neither can be paid in halves *and* thirds — the splitter has one
 * setting, so it has to cut into sixths, and then the machines want 3 strands and 2.
 *
 * That is the entire idea behind a common denominator, and here it is a constraint of the
 * apparatus rather than a rule to remember. Refraction (UW Center for Game Science) is
 * the prior art; this is the same lever.
 */

export interface Demand {
  n: number;
  d: number;
  name: string;
}

export interface BeamProblem {
  demands: Demand[];
  /** Splitter settings she can choose between. Always includes the LCD. */
  settings: number[];
}

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}
export function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

export function lcd(demands: Demand[]): number {
  return demands.reduce((acc, x) => lcm(acc, x.d), 1);
}

/** Strands each machine needs at this splitter setting, or null if it cannot be paid. */
export function strandsFor(demand: Demand, setting: number): number | null {
  const exact = (demand.n * setting) / demand.d;
  return Number.isInteger(exact) ? exact : null;
}

/** A setting works only if every machine can be paid in whole strands. */
export function settingWorks(demands: Demand[], setting: number): boolean {
  return demands.every((x) => strandsFor(x, setting) !== null);
}

/** Total of the demands, as a fraction in lowest terms. */
export function totalDemand(demands: Demand[]): { n: number; d: number } {
  const D = lcd(demands);
  const n = demands.reduce((acc, x) => acc + (x.n * D) / x.d, 0);
  const g = gcd(n, D) || 1;
  return { n: n / g, d: D / g };
}

const MACHINE_NAMES = ["the mill", "the lamp", "the pump", "the kiln"];

const POOLS: Record<number, [number, number][][]> = {
  // Each entry is a set of [n, d] demands that together use at most the whole beam.
  1: [
    [
      [1, 2],
      [1, 4],
    ],
    [
      [1, 3],
      [1, 3],
    ],
    [
      [1, 2],
      [1, 3],
    ],
  ],
  2: [
    [
      [1, 2],
      [1, 3],
    ],
    [
      [2, 3],
      [1, 4],
    ],
    [
      [3, 4],
      [1, 6],
    ],
    [
      [1, 4],
      [2, 3],
    ],
  ],
  3: [
    [
      [1, 2],
      [1, 3],
      [1, 12],
    ],
    [
      [2, 5],
      [1, 2],
    ],
    [
      [3, 8],
      [1, 3],
    ],
    [
      [5, 6],
      [1, 8],
    ],
  ],
  4: [
    [
      [1, 3],
      [1, 4],
      [1, 5],
    ],
    [
      [3, 10],
      [2, 5],
      [1, 4],
    ],
    [
      [5, 12],
      [1, 8],
      [1, 3],
    ],
  ],
};

export function genBeam(level: number, rnd: (a: number, b: number) => number): BeamProblem {
  const pool = POOLS[Math.min(4, Math.max(1, level))];
  const chosen = pool[rnd(0, pool.length - 1)];
  const demands: Demand[] = chosen.map(([n, d], i) => ({ n, d, name: MACHINE_NAMES[i] }));

  const need = lcd(demands);
  // Offer the answer among plausible near misses — each machine's own denominator, which
  // is exactly the wrong-but-tempting choice, plus a multiple or two of the real one.
  const options = new Set<number>([need, need * 2]);
  for (const dm of demands) options.add(dm.d);
  return { demands, settings: [...options].sort((a, b) => a - b) };
}
