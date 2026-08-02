/**
 * Factors, GCF & LCM.
 *
 * Ported from docs/math-table.html:1505-1560. Also the source of truth for the Munchers
 * game: the board ranges below are the tutor's own, so "level 3" means the same numbers
 * in both places, and the round-end panel can reuse the very same factor-list rendering.
 */

import { factorsOf, gcd, lcm } from "../number";
import { fmt, parseRich, text } from "../format";
import type { Rng } from "../rng";
import {
  box,
  grn,
  hi,
  joinInline,
  line,
  mut,
  op,
  t,
  type DisplayNode,
  type Inline,
  type StepsModel,
} from "../types";

export interface FactorsProblem {
  a: number;
  b: number;
}

/** The tutor's own level ranges. Munchers boards must use these. */
export const FACTOR_HI = [20, 30, 48, 72];
export const FACTOR_LO = [4, 6, 8, 12];

export function genFactors(level: number, rng: Rng): FactorsProblem {
  const hiN = FACTOR_HI[level - 1];
  const loN = FACTOR_LO[level - 1];
  let a: number;
  let b: number;
  let guard = 0;
  // The LCM cap keeps the multiples lists short enough to actually read.
  do {
    a = rng.int(loN, hiN);
    b = rng.int(loN, hiN);
    guard++;
  } while ((a === b || lcm(a, b) > 420) && guard < 80);
  return { a, b };
}

export const factorsTitle = (p: FactorsProblem) => `GCF and LCM of ${p.a} and ${p.b}`;

/** Shared factors — what Munchers level 4 asks her to eat, last one being the GCF. */
export function sharedFactors(a: number, b: number): number[] {
  const fb = factorsOf(b);
  return factorsOf(a).filter((x) => fb.includes(x));
}

function factorList(arr: number[], mark: number[]): DisplayNode {
  return {
    t: "workLine",
    items: joinInline(
      arr.map((x) => (mark.includes(x) ? box(String(x)) : mut(String(x)))),
      ",",
    ),
  };
}

function multipleList(label: string, arr: number[], target: number): DisplayNode {
  const items: Inline[] = [mut(`${label}:`), t(" ")];
  arr.forEach((x, i) => {
    if (i > 0) items.push(op(","));
    items.push(x === target ? box(String(x)) : mut(String(x)));
  });
  return { t: "workLine", items };
}

export function buildFactors(prob: FactorsProblem): StepsModel {
  const { a, b } = prob;
  const fa = factorsOf(a);
  const fb = factorsOf(b);
  const g = gcd(a, b);
  const l = lcm(a, b);
  const shared = fa.filter((x) => fb.includes(x));

  const mults = (k: number) => {
    const o: number[] = [];
    for (let i = 1; i * k <= l; i++) o.push(i * k);
    return o;
  };
  const ma = mults(a);
  const mb = mults(b);

  const onlyA = fa.filter((x) => !shared.includes(x));
  const onlyB = fb.filter((x) => !shared.includes(x));

  return {
    kind: "steps",
    title: `GCF and LCM of ${a} and ${b}`,
    answerText: `GCF ${g}, LCM ${l}`,
    steps: [
      {
        label: `List every factor of ${a}`,
        say: text(
          "A factor divides in with nothing left over. Walk up from 1 and check each one.",
        ),
        show: [factorList(fa, shared)],
      },
      {
        label: `List every factor of ${b}`,
        say: text(
          `The highlighted numbers are the ones both lists share: ${shared.join(", ")}.`,
        ),
        show: [factorList(fb, shared)],
      },
      {
        label: "The greatest common factor is the biggest number in both lists",
        say: text(
          `Both ${a} and ${b} can be divided by ${shared.join(", ")}. The largest of those is ${g}.`,
        ),
        show: [line(t(`GCF(${a}, ${b}) = `), grn(String(g)))],
        ask: [{ label: "GCF", expect: String(g), w: 3 }],
      },
      {
        label: `Now count up in ${a}s and in ${b}s`,
        say: text(
          "Multiples run the other direction — keep adding the number to itself until the two lists collide.",
        ),
        show: [multipleList(String(a), ma, l), multipleList(String(b), mb, l)],
      },
      {
        label: "The least common multiple is the first number in both lists",
        say: text(`The first place the two counts meet is ${l}.`),
        show: [line(t(`LCM(${a}, ${b}) = `), grn(String(l)))],
        ask: [{ label: "LCM", expect: String(l), w: 4 }],
      },
    ],
    picture: {
      title: `Factors of ${a} and ${b}, side by side`,
      sub: text(
        "The overlap in the middle is what they have in common. The biggest number there is the GCF.",
      ),
      body: [
        {
          t: "columns",
          cols: [
            { title: `Only ${a}`, items: asItems(onlyA, mut) },
            { title: "Shared", items: asItems(shared, hi) },
            { title: `Only ${b}`, items: asItems(onlyB, mut) },
          ],
        },
        {
          t: "note",
          body: parseRich(
            `<b>The shortcut worth knowing:</b> GCF × LCM = the two numbers multiplied together. Here ${g} × ${l} = ${fmt(g * l)}, and ${a} × ${b} = ${fmt(a * b)}. So once you have the GCF you can get the LCM by dividing: ${a} × ${b} ÷ ${g} = ${l}.`,
          ),
        },
        {
          t: "note",
          body: parseRich(
            "<b>Where you actually use these:</b> the GCF is what you divide by to simplify a fraction. The LCM is the common denominator when you add fractions.",
          ),
        },
      ],
    },
  };
}

function asItems(arr: number[], style: (v: string) => Inline): Inline[] {
  if (arr.length === 0) return [mut("—")];
  return joinInline(arr.map((x) => style(String(x))), ",");
}

/** Practice mode. */
export const factorsPractice = {
  fields: [
    { key: "g", label: "GCF", w: 3 },
    { key: "l", label: "LCM", w: 4 },
  ],
  check(p: FactorsProblem, v: Record<string, string>) {
    return Number(v.g) === gcd(p.a, p.b) && Number(v.l) === lcm(p.a, p.b);
  },
  answer(p: FactorsProblem) {
    return `GCF ${gcd(p.a, p.b)}, LCM ${lcm(p.a, p.b)}`;
  },
};
