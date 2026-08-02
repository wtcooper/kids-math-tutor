/**
 * Base-10 sharing — the model behind long division's "Picture it".
 *
 * Ported from docs/math-table.html:1229-1238. Already pure data in the original.
 *
 * Each stage is one place value: how many blocks of that size you have (including any
 * traded down from the place above), how many each group gets, and what is left to trade
 * onward. Doing it this way is what makes 372 ÷ 5 explicable — you can see that there are
 * not enough hundreds to give everyone one.
 */

import { PLACES } from "../number";

export interface ShareStage {
  /** Power-of-ten place: 2 = hundreds, 1 = tens, 0 = ones. */
  place: number;
  name: string;
  /** The digit of the dividend at this place. */
  digit: number;
  /** How many were traded down from the place above. */
  carryIn: number;
  /** Total available here, i.e. carryIn * 10 + digit. */
  avail: number;
  /** How many each group gets — this is the quotient digit. */
  each: number;
  /** What will not split, and gets traded down. */
  left: number;
}

export interface ShareModel {
  stages: ShareStage[];
  leftover: number;
}

export function buildShare(dividend: number, divisor: number): ShareModel {
  const ds = String(dividend).split("").map(Number);
  const n = ds.length;
  const stages: ShareStage[] = [];
  let carry = 0;

  for (let i = 0; i < n; i++) {
    const place = n - 1 - i;
    const avail = carry * 10 + ds[i];
    const each = Math.floor(avail / divisor);
    const left = avail - each * divisor;
    stages.push({ place, name: PLACES[place], digit: ds[i], carryIn: carry, avail, each, left });
    carry = left;
  }

  return { stages, leftover: carry };
}
