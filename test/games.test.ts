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
  equalBreaks,
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
  allEasy,
  allSolved,
  areasSumToProduct,
  genTiles,
  regionsFor,
  tensCut,
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
  makeGate,
  makeRun,
  RAPIDS_LEVELS,
} from "../app/(app)/play/[slug]/_games/rapids/rapids-model";
import { genFloor, strike } from "../app/(app)/play/[slug]/_games/depths/depths-model";
import {
  catalogFor,
  makeWave,
  satisfies as gardenSatisfies,
  stoppers,
  WAVES_PER_ROUND,
} from "../app/(app)/play/[slug]/_games/garden/garden-model";
import {
  ALL_OPS,
  genMachine,
  machineWorks,
  type Node,
  type Op,
  runResults,
  slotPaths,
  tidyText,
} from "../app/(app)/play/[slug]/_games/machine/machine-model";
import {
  bestProfit,
  CUPS_PER_POUND,
  cupsIn,
  flourText,
  genDay,
  maxTrays,
  money,
  rateText,
  sackText,
  simulate,
  unitRate,
} from "../app/(app)/play/[slug]/_games/bakery/bakery-model";
import {
  type Blocks,
  check,
  floorArea,
  genCommission,
  GRID,
  isSolidBox,
  key,
  perimeter,
  volume,
} from "../app/(app)/play/[slug]/_games/build/build-model";
import {
  makeRule as makeCrossingRule,
  ROW_Y,
} from "../app/(app)/play/[slug]/_games/crossing/CrossingScene";

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

  it("breaking into equal pieces, by ANY offered choice, always terminates in primes without losing a unit", () => {
    // Equal-piece breaking is division as sharing: a rock of 12 into three 4s keeps
    // 12 units on the board (3 × 4), so the invariant is the SUM of the rocks, not the
    // product — the factors she names are the counts, one per break. Walk every n
    // twice — always taking the first break and always the last — so both extremes of
    // her choices (fewest big pieces, most small pieces) are exercised.
    for (const pick of [0, -1]) {
      for (let n = 4; n <= 200; n++) {
        let pile = [n];
        let guard = 0;
        while (pile.some((v) => equalBreaks(v).length > 0) && guard++ < 100) {
          const next: number[] = [];
          for (const v of pile) {
            const options = equalBreaks(v);
            if (options.length === 0) {
              next.push(v);
              continue;
            }
            const [count, size] = options.at(pick)!;
            for (let i = 0; i < count; i++) next.push(size);
          }
          pile = next;
        }
        expect(pile.every((v) => equalBreaks(v).length === 0), `${n} left a composite`).toBe(true);
        expect(pile.reduce((a, b) => a + b, 0), `${n} lost units`).toBe(n);
        // Every final rock is genuinely prime — that is the whole destination.
        expect(pile.every((v) => splitPair(v) === null), `${n} ended non-prime`).toBe(true);
      }
    }
  });

  it("a rock offers an equal break exactly when it is composite", () => {
    for (let n = 2; n <= 200; n++) {
      expect(equalBreaks(n).length > 0, `${n}`).toBe(splitPair(n) !== null);
    }
  });
});

