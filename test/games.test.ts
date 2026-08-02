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
