/**
 * Multiplication and long-division models.
 *
 * Ported from docs/math-table.html:944-962 (buildMulModel), :1168-1181 (buildDivModel)
 * and :1025-1030 (decompose). All three were already pure data in the original — the HTML
 * lived in separate render functions — so this half ports across unchanged.
 */

export interface MulDigitStep {
  k: number;
  ad?: number;
  bd?: number;
  raw?: number;
  carryIn: number;
  tot?: number;
  write: number;
  carryOut?: number;
  /** The final leading carry, which has no A-digit of its own. */
  last: boolean;
}

export interface MulPart {
  /** Which digit of B this partial product came from, 0 = ones. */
  j: number;
  bd: number;
  digitSteps: MulDigitStep[];
  digits: string;
  value: number;
}

export interface MulModel {
  a: number;
  b: number;
  A: string;
  B: string;
  cols: number;
  parts: MulPart[];
  product: number;
}

export function buildMulModel(a: number, b: number): MulModel {
  const A = String(a);
  const B = String(b);
  const cols = A.length + B.length + 1;
  const parts: MulPart[] = [];

  for (let j = 0; j < B.length; j++) {
    const bd = Number(B[B.length - 1 - j]);
    const digitSteps: MulDigitStep[] = [];
    let carry = 0;
    let res = "";

    for (let k = 0; k < A.length; k++) {
      const ad = Number(A[A.length - 1 - k]);
      const raw = ad * bd;
      const tot = raw + carry;
      const w = tot % 10;
      const co = Math.floor(tot / 10);
      digitSteps.push({
        k,
        ad,
        bd,
        raw,
        carryIn: carry,
        tot,
        write: w,
        carryOut: co,
        last: false,
      });
      res = String(w) + res;
      carry = co;
    }
    if (carry > 0) {
      digitSteps.push({ k: A.length, write: carry, last: true, carryIn: carry });
      res = String(carry) + res;
    }
    parts.push({ j, bd, digitSteps, digits: res, value: bd * a * Math.pow(10, j) });
  }

  return { a, b, A, B, cols, parts, product: a * b };
}

export interface DivStep {
  i: number;
  cur: number;
  q: number;
  p: number;
  r: number;
  /**
   * A leading zero in the quotient, skipped by the renderer. This is the 372 ÷ 5 case
   * where nothing is written above the 3 — a classic sticking point the tutor explains
   * deliberately rather than hiding.
   */
  hidden: boolean;
  bring: number | null;
}

export interface DivModel {
  dividend: number;
  divisor: number;
  ds: number[];
  n: number;
  cols: number;
  steps: DivStep[];
  quotient: number;
  remainder: number;
}

export function buildDivModel(dividend: number, divisor: number): DivModel {
  const ds = String(dividend).split("").map(Number);
  const n = ds.length;
  const steps: DivStep[] = [];
  let rem = 0;
  let seen = false;

  for (let i = 0; i < n; i++) {
    const cur = rem * 10 + ds[i];
    const q = Math.floor(cur / divisor);
    const p = q * divisor;
    const r = cur - p;
    const hidden = !seen && q === 0;
    if (q > 0) seen = true;
    steps.push({ i, cur, q, p, r, hidden, bring: i < n - 1 ? ds[i + 1] : null });
    rem = r;
  }

  return {
    dividend,
    divisor,
    ds,
    n,
    cols: n + 1,
    steps,
    quotient: Math.floor(dividend / divisor),
    remainder: dividend % divisor,
  };
}

/** 342 → [300, 40, 2]. Zeros are dropped, which is what the area model wants. */
export function decompose(n: number): number[] {
  const s = String(n);
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const v = Number(s[i]) * Math.pow(10, s.length - 1 - i);
    if (v) out.push(v);
  }
  return out;
}
