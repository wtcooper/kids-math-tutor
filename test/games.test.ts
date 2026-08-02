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
import {
  genBeam,
  lcd,
  settingWorks,
  strandsFor,
  totalDemand,
} from "../app/(app)/play/[slug]/_games/beam/beam-model";
import {
  apply,
  canApply,
  equationText,
  genBalance,
  isBalanced,
  isSolved,
  type Move,
  solvedValue,
} from "../app/(app)/play/[slug]/_games/balance/balance-model";
import {
  ALL_OPS,
  genMachine,
  machineWorks,
  type Node,
  type Op,
  runResults,
  tidyText,
} from "../app/(app)/play/[slug]/_games/machine/machine-model";
import {
  bestProfit,
  genDay,
  maxTrays,
  pence,
  simulate,
} from "../app/(app)/play/[slug]/_games/bakery/bakery-model";

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

describe("Split the Beam", () => {
  it("the LCD always works and every machine's own denominator is offered", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 150; s++) {
        const rand = mulberry32(12000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genBeam(level, rnd);
        const need = lcd(p.demands);
        expect(settingWorks(p.demands, need), `LCD ${need} fails`).toBe(true);
        expect(p.settings, `LCD ${need} not offered`).toContain(need);
        for (const d of p.demands) expect(p.settings).toContain(d.d);
      }
    }
  });

  it("no setting smaller than the LCD can pay everyone", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 150; s++) {
        const rand = mulberry32(13000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genBeam(level, rnd);
        const need = lcd(p.demands);
        for (let setting = 1; setting < need; setting++) {
          expect(
            settingWorks(p.demands, setting),
            `${p.demands.map((d) => `${d.n}/${d.d}`).join("+")} paid at ${setting}`,
          ).toBe(false);
        }
      }
    }
  });

  it("the machines never ask for more beam than exists", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 150; s++) {
        const rand = mulberry32(14000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genBeam(level, rnd);
        const t = totalDemand(p.demands);
        expect(t.n / t.d, `${p.demands.map((d) => `${d.n}/${d.d}`).join("+")} > 1`).toBeLessThanOrEqual(1);
        // And the strands at the LCD really do fit.
        const need = lcd(p.demands);
        const used = p.demands.reduce((a, d) => a + (strandsFor(d, need) ?? 0), 0);
        expect(used).toBeLessThanOrEqual(need);
      }
    }
  });

  it("at least one offered setting is a tempting wrong answer", () => {
    // A machine's own denominator that cannot pay the others is the whole lesson.
    for (let level = 2; level <= 4; level++) {
      for (let s = 0; s < 80; s++) {
        const rand = mulberry32(15000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genBeam(level, rnd);
        const wrong = p.settings.filter((x) => !settingWorks(p.demands, x));
        expect(wrong.length, `${p.demands.map((d) => `${d.n}/${d.d}`).join("+")} has no near miss`).toBeGreaterThan(0);
      }
    }
  });
});

describe("Balance", () => {
  it("every scale starts balanced and stays balanced through any legal move", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(16000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genBalance(level, rnd);
        expect(isBalanced(p.start, p.x), `L${level}: ${equationText(p.start)} is not level`).toBe(true);

        const moves: Move[] = [
          { kind: "removeStones", count: 1 },
          { kind: "removeBag", count: 1 },
          { kind: "divide", by: 2 },
          { kind: "divide", by: 3 },
          { kind: "addStones", count: 4 },
        ];
        for (const m of moves) {
          if (!canApply(p.start, m)) continue;
          const after = apply(p.start, m);
          expect(
            isBalanced(after, p.x),
            `L${level}: ${equationText(p.start)} then ${m.kind} broke the balance`,
          ).toBe(true);
        }
      }
    }
  });

  it("is always solvable, and the answer is the x it was built with", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(17000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genBalance(level, rnd);

        // Play it the way the game allows: cancel bags, cancel stones, then share out.
        let sc = p.start;
        let guard = 0;
        while (!isSolved(sc) && guard++ < 40) {
          const bags = Math.min(sc.left.bags, sc.right.bags);
          const stones = Math.min(sc.left.stones, sc.right.stones);
          if (bags > 0) sc = apply(sc, { kind: "removeBag", count: bags });
          else if (stones > 0) sc = apply(sc, { kind: "removeStones", count: stones });
          else {
            const by = [2, 3, 4, 5].find((n) => canApply(sc, { kind: "divide", by: n }));
            if (!by) break;
            sc = apply(sc, { kind: "divide", by });
          }
        }
        expect(isSolved(sc), `L${level}: ${equationText(p.start)} could not be solved`).toBe(true);
        expect(solvedValue(sc), `L${level}: ${equationText(p.start)}`).toBe(p.x);
      }
    }
  });

  it("writes the equation the way the tutor does", () => {
    expect(equationText({ left: { bags: 1, stones: 3 }, right: { bags: 0, stones: 8 } })).toBe(
      "x + 3 = 8",
    );
    expect(equationText({ left: { bags: 3, stones: 0 }, right: { bags: 0, stones: 12 } })).toBe(
      "3x = 12",
    );
    expect(equationText({ left: { bags: 4, stones: 2 }, right: { bags: 1, stones: 11 } })).toBe(
      "4x + 2 = x + 11",
    );
    expect(equationText({ left: { bags: 1, stones: 0 }, right: { bags: 0, stones: 5 } })).toBe(
      "x = 5",
    );
  });

  it("refuses a move a pan cannot afford", () => {
    const sc = { left: { bags: 2, stones: 1 }, right: { bags: 0, stones: 9 } };
    expect(canApply(sc, { kind: "removeStones", count: 2 })).toBe(false);
    expect(canApply(sc, { kind: "removeBag", count: 1 })).toBe(false);
    expect(canApply(sc, { kind: "divide", by: 2 })).toBe(false);
  });
});

