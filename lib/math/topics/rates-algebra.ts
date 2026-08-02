/**
 * The last six topics: multiplying/dividing decimals, percents, ratios, integers,
 * solving for x, and geometry.
 *
 * Ported from docs/math-table.html:2246-2255 (dec-muldiv), :2333-2345 (percent),
 * :2448-2457 (ratio), :2530-2539 (integers), :2629-2640 (equations),
 * :2772-2784 (geometry).
 */

import { fmt } from "../format";
import { rd, simp, trimNum } from "../number";
import type { Rng } from "../rng";

/* ------------------------------------------------------------ dec-muldiv */

export type DecMulDivProblem =
  | { kind: "mul"; a: number; b: number }
  | { kind: "div"; a: number; b: number; q: number };

export function genDecMulDiv(level: number, rng: Rng): DecMulDivProblem {
  const kind: "mul" | "div" =
    level === 3 ? "div" : level === 4 ? rng.pick(["mul", "div"] as const) : "mul";

  if (kind === "mul") {
    if (level === 1) return { kind: "mul", a: rng.int(15, 99) / 10, b: rng.int(3, 9) };
    return { kind: "mul", a: rng.int(15, 99) / 10, b: rng.int(11, 49) / 10 };
  }
  // Built backwards from divisor x quotient so it always divides cleanly.
  const dsr = rng.int(11, 49) / 10;
  const q = rng.int(3, 49);
  return { kind: "div", b: rd(dsr, 1), q, a: rd(dsr * q, 3) };
}

export const decMulDivKindOf = (p: DecMulDivProblem) => p.kind;

export const decMulDivTitle = (p: DecMulDivProblem) =>
  p.kind === "mul"
    ? `${trimNum(p.a)} × ${trimNum(p.b)}`
    : `${trimNum(p.a)} ÷ ${trimNum(p.b)}`;

export const decMulDivAnswer = (p: DecMulDivProblem) =>
  p.kind === "mul" ? rd(p.a * p.b, 10) : p.q;

/* --------------------------------------------------------------- percent */

export type PercentProblem =
  | { kind: "of"; p: number; n: number }
  | { kind: "whatpct"; a: number; b: number }
  | { kind: "convert"; p: number };

export function genPercent(level: number, rng: Rng): PercentProblem {
  if (level === 1)
    return { kind: "of", p: rng.pick([10, 20, 25, 50, 75]), n: rng.int(4, 60) * 4 };
  if (level === 2) return { kind: "of", p: rng.int(1, 19) * 5, n: rng.int(3, 50) * 4 };
  if (level === 3) {
    const b = rng.int(4, 25) * 4;
    const p = rng.pick([10, 20, 25, 40, 50, 60, 75, 80]);
    return { kind: "whatpct", a: rd((b * p) / 100, 4), b };
  }
  // Note: the original builds all three candidates before picking, so every branch's
  // random draws happen every time. Preserved exactly, or the stream diverges.
  const ofCase: PercentProblem = {
    kind: "of",
    p: rng.int(1, 19) * 5,
    n: rng.int(3, 50) * 4,
  };
  const b = rng.int(4, 25) * 4;
  const pp = rng.pick([10, 20, 25, 40, 50, 75]);
  const whatCase: PercentProblem = { kind: "whatpct", a: rd((b * pp) / 100, 4), b };
  const convertCase: PercentProblem = {
    kind: "convert",
    p: rng.pick([5, 12, 15, 24, 35, 44, 60, 85]),
  };
  return rng.pick([ofCase, whatCase, convertCase]);
}

export const percentKindOf = (p: PercentProblem) => p.kind;

export const percentTitle = (p: PercentProblem) =>
  p.kind === "of"
    ? `${p.p}% of ${fmt(p.n)}`
    : p.kind === "whatpct"
      ? `${trimNum(p.a)} is what percent of ${fmt(p.b)}?`
      : `Write ${p.p}% as a decimal and a fraction`;

