/**
 * Step models for the four fraction topics.
 *
 * Ported from docs/math-table.html:1784-1832 (frac-equiv), :1859-1888 + mixedPicture at
 * :1900 (frac-mixed), :1944-2020 (frac-addsub), :2050-2140 (frac-muldiv).
 */

import { fmt, parseRich, text } from "../format";
import { gcd, lcm, simp } from "../number";
import type { DisplayNode, Inline, StepsModel } from "../types";
import { bigLine, grn, hi, line, mut, op, t } from "../types";
import {
  mixText,
  type AddSubFracProblem,
  type EquivProblem,
  type MixedProblem,
  type MulDivFracProblem,
} from "../topics/fractions";

const frac = (num: number, den: number, whole?: number): Inline => ({
  t: "frac",
  num,
  den,
  whole,
});

/* ------------------------------------------------------------ frac-equiv */

export function buildFracEquiv(prob: EquivProblem): StepsModel {
  const { n, d, k } = prob;
  const N = n * k;
  const D = d * k;

  if (prob.kind === "simplify") {
    return {
      kind: "steps",
      title: `Simplify ${N}/${D}`,
      lead: bigLine(frac(N, D)),
      answerText: `${n}/${d}`,
      steps: [
        {
          label: "What divides into both the top and the bottom?",
          say: text(
            `The greatest common factor of ${N} and ${D} is ${k}. That is the biggest piece we can pull out of both.`,
          ),
          show: [line(t(`GCF of ${N} and ${D} = `), hi(String(k)))],
          ask: [{ label: "GCF", expect: String(k), w: 3 }],
        },
        {
          label: `Divide the top by ${k}`,
          say: text(`${N} ÷ ${k} = ${n}.`),
          show: [line(t(String(N)), op("÷"), t(String(k)), op("="), hi(String(n)))],
          ask: [{ label: "New top", expect: String(n), w: 3 }],
        },
        {
          label: `Divide the bottom by the same ${k}`,
          say: text(
            `${D} ÷ ${k} = ${d}. Doing the same thing to both keeps the fraction worth exactly what it was.`,
          ),
          show: [bigLine(frac(N, D), op("="), frac(n, d))],
          ask: [{ label: "New bottom", expect: String(d), w: 3 }],
        },
      ],
      picture: {
        title: `${N}/${D} and ${n}/${d} are the same amount`,
        sub: text(
          "Simplifying does not make the fraction smaller — it just cuts the whole into fewer, bigger pieces.",
        ),
        body: [
          {
            t: "twoBars",
            top: { parts: D, shaded: N, label: `${N} of ${D} pieces` },
            bottom: { parts: d, shaded: n, label: `${n} of ${d} bigger pieces`, tone: 2 },
          },
          {
            t: "note",
            body: parseRich(
              `<b>Look at the bars:</b> the shaded length is identical. All we did was rub out some of the dividing lines — every ${k} small pieces became one big piece. That is what dividing top and bottom by ${k} does.`,
            ),
          },
        ],
      },
    };
  }

  return {
    kind: "steps",
    title: `${n}/${d} = ?/${D}`,
    lead: bigLine(frac(n, d), op("="), t(`?/${D}`)),
    answerText: `${N}/${D}`,
    steps: [
      {
        label: "What happened to the bottom number?",
        say: text(`${d} became ${D}, so it was multiplied by ${k}.`),
        show: [line(t(String(d)), op("×"), hi(String(k)), op("="), t(String(D)))],
        ask: [{ label: "Multiplied by", expect: String(k), w: 3 }],
      },
      {
        label: "Do exactly the same to the top",
        say: text(
          `${n} × ${k} = ${N}. Whatever you do to the bottom you must do to the top, or you change the value.`,
        ),
        show: [bigLine(frac(n, d), op("="), frac(N, D))],
        ask: [{ label: "New top", expect: String(N), w: 3 }],
      },
    ],
    picture: {
      title: "Same amount, more pieces",
      sub: text(
        `Cutting every piece into ${k} makes ${k} times as many pieces — and you shade ${k} times as many.`,
      ),
      body: [
        {
          t: "twoBars",
          top: { parts: d, shaded: n, label: `${n} of ${d}` },
          bottom: { parts: D, shaded: N, label: `${N} of ${D}`, tone: 2 },
        },
        {
          t: "note",
          body: parseRich(
            "<b>The rule in one line:</b> multiply top and bottom by the same number and nothing changes. Multiply only one of them and you have a different fraction entirely.",
          ),
        },
      ],
    },
  };
}

/* ------------------------------------------------------------ frac-mixed */

