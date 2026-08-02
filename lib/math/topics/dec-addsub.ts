/**
 * Adding and subtracting decimals — the grid engine with a decimal-point column.
 *
 * Ported from docs/math-table.html:2150-2171.
 *
 * Level 4 ("Across zeros") took two attempts in the original, both caught by tests before
 * shipping: first the generator swapped operands when the second was larger, putting the
 * decimal on top; then even after fixing that, a hundredths digit of zero meant the borrow
 * started at the tenths column and never crossed anything. Both guards are preserved
 * verbatim below — see BUILD-NOTES issue 10.
 */

import { buildColumn, type ColumnModel } from "../engines/column";
import { decPlaces, rd, trimNum } from "../number";
import type { Rng } from "../rng";

export interface DecProblem {
  a: number;
  b: number;
  op: "+" | "-";
}

export function genDecAddSub(level: number, rng: Rng): DecProblem {
  const op: "+" | "-" = level === 4 ? "-" : rng.coin(0.5) ? "+" : "-";
  let a: number;
  let b: number;

  if (level === 1) {
    a = rng.int(15, 899) / 10;
    b = rng.int(15, 499) / 10;
  } else if (level === 2) {
    a = rng.int(150, 8999) / 100;
    b = rng.int(150, 4999) / 100;
  } else if (level === 3) {
    a = rng.int(150, 8999) / 100;
    b = rng.int(15, 499) / 10;
  } else {
    // Whole number on top so the borrow travels through .00. b is built strictly below a
    // so the swap below can never flip them and put the decimal on top. The hundredths
    // digit must be non-zero, or the borrow starts at the tenths column and never crosses
    // a zero at all.
    a = rng.int(20, 90);
    b = (rng.int(1, a - 1) * 100 + rng.int(0, 9) * 10 + rng.int(1, 9)) / 100;
  }

  a = rd(a, 2);
  b = rd(b, 2);
  if (op === "-" && b > a) {
    const t = a;
    a = b;
    b = t;
  }
  if (op === "-" && a === b) a = rd(a + 1.5, 2);

  return { a, b, op };
}

export const decTitle = (p: DecProblem) =>
  `${trimNum(p.a)} ${p.op === "+" ? "+" : "−"} ${trimNum(p.b)}`;

export const decKindOf = (p: DecProblem) => (p.op === "+" ? "add" : "sub");

/** Aligned digit strings plus where the point sits, ready for buildColumn. */
export function decColumns(p: DecProblem): {
  model: ColumnModel;
  dp: number;
  dotAt: number;
} {
  const { a, b, op } = p;
  const dp = Math.max(decPlaces(a), decPlaces(b), 1);
  const As = a.toFixed(dp);
  const Bs = b.toFixed(dp);
  const ai = As.split(".")[0];
  const af = As.split(".")[1];
  const bi = Bs.split(".")[0];
  const bf = Bs.split(".")[1];
  const il = Math.max(ai.length, bi.length);

  const aDigits = ai.padStart(il, "0") + af;
  const bDigits = bi.padStart(il, "0") + bf;
  // The point sits before index `il` in the combined digit string.
  const model = buildColumn(op, aDigits, bDigits, il);
  return { model, dp, dotAt: il };
}

export function decAnswer(p: DecProblem): number {
  return rd(p.op === "+" ? p.a + p.b : p.a - p.b, 10);
}