export function percentAnswer(p: PercentProblem): string {
  if (p.kind === "of") return trimNum(rd((p.n * p.p) / 100, 4));
  if (p.kind === "whatpct") return `${rd((p.a / p.b) * 100, 4)}%`;
  const [n, d] = simp(p.p, 100);
  return `${rd(p.p / 100, 4)} and ${n}/${d}`;
}

/* ----------------------------------------------------------------- ratio */

export const RATIO_ITEMS: [string, string][] = [
  ["apples", "$"],
  ["notebooks", "$"],
  ["tickets", "$"],
  ["cupcakes", "$"],
  ["pencils", "$"],
  ["candles", "$"],
  ["batteries", "$"],
];

export type RatioProblem =
  | {
      kind: "unit";
      item: string;
      sym: string;
      n: number;
      total: number;
      unit: number;
      m: number;
    }
  | { kind: "equiv"; a: number; b: number; k: number };

export function genRatio(level: number, rng: Rng): RatioProblem {
  const kind: "unit" | "equiv" =
    level === 1 ? "unit" : level === 2 ? "equiv" : rng.pick(["unit", "equiv"] as const);

  if (kind === "unit") {
    const item = rng.pick(RATIO_ITEMS);
    const n = rng.int(2, 9);
    const unit = rng.int(2, level >= 3 ? 25 : 12);
    const m = rng.int(2, 15);
    return { kind: "unit", item: item[0], sym: item[1], n, total: n * unit, unit, m };
  }
  const a = rng.int(2, 9);
  const b = rng.int(2, 12);
  const k = rng.int(2, level >= 3 ? 9 : 5);
  return { kind: "equiv", a, b, k };
}

export const ratioKindOf = (p: RatioProblem) => p.kind;

export const ratioTitle = (p: RatioProblem) =>
  p.kind === "unit"
    ? `${p.n} ${p.item} cost ${p.sym}${fmt(p.total)} — what do ${p.m} cost?`
    : `${p.a} : ${p.b} = ${p.a * p.k} : ?`;

export const ratioAnswer = (p: RatioProblem) =>
  p.kind === "unit" ? p.unit * p.m : p.b * p.k;

/* -------------------------------------------------------------- integers */

export interface IntegerProblem {
  kind: "add" | "sub" | "mul" | "div";
  a: number;
  b: number;
}

export function sgnPlain(x: number): string {
  return x < 0 ? `(-${Math.abs(x)})` : String(x);
}

export function genIntegers(level: number, rng: Rng): IntegerProblem {
  if (level === 1) {
    // `|| 3` mirrors the original: rnd can return 0, and 0 makes a dull problem.
    const a = rng.int(-15, 15) || 3;
    const b = -rng.int(1, 15);
    return { kind: "add", a, b };
  }
  if (level === 2) {
    const a = rng.int(-15, 15) || 4;
    return { kind: "sub", a, b: -rng.int(1, 15) };
  }
  if (level === 3) {
    const a = rng.int(-25, 25) || 5;
    const b = (rng.coin(0.5) ? -1 : 1) * rng.int(1, 25);
    return { kind: rng.pick(["add", "sub"] as const), a, b };
  }
  return {
    kind: rng.pick(["mul", "div"] as const),
    a: (rng.coin(0.5) ? -1 : 1) * rng.int(2, 12),
    b: (rng.coin(0.5) ? -1 : 1) * rng.int(2, 12),
  };
}

export const integerKindOf = (p: IntegerProblem) => p.kind;

export function integerTitle(p: IntegerProblem): string {
  const o = { add: "+", sub: "−", mul: "×", div: "÷" }[p.kind];
  // Division is presented as (a*b) ÷ b so it always divides exactly.
  return p.kind === "div"
    ? `${sgnPlain(p.a * p.b)} ÷ ${sgnPlain(p.b)}`
    : `${sgnPlain(p.a)} ${o} ${sgnPlain(p.b)}`;
}

export function integerAnswer(p: IntegerProblem): number {
  if (p.kind === "add") return p.a + p.b;
  if (p.kind === "sub") return p.a - p.b;
  if (p.kind === "mul") return p.a * p.b;
  return p.a;
}

