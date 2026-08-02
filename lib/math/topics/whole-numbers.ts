/**
 * Place value & rounding, order of operations, exponents.
 *
 * Ported from docs/math-table.html:1438-1451 (place), :1570-1599 (pemdas),
 * :1653-1662 (exponents).
 */

import { evalSteps, exprText, type Token } from "../engines/pemdas";
import { fmt } from "../format";
import { SING, trimNum } from "../number";
import type { Rng } from "../rng";

/* ---------------------------------------------------------------- place */

export interface PlaceProblem {
  n: number;
  /** Power-of-ten exponent: 1 = tens, 2 = hundreds, … */
  place: number;
}

export function genPlace(level: number, rng: Rng): PlaceProblem {
  const d = [4, 5, 6, 7][level - 1];
  const range = [
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 5],
  ][level - 1];
  let n = 0;
  let place = 0;
  let guard = 0;
  // Two rejections, both from BUILD-NOTES issue 6: a number already round to that place
  // leaves nothing to decide, and a target digit of 0 means the first question asks what
  // a zero is worth.
  do {
    n = rng.int(Math.pow(10, d - 1), Math.pow(10, d) - 1);
    place = rng.int(range[0], Math.min(range[1], d - 1));
    guard++;
  } while (
    guard < 200 &&
    (n % Math.pow(10, place) === 0 ||
      Number(String(n)[String(n).length - 1 - place]) === 0)
  );
  return { n, place };
}

export const placeTitle = (p: PlaceProblem) =>
  `Round ${fmt(p.n)} to the nearest ${SING[p.place]}`;

export function placeAnswer(p: PlaceProblem): number {
  const pow = Math.pow(10, p.place);
  return Math.round(p.n / pow) * pow;
}

/* --------------------------------------------------------------- pemdas */

export interface PemdasProblem {
  tokens: Token[];
}

type Template = (rng: Rng) => Token[];

export const PEM_TEMPLATES: Record<number, Template[]> = {
  1: [
    (r) => [r.int(3, 20), "+", r.int(2, 9), "×", r.int(2, 9)],
    (r) => [r.int(2, 9), "×", r.int(2, 9), "+", r.int(3, 20)],
    (r) => {
      const a = r.int(4, 9);
      const b = r.int(4, 9);
      return [a, "×", b, "-", r.int(2, a * b - 1)];
    },
  ],
  2: [
    (r) => ["(", r.int(3, 15), "+", r.int(2, 12), ")", "×", r.int(2, 8)],
    (r) => {
      const b = r.int(6, 18);
      const c = r.int(2, b - 1);
      return [r.int(2, 9), "×", "(", b, "-", c, ")"];
    },
    (r) => {
      const d = r.int(2, 9);
      const q = r.int(2, 12);
      const sum = d * q;
      const a = r.int(1, sum - 1);
      return ["(", a, "+", sum - a, ")", "÷", d];
    },
  ],
  3: [
    (r) => {
      const a = r.int(3, 12);
      const b = r.int(2, 10);
      const c = r.int(2, 8);
      return ["(", a, "+", b, ")", "×", c, "-", r.int(2, (a + b) * c - 1)];
    },
    (r) => {
      const e = r.int(2, 9);
      const q = r.int(2, 9);
      const a = r.int(5, 25);
      const b = r.int(2, 9);
      const c = r.int(2, 9);
      return [a, "+", b, "×", c, "-", e * q, "÷", e];
    },
    (r) => {
      const b = r.int(6, 18);
      const c = r.int(2, b - 1);
      return [r.int(2, 9), "×", "(", b, "-", c, ")", "+", r.int(3, 30)];
    },
  ],
  4: [
    (r) => {
      const c = r.int(4, 12);
      const d = r.int(1, c - 1);
      return [r.int(3, 25), "+", r.int(2, 5), "×", "(", c, "-", d, ")", "^", 2];
    },
    (r) => {
      const a = r.int(5, 8);
      const b = r.int(5, 7);
      const c = r.int(2, 9);
      const d = r.int(2, 9);
      return ["(", a, "+", b, ")", "^", 2, "-", c, "×", d];
    },
    (r) => {
      const a = r.int(3, 12);
      const b = r.int(2, 9);
      return [a, "^", 2, "+", b, "^", 2, "-", r.int(2, a * a + b * b - 1)];
    },
  ],
};

/** Two identical reductions (6 × 5 − 6 × 5) would narrate the same words twice. */
function repeats(steps: { a: number; op: string; b: number }[]): boolean {
  const seen: Record<string, number> = {};
  for (const st of steps) {
    const k = `${st.a}${st.op}${st.b}`;
    if (seen[k]) return true;
    seen[k] = 1;
  }
  return false;
}

export function genPemdas(level: number, rng: Rng): PemdasProblem {
  const tpls = PEM_TEMPLATES[level];
  let tk: Token[] = [];
  let guard = 0;
  // Rejections from BUILD-NOTES issue 6: non-integer or non-positive answers, and
  // expressions that reduce in fewer than two visible moves.
  do {
    tk = rng.pick(tpls)(rng);
    const res = evalSteps(tk);
    guard++;
    if (
      Number.isInteger(res.value) &&
      res.value > 0 &&
      res.value <= 100000 &&
      res.steps.length >= 2 &&
      !repeats(res.steps)
    ) {
      return { tokens: tk };
    }
  } while (guard < 160);
  return { tokens: tk };
}

export const pemdasTitle = (p: PemdasProblem) => exprText(p.tokens);
export const pemdasAnswer = (p: PemdasProblem) => evalSteps(p.tokens).value;

/* ------------------------------------------------------------ exponents */

export type ExponentProblem =
  | { kind: "pow"; base: number; exp: number }
  | { kind: "ten"; n: number; k: number };

export function genExponents(level: number, rng: Rng): ExponentProblem {
  if (level === 1) return { kind: "pow", base: rng.int(2, 7), exp: rng.int(2, 3) };
  if (level === 2) return { kind: "pow", base: rng.int(2, 9), exp: rng.int(2, 4) };
  if (level === 3)
    return { kind: "ten", n: rng.int(2, 99) / rng.pick([1, 10, 100]), k: rng.int(1, 5) };
  return rng.coin(0.5)
    ? { kind: "pow", base: rng.int(3, 12), exp: rng.int(2, 3) }
    : { kind: "ten", n: rng.int(11, 999) / rng.pick([10, 100]), k: rng.int(2, 6) };
}

export const exponentKindOf = (p: ExponentProblem) => p.kind;

export const exponentTitle = (p: ExponentProblem) =>
  p.kind === "pow" ? `${p.base}^${p.exp}` : `${trimNum(p.n)} × 10^${p.k}`;

export function exponentAnswer(p: ExponentProblem): number {
  return p.kind === "pow" ? Math.pow(p.base, p.exp) : p.n * Math.pow(10, p.k);
}
