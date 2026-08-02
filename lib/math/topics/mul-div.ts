/**
 * Multi-digit multiplication and long division.
 *
 * Ported from docs/math-table.html:1032-1045 (mul) and :1253-1265 (div).
 */

import { buildDivModel, buildMulModel, type DivModel, type MulModel } from "../engines/mul-div";
import { fmt } from "../format";
import { roundNice } from "../number";
import type { Rng } from "../rng";

export interface MulProblem {
  a: number;
  b: number;
}

export interface DivProblem {
  dividend: number;
  divisor: number;
}

export function genMul(level: number, rng: Rng): MulProblem {
  let a = 0;
  let b = 0;
  let guard = 0;
  // A zero digit in the multiplier produces a partial product of all zeros, which teaches
  // nothing and looks like a mistake. Rejected rather than special-cased in the renderer.
  do {
    if (level === 1) {
      a = rng.int(12, 99);
      b = rng.int(3, 9);
    } else if (level === 2) {
      a = rng.int(102, 999);
      b = rng.int(3, 9);
    } else if (level === 3) {
      a = rng.int(112, 999);
      b = rng.int(12, 99);
    } else {
      a = rng.int(1102, 9999);
      b = rng.int(12, 99);
    }
    guard++;
  } while (String(b).indexOf("0") >= 0 && guard < 60);
  return { a, b };
}

export function genDiv(level: number, rng: Rng): DivProblem {
  let dsr = 0;
  let q = 0;
  let dvd = 0;
  let rem = 0;
  let guard = 0;
  // Built backwards from divisor × quotient + remainder so the numbers always divide the
  // way the level promises, rather than hoping a random pair happens to.
  do {
    guard++;
    if (level === 1) {
      dsr = rng.int(2, 6);
      const qmin = Math.max(11, Math.ceil(20 / dsr));
      const qmax = Math.floor(99 / dsr);
      q = rng.int(qmin, qmax);
      rem = 0;
    } else if (level === 2) {
      dsr = rng.int(2, 9);
      q = rng.int(100, Math.floor(999 / dsr));
      rem = rng.coin(0.45) ? rng.int(1, dsr - 1) : 0;
    } else if (level === 3) {
      dsr = rng.int(3, 9);
      q = rng.int(Math.ceil(1000 / dsr), Math.min(999, Math.floor(9990 / dsr)));
      rem = rng.coin(0.6) ? rng.int(1, dsr - 1) : 0;
    } else {
      dsr = rng.int(12, 49);
      q = rng.int(21, 199);
      rem = rng.coin(0.6) ? rng.int(1, dsr - 1) : 0;
    }
    dvd = dsr * q + rem;
  } while ((dvd < 10 || dvd > 99999) && guard < 80);
  return { dividend: dvd, divisor: dsr };
}

export const mulTitle = (p: MulProblem) => `${fmt(p.a)} × ${fmt(p.b)}`;
export const divTitle = (p: DivProblem) => `${fmt(p.dividend)} ÷ ${p.divisor}`;

export const mulModel = (p: MulProblem): MulModel => buildMulModel(p.a, p.b);
export const divModel = (p: DivProblem): DivModel =>
  buildDivModel(p.dividend, p.divisor);

export function mulHint(p: MulProblem): string {
  const ra = roundNice(p.a);
  const rb = roundNice(p.b);
  return `Estimate first: about ${fmt(ra)} × ${fmt(rb)} ≈ ${fmt(ra * rb)}.`;
}

export function divAnswerText(p: DivProblem): string {
  const q = Math.floor(p.dividend / p.divisor);
  const r = p.dividend % p.divisor;
  return fmt(q) + (r ? ` r${r}` : "");
}

export function divHint(p: DivProblem): string {
  return `Roughly how many ${p.divisor}s fit into ${fmt(p.dividend)}? The remainder must be smaller than ${p.divisor}.`;
}
