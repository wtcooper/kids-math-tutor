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
import { gcd, lcm, rd } from "./number";
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
  },
  "dec-addsub": {
    id: "dec-addsub",
    gen: genDecAddSub,
    title: decTitle,
    fields: one(),
    check: (p, v) => rd(num(v.q), 6) === rd(decAnswer(p), 6),
    answer: (p) => String(rd(decAnswer(p), 6)),
    gridBuild: buildDecAddSub,
  },
  place: {
    id: "place",
    gen: genPlace,
    title: placeTitle,
    fields: one(),
    check: (p, v) => num(v.q) === placeAnswer(p),
    answer: (p) => fmt(placeAnswer(p)),
    build: buildPlace,
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
  },
  pemdas: {
    id: "pemdas",
    gen: genPemdas,
    title: pemdasTitle,
    fields: one(),
    check: (p, v) => num(v.q) === pemdasAnswer(p),
    answer: (p) => fmt(pemdasAnswer(p)),
    build: buildPemdas,
  },
  exponents: {
    id: "exponents",
    gen: genExponents,
    title: exponentTitle,
    fields: one(),
    check: (p, v) => rd(num(v.q), 6) === rd(exponentAnswer(p), 6),
    answer: (p) => fmt(exponentAnswer(p)),
    build: buildExponents,
  },
  "frac-equiv": {
    id: "frac-equiv",
    gen: genFracEquiv,
    title: fracEquivTitle,
    fields: one(),
    check: (p, v) => String(v.q ?? "").replace(/\s/g, "") === fracEquivAnswer(p),
    answer: fracEquivAnswer,
    build: buildFracEquiv,
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
  },
  "dec-muldiv": {
    id: "dec-muldiv",
    gen: genDecMulDiv,
    title: decMulDivTitle,
    fields: one(),
    check: (p, v) => rd(num(v.q), 4) === rd(decMulDivAnswer(p), 4),
    answer: (p) => String(rd(decMulDivAnswer(p), 4)),
    build: buildDecMulDiv,
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
  },
  ratio: {
    id: "ratio",
    gen: genRatio,
    title: ratioTitle,
    fields: one(),
    check: (p, v) => num(v.q) === ratioAnswer(p),
    answer: (p) => fmt(ratioAnswer(p)),
    build: buildRatio,
  },
  integers: {
    id: "integers",
    gen: genIntegers,
    title: integerTitle,
    fields: one(),
    check: (p, v) => num(v.q) === integerAnswer(p),
    answer: (p) => String(integerAnswer(p)),
    build: buildIntegers,
  },
  equations: {
    id: "equations",
    gen: genEquations,
    title: equationTitle,
    fields: one("x"),
    check: (p, v) => num(v.q) === equationAnswer(p),
    answer: (p) => String(equationAnswer(p)),
    build: buildEquations,
  },
  geometry: {
    id: "geometry",
    gen: genGeometry,
    title: geometryTitle,
    fields: one(),
    check: (p, v) => rd(num(v.q), 6) === rd(geometryAnswer(p), 6),
    answer: (p) => String(rd(geometryAnswer(p), 6)),
    build: buildGeometry,
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
