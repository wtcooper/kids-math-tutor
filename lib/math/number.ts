/**
 * Number helpers, ported verbatim from the original tutor (docs/math-table.html:441-458).
 *
 * "Verbatim" is load-bearing: these feed the generators, and the differential tests
 * compare the port's output against the original's. A tidier `gcd` that returns 0 for
 * gcd(0,0) instead of 1 would change generated problems.
 */

export const PLACES = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten-thousands",
  "hundred-thousands",
  "millions",
] as const;

export const SING = [
  "one",
  "ten",
  "hundred",
  "thousand",
  "ten-thousand",
  "hundred-thousand",
  "million",
] as const;

export const DPLACES = ["tenths", "hundredths", "thousandths"] as const;

export const ORD = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
] as const;

/** Place name agreeing in number — "1 hundred" vs "3 hundreds". */
export function pn(count: number, place: number): string {
  return count === 1 ? SING[place] : PLACES[place];
}

/**
 * Round to the leading digit: 342 → 300.
 *
 * Not `toPrecision(2)`. The original rounded 342 to 340 and predicted ~10,200 for
 * 342 × 26 (actual 8,892), which teaches the wrong instinct — see BUILD-NOTES issue 2.
 */
export function roundNice(n: number): number {
  const p = Math.pow(10, String(Math.abs(n)).length - 1);
  return Math.round(n / p) * p;
}

/** Note: returns 1 rather than 0 when both are 0. Callers rely on the non-zero result. */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function factorsOf(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

/** Simplify a fraction to lowest terms. */
export function simp(n: number, d: number): [number, number] {
  const g = gcd(n, d);
  return [n / g, d / g];
}

/** Round to k places without binary-float noise. Defaults to 10 places. */
export function rd(x: number, k?: number): number {
  const p = Math.pow(10, k === undefined ? 10 : k);
  return Math.round(x * p) / p;
}

export function decPlaces(x: number): number {
  const s = String(x);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

export function trimNum(x: number): string {
  return String(rd(x, 10));
}

/** Common factors of two numbers — what Munchers level 4 asks her to eat. */
export function commonFactors(a: number, b: number): number[] {
  return factorsOf(a).filter((f) => b % f === 0);
}
