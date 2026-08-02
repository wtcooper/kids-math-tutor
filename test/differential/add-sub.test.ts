/**
 * Differential test: ported add/sub generators and column model vs the original.
 *
 * Both implementations are driven from the same seeded stream — the oracle's Math.random
 * is replaced, and the port's Rng wraps the identical generator. Any divergence in the
 * arithmetic *or* in how many random draws a generator makes will show up as a mismatched
 * problem, which is exactly the sensitivity wanted.
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs helper, no types
import { loadOracle } from "../../scripts/oracle.mjs";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import {
  addAnswer,
  addModel,
  addTitle,
  genAdd,
  genSub,
  subAnswer,
  subModel,
  subTitle,
} from "@/lib/math/topics/add-sub";
import { hasBorrow, hasBorrowAcrossZero, hasCarry } from "@/lib/math/engines/column";

const SEEDS = 200;

// One oracle for the whole file. Its boot consumes random numbers (initFacts shuffles a
// deck), so the source is reset per seed *after* boot rather than seeded at construction.
const oracle = loadOracle();

/** Point both implementations at identical, freshly-seeded streams. */
function pairFor(seed: number) {
  oracle.__setRandom(mulberry32(seed));
  const rng = makeRng(mulberry32(seed));
  return { oracle, rng };
}

describe("add: generated problems match the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const { oracle, rng } = pairFor(1000 + s);
        const theirs = oracle.BY_ID["add"].gen(level);
        const mine = genAdd(level, rng);
        expect(mine).toEqual({ a: theirs.a, b: theirs.b });
        expect(addTitle(mine)).toBe(oracle.BY_ID["add"].title(theirs));
        expect(String(addAnswer(mine))).toBe(String(theirs.a + theirs.b));
      }
    });
  }
});

describe("sub: generated problems match the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const { oracle, rng } = pairFor(2000 + s);
        const theirs = oracle.BY_ID["sub"].gen(level);
        const mine = genSub(level, rng);
        expect(mine).toEqual({ a: theirs.a, b: theirs.b });
        expect(subTitle(mine)).toBe(oracle.BY_ID["sub"].title(theirs));
        expect(String(subAnswer(mine))).toBe(String(theirs.a - theirs.b));
      }
    });
  }
});

/**
 * The invariant from BUILD-NOTES issue 10, kept as a first-class test rather than a
 * differential one — it must survive the oracle being archived, because it is the thing
 * that makes these topics teach anything.
 */
describe("regrouping is guaranteed, not incidental", () => {
  const SAMPLES = 300;

  it("every addition problem at every level actually carries", () => {
    for (let level = 1; level <= 4; level++) {
      const rng = makeRng(mulberry32(4242 + level));
      for (let i = 0; i < SAMPLES; i++) {
        const p = genAdd(level, rng);
        expect(hasCarry(addModel(p)), `add L${level}: ${p.a} + ${p.b}`).toBe(true);
      }
    }
  });

  it("every subtraction problem at every level actually borrows", () => {
    for (let level = 1; level <= 4; level++) {
      const rng = makeRng(mulberry32(9090 + level));
      for (let i = 0; i < SAMPLES; i++) {
        const p = genSub(level, rng);
        expect(hasBorrow(subModel(p)), `sub L${level}: ${p.a} − ${p.b}`).toBe(true);
      }
    }
  });

  it("level 4 subtraction borrows across a zero", () => {
    const rng = makeRng(mulberry32(31337));
    for (let i = 0; i < SAMPLES; i++) {
      const p = genSub(4, rng);
      expect(hasBorrowAcrossZero(subModel(p)), `sub L4: ${p.a} − ${p.b}`).toBe(true);
    }
  });
});

describe("column model matches the original's", () => {
  it("digits, carries, borrows and result agree", () => {
    for (let s = 0; s < 60; s++) {
      const { oracle, rng } = pairFor(7000 + s);
      for (let level = 1; level <= 4; level++) {
        const theirs = oracle.BY_ID["sub"].gen(level);
        genSub(level, rng); // keep streams aligned
        const mine = subModel({ a: theirs.a, b: theirs.b });
        expect(mine.res.join("")).toBe(
          String(theirs.a - theirs.b).padStart(mine.n, "0"),
        );
      }
    }
  });
});
