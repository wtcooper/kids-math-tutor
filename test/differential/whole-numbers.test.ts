import { describe, expect, it } from "vitest";
// @ts-ignore - plain .mjs helper, no types
import { loadOracle } from "../../scripts/oracle.mjs";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import {
  exponentAnswer,
  exponentKindOf,
  exponentTitle,
  genExponents,
  genPemdas,
  genPlace,
  pemdasAnswer,
  pemdasTitle,
  placeAnswer,
  placeTitle,
} from "@/lib/math/topics/whole-numbers";
import { evalSteps, exprText } from "@/lib/math/engines/pemdas";

const oracle = loadOracle();
const SEEDS = 120;

function pairFor(seed: number) {
  oracle.__setRandom(mulberry32(seed));
  return makeRng(mulberry32(seed));
}

describe("place: matches the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const rng = pairFor(21000 + s);
        const theirs = oracle.BY_ID["place"].gen(level);
        const mine = genPlace(level, rng);
        expect(mine).toEqual({ n: theirs.n, place: theirs.place });
        expect(placeTitle(mine)).toBe(oracle.BY_ID["place"].title(theirs));
      }
    });
  }

  it("never asks about an already-round number or a zero digit", () => {
    const rng = makeRng(mulberry32(999));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 300; i++) {
        const { n, place } = genPlace(level, rng);
        expect(n % Math.pow(10, place), `${n} @ ${place}`).not.toBe(0);
        const digit = Number(String(n)[String(n).length - 1 - place]);
        expect(digit, `${n} @ ${place}`).not.toBe(0);
        expect(placeAnswer({ n, place }) % Math.pow(10, place)).toBe(0);
      }
    }
  });
});

describe("pemdas: matches the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const rng = pairFor(22000 + s);
        const theirs = oracle.BY_ID["pemdas"].gen(level);
        const mine = genPemdas(level, rng);
        expect(exprText(mine.tokens)).toBe(exprText(theirs.tokens));
        expect(pemdasTitle(mine)).toBe(oracle.BY_ID["pemdas"].title(theirs));
        expect(pemdasAnswer(mine)).toBe(oracle.evalSteps(theirs.tokens).value);
      }
    });
  }

  it("answers are positive integers reached in at least two visible steps", () => {
    const rng = makeRng(mulberry32(1717));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 250; i++) {
        const p = genPemdas(level, rng);
        const res = evalSteps(p.tokens);
        expect(Number.isInteger(res.value)).toBe(true);
        expect(res.value).toBeGreaterThan(0);
        expect(res.steps.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("no two reductions in one expression are identical", () => {
    // The 6 x 5 - 6 x 5 case: both steps narrate the same words, which reads as a step
    // that does nothing (BUILD-NOTES issue 6).
    const rng = makeRng(mulberry32(1818));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 250; i++) {
        const res = evalSteps(genPemdas(level, rng).tokens);
        const keys = res.steps.map((s) => `${s.a}${s.op}${s.b}`);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });
});

describe("exponents: matches the original", () => {
  for (let level = 1; level <= 4; level++) {
    it(`level ${level}`, () => {
      for (let s = 0; s < SEEDS; s++) {
        const rng = pairFor(23000 + s);
        const theirs = oracle.BY_ID["exponents"].gen(level);
        const mine = genExponents(level, rng);
        expect(mine).toEqual(
          theirs.kind === "pow"
            ? { kind: "pow", base: theirs.base, exp: theirs.exp }
            : { kind: "ten", n: theirs.n, k: theirs.k },
        );
        expect(exponentTitle(mine)).toBe(oracle.BY_ID["exponents"].title(theirs));
      }
    });
  }

  it("level labels are honest in both directions", () => {
    const LEVEL_KINDS = [["pow"], ["pow"], ["ten"], ["pow", "ten"]];
    for (let level = 1; level <= 4; level++) {
      const rng = makeRng(mulberry32(3131 + level));
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) {
        const kind = exponentKindOf(genExponents(level, rng));
        expect(LEVEL_KINDS[level - 1]).toContain(kind);
        seen.add(kind);
      }
      expect([...seen].sort()).toEqual([...LEVEL_KINDS[level - 1]].sort());
    }
  });

  it("answers are what the notation says", () => {
    const rng = makeRng(mulberry32(4141));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 200; i++) {
        const p = genExponents(level, rng);
        if (p.kind === "pow") {
          expect(exponentAnswer(p)).toBe(Math.pow(p.base, p.exp));
        } else {
          expect(exponentAnswer(p)).toBeCloseTo(p.n * Math.pow(10, p.k), 6);
        }
      }
    }
  });
});