function mixedPicture(w: number, r: number, d: number, N: number) {
  const bars: DisplayNode[] = [];
  for (let i = 0; i < w; i++) bars.push({ t: "fracBar", parts: d, shaded: d, tone: 1 });
  bars.push({ t: "fracBar", parts: d, shaded: r, tone: 3 });
  return {
    title: `${w} whole ${w === 1 ? "one" : "ones"} plus ${r} more piece${r === 1 ? "" : "s"}`,
    sub: text(
      `Count the shaded pieces one way and you get ${N}/${d}. Count the whole bars and you get ${w} ${r}/${d}. Same amount.`,
    ),
    body: [
      ...bars,
      {
        t: "note" as const,
        body: parseRich(
          `<b>Which form to use:</b> mixed numbers are easier to picture and to compare. Improper fractions are easier to calculate with — that is why you convert to improper before multiplying or dividing.`,
        ),
      },
    ],
  };
}

export function buildFracMixed(prob: MixedProblem): StepsModel {
  const { d, w, r } = prob;
  const N = w * d + r;

  if (prob.kind === "toMixed") {
    return {
      kind: "steps",
      title: `Write ${N}/${d} as a mixed number`,
      lead: bigLine(frac(N, d)),
      answerText: `${w} ${r}/${d}`,
      steps: [
        {
          label: "How many whole ones fit?",
          say: text(
            `Each whole needs ${d} pieces. ${N} ÷ ${d} = ${w} with ${r} left over, so there are ${w} whole ones.`,
          ),
          show: [
            line(t(String(N)), op("÷"), t(String(d)), op("="), hi(String(w)), mut(`remainder ${r}`)),
          ],
          ask: [{ label: "Whole ones", expect: String(w), w: 3 }],
        },
        {
          label: "What is left over?",
          say: text(
            `After making ${w} whole ones we used ${w * d} pieces. ${N} − ${w * d} = ${r} pieces still loose, and each is still a one/${d}.`,
          ),
          show: [bigLine(frac(N, d), op("="), frac(r, d, w))],
          ask: [{ label: "Leftover pieces", expect: String(r), w: 3 }],
        },
      ],
      picture: mixedPicture(w, r, d, N),
    };
  }

  return {
    kind: "steps",
    title: `Write ${w} ${r}/${d} as an improper fraction`,
    lead: bigLine(frac(r, d, w)),
    answerText: `${N}/${d}`,
    steps: [
      {
        label: "Turn the whole ones into pieces",
        say: text(
          `Each whole is ${d} pieces, and there are ${w} of them: ${w} × ${d} = ${w * d} pieces.`,
        ),
        show: [line(t(String(w)), op("×"), t(String(d)), op("="), hi(String(w * d)), mut("pieces"))],
        ask: [{ label: `${w} × ${d}`, expect: String(w * d), w: 3 }],
      },
      {
        label: "Add the pieces you already had",
        say: text(
          `${w * d} + ${r} = ${N} pieces altogether, each one a one/${d}.`,
        ),
        show: [bigLine(frac(r, d, w), op("="), frac(N, d))],
        ask: [{ label: "Total pieces", expect: String(N), w: 3 }],
      },
    ],
    picture: mixedPicture(w, r, d, N),
  };
}

/* ----------------------------------------------------------- frac-addsub */

