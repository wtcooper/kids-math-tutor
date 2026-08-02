/**
 * Order-of-operations evaluator.
 *
 * Ported from docs/math-table.html:645-698. Already pure data in the original.
 *
 * Expressions are token arrays mixing numbers and operator/paren strings, e.g.
 * `[3, '+', 4, '×', 5]`. `evalSteps` reduces one operation at a time, innermost
 * parentheses first, recording each reduction — which is exactly what Watch mode walks
 * through.
 */

import { fmt } from "../format";

export type Token = number | string;

export type StepWhy = "paren" | "exp" | "md" | "as";

export interface ReduceStep {
  a: number;
  op: string;
  b: number;
  val: number;
  why: StepWhy;
  after: Token[];
}

export interface EvalResult {
  steps: ReduceStep[];
  value: number;
}

export function opApply(a: number, op: string, b: number): number {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "×") return a * b;
  if (op === "÷") return a / b;
  if (op === "^") return Math.pow(a, b);
  return NaN;
}

const prec = (t: Token): number =>
  t === "^" ? 3 : t === "×" || t === "÷" ? 2 : t === "+" || t === "-" ? 1 : 0;

interface Reduction {
  arr: Token[];
  a: number;
  op: string;
  b: number;
  val: number;
  prec: number;
  at: number;
}

/** Reduce the single highest-precedence operation, leftmost on a tie. */
export function reduceOnce(arr: Token[]): Reduction | null {
  let best = -1;
  let bestP = 0;
  for (let i = 0; i < arr.length; i++) {
    const p = prec(arr[i]);
    if (p > 0 && typeof arr[i - 1] === "number" && typeof arr[i + 1] === "number") {
      if (p > bestP) {
        bestP = p;
        best = i;
      }
    }
  }
  if (best < 0) return null;

  const a = arr[best - 1] as number;
  const op = arr[best] as string;
  const b = arr[best + 1] as number;
  const val = opApply(a, op, b);
  const out = arr
    .slice(0, best - 1)
    .concat([val])
    .concat(arr.slice(best + 2));
  return { arr: out, a, op, b, val, prec: bestP, at: best - 1 };
}

export function exprText(arr: Token[]): string {
  return arr
    .map((t) => (typeof t === "number" ? fmt(t) : t))
    .join(" ")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")");
}

export function evalSteps(tokens: Token[]): EvalResult {
  let t = tokens.slice();
  const steps: ReduceStep[] = [];
  let guard = 0;

  while (t.length > 1 && guard++ < 40) {
    // Innermost parentheses first: scan for the first ')' and pair it with the nearest
    // '(' before it.
    let open = -1;
    let close = -1;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === "(") open = i;
      if (t[i] === ")") {
        close = i;
        break;
      }
    }

    if (open >= 0 && close > open) {
      const inner = t.slice(open + 1, close);
      if (inner.length === 1) {
        t = t.slice(0, open).concat(inner).concat(t.slice(close + 1));
        continue;
      }
      const r = reduceOnce(inner);
      if (!r) break;
      const newInner = r.arr;
      t =
        newInner.length === 1
          ? t.slice(0, open).concat(newInner).concat(t.slice(close + 1))
          : t.slice(0, open + 1).concat(newInner).concat(t.slice(close));
      steps.push({ a: r.a, op: r.op, b: r.b, val: r.val, why: "paren", after: t.slice() });
    } else {
      const r = reduceOnce(t);
      if (!r) break;
      t = r.arr;
      steps.push({
        a: r.a,
        op: r.op,
        b: r.b,
        val: r.val,
        why: r.prec === 3 ? "exp" : r.prec === 2 ? "md" : "as",
        after: t.slice(),
      });
    }
  }

  return { steps, value: t[0] as number };
}
