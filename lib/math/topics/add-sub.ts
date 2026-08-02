/**
 * Addition and subtraction with regrouping.
 *
 * The generators here look over-engineered until you read BUILD-NOTES issue 10: picking
 * two numbers at random meant level 1 of "Subtraction with regrouping" actually regrouped
 * only 37% of the time. On the level where a struggling kid *meets* the idea, nearly two
 * in three problems demonstrated nothing. Both generators now simulate the columns and
 * reject any problem that does not regroup.
 */

import {
  buildColumn,
  hasBorrow,
  hasBorrowAcrossZero,
  hasCarry,
  padPair,
  type ColumnModel,
} from "../engines/column";
import { fmt } from "../format";
import { roundNice } from "../number";
import type { Rng } from "../rng";

export interface AddSubProblem {
  a: number;
  b: number;
}

const ADD_DIGITS = [2, 3, 4, 5];
const SUB_DIGITS = [2, 3, 4, 4];

export function genAdd(level: number, rng: Rng): AddSubProblem {
  const d = ADD_DIGITS[level - 1];
  const lo = Math.pow(10, d - 1);
  const hi = Math.pow(10, d) - 1;
  // Bounded retry, matching the original's guard count exactly — the loop count is part
  // of the random stream, so changing it would change every generated problem.
  for (let guard = 0; guard < 400; guard++) {
    const a = rng.int(lo, hi);
    const b = rng.int(lo, hi);
    const [as, bs] = padPair(a, b);
    if (hasCarry(buildColumn("+", as, bs, -1))) return { a, b };
  }
  return { a: hi, b: hi };
}

export function genSub(level: number, rng: Rng): AddSubProblem {
  const d = SUB_DIGITS[level - 1];
  const lo = Math.pow(10, d - 1);
  const hi = Math.pow(10, d) - 1;

  for (let guard = 0; guard < 600; guard++) {
    let a: number;
    let b: number;

    if (level === 4) {
      // Interior zeros are constructed rather than hoped for, so the borrow has to
      // travel across them. Rejecting on the model alone was not enough: a hundredths
      // digit of zero meant the borrow started one column along and never crossed
      // anything (BUILD-NOTES issue 10).
      let str = String(rng.int(1, 9));
      for (let i = 1; i < d - 1; i++) str += "0";
      str += String(rng.int(0, 9));
      a = Number(str);
      b = rng.int(Math.floor(a / 3), a - 1);
    } else {
      a = rng.int(lo, hi);
      b = rng.int(lo, a - 1);
    }

    if (a <= b || a - b < 10) continue;

    // Note: B padded to A's width, not both to a common max — a is always the longer.
    const A = String(a);
    const B = String(b).padStart(A.length, "0");
    const m = buildColumn("-", A, B, -1);
    if (!hasBorrow(m)) continue;
    if (level === 4 && !hasBorrowAcrossZero(m)) continue;
    return { a, b };
  }
  return { a: 1000, b: 247 };
}

export function addModel(p: AddSubProblem): ColumnModel {
  const [as, bs] = padPair(p.a, p.b);
  return buildColumn("+", as, bs, -1);
}

export function subModel(p: AddSubProblem): ColumnModel {
  const A = String(p.a);
  return buildColumn("-", A, String(p.b).padStart(A.length, "0"), -1);
}

export const addTitle = (p: AddSubProblem) => `${fmt(p.a)} + ${fmt(p.b)}`;
export const subTitle = (p: AddSubProblem) => `${fmt(p.a)} − ${fmt(p.b)}`;

export const addAnswer = (p: AddSubProblem) => p.a + p.b;
export const subAnswer = (p: AddSubProblem) => p.a - p.b;

/**
 * Estimate hints round to the leading digit, not to two significant figures — see
 * BUILD-NOTES issue 2. Rounding 342 to 340 predicted ~10,200 for 342 × 26 (actual 8,892),
 * which teaches the wrong instinct about whether an estimate is worth doing.
 */
export function addHint(p: AddSubProblem): string {
  const ra = roundNice(p.a);
  const rb = roundNice(p.b);
  return `Estimate first: about ${fmt(ra)} + ${fmt(rb)} ≈ ${fmt(ra + rb)}.`;
}

export function subHint(p: AddSubProblem): string {
  const ra = roundNice(p.a);
  const rb = roundNice(p.b);
  return `Estimate first: about ${fmt(ra)} − ${fmt(rb)} ≈ ${fmt(ra - rb)}.`;
}