/* ------------------------------------------------------------- equations */

export interface EquationProblem {
  kind: "add" | "sub" | "mul" | "div" | "two";
  x: number;
  a: number;
  b?: number;
}

export function genEquations(level: number, rng: Rng): EquationProblem {
  const mk = (kind: EquationProblem["kind"], amax: number): EquationProblem => {
    const a = rng.int(2, amax);
    // For x ÷ a = b the answer has to divide evenly, so x is built from a.
    const x = kind === "div" ? a * rng.int(2, 9) : rng.int(2, 25);
    return { kind, x, a };
  };
  if (level === 1) return mk(rng.pick(["add", "sub"] as const), 20);
  if (level === 2) return mk(rng.pick(["mul", "div"] as const), 9);
  if (level === 3) return mk(rng.pick(["add", "sub", "mul", "div"] as const), 12);
  const a = rng.int(2, 9);
  const x = rng.int(2, 15);
  const b = rng.int(2, 25);
  return { kind: "two", x, a, b };
}

export const equationKindOf = (p: EquationProblem) => p.kind;

export function equationTitle(p: EquationProblem): string {
  const { x, a } = p;
  if (p.kind === "add") return `x + ${a} = ${x + a}`;
  if (p.kind === "sub") return `x − ${a} = ${x - a}`;
  if (p.kind === "mul") return `${a}x = ${a * x}`;
  if (p.kind === "div") return `x ÷ ${a} = ${x / a}`;
  return `${a}x + ${p.b} = ${a * x + (p.b ?? 0)}`;
}

export const equationAnswer = (p: EquationProblem) => p.x;

/* -------------------------------------------------------------- geometry */

export const UNITS = ["cm", "in", "ft", "m"] as const;

export type GeometryProblem =
  | { kind: "area" | "perim"; w: number; h: number; u: string }
  | { kind: "tri" | "para"; w: number; h: number; u: string }
  | { kind: "vol"; w: number; h: number; d: number; u: string }
  | { kind: "ell"; w1: number; h1: number; w2: number; h2: number; u: string };

const GEO_KINDS = ["area", "perim", "tri", "para", "vol", "ell"] as const;

export function genGeometry(level: number, rng: Rng): GeometryProblem {
  const u = rng.pick(UNITS);
  // One shape per level. Picking randomly inside a level meant choosing "Triangles" and
  // getting a rectangle, which reads as a bug even when the maths is right — BUILD-NOTES
  // issue 9.
  const kind = level >= 7 ? rng.pick(GEO_KINDS) : GEO_KINDS[level - 1];

  if (kind === "ell")
    return {
      kind: "ell",
      w1: rng.int(8, 18),
      h1: rng.int(6, 14),
      w2: rng.int(3, 6),
      h2: rng.int(2, 5),
      u,
    };
  if (kind === "vol")
    return { kind: "vol", w: rng.int(3, 15), h: rng.int(2, 12), d: rng.int(2, 9), u };
  if (kind === "tri") return { kind: "tri", w: rng.int(4, 20), h: rng.int(3, 16), u };
  if (kind === "para") return { kind: "para", w: rng.int(4, 16), h: rng.int(3, 12), u };
  return { kind, w: rng.int(3, 20), h: rng.int(2, 16), u };
}

export const geometryKindOf = (p: GeometryProblem) => p.kind;

export const geometryTitle = (p: GeometryProblem) =>
  ({
    area: "Area of a rectangle",
    perim: "Perimeter of a rectangle",
    tri: "Area of a triangle",
    para: "Area of a parallelogram",
    vol: "Volume of a box",
    ell: "Area of an L-shape",
  })[p.kind];

export function geometryAnswer(p: GeometryProblem): number {
  switch (p.kind) {
    case "area":
      return p.w * p.h;
    case "perim":
      return 2 * (p.w + p.h);
    case "tri":
      return (p.w * p.h) / 2;
    case "para":
      return p.w * p.h;
    case "vol":
      return p.w * p.h * p.d;
    case "ell":
      return p.w1 * p.h1 - p.w2 * p.h2;
  }
}