export function buildFracAddSub(prob: AddSubFracProblem): StepsModel {
  const { op: sign, w1, n1, d1, w2, n2, d2 } = prob;
  const N1 = w1 * d1 + n1;
  const N2 = w2 * d2 + n2;
  const L = lcm(d1, d2);
  const k1 = L / d1;
  const k2 = L / d2;
  const A = N1 * k1;
  const B = N2 * k2;
  const raw = sign === "+" ? A + B : A - B;
  const [sn, sd] = simp(raw, L);
  const opStr = sign === "+" ? "+" : "−";
  const mixed = w1 > 0 || w2 > 0;

  const steps = [];

  if (mixed) {
    steps.push({
      label: "Turn both mixed numbers into improper fractions",
      say: text(
        `Whole × bottom, then add the top. ${mixText(w1, n1, d1)} becomes ${N1}/${d1}, and ${mixText(w2, n2, d2)} becomes ${N2}/${d2}. Improper fractions are easier to combine.`,
      ),
      show: [line(frac(N1, d1), op(opStr), frac(N2, d2))],
      // One box per mixed number actually present, as the original did.
      ask: [
        ...(w1 > 0 ? [{ label: "First top", expect: String(N1), w: 3 }] : []),
        ...(w2 > 0 ? [{ label: "Second top", expect: String(N2), w: 3 }] : []),
      ],
    });
  }

  if (d1 !== d2) {
    steps.push({
      label: `Find a bottom they both fit into`,
      say: text(
        `The least common multiple of ${d1} and ${d2} is ${L}. Re-cut both fractions into ${L}ths so the pieces are the same size — you can only add pieces that match.`,
      ),
      show: [line(t(`LCM of ${d1} and ${d2} = `), hi(String(L)))],
      ask: [{ label: "Common bottom", expect: String(L), w: 3 }],
    });
    steps.push({
      label: `Rewrite both over ${L}`,
      say: text(
        `${N1}/${d1} × ${k1}/${k1} = ${A}/${L}, and ${N2}/${d2} × ${k2}/${k2} = ${B}/${L}.`,
      ),
      show: [line(frac(A, L), op(opStr), frac(B, L))],
      ask: [
        { label: "First top", expect: String(A), w: 4 },
        { label: "Second top", expect: String(B), w: 4 },
      ],
    });
  }

  steps.push({
    label: `Now ${sign === "+" ? "add" : "subtract"} the tops — the bottom stays put`,
    say: text(
      `${A} ${opStr} ${B} = ${raw}. The bottom does not change: you are counting pieces, not resizing them.`,
    ),
    show: [line(frac(raw, L))],
    ask: [{ label: "Top", expect: String(raw), w: 4 }],
  });

  if (raw !== sn || L !== sd) {
    steps.push({
      label: "Simplify",
      say: text(
        `${raw} and ${L} share a factor of ${gcd(raw, L)}, so divide both by it.`,
      ),
      show: [bigLine(frac(raw, L), op("="), frac(sn, sd))],
      ask: [
        { label: "Top", expect: String(sn), w: 3 },
        { label: "Bottom", expect: String(sd), w: 3 },
      ],
    });
  }

  // A top-heavy answer gets written as a mixed number, as the original did.
  if (sn > sd && sd > 1) {
    const W = Math.floor(sn / sd);
    const Rr = sn - W * sd;
    steps.push({
      label: "It is top-heavy — write it as a mixed number",
      say: text(`${sn} ÷ ${sd} = ${W} remainder ${Rr}.`),
      show: [bigLine(frac(Rr, sd, W || undefined))],
      ask:
        Rr === 0
          ? [{ label: "Whole", expect: String(W), w: 3 }]
          : [
              { label: "Whole", expect: String(W), w: 3 },
              { label: "Top", expect: String(Rr), w: 3 },
            ],
    });
  }

  return {
    kind: "steps",
    title: `${mixText(w1, n1, d1)} ${opStr} ${mixText(w2, n2, d2)}`,
    lead: bigLine(frac(n1, d1, w1 || undefined), op(opStr), frac(n2, d2, w2 || undefined)),
    answerText: sd === 1 ? String(sn) : `${sn}/${sd}`,
    steps,
    picture: {
      title:
        d1 === d2
          ? "The pieces already match"
          : `Both bars re-cut into ${L}ths`,
      sub: text(
        d1 === d2
          ? "Same sized pieces, so you can just count them together."
          : `You cannot add halves to thirds any more than you can add apples to hours. Cut both into ${L}ths and every piece is the same size.`,
      ),
      body: [
        {
          t: "twoBars",
          top: { parts: L, shaded: Math.min(A, L), label: `${N1}/${d1} = ${A}/${L}` },
          bottom: { parts: L, shaded: Math.min(B, L), label: `${N2}/${d2} = ${B}/${L}`, tone: 2 },
        },
        {
          t: "note",
          body: parseRich(
            `<b>Why the LCM:</b> any common multiple works — ${d1} × ${d2} = ${d1 * d2} always does. The least one just keeps the numbers small and usually saves you a simplify at the end.`,
          ),
        },
      ],
    },
  };
}

/* ----------------------------------------------------------- frac-muldiv */