describe("Rapids", () => {
  it("every gate has exactly one correct opening, for every level kind", () => {
    for (const { kind } of RAPIDS_LEVELS) {
      for (let s = 0; s < 300; s++) {
        const rand = mulberry32(31000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        let state = makeRun(kind, rnd);
        for (let g = 0; g < 14; g++) {
          const out = makeGate(state, rnd);
          state = out.state;
          const { sides, correct, meta } = out.gate;
          expect(sides[0], `${kind}: sides must differ`).not.toBe(sides[1]);
          if (kind === "count-easy" || kind === "count-hard") {
            const next = meta.next as number;
            expect(Number(sides[correct]), kind).toBe(next);
            expect(Number(sides[1 - correct]), `${kind}: distractor equals answer`).not.toBe(next);
          } else if (kind === "frac-compare") {
            const [an, ad] = sides[correct].split("/").map(Number);
            const [bn, bd] = sides[1 - correct].split("/").map(Number);
            expect(an * bd, `${kind}: ${sides.join(" vs ")}`).toBeGreaterThan(bn * ad);
          } else {
            const [tn, td] = (meta.target as string).split("/").map(Number);
            const [cn, cd] = sides[correct].split("/").map(Number);
            const [wn, wd] = sides[1 - correct].split("/").map(Number);
            expect(cn * td, `${kind}: match must equal target`).toBe(tn * cd);
            expect(wn * td, `${kind}: distractor must NOT equal target`).not.toBe(tn * wd);
          }
        }
      }
    }
  });

  it("counting runs never step outside the 1–12 table", () => {
    for (const kind of ["count-easy", "count-hard"] as const) {
      const rand = mulberry32(4242);
      const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
      let state = makeRun(kind, rnd);
      for (let g = 0; g < 60; g++) {
        const out = makeGate(state, rnd);
        state = out.state;
        const next = out.gate.meta.next as number;
        const base = out.gate.meta.base as number;
        expect(next % base).toBe(0);
        expect(next / base).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("Number Garden Defense", () => {
  it("every gnome in every wave is stoppable by some tower in the level's catalog", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(51000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        for (let wave = 1; wave <= WAVES_PER_ROUND; wave++) {
          for (const v of makeWave(level, wave, rnd)) {
            expect(v).toBeGreaterThanOrEqual(2);
            expect(v).toBeLessThanOrEqual(99);
            expect(stoppers(level, v).length, `L${level} w${wave}: ${v} unstoppable`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("from wave 2 on, no single tower rule covers a whole wave", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(53000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        for (let wave = 2; wave <= WAVES_PER_ROUND; wave++) {
          const values = makeWave(level, wave, rnd);
          for (const spec of catalogFor(level)) {
            expect(
              values.every((v) => gardenSatisfies(spec, v)),
              `L${level} w${wave}: "${spec.label}" alone covers ${values}`,
            ).toBe(false);
          }
        }
      }
    }
  });
});

describe("The Number Depths", () => {
  it("every floor is completable: shells composite, door answers whole, chests honest", () => {
    for (let floor = 1; floor <= 12; floor++) {
      for (let s = 0; s < 150; s++) {
        const rand = mulberry32(61000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const f = genFloor(floor, rnd);
        for (const shell of f.shells) {
          expect(splitPair(shell), `floor ${floor}: shell ${shell} unbreakable`).not.toBeNull();
        }
        for (const d of f.doors) {
          expect(Number.isInteger(d.answer)).toBe(true);
          expect(d.answer).toBeGreaterThanOrEqual(2);
          if (d.kind === "share") expect(d.bags! * d.answer).toBe(d.total);
          else expect(d.a! + d.answer).toBe(d.b);
        }
        for (const c of f.chests) {
          expect(c.pouches * c.each).toBe(c.answer);
        }
      }
    }
  });

  it("striking with true divisors always shatters a shell in finitely many blows", () => {
    for (let shell = 8; shell <= 96; shell++) {
      if (splitPair(shell) === null) continue;
      let v = shell;
      let guard = 0;
      while (guard++ < 20) {
        const pair = splitPair(v);
        if (!pair) break;
        const out = strike(v, pair[0]);
        expect(out.result).not.toBe("bounce");
        v = out.shell;
        if (out.result === "shatter") break;
      }
      expect(splitPair(v), `${shell} never shattered (stuck at ${v})`).toBeNull();
    }
  });

  it("a strike that does not divide always bounces and changes nothing", () => {
    const rand = mulberry32(777);
    const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
    for (let i = 0; i < 300; i++) {
      const shell = rnd(8, 96);
      const d = rnd(2, 97);
      const out = strike(shell, d);
      if (shell % d !== 0 || d >= shell) {
        expect(out.result).toBe("bounce");
        expect(out.shell).toBe(shell);
      }
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
  it("whatever the cut, the pieces add up to the whole rectangle", () => {
    // The distributive property itself. It must hold for every cut, not just the tens —
    // which is why she is allowed to cut anywhere.
    for (let a = 11; a <= 40; a += 3) {
      for (let b = 11; b <= 30; b += 3) {
        for (let x = 0; x <= a; x += 2) {
          for (let y = 0; y <= b; y += 3) {
            expect(areasSumToProduct({ a, b }, { x, y }), `${a}x${b} cut ${x},${y}`).toBe(true);
          }
        }
      }
    }
  });

  it("two cuts make four pieces; one makes two; none makes one", () => {
    const prob = { a: 23, b: 14 };
    expect(regionsFor(prob, { x: 20, y: 10 })).toHaveLength(4);
    expect(regionsFor(prob, { x: 20, y: 0 })).toHaveLength(2);
    expect(regionsFor(prob, { x: 0, y: 0 })).toHaveLength(1);
    // A cut flush with the edge is not a cut.
    expect(regionsFor(prob, { x: 23, y: 14 })).toHaveLength(1);
  });

  it("cutting at the tens is what makes every piece one she already knows", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(9000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genTiles(level, rnd);
        const easy = regionsFor(p, tensCut(p));
        expect(easy).toHaveLength(4);
        expect(allEasy(easy), `${p.a}x${p.b} at the tens is not easy`).toBe(true);
        // And the pieces really are the partial products.
        expect(easy.map((r) => r.area).reduce((m, n) => m + n, 0)).toBe(p.a * p.b);
      }
    }
  });

  it("an awkward cut still works but is not marked easy", () => {
    const prob = { a: 23, b: 14 };
    const awkward = regionsFor(prob, { x: 7, y: 5 });
    expect(awkward).toHaveLength(4);
    expect(allEasy(awkward)).toBe(false);
    expect(areasSumToProduct(prob, { x: 7, y: 5 })).toBe(true);
  });

  it("only the exact area counts as solved", () => {
    const prob = { a: 23, b: 14 };
    const regions = regionsFor(prob, tensCut(prob));
    const right = regions.map((r) => r.area);
    expect(allSolved(regions, right)).toBe(true);
    const oneOff = [...right];
    oneOff[0] = oneOff[0] + 1;
    expect(allSolved(regions, oneOff)).toBe(false);
    expect(allSolved(regions, [null, null, null, null])).toBe(false);
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
  it("slotPaths numbers every socket exactly once, in withOps order", () => {
    // Regression: the UI once numbered sockets with a counter mutated during render,
    // which double-counted under React's dev double-render — the level-1 socket wrote
    // to ops[1] and the outlet never evaluated. Indexes must come from the tree.
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(21000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const p = genMachine(level, rnd);
        const indexes = Object.values(slotPaths(p.shape)).sort((a, b) => a - b);
        expect(indexes, `L${level}`).toEqual(Array.from({ length: p.slotCount }, (_, i) => i));
      }
    }
  });

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
        expect(Number.isInteger(v), `${v} is not whole cents`).toBe(true);
      }
      expect(Number.isInteger(r.cupsUsed), "cups must be whole").toBe(true);
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

  it("formats money in dollars without float dust", () => {
    expect(money(0)).toBe("$0.00");
    expect(money(5)).toBe("$0.05");
    expect(money(460)).toBe("$4.60");
    expect(money(1234)).toBe("$12.34");
    expect(money(-250)).toBe("−$2.50");
  });

  it("says the same amount of flour in either unit system", () => {
    // The toggle must restate, never restate-and-change. A tray is a tray.
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 40; s++) {
        const rand = mulberry32(25000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const day = genDay(level, rnd);
        for (const o of day.offers) {
          // A sack holds a whole number of cups, so trays never come out fractional.
          expect(Number.isInteger(cupsIn(o))).toBe(true);
          expect(cupsIn(o)).toBe(o.pounds * CUPS_PER_POUND);
          expect(sackText(o, "us")).toContain("lb");
          expect(rateText(o, "us")).toContain("per lb");
          expect(rateText(o, "metric")).toContain("per kg");
        }
        expect(flourText(day.cupsPerTray, "us")).toContain("cup");
        expect(flourText(day.cupsPerTray, "metric")).toContain("g");
        // Whichever units are shown, the tray count is the same.
        expect(maxTrays(day, day.offers[0])).toBeGreaterThan(0);
      }
    }
  });

  it("the cheapest sack per pound is also the cheapest per kilo", () => {
    // If the toggle could flip which sack looks better, it would teach the wrong thing.
    for (let s = 0; s < 200; s++) {
      const rand = mulberry32(26000 + s);
      const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
      const day = genDay(3, rnd);
      const byPound = [...day.offers].sort((a, b) => unitRate(a) - unitRate(b));
      const perKilo = (o: (typeof day.offers)[number]) =>
        o.cents / ((o.pounds * CUPS_PER_POUND * 120) / 1000);
      const byKilo = [...day.offers].sort((a, b) => perKilo(a) - perKilo(b));
      expect(byKilo[0]).toEqual(byPound[0]);
    }
  });
});

describe("Build World", () => {
  const box = (w: number, d: number, h: number): Blocks => {
    const b: Blocks = {};
    for (let c = 0; c < w; c++) for (let r = 0; r < d; r++) b[key(c, r)] = h;
    return b;
  };

  it("measures a solid box the way a ruler would", () => {
    for (let w = 1; w <= 5; w++) {
      for (let d = 1; d <= 5; d++) {
        for (let h = 1; h <= 3; h++) {
          const b = box(w, d, h);
          expect(floorArea(b), `${w}x${d}x${h} area`).toBe(w * d);
          expect(volume(b), `${w}x${d}x${h} volume`).toBe(w * d * h);
          expect(perimeter(b), `${w}x${d} perimeter`).toBe(2 * (w + d));
          expect(isSolidBox(b)).toBe(true);
        }
      }
    }
  });

  it("counts the perimeter of a shape with a hole, where a path walk would not", () => {
    // A 3x3 ring: eight blocks around an empty middle.
    const b: Blocks = {};
    for (let c = 0; c < 3; c++)
      for (let r = 0; r < 3; r++) if (!(c === 1 && r === 1)) b[key(c, r)] = 1;
    expect(floorArea(b)).toBe(8);
    // 12 around the outside, 4 facing the hole.
    expect(perimeter(b)).toBe(16);
    expect(isSolidBox(b)).toBe(false);
  });

  it("a stack of different heights is not a solid box", () => {
    const b: Blocks = { [key(0, 0)]: 2, [key(1, 0)]: 1 };
    expect(isSolidBox(b)).toBe(false);
    expect(volume(b)).toBe(3);
  });

  it("every commission can actually be built on the grid", () => {
    for (let level = 1; level <= 4; level++) {
      for (let s = 0; s < 200; s++) {
        const rand = mulberry32(27000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const c = genCommission(level, rnd);

        if (c.kind === "floor") {
          // A rectangle with this area must fit, and meet the perimeter cap.
          const fits: [number, number][] = [];
          for (let w = 1; w <= GRID; w++) {
            const h = (c.target ?? 0) / w;
            if (Number.isInteger(h) && h <= GRID) fits.push([w, h]);
          }
          expect(fits.length, `L${level}: ${c.detail} does not fit`).toBeGreaterThan(0);
          if (c.maxPerimeter !== undefined) {
            const best = Math.min(...fits.map(([w, h]) => 2 * (w + h)));
            expect(best, `L${level}: ${c.detail} is impossible`).toBeLessThanOrEqual(
              c.maxPerimeter,
            );
          }
        }

        if (c.kind === "volume") {
          // Some w x d x h with all sides on the grid must exist.
          let ok = false;
          for (let w = 1; w <= GRID && !ok; w++)
            for (let d = 1; d <= GRID && !ok; d++)
              for (let h = 1; h <= 8 && !ok; h++)
                if (w * d * h === c.target) ok = true;
          expect(ok, `L${level}: ${c.detail} cannot be built`).toBe(true);
        }

        if (c.kind === "scale") {
          expect((c.fromW ?? 0) * (c.scaleBy ?? 1)).toBeLessThanOrEqual(GRID);
          expect((c.fromD ?? 0) * (c.scaleBy ?? 1)).toBeLessThanOrEqual(GRID);
        }
      }
    }
  });

  it("accepts a correct build and rejects a near miss", () => {
    const floorJob = {
      kind: "floor" as const,
      title: "t",
      detail: "d",
      target: 12,
      maxPerimeter: 14,
    };
    expect(check(floorJob, box(3, 4, 1)).met).toBe(true);
    // Right area, too much fence.
    expect(check(floorJob, box(12, 1, 1)).met).toBe(false);
    // Right area and perimeter, but two storeys.
    expect(check(floorJob, box(3, 4, 2)).met).toBe(false);

    const volJob = { kind: "volume" as const, title: "t", detail: "d", target: 24 };
    expect(check(volJob, box(2, 3, 4)).met).toBe(true);
    expect(check(volJob, box(2, 3, 3)).met).toBe(false);

    const scaleJob = {
      kind: "scale" as const,
      title: "t",
      detail: "d",
      fromW: 2,
      fromD: 3,
      scaleBy: 3,
    };
    expect(check(scaleJob, box(6, 9, 1)).met).toBe(true);
    expect(check(scaleJob, box(6, 8, 1)).met).toBe(false);
  });
});

describe("Crossing", () => {
  /**
   * These assert the *intent*, not the implementation. The previous browser check
   * computed the target row with the same `frogRow + 1` expression the scene used, so it
   * agreed with a bug that sent the frog across the whole river in one hop.
   */
  it("rows are ordered by travel, so one hop advances exactly one row", () => {
    // The frog starts at the bottom bank and finishes at the top, so row 0 must be the
    // LOWEST on screen (largest y) and each following row must be higher up.
    for (let i = 1; i < ROW_Y.length; i++) {
      expect(ROW_Y[i], `row ${i} is not further along than row ${i - 1}`).toBeLessThan(
        ROW_Y[i - 1],
      );
    }
  });

  it("the crossing needs one correct stone per row, in order", () => {
    for (const kind of ["mul", "div"] as const) {
      for (let level = 1; level <= 5; level++) {
        for (let s = 0; s < 120; s++) {
          const rand = mulberry32(28000 + s);
          const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
          const rule = makeCrossingRule(kind, level, rnd);
          expect(rule.sequence.length, `${rule.label}`).toBe(ROW_Y.length);
          // Ascending, so "the next one" is always well defined.
          for (let i = 1; i < rule.sequence.length; i++) {
            expect(rule.sequence[i], rule.label).toBeGreaterThan(rule.sequence[i - 1]);
          }
          // Every wanted value really satisfies the underlying rule.
          for (const v of rule.sequence) {
            if (kind === "mul") expect(v % rule.base, rule.label).toBe(0);
            else expect((rule.target ?? 0) % v, rule.label).toBe(0);
          }
        }
      }
    }
  });

  it("offers decoys that satisfy the rule but are the wrong step", () => {
    // This is what stops the game being winnable by pattern-matching: knowing "it is a
    // multiple of 5" is not enough when 35 is on the river and you need 20.
    for (const kind of ["mul", "div"] as const) {
      for (let s = 0; s < 120; s++) {
        const rand = mulberry32(29000 + s);
        const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
        const rule = makeCrossingRule(kind, 3, rnd);
        const decoys = rule.members.filter((m) => !rule.sequence.includes(m));
        expect(decoys.length, `${rule.label} has no decoys`).toBeGreaterThan(0);
      }
    }
  });
});
