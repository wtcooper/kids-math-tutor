/**
 * The four fraction topics.
 *
 * Ported from docs/math-table.html:1772-1782 (frac-equiv), :1848-1857 (frac-mixed),
 * :1915-1943 (frac-addsub), :2035-2049 (frac-muldiv), plus coprimeNum at :1738.
 */

import { gcd, lcm, simp } from "../number";
import type { Rng } from "../rng";

/** A numerator coprime with d, so the fraction is already in lowest terms. */
export function coprimeNum(d: number, rng: Rng): number {
  const opts: number[] = [];
  for (let i = 1; i < d; i++) if (gcd(i, d) === 1) opts.push(i);
  return opts.length ? rng.pick(opts) : 1;
}

export function mixText(w: number, n: number, d: number): string {
  if (!w) return `${n}/${d}`;
  if (!n) return String(w);
  return `${w} ${n}/${d}`;
}

/* ------------------------------------------------------------ frac-equiv */

export interface EquivProblem {
  kind: "simplify" | "missing";
  n: number;
  d: number;
  k: number;
}

export function genFracEquiv(level: number, rng: Rng): EquivProblem {
  const kind: EquivProblem["kind"] =
    level >= 3 && rng.coin(0.5) ? "missing" : "simplify";
  const dmax = [6, 12, 16, 20][level - 1];
  const kmax = [3, 5, 7, 9][level - 1];
  let d = 0;
  let n = 0;
  let guard = 0;
  do {
    d = rng.int(3, dmax);
    n = rng.int(1, d - 1);
    guard++;
  } while (gcd(n, d) !== 1 && guard < 80);
  return { kind, n, d, k: rng.int(2, kmax) };
}

export const fracEquivTitle = (p: EquivProblem) =>
  p.kind === "simplify"
    ? `Simplify ${p.n * p.k}/${p.d * p.k}`
    : `${p.n}/${p.d} = ?/${p.d * p.k}`;

export const fracEquivAnswer = (p: EquivProblem) =>
  p.kind === "simplify" ? `${p.n}/${p.d}` : String(p.n * p.k);

/* ------------------------------------------------------------ frac-mixed */

export interface MixedProblem {
  kind: "toMixed" | "toImproper";
  d: number;
  w: number;
  r: number;
}

export function genFracMixed(level: number, rng: Rng): MixedProblem {
  const kind: MixedProblem["kind"] =
    level === 1 ? "toMixed" : rng.pick(["toMixed", "toImproper"] as const);
  const dmax = [5, 8, 10, 12][level - 1];
  const wmax = [3, 5, 7, 9][level - 1];
  const d = rng.int(2, dmax);
  const w = rng.int(1, wmax);
  const r = coprimeNum(d, rng);
  return { kind, d, w, r };
}

export const fracMixedTitle = (p: MixedProblem) =>
  p.kind === "toMixed"
    ? `Write ${p.w * p.d + p.r}/${p.d} as a mixed number`
    : `Write ${p.w} ${p.r}/${p.d} as an improper fraction`;

export const fracMixedAnswer = (p: MixedProblem) =>
  p.kind === "toMixed" ? `${p.w} ${p.r}/${p.d}` : `${p.w * p.d + p.r}/${p.d}`;

/* ----------------------------------------------------------- frac-addsub */

export interface AddSubFracProblem {
  op: "+" | "-";
  w1: number;
  n1: number;
  d1: number;
  w2: number;
  n2: number;
  d2: number;
}

