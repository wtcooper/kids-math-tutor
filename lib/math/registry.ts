/**
 * One dispatch table over all 21 topics.
 *
 * The tutor UI and the games both go through this, so neither ever branches on a topic
 * id. Every entry is pure: give it a level and an Rng and it yields a problem, a title,
 * and a way to check an answer.
 *
 * Step-by-step models (Watch it / You try / Picture it) are a separate, larger surface
 * and are added per topic; `hasSteps` says whether a topic has one yet.
 */

import type { Rng } from "./rng";
import type { StepsModel } from "./types";
import type { DivGridModel, GridModel } from "./builds/grid";
import { buildAdd, buildDecAddSub, buildDiv, buildMul, buildSub } from "./builds/grid";
import { buildFactors } from "./topics/factors";
import { buildExponents, buildPemdas, buildPlace } from "./builds/whole-numbers";
import { buildFracAddSub, buildFracEquiv, buildFracMixed, buildFracMulDiv } from "./builds/fractions";
import {
  buildDecMulDiv,
  buildEquations,
  buildGeometry,
  buildIntegers,
  buildPercent,
  buildRatio,
} from "./builds/rates-algebra";
import { BY_ID, type Topic } from "@/lib/topics";

import { addAnswer, addHint, addTitle, genAdd, genSub, subAnswer, subHint, subTitle } from "./topics/add-sub";
import { divAnswerText, divHint, divTitle, genDiv, genMul, mulHint, mulTitle } from "./topics/mul-div";
import { decAnswer, decTitle, genDecAddSub } from "./topics/dec-addsub";
import { factorsTitle, genFactors } from "./topics/factors";
import { gcd, lcm, PLACES, rd, trimNum } from "./number";
import { fmt, fracText } from "./format";
import {
  exponentAnswer,
  exponentTitle,
  genExponents,
  genPemdas,
  genPlace,
  pemdasAnswer,
  pemdasTitle,
  placeAnswer,
  placeTitle,
} from "./topics/whole-numbers";
import {
  fracAddSubAnswer,
  fracAddSubTitle,
  fracEquivAnswer,
  fracEquivTitle,
  fracMixedAnswer,
  fracMixedTitle,
  fracMulDivAnswer,
  fracMulDivTitle,
  genFracAddSub,
  genFracEquiv,
  genFracMixed,
  genFracMulDiv,
} from "./topics/fractions";
import {
  decMulDivAnswer,
  decMulDivTitle,
  equationAnswer,
  equationTitle,
  genDecMulDiv,
  genEquations,
  genGeometry,
  genIntegers,
  genPercent,
  genRatio,
  geometryAnswer,
  geometryTitle,
  integerAnswer,
  integerTitle,
  percentAnswer,
  percentTitle,
  ratioAnswer,
  ratioTitle,
} from "./topics/rates-algebra";

/** One answer box in Practice mode. */
export interface PracticeField {
  key: string;
  label: string;
  /** Rough width hint; the component decides the actual size. */
  size?: "small" | "normal";
  placeholder?: string;
}

export interface TopicRuntime<P = unknown> {
  id: string;
  gen(level: number, rng: Rng): P;
  title(p: P): string;
  fields: PracticeField[];
  /** True when the typed answer is right. */
  check(p: P, v: Record<string, string>): boolean;
  /** The answer, written the way the tutor writes it. */
  answer(p: P): string;
  hint?(p: P): string;
  /**
   * The step-by-step model behind Watch it / You try / Picture it. Absent while a topic
   * is still being ported, in which case the tutor shows Practice only.
   */
  build?(p: P): StepsModel;
  /** Column-arithmetic equivalent of build(), for the five grid topics. */
  gridBuild?(p: P): GridModel | DivGridModel;
  /** "or use your own numbers" — present on the four whole-number topics. */
  custom?: {
    op: string;
    validate(a: number, b: number): string | null;
    apply(a: number, b: number): P;
  };
}

