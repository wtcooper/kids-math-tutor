/**
 * Invariants a game must hold before anyone plays it.
 *
 * These exist because the first play-test turned up a Munchers round reading "Eat the
 * factors of 61" — a prime, so the board had nothing on it to eat and the round could not
 * be won. That is exactly the class of bug that is invisible until it lands in front of a
 * kid, and exactly the class a cheap property test catches.
 */
import { describe, expect, it } from "vitest";
import {
  answersFor,
  makeRule,
  MIN_TARGETS,
} from "../app/(app)/play/[slug]/_games/munchers/GridScene";
import { mulberry32 } from "@/lib/math/rng";
import {
  primeFactorCount,
  splitPair,
  startingNumbers,
} from "../app/(app)/play/[slug]/_games/split/SplitScene";
import {
  bestPerimeter,
  COLS,
  enclosedCells,
  makeCommission,
  ROWS,
  stripPerimeter,
} from "../app/(app)/play/[slug]/_games/enclosure/EnclosureScene";

const LEVELS = [1, 2, 3, 4];
const SEEDS = 300;

describe("Munchers rules", () => {
  it("never deals a board with too few numbers to eat", () => {
    const bad: string[] = [];
    for (const level of LEVELS) {
      for (let s = 0; s < SEEDS; s++) {
        const rand = mulberry32(4000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const rule = makeRule(level, rnd);
        const answers = answersFor(rule);
        if (answers.length < MIN_TARGETS) {
          bad.push(`L${level} seed ${s}: "${rule.label}" → only ${answers.length}`);
        }
      }
    }
    expect(bad.slice(0, 5), `unwinnable boards: ${bad.length}`).toEqual([]);
  });

  it("every number in a rule's pool really does satisfy that rule", () => {
    for (const level of LEVELS) {
      for (let s = 0; s < SEEDS; s++) {
        const rand = mulberry32(5000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const rule = makeRule(level, rnd);
        for (const n of answersFor(rule)) {
          expect(rule.satisfies(n), `${rule.label}: ${n} is in the pool but fails`).toBe(
            true,
          );
        }
      }
    }
  });

  it("the GCF round always has a greatest common factor worth finding", () => {
    for (let s = 0; s < SEEDS; s++) {
      const rand = mulberry32(6000 + s);
      const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
      const rule = makeRule(4, rnd);
      if (rule.kind !== "common") continue;
      const answers = answersFor(rule);
      // The last one she eats is the GCF, so it has to be on the board.
      const largest = Math.max(...answers);
      expect(rule.a % largest, `${rule.label}`).toBe(0);
      expect(rule.b! % largest, `${rule.label}`).toBe(0);
      expect(largest).toBeGreaterThan(1);
    }
  });
});

describe("Split", () => {
  it("every starting rock really can be broken all the way down to primes", () => {
    for (const level of LEVELS) {
      for (let s = 0; s < 100; s++) {
        const rand = mulberry32(7000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const nums = startingNumbers(level, rnd);
        expect(new Set(nums).size, `L${level}: repeated rocks ${nums}`).toBe(nums.length);
        for (const n of nums) {
          // Composite, or there is nothing to shoot.
          expect(splitPair(n), `L${level}: ${n} cannot be split at all`).not.toBeNull();
          // Worth a tree rather than one snip.
          expect(primeFactorCount(n), `L${level}: ${n}`).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("splitting repeatedly always terminates in primes whose product is the original", () => {
    for (let n = 4; n <= 200; n++) {
      let pile = [n];
      let guard = 0;
      while (pile.some((v) => splitPair(v)) && guard++ < 100) {
        const next: number[] = [];
        for (const v of pile) {
          const pair = splitPair(v);
          if (pair) next.push(pair[0], pair[1]);
          else next.push(v);
        }
        pile = next;
      }
      expect(pile.every((v) => splitPair(v) === null), `${n} left a composite`).toBe(true);
      expect(pile.reduce((a, b) => a * b, 1), `${n} lost value`).toBe(n);
      expect(pile.length, `${n}`).toBe(primeFactorCount(n));
    }
  });
});

describe("Enclosure", () => {
  /** The lattice path around a w×h rectangle whose top-left cell is (c0, r0). */
  function rect(c0: number, r0: number, w: number, h: number) {
    const pts: { c: number; r: number }[] = [];
    for (let c = c0; c < c0 + w; c++) pts.push({ c, r: r0 });
    for (let r = r0; r < r0 + h; r++) pts.push({ c: c0 + w, r });
    for (let c = c0 + w; c > c0; c--) pts.push({ c, r: r0 + h });
    for (let r = r0 + h; r > r0; r--) pts.push({ c: c0, r });
    return pts;
  }

  it("counts the squares inside a rectangle as width times height", () => {
    for (let w = 1; w <= 6; w++) {
      for (let h = 1; h <= 5; h++) {
        expect(enclosedCells(rect(1, 1, w, h)).length, `${w}x${h}`).toBe(w * h);
      }
    }
  });

  it("counts the walked edges as the perimeter", () => {
    for (let w = 1; w <= 6; w++) {
      for (let h = 1; h <= 5; h++) {
        expect(rect(1, 1, w, h).length, `${w}x${h}`).toBe(2 * (w + h));
      }
    }
  });

  it("handles an L-shape, where a bounding box would be wrong", () => {
    // A 4-wide, 2-tall block with a 2x1 tab hanging below its left half: 8 + 2 = 10.
    const path = [
      { c: 1, r: 1 }, { c: 2, r: 1 }, { c: 3, r: 1 }, { c: 4, r: 1 }, { c: 5, r: 1 },
      { c: 5, r: 2 }, { c: 5, r: 3 },
      { c: 3, r: 3 },
      { c: 3, r: 4 },
      { c: 1, r: 4 },
    ];
    expect(enclosedCells(path).length).toBe(10);
  });

  it("every commission is achievable, and rules out the lazy 1xN strip", () => {
    for (let level = 1; level <= 7; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(8000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const c = makeCommission(level, rnd);
        expect(c.area, `L${level}: ${c.label} does not fit the board`).toBeLessThanOrEqual(
          COLS * ROWS,
        );
        if (c.maxPerimeter !== undefined) {
          expect(
            bestPerimeter(c.area),
            `L${level}: "${c.label}" is impossible`,
          ).toBeLessThanOrEqual(c.maxPerimeter);
          expect(
            stripPerimeter(c.area),
            `L${level}: "${c.label}" — a 1x${c.area} strip still fits, so the cap teaches nothing`,
          ).toBeGreaterThan(c.maxPerimeter);
        }
      }
    }
  });
});
