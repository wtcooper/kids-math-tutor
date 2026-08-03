import { isPrime } from "@/lib/math/number";

/**
 * The Number Depths — floor generation, pure and testable.
 *
 * A floor of the mine is four chambers in a row, sealed by doors. Everything that
 * progresses is a produced number:
 *
 *  - MONSTERS carry composite shield-shells. A strike is a typed divisor: it splits the
 *    shell (84 struck with 7 → 12) until the core is prime, which shatters. A number
 *    that doesn't divide just shoves you back — free.
 *  - DOORS eat equal shares ("this door eats 24: feed it 4 equal bags of…?") or hold a
 *    little equation ("x + 5 = 12").
 *  - CHESTS pay out a product ("3 pouches of 8 — how many coins?").
 *
 * Generation guarantees, all tested: every shell is composite (something to strike),
 * every door answer is a whole number ≥ 2, every chest product is honest, and the
 * whole floor is completable.
 */

export interface DoorSpec {
  kind: "share" | "solve";
  /** share: total and bags; solve: a + x = b. */
  total?: number;
  bags?: number;
  a?: number;
  b?: number;
  answer: number;
  text: string;
}

export interface ChestSpec {
  pouches: number;
  each: number;
  answer: number;
  text: string;
}

export interface FloorSpec {
  floor: number;
  /** One shell value per monster, chamber by chamber. */
  shells: number[];
  doors: DoorSpec[];
  chests: ChestSpec[];
}

export interface DepthsSave {
  floor: number;
  coins: number;
  xp: number;
  beaten: number;
}

export const FRESH_SAVE: DepthsSave = { floor: 1, coins: 0, xp: 0, beaten: 0 };

type Rnd = (a: number, b: number) => number;

/** A composite worth striking: at least two prime factors, sized to the floor. */
function makeShell(floor: number, rnd: Rnd): number {
  const hi = Math.min(96, 20 + floor * 14);
  let guard = 0;
  while (guard++ < 200) {
    const n = rnd(8, hi);
    if (!isPrime(n) && n % 1 === 0 && n >= 8) {
      // Needs a proper split: not prime, and not 1.
      return n;
    }
  }
  return 24;
}

function makeDoor(floor: number, rnd: Rnd): DoorSpec {
  if (rnd(0, 1) === 0) {
    const bags = rnd(2, Math.min(6, 2 + floor));
    const each = rnd(2, Math.min(12, 3 + floor * 2));
    const total = bags * each;
    return {
      kind: "share",
      total,
      bags,
      answer: each,
      text: `This door eats ${total}. Feed it ${bags} equal bags of…?`,
    };
  }
  const x = rnd(2, Math.min(15, 4 + floor * 2));
  const a = rnd(2, 9 + floor);
  return {
    kind: "solve",
    a,
    b: a + x,
    answer: x,
    text: `The lock reads  x + ${a} = ${a + x}.  What is x?`,
  };
}

function makeChest(floor: number, rnd: Rnd): ChestSpec {
  const pouches = rnd(2, Math.min(6, 2 + floor));
  const each = rnd(3, Math.min(12, 4 + floor * 2));
  return {
    pouches,
    each,
    answer: pouches * each,
    text: `${pouches} pouches of ${each} coins — how many altogether?`,
  };
}

export function genFloor(floor: number, rnd: Rnd): FloorSpec {
  return {
    floor,
    shells: [makeShell(floor, rnd), makeShell(floor, rnd), makeShell(floor, rnd)],
    doors: [makeDoor(floor, rnd), makeDoor(floor, rnd), makeDoor(floor, rnd)],
    chests: [makeChest(floor, rnd), makeChest(floor, rnd)],
  };
}

/** One strike: does d split the shell? Returns the new shell, or "shatter"/"bounce". */
export function strike(shell: number, d: number): { result: "split" | "shatter" | "bounce"; shell: number } {
  if (!Number.isInteger(d) || d < 2 || d >= shell || shell % d !== 0) {
    return { result: "bounce", shell };
  }
  const next = shell / d;
  if (isPrime(next) || next === 1) return { result: "shatter", shell: next };
  return { result: "split", shell: next };
}

/** Coins a shattered shell pays: its prime core, so bigger cores feel bigger. */
export function bounty(core: number): number {
  return Math.max(3, core);
}
