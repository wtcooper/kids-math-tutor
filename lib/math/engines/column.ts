/**
 * Column arithmetic — the model behind add, sub and dec-addsub.
 *
 * Ported from docs/math-table.html:513-551. The original was already pure data here; the
 * HTML lived in a separate render layer, which is why this half of the grid engine ports
 * across almost unchanged.
 *
 * The one deliberate change: `steps` is data only, and the answer state a student types
 * lives elsewhere. The original mutated slot objects on the model in place, so the model
 * and the view state were the same objects — which in React produces stale renders that
 * are miserable to trace.
 */

export type ColumnOp = "+" | "-";

export interface AddStep {
  k: number;
  col: number;
  a: number;
  b: number;
  carryIn: number;
  tot: number;
  write: number;
  carryOut: number;
}

export interface Borrow {
  /** Index of the digit actually decremented. */
  from: number;
  /** Zero columns in between, which become 9s. This is the across-zeros case. */
  chain: number[];
}

export interface SubStep {
  k: number;
  col: number;
  a: number;
  b: number;
  top: number;
  write: number;
  borrowed: Borrow | null;
  workSnapshot: number[];
}

export interface ColumnModel {
  op: ColumnOp;
  n: number;
  A: number[];
  B: number[];
  steps: (AddStep | SubStep)[];
  res: number[];
  /** Addition only: the leading carry digit, revealed by its own phase. */
  lead?: number;
  /** Subtraction only: the borrowed-into top row. */
  work?: number[];
  /** Index the decimal point sits before, or -1 for whole numbers. */
  dotAt: number;
}

/**
 * @param aStr,bStr equal-length digit strings, no decimal point
 * @param dotAt index in the string BEFORE which the point sits, or -1
 */
export function buildColumn(
  op: ColumnOp,
  aStr: string,
  bStr: string,
  dotAt: number,
): ColumnModel {
  const n = aStr.length;
  const A = aStr.split("").map(Number);
  const B = bStr.split("").map(Number);
  const res = new Array<number>(n).fill(0);

  if (op === "+") {
    const steps: AddStep[] = [];
    let carry = 0;
    for (let k = 0; k < n; k++) {
      const i = n - 1 - k;
      const tot = A[i] + B[i] + carry;
      const w = tot % 10;
      const co = Math.floor(tot / 10);
      steps.push({ k, col: i, a: A[i], b: B[i], carryIn: carry, tot, write: w, carryOut: co });
      res[i] = w;
      carry = co;
    }
    return { op, n, A, B, steps, res, lead: carry, dotAt };
  }

  const steps: SubStep[] = [];
  const work = A.slice();
  for (let k = 0; k < n; k++) {
    const i = n - 1 - k;
    let borrowed: Borrow | null = null;
    if (work[i] < B[i]) {
      let j = i - 1;
      while (j >= 0 && work[j] === 0) j--;
      const chain: number[] = [];
      for (let z = j + 1; z < i; z++) chain.push(z);
      work[j] -= 1;
      for (let z = j + 1; z < i; z++) work[z] = 9;
      work[i] += 10;
      borrowed = { from: j, chain };
    }
    const val = work[i] - B[i];
    steps.push({
      k,
      col: i,
      a: A[i],
      b: B[i],
      top: work[i],
      write: val,
      borrowed,
      workSnapshot: work.slice(),
    });
    res[i] = val;
  }
  return { op, n, A, B, steps, res, work, dotAt };
}

/** Does this addition actually carry anywhere? The `add` topic requires it. */
export function hasCarry(m: ColumnModel): boolean {
  return m.op === "+" && m.steps.some((s) => (s as AddStep).carryOut > 0);
}

/** Does this subtraction actually borrow anywhere? The `sub` topic requires it. */
export function hasBorrow(m: ColumnModel): boolean {
  return m.op === "-" && m.steps.some((s) => (s as SubStep).borrowed !== null);
}

/** A borrow that travels across at least one zero — what `sub` level 4 promises. */
export function hasBorrowAcrossZero(m: ColumnModel): boolean {
  return (
    m.op === "-" &&
    m.steps.some((s) => {
      const b = (s as SubStep).borrowed;
      return b !== null && b.chain.length > 0;
    })
  );
}

/** Pad two numbers to a common width so their columns line up. */
export function padPair(a: number, b: number): [string, string] {
  const len = Math.max(String(a).length, String(b).length);
  return [String(a).padStart(len, "0"), String(b).padStart(len, "0")];
}
