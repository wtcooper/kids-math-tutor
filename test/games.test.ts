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
import {
  canPlace,
  decompose,
  genTiles,
  MAX_TILES,
  type Placed,
} from "../app/(app)/play/[slug]/_games/tiles/tiles-model";
import {
  fillsExactly,
  genCut,
  simplify,
  workableDenoms,
} from "../app/(app)/play/[slug]/_games/cut/cut-model";

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

describe("Tiles", () => {
  it("the four partial products always add to the product", () => {
    for (let a = 2; a <= 60; a++) {
      for (let b = 2; b <= 30; b++) {
        const d = decompose({ a, b });
        const sum =
          d.tensA * d.tensB + d.tensA * d.onesB + d.onesA * d.tensB + d.onesA * d.onesB;
        expect(sum, `${a}x${b}`).toBe(a * b);
        expect(d.product).toBe(a * b);
      }
    }
  });

  it("the tile counts cover exactly the rectangle", () => {
    for (let a = 2; a <= 60; a++) {
      for (let b = 2; b <= 30; b++) {
        const d = decompose({ a, b });
        const area = d.hundreds * 100 + d.tenDowns * 10 + d.tenAcrosses * 10 + d.ones;
        expect(area, `${a}x${b}`).toBe(a * b);
        expect(d.fewest).toBe(d.hundreds + d.tenDowns + d.tenAcrosses + d.ones);
      }
    }
  });

  it("refuses a tile that would overlap or hang off the edge", () => {
    const prob = { a: 12, b: 14 };
    expect(canPlace([], "hundred", 0, 0, prob)).toBe(true);
    // Would run past the right edge.
    expect(canPlace([], "hundred", 5, 0, prob)).toBe(false);
    // Would run past the bottom.
    expect(canPlace([], "hundred", 0, 6, prob)).toBe(false);
    // A 1x10 strip does not fit in an 8-tall board.
    expect(canPlace([], "tenDown", 0, 0, { a: 12, b: 8 })).toBe(false);

    const first: Placed[] = [{ id: 1, kind: "hundred", c: 0, r: 0 }];
    expect(canPlace(first, "one", 5, 5, prob)).toBe(false);
    expect(canPlace(first, "one", 10, 0, prob)).toBe(true);
    expect(canPlace(first, "one", 0, 10, prob)).toBe(true);
  });

  it("every generated rectangle is small enough to tile by hand", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(9000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genTiles(level, rnd);
        const d = decompose(p);
        expect(
          d.fewest,
          `L${level}: ${p.a}x${p.b} needs ${d.fewest} tiles`,
        ).toBeLessThanOrEqual(MAX_TILES);
        // Every board has a real four-way split, or there is no distributive property
        // on show — which is the entire point of the game.
        expect(d.hundreds, `L${level}: ${p.a}x${p.b} has no hundred`).toBeGreaterThan(0);
        expect(d.ones, `L${level}: ${p.a}x${p.b} has no ones corner`).toBeGreaterThan(0);
      }
    }
  });
});

describe("Cut", () => {
  it("every gap can actually be filled by something you can cut to", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(10000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genCut(level, rnd);
        const ok = workableDenoms(p.gap, p.reachable);
        expect(ok.length, `L${level}: ${p.gap.n}/${p.gap.d} cannot be filled`).toBeGreaterThan(0);
        // More than one way, or there is no equivalence to discover.
        expect(ok.length, `L${level}: ${p.gap.n}/${p.gap.d} has only one solution`).toBeGreaterThan(1);
      }
    }
  });

  it("only an exact fill counts, using integer arithmetic", () => {
    const gap = { n: 3, d: 4 };
    expect(fillsExactly(gap, 4, 3)).toBe(true);
    expect(fillsExactly(gap, 8, 6)).toBe(true);
    expect(fillsExactly(gap, 12, 9)).toBe(true);
    expect(fillsExactly(gap, 8, 5)).toBe(false);
    expect(fillsExactly(gap, 8, 7)).toBe(false);
    // Thirds cannot tile three quarters, however many you lay.
    for (let n = 1; n <= 40; n++) expect(fillsExactly(gap, 3, n)).toBe(false);
  });

  it("a third of a brick three times is exactly one brick", () => {
    // The float trap this game would fall into: 1/3 + 1/3 + 1/3 !== 1 in doubles.
    expect(fillsExactly({ n: 1, d: 1 }, 3, 3)).toBe(true);
    expect(fillsExactly({ n: 2, d: 3 }, 3, 2)).toBe(true);
    expect(fillsExactly({ n: 2, d: 3 }, 9, 6)).toBe(true);
  });

  it("the simplest workable slicing is the gap in lowest terms", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 120; s++) {
        const rand = mulberry32(11000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genCut(level, rnd);
        const [, sd] = simplify(p.gap.n, p.gap.d);
        expect(workableDenoms(p.gap, p.reachable)[0], `${p.gap.n}/${p.gap.d}`).toBe(sd);
      }
    }
  });
});