export function genFracAddSub(level: number, rng: Rng): AddSubFracProblem {
  let guard = 0;
  let p: AddSubFracProblem = { op: "+", w1: 0, n1: 1, d1: 2, w2: 0, n2: 1, d2: 2 };

  do {
    guard++;
    const op: "+" | "-" = rng.coin(0.5) ? "+" : "-";

    if (level === 1) {
      const d = rng.int(3, 12);
      let n1 = coprimeNum(d, rng);
      let n2 = coprimeNum(d, rng);
      if (op === "-" && n1 < n2) {
        const t = n1;
        n1 = n2;
        n2 = t;
      }
      p = { op, w1: 0, n1, d1: d, w2: 0, n2, d2: d };
    } else if (level === 2) {
      // One denominator divides the other, so only one side needs re-cutting.
      const d = rng.int(2, 6);
      const k = rng.int(2, 4);
      const D = d * k;
      const a = { n: coprimeNum(D, rng), d: D };
      const b = { n: coprimeNum(d, rng), d };
      p = { op, w1: 0, n1: a.n, d1: a.d, w2: 0, n2: b.n, d2: b.d };
    } else if (level === 3) {
      // Coprime denominators, so the common denominator is the product — the case that
      // actually needs the LCM idea.
      let d1 = 0;
      let d2 = 0;
      do {
        d1 = rng.int(3, 9);
        d2 = rng.int(3, 9);
      } while (d1 === d2 || gcd(d1, d2) !== 1);
      p = { op, w1: 0, n1: coprimeNum(d1, rng), d1, w2: 0, n2: coprimeNum(d2, rng), d2 };
    } else {
      const d1 = rng.int(2, 8);
      const d2 = rng.int(2, 8);
      p = {
        op,
        w1: rng.int(1, 4),
        n1: coprimeNum(d1, rng),
        d1,
        w2: rng.int(1, 3),
        n2: coprimeNum(d2, rng),
        d2,
      };
    }

    const N1 = p.w1 * p.d1 + p.n1;
    const N2 = p.w2 * p.d2 + p.n2;
    const L = lcm(p.d1, p.d2);
    const R = p.op === "+" ? N1 * (L / p.d1) + N2 * (L / p.d2) : N1 * (L / p.d1) - N2 * (L / p.d2);
    if (R > 0) return p;

    if (p.op === "-") {
      // Swap so the answer stays positive — negative fractions belong to a later topic.
      const q: AddSubFracProblem = {
        op: "-",
        w1: p.w2,
        n1: p.n2,
        d1: p.d2,
        w2: p.w1,
        n2: p.n1,
        d2: p.d1,
      };
      const A = q.w1 * q.d1 + q.n1;
      const B = q.w2 * q.d2 + q.n2;
      const L2 = lcm(q.d1, q.d2);
      if (A * (L2 / q.d1) - B * (L2 / q.d2) > 0) return q;
    }
  } while (guard < 120);

  return p;
}

export const fracAddSubTitle = (p: AddSubFracProblem) =>
  `${mixText(p.w1, p.n1, p.d1)} ${p.op === "+" ? "+" : "−"} ${mixText(p.w2, p.n2, p.d2)}`;

export const fracAddSubKindOf = (p: AddSubFracProblem) => (p.op === "+" ? "add" : "sub");

/** Exact result as an improper fraction in lowest terms. */
export function fracAddSubAnswer(p: AddSubFracProblem): [number, number] {
  const N1 = p.w1 * p.d1 + p.n1;
  const N2 = p.w2 * p.d2 + p.n2;
  const L = lcm(p.d1, p.d2);
  const num = p.op === "+" ? N1 * (L / p.d1) + N2 * (L / p.d2) : N1 * (L / p.d1) - N2 * (L / p.d2);
  return simp(num, L);
}

/* ----------------------------------------------------------- frac-muldiv */

export interface MulDivFracProblem {
  kind: "mul" | "div";
  w1: number;
  n1: number;
  d1: number;
  w2: number;
  n2: number;
  d2: number;
}

export function genFracMulDiv(level: number, rng: Rng): MulDivFracProblem {
  const kind: MulDivFracProblem["kind"] =
    level === 1 ? "mul" : rng.pick(["mul", "div"] as const);

  if (level === 4) {
    const d1 = rng.int(2, 6);
    const d2 = rng.int(2, 6);
    return {
      kind,
      w1: rng.int(1, 3),
      n1: coprimeNum(d1, rng),
      d1,
      w2: rng.int(1, 2),
      n2: coprimeNum(d2, rng),
      d2,
    };
  }

  const dmax = [6, 8, 10, 10][level - 1];
  const d1 = rng.int(2, dmax);
  const d2 = rng.int(2, dmax);
  return { kind, w1: 0, n1: coprimeNum(d1, rng), d1, w2: 0, n2: coprimeNum(d2, rng), d2 };
}

export const fracMulDivTitle = (p: MulDivFracProblem) =>
  `${mixText(p.w1, p.n1, p.d1)} ${p.kind === "mul" ? "×" : "÷"} ${mixText(p.w2, p.n2, p.d2)}`;

export const fracMulDivKindOf = (p: MulDivFracProblem) => p.kind;

export function fracMulDivAnswer(p: MulDivFracProblem): [number, number] {
  const N1 = p.w1 * p.d1 + p.n1;
  const N2 = p.w2 * p.d2 + p.n2;
  return p.kind === "mul"
    ? simp(N1 * N2, p.d1 * p.d2)
    : simp(N1 * p.d2, p.d1 * N2);
}