describe("The Machine Shop", () => {
  it("the wiring the puzzle was built from always solves it", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(18000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genMachine(level, rnd);
        const correct: Op[] = [];
        const collect = (n: Node) => {
          if (n.kind !== "op") return;
          collect(n.left);
          correct.push(n.op);
          collect(n.right);
        };
        collect(p.shape);
        expect(correct.length, `L${level} slot count`).toBe(p.slotCount);
        expect(machineWorks(p, correct), `L${level}: ${tidyText(p.shape)} does not solve itself`).toBe(true);
      }
    }
  });

  it("the last level cannot be solved by a machine that only works for one input", () => {
    // The whole point: a fixed arrangement that happens to hit run 1 must fail run 2.
    let foundDecoy = 0;
    for (let s = 0; s < 200; s++) {
      const rand = mulberry32(19000 + s);
      const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
      const p = genMachine(4, rnd);
      expect(p.runs.length).toBeGreaterThan(1);
      expect(new Set(p.runs).size, "test runs must differ").toBe(p.runs.length);

      // Try every wiring; any that passes only the first run must not be accepted.
      for (const a of ALL_OPS) {
        for (const b of ALL_OPS) {
          const ops = [a, b];
          const res = runResults(p, ops);
          const firstOnly = res[0] === p.targets[0] && res.some((r, i) => r !== p.targets[i]);
          if (firstOnly) {
            foundDecoy++;
            expect(machineWorks(p, ops), "a one-run fluke was accepted").toBe(false);
          }
        }
      }
    }
    expect(foundDecoy, "no one-run flukes exist, so the level teaches nothing").toBeGreaterThan(0);
  });

  it("writes the expression with brackets only where they change the meaning", () => {
    const n = (v: number): Node => ({ kind: "num", value: v });
    const o = (op: Op, left: Node, right: Node): Node => ({ kind: "op", op, left, right });
    expect(tidyText(o("+", o("×", n(3), n(4)), n(5)))).toBe("3 × 4 + 5");
    expect(tidyText(o("×", o("+", n(3), n(4)), n(5)))).toBe("(3 + 4) × 5");
    expect(tidyText(o("-", n(9), o("-", n(4), n(2))))).toBe("9 - (4 - 2)");
    expect(tidyText(o("-", o("-", n(9), n(4)), n(2)))).toBe("9 - 4 - 2");
  });

  it("never asks for a machine that divides by zero", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 150; s++) {
        const rand = mulberry32(20000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genMachine(level, rnd);
        for (const t of p.targets) expect(Number.isFinite(t)).toBe(true);
      }
    }
  });
});

describe("The Bakery", () => {
  it("every day's target is actually achievable", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 60; s++) {
        const rand = mulberry32(21000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const day = genDay(level, rnd);
        expect(day.target, `L${level}: target ${day.target} > best ${bestProfit(day)}`)
          .toBeLessThanOrEqual(bestProfit(day));
        expect(day.target).toBeGreaterThan(0);
      }
    }
  });

  it("the target cannot be hit by ignoring the unit rate and the price together", () => {
    // If any choice at all met the target, the maths would not be load-bearing.
    for (let level = 2; level <= 4; level++) {
      for (let s = 0; s < 40; s++) {
        const rand = mulberry32(22000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const day = genDay(level, rnd);
        let met = 0;
        let total = 0;
        for (let o = 0; o < day.offers.length; o++) {
          for (let t = 1; t <= maxTrays(day, day.offers[o]); t++) {
            for (let m = 0; m < day.markups.length; m++) {
              for (const c of [false, true]) {
                const r = simulate(day, { offerIndex: o, trays: t, markupIndex: m, clearance: c });
                if (r.overBaked) continue;
                total++;
                if (r.metTarget) met++;
              }
            }
          }
        }
        expect(met, `L${level}: no way to hit the target`).toBeGreaterThan(0);
        expect(met / total, `L${level}: ${met}/${total} choices hit it — too easy`).toBeLessThan(0.7);
      }
    }
  });

  it("money stays in whole pence", () => {
    for (let s = 0; s < 60; s++) {
      const rand = mulberry32(23000 + s);
      const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
      const day = genDay(3, rnd);
      const r = simulate(day, { offerIndex: 0, trays: 2, markupIndex: 0, clearance: true });
      for (const v of [r.flourCost, r.costPerBun, r.price, r.salePrice, r.revenue, r.profit]) {
        expect(Number.isInteger(v), `${v} is not whole pence`).toBe(true);
      }
    }
  });

  it("baking more than the flour allows is refused rather than sold", () => {
    const rand = mulberry32(24000);
    const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
    const day = genDay(2, rnd);
    const tooMany = maxTrays(day, day.offers[0]) + 3;
    const r = simulate(day, { offerIndex: 0, trays: tooMany, markupIndex: 0, clearance: false });
    expect(r.overBaked).toBe(true);
    expect(r.sold).toBe(0);
    expect(r.metTarget).toBe(false);
  });

  it("formats money without float dust", () => {
    expect(pence(0)).toBe("£0.00");
    expect(pence(5)).toBe("£0.05");
    expect(pence(460)).toBe("£4.60");
    expect(pence(1234)).toBe("£12.34");
    expect(pence(-250)).toBe("−£2.50");
  });
});