const num = (s: string): number => Number(String(s).replace(/,/g, "").trim());
const one = (label = "Answer", size?: "small" | "normal"): PracticeField[] => [
  { key: "q", label, size },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
const R: Record<string, TopicRuntime<any>> = {
  add: {
    id: "add",
    gen: genAdd,
    title: addTitle,
    fields: one(),
    check: (p, v) => num(v.q) === addAnswer(p),
    answer: (p) => fmt(addAnswer(p)),
    hint: addHint,
    gridBuild: buildAdd,
    custom: {
      op: "+",
      validate: (a, b) =>
        a < 1 || b < 1 || a > 999999 || b > 999999
          ? "Use whole numbers under 1,000,000."
          : null,
      apply: (a, b) => ({ a, b }),
    },
  },
  sub: {
    id: "sub",
    gen: genSub,
    title: subTitle,
    fields: one(),
    check: (p, v) => num(v.q) === subAnswer(p),
    answer: (p) => fmt(subAnswer(p)),
    hint: subHint,
    gridBuild: buildSub,
    custom: {
      op: "−",
      validate: (a, b) =>
        a < 1 || b < 1 || b > a ? "The second number must be smaller than the first." : null,
      apply: (a, b) => ({ a, b }),
    },
  },
  mul: {
    id: "mul",
    gen: genMul,
    title: mulTitle,
    fields: one(),
    check: (p, v) => num(v.q) === p.a * p.b,
    answer: (p) => fmt(p.a * p.b),
    hint: mulHint,
    gridBuild: buildMul,
    custom: {
      op: "×",
      validate: (a, b) =>
        a < 1 || b < 1 || a > 99999 || b > 999
          ? "Keep the first number under 100,000 and the second under 1,000."
          : null,
      apply: (a, b) => ({ a, b }),
    },
  },
  div: {
    id: "div",
    gen: genDiv,
    title: divTitle,
    fields: [
      { key: "q", label: "Quotient" },
      { key: "r", label: "Remainder", size: "small", placeholder: "0" },
    ],
    check: (p, v) => {
      const q = Math.floor(p.dividend / p.divisor);
      const r = p.dividend % p.divisor;
      const typed = String(v.r ?? "").trim() === "" ? 0 : num(v.r);
      return num(v.q) === q && typed === r;
    },
    answer: divAnswerText,
    hint: divHint,
    gridBuild: buildDiv,
    custom: {
      op: "÷",
      validate: (a, b) =>
        a < 1 || b < 1 || b > a || a > 999999 || b > 999
          ? "The divisor must be smaller than the dividend."
          : null,
      apply: (a, b) => ({ dividend: a, divisor: b }),
    },
  },
  "dec-addsub": {
    id: "dec-addsub",
    gen: genDecAddSub,
    title: decTitle,
    fields: one(),
    check: (p, v) => rd(num(v.q), 6) === rd(decAnswer(p), 6),
    answer: (p) => String(rd(decAnswer(p), 6)),
    gridBuild: buildDecAddSub,
    hint: () => "Line up the decimal points and pad the shorter number with zeros.",
  },
  place: {
    id: "place",
    gen: genPlace,
    title: placeTitle,
    fields: one(),
    check: (p, v) => num(v.q) === placeAnswer(p),
    answer: (p) => fmt(placeAnswer(p)),
    build: buildPlace,
    hint: (p) => `Look at the digit just right of the ${PLACES[p.place]} place. Everything after it becomes zero.`,
  },
  factors: {
    id: "factors",
    gen: genFactors,
    title: factorsTitle,
    fields: [
      { key: "g", label: "GCF", size: "small" },
      { key: "l", label: "LCM", size: "small" },
    ],
    check: (p, v) => num(v.g) === gcd(p.a, p.b) && num(v.l) === lcm(p.a, p.b),
    answer: (p) => `GCF ${gcd(p.a, p.b)}, LCM ${lcm(p.a, p.b)}`,
    build: buildFactors,
    hint: () => "The GCF divides into both. The LCM is what both divide into.",
  },
  pemdas: {
    id: "pemdas",
    gen: genPemdas,
    title: pemdasTitle,
    fields: one(),
    check: (p, v) => num(v.q) === pemdasAnswer(p),
    answer: (p) => fmt(pemdasAnswer(p)),
    build: buildPemdas,
    hint: () => "Scan the whole expression first. Parentheses, then exponents, then × and ÷ left to right, then + and − left to right.",
  },
  exponents: {
    id: "exponents",
    gen: genExponents,
    title: exponentTitle,
    fields: one(),
    check: (p, v) => rd(num(v.q), 6) === rd(exponentAnswer(p), 6),
    answer: (p) => fmt(exponentAnswer(p)),
    build: buildExponents,
    hint: (p) => p.kind === "pow" ? `Write it out longhand: ${Array(p.exp).fill(p.base).join(" × ")}.` : `Move the decimal point ${p.k} place${p.k === 1 ? "" : "s"} to the right.`,
  },
  "frac-equiv": {
    id: "frac-equiv",
    gen: genFracEquiv,
    title: fracEquivTitle,
    fields: one(),
    check: (p, v) => String(v.q ?? "").replace(/\s/g, "") === fracEquivAnswer(p),
    answer: fracEquivAnswer,
    build: buildFracEquiv,
    hint: (p) => p.kind === "simplify" ? "Find the biggest number that divides into both, then divide both by it." : "Work out what the bottom was multiplied by, then do the same on top.",
  },
  "frac-mixed": {
    id: "frac-mixed",
    gen: genFracMixed,
    title: fracMixedTitle,
    fields: one(),
    check: (p, v) =>
      String(v.q ?? "").replace(/\s+/g, " ").trim() === fracMixedAnswer(p),
    answer: fracMixedAnswer,
    build: buildFracMixed,
    hint: (p) => p.kind === "toMixed" ? "Divide the top by the bottom. The quotient is the whole number, the remainder stays on top." : "Whole × bottom, then add the top. The bottom never changes.",
  },
  "frac-addsub": {
    id: "frac-addsub",
    gen: genFracAddSub,
    title: fracAddSubTitle,
    fields: one(),
    check: (p, v) => {
      const [n, d] = fracAddSubAnswer(p);
      return String(v.q ?? "").replace(/\s+/g, " ").trim() === fracText(n, d);
    },
    answer: (p) => {
      const [n, d] = fracAddSubAnswer(p);
      return fracText(n, d);
    },
    build: buildFracAddSub,
    hint: (p) => p.d1 === p.d2 ? "Same bottom already — just combine the tops." : `Find the smallest number both ${p.d1} and ${p.d2} go into, rewrite both fractions over it, then combine the tops.`,
  },
  "frac-muldiv": {
    id: "frac-muldiv",
    gen: genFracMulDiv,
    title: fracMulDivTitle,
    fields: one(),
    check: (p, v) => {
      const [n, d] = fracMulDivAnswer(p);
      return String(v.q ?? "").replace(/\s+/g, " ").trim() === fracText(n, d);
    },
    answer: (p) => {
      const [n, d] = fracMulDivAnswer(p);
      return fracText(n, d);
    },
    build: buildFracMulDiv,
    hint: (p) => p.kind === "mul" ? "Tops together, bottoms together. Convert mixed numbers first." : "Flip the second fraction, change ÷ to ×, then go straight across.",
  },
  "dec-muldiv": {
    id: "dec-muldiv",
    gen: genDecMulDiv,
    title: decMulDivTitle,
    fields: one(),
    check: (p, v) => rd(num(v.q), 4) === rd(decMulDivAnswer(p), 4),
    answer: (p) => String(rd(decMulDivAnswer(p), 4)),
    build: buildDecMulDiv,
    hint: (p) => p.kind === "mul" ? "Multiply as whole numbers, then count the decimal places in the question." : "Move the point in the divisor until it is whole, and move the other number the same amount.",
  },
  percent: {
    id: "percent",
    gen: genPercent,
    title: percentTitle,
    fields: one(),
    check: (p, v) =>
      String(v.q ?? "").replace(/\s+/g, " ").trim().replace(/%$/, "") ===
      percentAnswer(p).replace(/%$/, ""),
    answer: percentAnswer,
    build: buildPercent,
    hint: (p) => p.kind === "of" ? `10% of ${fmt(p.n)} is ${trimNum(rd(p.n / 10, 4))}. Build the answer from that.` : p.kind === "whatpct" ? "Divide the part by the whole, then multiply by 100." : "Dividing by 100 moves the decimal point two places left.",
  },
  ratio: {
    id: "ratio",
    gen: genRatio,
    title: ratioTitle,
    fields: one(),
    check: (p, v) => num(v.q) === ratioAnswer(p),
    answer: (p) => fmt(ratioAnswer(p)),
    build: buildRatio,
    hint: (p) => p.kind === "unit" ? "Find the cost of one first, then multiply." : "Work out the scale factor, then apply it to the other number.",
  },
  integers: {
    id: "integers",
    gen: genIntegers,
    title: integerTitle,
    fields: one(),
    check: (p, v) => num(v.q) === integerAnswer(p),
    answer: (p) => String(integerAnswer(p)),
    build: buildIntegers,
    hint: (p) => p.kind === "mul" || p.kind === "div" ? "Work out the size first, then count the negatives — odd means the answer is negative." : "Rewrite any subtraction as adding the opposite, then think about the number line.",
  },
  equations: {
    id: "equations",
    gen: genEquations,
    title: equationTitle,
    fields: one("x"),
    check: (p, v) => num(v.q) === equationAnswer(p),
    answer: (p) => String(equationAnswer(p)),
    build: buildEquations,
    hint: () => "Get x by itself. Whatever you do to one side you must do to the other.",
  },
  geometry: {
    id: "geometry",
    gen: genGeometry,
    title: geometryTitle,
    fields: one(),
    check: (p, v) => rd(num(v.q), 6) === rd(geometryAnswer(p), 6),
    answer: (p) => String(rd(geometryAnswer(p), 6)),
    build: buildGeometry,
    hint: (p) => ({ area: "Length × width.", perim: "Add all four sides.", tri: "Base × height, then halve it.", para: "Base × perpendicular height.", vol: "One layer, then multiply by the depth.", ell: "Whole rectangle minus the missing corner." })[p.kind as "area" | "perim" | "tri" | "para" | "vol" | "ell"],
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function runtimeFor(topicId: string): TopicRuntime | undefined {
  return R[topicId];
}

/** Flashcard topics have no gen/build — they use lib/math/facts directly. */
export function isFactsTopic(topic: Topic): boolean {
  return topic.engine === "facts";
}

export function topicOrThrow(topicId: string): Topic {
  const t = BY_ID[topicId];
  if (!t) throw new Error(`unknown topic: ${topicId}`);
  return t;
}
