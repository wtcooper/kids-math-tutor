import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs helper, no types
import { loadOracle } from "../../scripts/oracle.mjs";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import {
  decMulDivKindOf,
  decMulDivTitle,
  equationAnswer,
  equationKindOf,
  equationTitle,
  genDecMulDiv,
  genEquations,
  genGeometry,
  genIntegers,
  genPercent,
  genRatio,
  geometryAnswer,
  geometryKindOf,
  geometryTitle,
  integerKindOf,
  integerTitle,
  percentKindOf,
  percentTitle,
  ratioAnswer,
  ratioKindOf,
  ratioTitle,
} from "@/lib/math/topics/rates-algebra";

const oracle = loadOracle();
const SEEDS = 120;

function pairFor(seed: number) {
  oracle.__setRandom(mulberry32(seed));
  return makeRng(mulberry32(seed));
}

const CASES = [
  { id: "dec-muldiv", gen: genDecMulDiv, title: decMulDivTitle, kindOf: decMulDivKindOf, levels: 4, seed: 41000, kinds: [["mul"], ["mul"], ["div"], ["mul", "div"]] },
  { id: "percent", gen: genPercent, title: percentTitle, kindOf: percentKindOf, levels: 4, seed: 42000, kinds: [["of"], ["of"], ["whatpct"], ["of", "whatpct", "convert"]] },
  { id: "ratio", gen: genRatio, title: ratioTitle, kindOf: ratioKindOf, levels: 4, seed: 43000, kinds: [["unit"], ["equiv"], ["unit", "equiv"], ["unit", "equiv"]] },
  { id: "integers", gen: genIntegers, title: integerTitle, kindOf: integerKindOf, levels: 4, seed: 44000, kinds: [["add"], ["sub"], ["add", "sub"], ["mul", "div"]] },
  { id: "equations", gen: genEquations, title: equationTitle, kindOf: equationKindOf, levels: 4, seed: 45000, kinds: [["add", "sub"], ["mul", "div"], ["add", "sub", "mul", "div"], ["two"]] },
  { id: "geometry", gen: genGeometry, title: geometryTitle, kindOf: geometryKindOf, levels: 7, seed: 46000, kinds: [["area"], ["perim"], ["tri"], ["para"], ["vol"], ["ell"], ["area", "perim", "tri", "para", "vol", "ell"]] },
] as const;

for (const c of CASES) {
  describe(`${c.id}: matches the original`, () => {
    for (let level = 1; level <= c.levels; level++) {
      it(`level ${level}`, () => {
        for (let s = 0; s < SEEDS; s++) {
          const rng = pairFor(c.seed + s);
          const theirs = oracle.BY_ID[c.id].gen(level);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mine = (c.gen as any)(level, rng);
          expect(mine).toEqual(theirs);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect((c.title as any)(mine)).toBe(oracle.BY_ID[c.id].title(theirs));
        }
      });
    }
  });
}

/**
 * Level-label honesty in both directions — the rule from BUILD-NOTES issue 9 that found
 * drift in five separate topics. This one outlives the oracle.
 */
describe("level labels promise only what the generator delivers", () => {
  for (const c of CASES) {
    it(c.id, () => {
      for (let level = 1; level <= c.levels; level++) {
        const rng = makeRng(mulberry32(c.seed + 900 + level));
        const seen = new Set<string>();
        for (let i = 0; i < 500; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kind = (c.kindOf as any)((c.gen as any)(level, rng));
          expect(c.kinds[level - 1] as readonly string[], `${c.id} L${level}`).toContain(kind);
          seen.add(kind);
        }
        // ...and every declared kind is actually reachable.
        expect([...seen].sort(), `${c.id} L${level}`).toEqual(
          [...c.kinds[level - 1]].sort(),
        );
      }
    });
  }
});

describe("answers are right, checked independently of the generator", () => {
  it("geometry formulas", () => {
    const rng = makeRng(mulberry32(5150));
    for (let level = 1; level <= 7; level++) {
      for (let i = 0; i < 200; i++) {
        const p = genGeometry(level, rng);
        const a = geometryAnswer(p);
        expect(a).toBeGreaterThan(0);
        if (p.kind === "ell") {
          // The notch must actually fit inside the outer rectangle.
          expect(p.w2).toBeLessThan(p.w1);
          expect(p.h2).toBeLessThan(p.h1);
          expect(a).toBe(p.w1 * p.h1 - p.w2 * p.h2);
        }
        if (p.kind === "tri") expect(a).toBeCloseTo((p.w * p.h) / 2, 9);
        if (p.kind === "vol") expect(a).toBe(p.w * p.h * p.d);
      }
    }
  });

  it("equations: substituting x back in satisfies the equation", () => {
    const rng = makeRng(mulberry32(6160));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 250; i++) {
        const p = genEquations(level, rng);
        const x = equationAnswer(p);
        const title = equationTitle(p);
        const rhs = Number(title.split("=")[1].trim());
        if (p.kind === "add") expect(x + p.a).toBe(rhs);
        if (p.kind === "sub") expect(x - p.a).toBe(rhs);
        if (p.kind === "mul") expect(p.a * x).toBe(rhs);
        if (p.kind === "div") {
          expect(x / p.a).toBe(rhs);
          expect(x % p.a, `x ÷ a must divide evenly: ${title}`).toBe(0);
        }
        if (p.kind === "two") expect(p.a * x + (p.b ?? 0)).toBe(rhs);
      }
    }
  });

  it("ratio: unit rate scales correctly", () => {
    const rng = makeRng(mulberry32(7170));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 200; i++) {
        const p = genRatio(level, rng);
        if (p.kind === "unit") {
          expect(p.total / p.n).toBe(p.unit);
          expect(ratioAnswer(p)).toBe(p.unit * p.m);
        } else {
          expect(ratioAnswer(p)).toBe(p.b * p.k);
        }
      }
    }
  });

  it("integers: division is always exact", () => {
    const rng = makeRng(mulberry32(8180));
    for (let i = 0; i < 400; i++) {
      const p = genIntegers(4, rng);
      // Math.abs because a negative dividend yields -0, and Object.is(-0, +0) is false.
      if (p.kind === "div") expect(Math.abs((p.a * p.b) % p.b)).toBe(0);
    }
  });
});
