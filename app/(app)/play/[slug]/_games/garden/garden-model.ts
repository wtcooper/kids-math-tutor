import { factorsOf, isPrime } from "@/lib/math/number";

/**
 * Number Garden Defense — the rules layer, pure and testable.
 *
 * The maths lives in TOWER RULES: a tower only stops a gnome whose number satisfies its
 * rule (multiples of 6, factors of 48, primes). Planting is therefore classification in
 * reverse — she reads the incoming wave and builds the classifier that covers it.
 *
 * Two invariants, both tested, both load-bearing:
 *  1. Every gnome in every wave is stoppable by at least one tower in the level's
 *     catalog — no wave is unwinnable.
 *  2. From wave 2 on, no SINGLE tower rule covers a whole wave — one plant can never
 *     be the answer, so reading the numbers is always required.
 */

export type TowerKind = "multiples" | "factors" | "primes";

export interface TowerSpec {
  id: string;
  kind: TowerKind;
  a?: number;
  label: string;
  cost: number;
}

export const TOWER_COST = 20;
export const START_COINS = 45;
export const COINS_PER_STOP = 3;
export const WAVES_PER_ROUND = 5;

/** The plantable towers per level. Fixed, so a level is a knowable toolkit. */
export function catalogFor(level: number): TowerSpec[] {
  const mult = (a: number): TowerSpec => ({
    id: `m${a}`,
    kind: "multiples",
    a,
    label: `multiples of ${a}`,
    cost: TOWER_COST,
  });
  const fact = (a: number): TowerSpec => ({
    id: `f${a}`,
    kind: "factors",
    a,
    label: `factors of ${a}`,
    cost: TOWER_COST,
  });
  const primes: TowerSpec = { id: "p", kind: "primes", label: "primes", cost: TOWER_COST };
  if (level <= 1) return [mult(2), mult(3), mult(5), primes];
  if (level === 2) return [mult(3), mult(4), mult(6), primes];
  if (level === 3) return [fact(24), mult(7), mult(6), primes];
  return [fact(48), mult(8), mult(9), primes];
}

export function satisfies(spec: TowerSpec, v: number): boolean {
  if (spec.kind === "primes") return isPrime(v);
  if (spec.kind === "multiples") return v % spec.a! === 0;
  return spec.a! % v === 0 && v > 1;
}

/** Values a spec can stop, kept honest (≥2, ≤99, and never the trivial a×1 for drills). */
function poolFor(spec: TowerSpec): number[] {
  if (spec.kind === "primes") return [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
  if (spec.kind === "multiples") {
    const out: number[] = [];
    for (let k = 2; spec.a! * k <= 99; k++) out.push(spec.a! * k);
    return out;
  }
  return factorsOf(spec.a!).filter((n) => n > 1);
}

/** Primes large enough to be no multiple-tower's business — the primes tower's job. */
const LONER_PRIMES = [53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

export function makeWave(
  level: number,
  wave: number,
  rnd: (a: number, b: number) => number,
): number[] {
  const catalog = catalogFor(level);
  const count = 5 + wave * 2;
  const values: number[] = [];

  // Backbone: cycle the catalog so several rules are always needed.
  for (let i = 0; i < count - 2; i++) {
    const spec = catalog[i % catalog.length];
    const pool = poolFor(spec);
    values.push(pool[rnd(0, pool.length - 1)]);
  }

  // The two spoilers, from wave 2 on: a loner prime (only the primes tower stops it)
  // and a composite multiple (the primes tower cannot). Together they guarantee no
  // single rule covers the wave.
  if (wave >= 2) {
    values.push(LONER_PRIMES[rnd(0, LONER_PRIMES.length - 1)]);
    const multSpecs = catalog.filter((s) => s.kind === "multiples");
    const spec = multSpecs[rnd(0, multSpecs.length - 1)];
    const composites = poolFor(spec).filter((v) => !isPrime(v));
    values.push(composites[rnd(0, composites.length - 1)]);
  } else {
    const spec = catalog[rnd(0, catalog.length - 1)];
    const pool = poolFor(spec);
    values.push(pool[rnd(0, pool.length - 1)], pool[rnd(0, pool.length - 1)]);
  }

  // Shuffle so the spoilers don't always bring up the rear.
  for (let i = values.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

/** Which catalog towers stop v — the coverage check the tests lean on. */
export function stoppers(level: number, v: number): TowerSpec[] {
  return catalogFor(level).filter((s) => satisfies(s, v));
}
