/**
 * Step models for place value, order of operations and exponents.
 *
 * Ported from docs/math-table.html:1452-1489 (place), :1600-1637 (pemdas),
 * :1663-1740 (exponents). Narration text is carried across verbatim — it is the part
 * written to be read aloud, and paraphrasing it would quietly change the teaching.
 */

import { evalSteps, exprText, type StepWhy } from "../engines/pemdas";
import { fmt, parseRich, text } from "../format";
import { PLACES, SING } from "../number";
import type { DisplayNode, Inline, StepsModel } from "../types";
import { bigLine, grn, hi, line, mut, op, t } from "../types";
import type { ExponentProblem, PemdasProblem, PlaceProblem } from "../topics/whole-numbers";

/** Digit string with one position picked out. */
function digitsWith(s: string, at: number, style: "hi" | "box"): Inline[] {
  return s.split("").map((ch, i) =>
    i === at
      ? style === "hi"
        ? hi(ch)
        : ({ t: "box", v: ch } as Inline)
      : mut(ch),
  );
}

/* ----------------------------------------------------------------- place */

export function buildPlace(prob: PlaceProblem): StepsModel {
  const { n, place } = prob;
  const s = String(n);
  const L = s.length;
  const ti = L - 1 - place;
  const target = Number(s[ti]);
  const decider = Number(s[ti + 1]);
  const base = Math.pow(10, place);
  const down = Math.floor(n / base) * base;
  const up = down + base;
  const ans = decider >= 5 ? up : down;
  const mid = (down + up) / 2;

  const marks = [down, mid, up];
  for (let i = 1; i < 10; i++) if (i !== 5) marks.push(down + (i * base) / 10);

  return {
    kind: "steps",
    title: `Round ${fmt(n)} to the nearest ${SING[place]}`,
    answerText: fmt(ans),
    steps: [
      {
        label: "What is that digit actually worth?",
        say: text(
          `The ${PLACES[place]} digit is ${target}. Sitting in the ${PLACES[place]} place, it is worth ${fmt(target * base)} — not just ${target}.`,
        ),
        show: [
          {
            t: "workLine",
            items: [
              ...digitsWith(s, ti, "hi"),
              t(" "),
              op("→"),
              t(` the ${target} means `),
              hi(fmt(target * base)),
            ],
          },
        ],
        ask: [{ label: "Its value", expect: String(target * base), w: 6 }],
      },
      {
        label: "Find the decider — the digit just to its right",
        say: text(
          `Only one digit matters for rounding: the very next one. Here that is ${decider}. Everything further right is ignored.`,
        ),
        show: [
          {
            t: "workLine",
            items: [...digitsWith(s, ti + 1, "box"), t(" "), mut(`decider = ${decider}`)],
          },
        ],
        ask: [{ label: "Decider", expect: String(decider), w: 2 }],
      },
      {
        label: "5 or more rounds up. 4 or less rounds down.",
        say: parseRich(
          decider >= 5
            ? `${decider} is 5 or more, so we round <b>up</b> to ${fmt(up)}. The ${PLACES[place]} digit goes up by one and everything to the right becomes zero.`
            : `${decider} is 4 or less, so we round <b>down</b> to ${fmt(down)}. The ${PLACES[place]} digit stays put and everything to the right becomes zero.`,
        ),
        show: [bigLine(t(fmt(n)), op("→"), grn(fmt(ans)))],
        ask: [{ label: "Rounded", expect: String(ans), w: 8 }],
      },
    ],
    picture: {
      title: `Which neighbor is ${fmt(n)} closer to?`,
      sub: text(
        `Rounding is a number-line question. Find the two nearest ${PLACES[place]} marks and see which side of the middle you land on.`,
      ),
      body: [
        { t: "numberLine", min: down, max: up, marks, point: n, pointLabel: fmt(n) },
        {
          t: "note",
          body: parseRich(
            `<b>Why the decider works:</b> the halfway point is ${fmt(mid)}. Any number past halfway is closer to ${fmt(up)}, and the only digit that decides which side of halfway you are on is the ${PLACES[place - 1]} digit. That is why you never need to look further right.`,
          ),
        },
        { t: "banner", body: text(`${fmt(n)} is closer to ${fmt(ans)}`) },
      ],
    },
  };
}

/* ---------------------------------------------------------------- pemdas */

const WHY: Record<StepWhy, string> = {
  paren: "It is inside the parentheses, and parentheses always go first.",
  exp: "Exponents come next, right after parentheses.",
  md: "Multiply and divide before you add or subtract — no matter which one you see first.",
  as: "Only adding and subtracting left, so work left to right.",
};

const PEM_RULES: [string, string, string, StepWhy][] = [
  ["P", "Parentheses", "Anything inside brackets, innermost first", "paren"],
  ["E", "Exponents", "Powers and roots", "exp"],
  ["MD", "Multiply & Divide", "Left to right — neither one outranks the other", "md"],
  ["AS", "Add & Subtract", "Left to right, last of all", "as"],
];

