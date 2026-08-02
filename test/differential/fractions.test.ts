import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs helper, no types
import { loadOracle } from "../../scripts/oracle.mjs";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import {
  fracAddSubAnswer,
  fracAddSubKindOf,
  fracAddSubTitle,
  fracEquivTitle,
  fracMixedTitle,
  fracMulDivAnswer,
  fracMulDivKindOf,
  fracMulDivTitle,
  genFracAddSub,
  genFracEquiv,
  genFracMixed,
  genFracMulDiv,
} from "@/lib/math/topics/fractions";
import { gcd } from "@/lib/math/number";

const oracle = loadOracle();
const SEEDS = 120;

function pairFor(seed: number) {
  oracle.__setRandom(mulberry32(seed));
  return makeRng(mulberry32(seed));
}

const TOPICS = [
  { id: "frac-equiv", gen: genFracEquiv, title: fracEquivTitle, seed: 31000 },
  { id: "frac-mixed", gen: genFracMixed, title: fracMixedTitle, seed: 32000 },
  { id: "frac-addsub", gen: genFracAddSub, title: fracAddSubTitle, seed: 33000 },
  { id: "frac-muldiv", gen: genFracMulDiv, title: fracMulDivTitle, seed: 34000 },
] as const;

for (const topic of TOPICS) {
  describe(`${topic.id}: matches the original`, () => {
    for (let level = 1; level <= 4; level++) {
      it(`level ${level}`, () => {
        for (let s = 0; s < SEEDS; s++) {
          const rng = pairFor(topic.seed + s);
          const theirs = oracle.BY_ID[topic.id].gen(level);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mine = (topic.gen as any)(level, rng);
          expect(mine).toEqual(theirs);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect((topic.title as any)(mine)).toBe(oracle.BY_ID[topic.id].title(theirs));
        }
      });
    }
  });
}

describe("fractions: level labels are honest in both directions", () => {
  const CASES = [
    {
      id: "frac-equiv",
      gen: genFracEquiv,
      kindOf: (p: { kind: string }) => p.kind,
      kinds: [["simplify"], ["simplify"], ["simplify", "missing"], ["simplify", "missing"]],
    },
    {
      id: "frac-mixed",
      gen: genFracMixed,
      kindOf: (p: { kind: string }) => p.kind,
      kinds: [
        ["toMixed"],
        ["toMixed", "toImproper"],
        ["toMixed", "toImproper"],
        ["toMixed", "toImproper"],
      ],
    },
    {
      id: "frac-muldiv",
      gen: genFracMulDiv,
      kindOf: fracMulDivKindOf,
      kinds: [["mul"], ["mul", "div"], ["mul", "div"], ["mul", "div"]],
    },
  ] as const;

  for (const c of CASES) {
    it(c.id, () => {
      for (let level = 1; level <= 4; level++) {
        const rng = makeRng(mulberry32(6000 + level));
        const seen = new Set<string>();
        for (let i = 0; i < 400; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kind = (c.kindOf as any)((c.gen as any)(level, rng));
          expect(c.kinds[level - 1] as readonly string[]).toContain(kind);
          seen.add(kind);
        }
        expect([...seen].sort()).toEqual([...c.kinds[level - 1]].sort());
      }
    });
  }
});

describe("fractions: answers are correct and well-formed", () => {
  it("add/subtract results are positive and in lowest terms", () => {
    const rng = makeRng(mulberry32(7777));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 250; i++) {
        const p = genFracAddSub(level, rng);
        const [n, d] = fracAddSubAnswer(p);
        expect(n, fracAddSubTitle(p)).toBeGreaterThan(0);
        expect(gcd(n, d)).toBe(1);
        // Cross-check against decimal arithmetic — a deliberately different route.
        const v1 = (p.w1 * p.d1 + p.n1) / p.d1;
        const v2 = (p.w2 * p.d2 + p.n2) / p.d2;
        expect(n / d).toBeCloseTo(p.op === "+" ? v1 + v2 : v1 - v2, 9);
      }
    }
  });

  it("multiply/divide results are in lowest terms and match decimal arithmetic", () => {
    const rng = makeRng(mulberry32(8888));
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 250; i++) {
        const p = genFracMulDiv(level, rng);
        const [n, d] = fracMulDivAnswer(p);
        expect(gcd(n, d)).toBe(1);
        const v1 = (p.w1 * p.d1 + p.n1) / p.d1;
        const v2 = (p.w2 * p.d2 + p.n2) / p.d2;
        expect(n / d).toBeCloseTo(p.kind === "mul" ? v1 * v2 : v1 / v2, 9);
      }
    }
  });

  it("add/subtract kinds are reported consistently", () => {
    const rng = makeRng(mulberry32(9999));
    for (let i = 0; i < 200; i++) {
      const p = genFracAddSub(3, rng);
      expect(["add", "sub"]).toContain(fracAddSubKindOf(p));
    }
  });
});