export function buildFracMulDiv(prob: MulDivFracProblem): StepsModel {
  const { kind, w1, n1, d1, w2, n2, d2 } = prob;
  const N1 = w1 * d1 + n1;
  const N2 = w2 * d2 + n2;
  const mixed = w1 > 0 || w2 > 0;

  const topRaw = kind === "mul" ? N1 * N2 : N1 * d2;
  const botRaw = kind === "mul" ? d1 * d2 : d1 * N2;
  const [sn, sd] = simp(topRaw, botRaw);
  const opStr = kind === "mul" ? "×" : "÷";

  const steps = [];

  if (mixed) {
    steps.push({
      label: "Convert to improper fractions first",
      say: text(
        `You cannot multiply mixed numbers piece by piece. ${mixText(w1, n1, d1)} is ${N1}/${d1} and ${mixText(w2, n2, d2)} is ${N2}/${d2}.`,
      ),
      show: [line(frac(N1, d1), op(opStr), frac(N2, d2))],
      // One box per mixed number actually present, as the original did.
      ask: [
        ...(w1 > 0 ? [{ label: "First top", expect: String(N1), w: 3 }] : []),
        ...(w2 > 0 ? [{ label: "Second top", expect: String(N2), w: 3 }] : []),
      ],
    });
  }

  if (kind === "div") {
    steps.push({
      label: "Flip the second fraction and switch ÷ to ×",
      say: text(
        `Dividing by ${N2}/${d2} is the same as multiplying by ${d2}/${N2}. Turn it upside down and the problem becomes a multiplication.`,
      ),
      show: [line(frac(N1, d1), op("×"), frac(d2, N2))],
      ask: [
        { label: "Flipped top", expect: String(d2), w: 3 },
        { label: "Flipped bottom", expect: String(N2), w: 3 },
      ],
    });
  }

  steps.push({
    label: "Multiply straight across the top",
    say: text(`${kind === "mul" ? N1 : N1} × ${kind === "mul" ? N2 : d2} = ${topRaw}.`),
    show: [line(t(`${kind === "mul" ? N1 : N1} × ${kind === "mul" ? N2 : d2} = `), hi(String(topRaw)))],
    ask: [{ label: "New top", expect: String(topRaw), w: 4 }],
  });

  steps.push({
    label: "And straight across the bottom",
    say: text(
      `${kind === "mul" ? d1 : d1} × ${kind === "mul" ? d2 : N2} = ${botRaw}. No common denominator needed — that is only for adding.`,
    ),
    show: [line(frac(topRaw, botRaw))],
    ask: [{ label: "New bottom", expect: String(botRaw), w: 4 }],
  });

  if (topRaw !== sn || botRaw !== sd) {
    steps.push({
      label: "Simplify",
      say: text(`Divide top and bottom by ${gcd(topRaw, botRaw)}.`),
      show: [bigLine(frac(topRaw, botRaw), op("="), frac(sn, sd))],
      ask: [
        { label: "Top", expect: String(sn), w: 4 },
        { label: "Bottom", expect: String(sd), w: 4 },
      ],
    });
  }

  if (sn > sd && sd > 1) {
    const W = Math.floor(sn / sd);
    const Rr = sn - W * sd;
    steps.push({
      label: "Write the top-heavy answer as a mixed number",
      say: text(`${sn} ÷ ${sd} = ${W} remainder ${Rr}.`),
      show: [bigLine(frac(Rr, sd, W || undefined))],
      ask:
        Rr === 0
          ? [{ label: "Whole", expect: String(W), w: 3 }]
          : [
              { label: "Whole", expect: String(W), w: 3 },
              { label: "Top", expect: String(Rr), w: 3 },
            ],
    });
  }

  return {
    kind: "steps",
    title: `${mixText(w1, n1, d1)} ${opStr} ${mixText(w2, n2, d2)}`,
    lead: bigLine(frac(n1, d1, w1 || undefined), op(opStr), frac(n2, d2, w2 || undefined)),
    answerText: sd === 1 ? String(sn) : `${sn}/${sd}`,
    steps,
    picture:
      kind === "mul" && !mixed
        ? {
            title: `${n1}/${d1} of ${n2}/${d2}`,
            sub: text(
              'Multiplying fractions means "of". Shade one way for the first fraction, the other way for the second, and the overlap is the answer.',
            ),
            body: [
              { t: "unitGrid", rows: d1, cols: d2, a: n1, b: n2 },
              {
                t: "note",
                body: parseRich(
                  `<b>Why the answer is smaller:</b> taking a fraction <b>of</b> something makes it smaller, which is why ${n1}/${d1} × ${n2}/${d2} lands below both. That surprises people who expect multiplying to grow things.`,
                ),
              },
            ],
          }
        : {
            title: kind === "div" ? "Dividing is multiplying by the flip" : "Straight across",
            sub: text(
              kind === "div"
                ? `"How many ${N2}/${d2}s fit into ${N1}/${d1}?" Flipping the second fraction turns that question into a multiplication.`
                : "Tops together, bottoms together. Nothing needs to match first.",
            ),
            body: [
              line(frac(N1, d1), op(opStr), frac(N2, d2), op("="), grn(fmt(sn) + (sd === 1 ? "" : `/${sd}`))),
              {
                t: "note",
                body: parseRich(
                  "<b>The one to remember:</b> a common denominator is for adding and subtracting only. Multiplying and dividing never need one.",
                ),
              },
            ],
          },
  };
}
