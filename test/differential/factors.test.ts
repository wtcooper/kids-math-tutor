import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs helper, no types
import { loadOracle } from "../../scripts/oracle.mjs";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import {
  buildFactors,
  factorsTitle,
  genFactors,
  sharedFactors,
  FACTOR_HI,
  FACTOR_LO,
} from "@/lib/math/topics/factors";
import { gcd, lcm, factorsOf, isPrime, commonFactors } from "@/lib/math/number";

const oracle = loadOracle();
const SEEDS = 150;

function pairFor(seed: number) {
  oracle.__setRandom(mulberry32(seed));
  return makeRng(mulberry32(seed));
}

describe("factors: generated problems match the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const rng = pairFor(5000 + s);
        const theirs = oracle.BY_ID["factors"].gen(level);
        const mine = genFactors(level, rng);
        expect(mine).toEqual({ a: theirs.a, b: theirs.b });
        expect(factorsTitle(mine)).toBe(oracle.BY_ID["factors"].title(theirs));
      }
    });
  }
});

describe("factors: model answers match the original", () => {
  it("GCF, LCM, ask expectations and answerText", () => {
    for (let s = 0; s < SEEDS; s++) {
      const rng = pairFor(6000 + s);
      for (let level = 1; level <= 4; level++) {
        const theirs = oracle.BY_ID["factors"].gen(level);
        genFactors(level, rng); // keep the streams aligned
        const p = { a: theirs.a, b: theirs.b };

        const theirModel = oracle.BY_ID["factors"].build(theirs);
        const mine = buildFactors(p);

        expect(mine.answerText).toBe(theirModel.answerText);
        expect(mine.title).toBe(theirModel.title);

        // Every fill-in slot must expect the same string the original expected —
        // this is what a student actually types.
        const mineAsks = mine.steps.flatMap((st) => st.ask ?? []).map((a) => a.expect);
        const theirAsks = theirModel.steps
          .flatMap((st: { ask?: { expect: string }[] }) => st.ask ?? [])
          .map((a: { expect: string }) => a.expect);
        expect(mineAsks).toEqual(theirAsks);

        expect(mine.steps.length).toBe(theirModel.steps.length);
        expect(mine.steps.map((st) => st.label)).toEqual(
          theirModel.steps.map((st: { lbl: string }) => st.lbl),
        );
      }
    }
  });
});

/**
 * Invariants that must outlive the oracle — these are what the Munchers rules depend on.
 */
describe("factors: number theory the game relies on", () => {
  it("shared factors always contain 1 and end at the GCF", () => {
    const rng = makeRng(mulberry32(77));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 200; i++) {
        const { a, b } = genFactors(level, rng);
        const shared = sharedFactors(a, b);
        expect(shared[0]).toBe(1);
        expect(shared[shared.length - 1]).toBe(gcd(a, b));
        expect(shared).toEqual(commonFactors(a, b));
      }
    }
  });

  it("level ranges match the tutor's, so a level means the same numbers in both", () => {
    expect(FACTOR_HI).toEqual([20, 30, 48, 72]);
    expect(FACTOR_LO).toEqual([4, 6, 8, 12]);
    const rng = makeRng(mulberry32(88));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 200; i++) {
        const { a, b } = genFactors(level, rng);
        for (const n of [a, b]) {
          expect(n).toBeGreaterThanOrEqual(FACTOR_LO[level - 1]);
          expect(n).toBeLessThanOrEqual(FACTOR_HI[level - 1]);
        }
      }
    }
  });

  it("factorsOf and isPrime agree with each other", () => {
    for (let n = 1; n <= 200; n++) {
      expect(isPrime(n)).toBe(factorsOf(n).length === 2);
    }
  });
});