export function buildPemdas(prob: PemdasProblem): StepsModel {
  const ev = evalSteps(prob.tokens);

  return {
    kind: "steps",
    title: exprText(prob.tokens),
    lead: bigLine(t(exprText(prob.tokens))),
    answerText: fmt(ev.value),
    steps: ev.steps.map((s) => ({
      label: `Do ${fmt(s.a)} ${s.op} ${fmt(s.b)} first`,
      say: text(WHY[s.why]),
      // The reduced expression with the freshly computed value picked out, so the eye
      // lands on what just changed.
      show: [
        {
          t: "workLine",
          items: highlightValue(exprText(s.after), fmt(s.val)),
        },
      ],
      ask: [{ label: "Result", expect: String(s.val), w: 5 }],
    })),
    picture: {
      title: "The order, and where this problem lands on it",
      sub: text("PEMDAS is a priority list, not a left-to-right reading order."),
      body: [
        {
          t: "columns",
          cols: PEM_RULES.map(([abbr, name, blurb, why]) => {
            const hits = ev.steps
              .map((s, i) => ({ i: i + 1, txt: `${fmt(s.a)} ${s.op} ${fmt(s.b)}`, why: s.why }))
              .filter((o) => o.why === why);
            const items: Inline[] = [mut(blurb)];
            hits.forEach((h) =>
              items.push({ t: "box", v: `step ${h.i}: ${h.txt}` } as Inline),
            );
            return { title: `${abbr} · ${name}`, items };
          }),
        },
        {
          t: "note",
          body: parseRich(
            "<b>The trap:</b> MD and AS are each one level, not two. In 20 − 6 + 3 you do the subtraction first because it comes first left to right — the answer is 17, not 11. Same for × and ÷.",
          ),
        },
      ],
    },
  };
}

/** Split a rendered expression so the first occurrence of `value` is highlighted. */
function highlightValue(expr: string, value: string): Inline[] {
  const at = expr.indexOf(value);
  if (at < 0) return [t(expr)];
  const out: Inline[] = [];
  if (at > 0) out.push(t(expr.slice(0, at)));
  out.push(hi(value));
  const rest = expr.slice(at + value.length);
  if (rest) out.push(t(rest));
  return out;
}

/* ------------------------------------------------------------- exponents */

export function buildExponents(prob: ExponentProblem): StepsModel {
  if (prob.kind === "pow") {
    const b = prob.base;
    const e = prob.exp;
    const chain: number[] = [];
    let acc = 1;
    for (let i = 0; i < e; i++) {
      acc *= b;
      chain.push(acc);
    }
    const ans = acc;

    const steps = chain.map((v, i) => ({
      label:
        i === 0
          ? `Start with one ${b}`
          : `Multiply by ${b} again — that is ${i + 1} of them`,
      say: text(
        i === 0
          ? `The exponent counts how many ${b}s get multiplied together, not what you multiply by.`
          : `${i === 1 ? `${b} × ${b}` : `${chain[i - 1]} × ${b}`} = ${v}.`,
      ),
      show: [
        line(
          t(Array.from({ length: i + 1 }, () => String(b)).join(" × ")),
          op("="),
          i === chain.length - 1 ? grn(String(v)) : hi(String(v)),
        ),
      ],
      ask: [{ label: "Value", expect: String(v), w: 7 }],
    }));

    return {
      kind: "steps",
      title: `${b}^${e}`,
      lead: bigLine({ t: "pow", base: String(b), exp: String(e) }),
      answerText: fmt(ans),
      steps,
      picture: {
        title: `What ${b}^${e} actually means`,
        sub: text(
          `An exponent is a count of factors. ${b}^${e} is ${e} copies of ${b} multiplied together — it is not ${b} × ${e}.`,
        ),
        body: [
          line(
            { t: "pow", base: String(b), exp: String(e) },
            op("="),
            t(Array.from({ length: e }, () => String(b)).join(" × ")),
            op("="),
            grn(fmt(ans)),
          ),
          {
            t: "note",
            body: parseRich(
              `<b>The commonest slip:</b> reading ${b}^${e} as ${b} × ${e} = ${fmt(b * e)}. It is ${fmt(ans)}. The exponent tells you <b>how many</b>, never <b>what by</b>.`,
            ),
          },
        ],
      },
    };
  }

  // Powers of ten: the point moves, the digits do not.
  const { n, k } = prob;
  const ans = n * Math.pow(10, k);
  return {
    kind: "steps",
    title: `${n} × 10^${k}`,
    lead: bigLine(t(String(n)), op("×"), { t: "pow", base: "10", exp: String(k) }),
    answerText: fmt(ans),
    steps: [
      {
        label: `10^${k} is a 1 with ${k} zero${k === 1 ? "" : "s"}`,
        say: text(
          `Every power of ten is just a 1 followed by that many zeros, so multiplying by it slides the decimal point.`,
        ),
        show: [line(t(`10^${k}`), op("="), hi(fmt(Math.pow(10, k))))],
        ask: [{ label: "10^" + k, expect: String(Math.pow(10, k)), w: 8 }],
      },
      {
        label: `Move the point ${k} place${k === 1 ? "" : "s"} to the right`,
        say: text(
          `The digits never change — only where the point sits. ${n} becomes ${fmt(ans)}.`,
        ),
        show: [bigLine(t(String(n)), op("→"), grn(fmt(ans)))],
        ask: [{ label: "Answer", expect: String(ans), w: 10 }],
      },
    ],
    picture: {
      title: "Multiplying by ten slides the point",
      sub: text(
        "Each power of ten moves the decimal point one more place to the right. Nothing else about the number changes.",
      ),
      body: [
        line(t(String(n)), op("×"), { t: "pow", base: "10", exp: String(k) }, op("="), grn(fmt(ans))),
        {
          t: "note",
          body: parseRich(
            "<b>Worth knowing:</b> dividing by a power of ten slides the point the other way. The digits are the same either direction.",
          ),
        },
      ],
    },
  };
}
