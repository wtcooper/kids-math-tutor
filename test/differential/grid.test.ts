/**
 * Differential test for the remaining grid topics: mul, div, dec-addsub.
 *
 * `div` and `dec-addsub` are the two generators that use inline coin flips
 * (`Math.random() < k`) rather than only rnd/pick, so they are the sharpest test of
 * whether the seeded Rng consumes the stream in exactly the same order as the original.
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs helper, no types
import { loadOracle } from "../../scripts/oracle.mjs";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import {
  divAnswerText,
  divModel,
  divTitle,
  genDiv,
  genMul,
  mulModel,
  mulTitle,
} from "@/lib/math/topics/mul-div";
import {
  decAnswer,
  decColumns,
  decKindOf,
  decTitle,
  genDecAddSub,
} from "@/lib/math/topics/dec-addsub";
import { hasBorrowAcrossZero } from "@/lib/math/engines/column";

const oracle = loadOracle();
const SEEDS = 150;

function pairFor(seed: number) {
  oracle.__setRandom(mulberry32(seed));
  return makeRng(mulberry32(seed));
}

describe("mul: generated problems and model match the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const rng = pairFor(11000 + s);
        const theirs = oracle.BY_ID["mul"].gen(level);
        const mine = genMul(level, rng);
        expect(mine).toEqual({ a: theirs.a, b: theirs.b });
        expect(mulTitle(mine)).toBe(oracle.BY_ID["mul"].title(theirs));

        const m = mulModel(mine);
        expect(m.product).toBe(theirs.a * theirs.b);
        // Partial products must sum to the answer, digit by digit.
        expect(m.parts.reduce((n, p) => n + p.value, 0)).toBe(m.product);
        // A zero in the multiplier would make a partial product all zeros.
        expect(String(mine.b)).not.toContain("0");
      }
    });
  }
});

describe("div: generated problems and model match the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const rng = pairFor(12000 + s);
        const theirs = oracle.BY_ID["div"].gen(level);
        const mine = genDiv(level, rng);
        expect(mine).toEqual({
          dividend: theirs.dividend,
          divisor: theirs.divisor,
        });
        expect(divTitle(mine)).toBe(oracle.BY_ID["div"].title(theirs));

        const m = divModel(mine);
        expect(m.quotient * m.divisor + m.remainder).toBe(m.dividend);
        expect(m.remainder).toBeLessThan(m.divisor);
        expect(divAnswerText(mine)).toBe(
          oracle.BY_ID["div"].practice.answer(theirs),
        );
      }
    });
  }

  it("level 1 always divides exactly", () => {
    const rng = makeRng(mulberry32(4321));
    for (let i = 0; i < 300; i++) {
      const p = genDiv(1, rng);
      expect(p.dividend % p.divisor).toBe(0);
    }
  });
});

describe("dec-addsub: generated problems match the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const rng = pairFor(13000 + s);
        const theirs = oracle.BY_ID["dec-addsub"].gen(level);
        const mine = genDecAddSub(level, rng);
        expect(mine).toEqual({ a: theirs.a, b: theirs.b, op: theirs.op });
        expect(decTitle(mine)).toBe(oracle.BY_ID["dec-addsub"].title(theirs));
        expect(decKindOf(mine)).toBe(oracle.BY_ID["dec-addsub"].kindOf(theirs));
      }
    });
  }
});

/**
 * Level-label honesty, from BUILD-NOTES issue 9: a level must generate only what its name
 * promises, and every declared kind must be reachable. These outlive the oracle.
 */
describe("dec-addsub: levels deliver what their names promise", () => {
  const LEVEL_KINDS = [
    ["add", "sub"],
    ["add", "sub"],
    ["add", "sub"],
    ["sub"],
  ];

  it("nothing outside the declared set is generated, and every declared kind appears", () => {
    for (let level = 1; level <= 4; level++) {
      const rng = makeRng(mulberry32(555 + level));
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) {
        const kind = decKindOf(genDecAddSub(level, rng));
        expect(LEVEL_KINDS[level - 1]).toContain(kind);
        seen.add(kind);
      }
      expect([...seen].sort()).toEqual([...LEVEL_KINDS[level - 1]].sort());
    }
  });

  it("'Across zeros' actually borrows across a zero", () => {
    const rng = makeRng(mulberry32(8899));
    for (let i = 0; i < 300; i++) {
      const p = genDecAddSub(4, rng);
      expect(p.op).toBe("-");
      const { model } = decColumns(p);
      expect(hasBorrowAcrossZero(model), `${p.a} − ${p.b}`).toBe(true);
    }
  });

  it("the column result equals the arithmetic answer", () => {
    const rng = makeRng(mulberry32(2468));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 200; i++) {
        const p = genDecAddSub(level, rng);
        const { model, dp } = decColumns(p);
        const digits = model.res.join("");
        const withLead =
          model.op === "+" && model.lead ? String(model.lead) + digits : digits;
        const value =
          Number(withLead.slice(0, withLead.length - dp) || "0") +
          Number(withLead.slice(withLead.length - dp)) / Math.pow(10, dp);
        expect(value).toBeCloseTo(decAnswer(p), 6);
      }
    }
  });
});
