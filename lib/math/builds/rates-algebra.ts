/**
 * Step models for decimals ×/÷, percents, ratios, integers, solving for x and geometry.
 *
 * Ported from docs/math-table.html:2259-2328 (dec-muldiv), :2348-2440 (percent),
 * :2461-2520 (ratio), :2545-2620 (integers), :2643-2710 (equations),
 * :2786-2928 (geometry).
 */

import { fmt, parseRich, text } from "../format";
import { decPlaces, rd, simp, trimNum } from "../number";
import type { StepsModel } from "../types";
import { bigLine, grn, hi, line, mut, op, t } from "../types";
import {
  geometryAnswer,
  sgnPlain,
  type DecMulDivProblem,
  type EquationProblem,
  type GeometryProblem,
  type IntegerProblem,
  type PercentProblem,
  type RatioProblem,
} from "../topics/rates-algebra";

/* ------------------------------------------------------------ dec-muldiv */

export function buildDecMulDiv(prob: DecMulDivProblem): StepsModel {
  if (prob.kind === "mul") {
    const { a, b } = prob;
    const da = decPlaces(a);
    const db = decPlaces(b);
    const tot = da + db;
    const wa = Math.round(a * Math.pow(10, da));
    const wb = Math.round(b * Math.pow(10, db));
    const wp = wa * wb;
    const ans = rd(a * b, tot);
    const est = Math.round(a) * Math.round(b);

    return {
      kind: "steps",
      title: `${trimNum(a)} × ${trimNum(b)}`,
      lead: bigLine(t(`${trimNum(a)} × ${trimNum(b)}`)),
      answerText: trimNum(ans),
      steps: [
        {
          label: "Ignore the points and multiply the whole numbers",
          say: text(
            `Pretend it says ${wa} × ${wb}. Do it exactly like any whole-number multiplication.`,
          ),
          show: [line(t(String(wa)), op("×"), t(String(wb)), op("="), hi(fmt(wp)))],
          ask: [{ label: `${wa} × ${wb}`, expect: String(wp), w: 6 }],
        },
        {
          label: "Count the decimal places in the question",
          say: text(
            `${trimNum(a)} has ${da} and ${trimNum(b)} has ${db}, so ${tot} altogether. The answer needs exactly that many.`,
          ),
          show: [line(t(String(da)), op("+"), t(String(db)), op("="), hi(String(tot)), mut("decimal places"))],
          ask: [{ label: "Places", expect: String(tot), w: 2 }],
        },
        {
          label: `Count ${tot} places in from the right and drop the point in`,
          say: text(
            `${fmt(wp)} with the point ${tot} places from the right is ${trimNum(ans)}.`,
          ),
          show: [bigLine(grn(trimNum(ans)))],
          ask: [{ label: "Answer", expect: trimNum(ans), w: 6, mode: "text" }],
        },
      ],
      picture: {
        title: "Estimate first, then the point places itself",
        sub: text(
          "You rarely need to count places if you know roughly how big the answer should be.",
        ),
        body: [
          line(t(`${trimNum(a)} is about ${Math.round(a)}, and ${trimNum(b)} is about ${Math.round(b)}`)),
          line(t("so the answer should be near "), hi(String(est))),
          line(t("Digits from the whole-number multiply: "), mut(fmt(wp))),
          line(t("Only "), grn(trimNum(ans)), t(` is anywhere near ${est}.`)),
          {
            t: "note",
            body: parseRich(
              "<b>Both methods agree, always.</b> Counting decimal places is the reliable rule; estimating is the check that catches you when you miscount. Use the rule, confirm with the estimate.",
            ),
          },
        ],
      },
    };
  }

  const { a, b, q } = prob;
  const db = decPlaces(b);
  const nb = rd(b * Math.pow(10, db), 6);
  const na = rd(a * Math.pow(10, db), 6);

  return {
    kind: "steps",
    title: `${trimNum(a)} ÷ ${trimNum(b)}`,
    lead: bigLine(t(`${trimNum(a)} ÷ ${trimNum(b)}`)),
    answerText: trimNum(q),
    steps: [
      {
        label: "Make the divisor a whole number",
        say: text(
          `You cannot divide by ${trimNum(b)} comfortably. Move its point ${db} place${db === 1 ? "" : "s"} right and it becomes ${nb}.`,
        ),
        show: [line(t(trimNum(b)), op("→"), hi(String(nb)), mut(`(moved ${db})`))],
        ask: [{ label: "Places moved", expect: String(db), w: 2 }],
      },
      {
        label: "Move the point in the other number exactly as far",
        say: text(
          `${trimNum(a)} becomes ${trimNum(na)}. Moving both the same amount keeps the answer identical — it is the same as multiplying top and bottom of a fraction by ${Math.pow(10, db)}.`,
        ),
        show: [line(t(trimNum(na)), op("÷"), t(String(nb)))],
        ask: [{ label: "New dividend", expect: trimNum(na), w: 6, mode: "text" }],
      },
      {
        label: "Now it is a whole-number division",
        say: text(`${trimNum(na)} ÷ ${nb} = ${trimNum(q)}.`),
        show: [bigLine(grn(trimNum(q)))],
        ask: [{ label: "Answer", expect: trimNum(q), w: 6, mode: "text" }],
      },
    ],
    picture: {
      title: "Sliding both points keeps the answer the same",
      sub: text(
        "A division is a fraction. Multiply top and bottom by the same power of ten and its value does not change — but the divisor becomes easy to work with.",
      ),
      body: [
        line(t(`${trimNum(a)} ÷ ${trimNum(b)}`), op("="), t(`${trimNum(na)} ÷ ${nb}`), op("="), grn(trimNum(q))),
        {
          t: "note",
          body: parseRich(
            "<b>The mistake to avoid:</b> moving the point in only one of them. Both move, or the answer changes.",
          ),
        },
      ],
    },
  };
}

/* --------------------------------------------------------------- percent */

export function buildPercent(prob: PercentProblem): StepsModel {
  if (prob.kind === "of") {
    const P = prob.p;
    const N = prob.n;
    const dec = rd(P / 100, 4);
    const ans = rd((N * P) / 100, 4);
    const ten = rd(N / 10, 4);
    const one = rd(N / 100, 4);

    return {
      kind: "steps",
      title: `${P}% of ${fmt(N)}`,
      lead: bigLine(t(`${P}% of ${fmt(N)}`)),
      answerText: trimNum(ans),
      steps: [
        {
          label: "Turn the percent into a decimal",
          say: text(
            `${P}% means ${P} out of 100, so divide by 100: ${trimNum(dec)}. Dividing by 100 slides the point two places left.`,
          ),
          show: [line(t(`${P}%`), op("="), { t: "frac", num: P, den: 100 }, op("="), hi(trimNum(dec)))],
          ask: [{ label: "As a decimal", expect: trimNum(dec), w: 4, mode: "text" }],
        },
        {
          label: '"Of" means multiply',
          say: text(`${trimNum(dec)} × ${fmt(N)} = ${trimNum(ans)}.`),
          sub: text(
            `Mental check: 10% of ${fmt(N)} is ${trimNum(ten)}, so ${P}% is about ${P / 10} of those — around ${trimNum(rd((ten * P) / 10, 2))}.`,
          ),
          show: [bigLine(grn(trimNum(ans)))],
          ask: [{ label: "Answer", expect: trimNum(ans), w: 6, mode: "text" }],
        },
      ],
      picture: {
        title: "Two scales on the same bar",
        sub: text(`The bar is ${fmt(N)} from end to end, and also 100% from end to end.`),
        body: [
          { t: "percentBar", percent: Math.min(P, 100), value: trimNum(ans) },
          {
            t: "note",
            body: parseRich(
              `<b>The mental-math route:</b> 10% of ${fmt(N)} is ${trimNum(ten)} (just move the point one place). 1% is ${trimNum(one)}. Almost any percent can be built from those two.`,
            ),
          },
        ],
      },
    };
  }

  if (prob.kind === "whatpct") {
    const { a, b } = prob;
    const dec = rd(a / b, 6);
    const pct = rd(dec * 100, 4);
    return {
      kind: "steps",
      title: `${trimNum(a)} is what percent of ${fmt(b)}?`,
      lead: bigLine(t(`${trimNum(a)} out of ${fmt(b)}`)),
      answerText: `${trimNum(pct)}%`,
      steps: [
        {
          label: "Write it as a fraction, part over whole",
          say: text(
            `The part is ${trimNum(a)} and the whole is ${fmt(b)}, so the fraction is ${trimNum(a)}/${fmt(b)}.`,
          ),
          show: [line({ t: "frac", num: a, den: b })],
          ask: [{ label: "The whole", expect: String(b), w: 5 }],
        },
        {
          label: "Divide to get a decimal",
          say: text(`${trimNum(a)} ÷ ${fmt(b)} = ${trimNum(dec)}.`),
          show: [line(t(`${trimNum(a)} ÷ ${fmt(b)} = `), hi(trimNum(dec)))],
          ask: [{ label: "Decimal", expect: trimNum(dec), w: 6, mode: "text" }],
        },
        {
          label: "Multiply by 100 to turn it into a percent",
          say: text(
            `${trimNum(dec)} × 100 = ${trimNum(pct)}%. Per cent literally means per hundred, so this step is just changing units.`,
          ),
          show: [bigLine(grn(`${trimNum(pct)}%`))],
          ask: [{ label: "Percent", expect: trimNum(pct), w: 5, mode: "text" }],
        },
      ],
      picture: {
        title: `${trimNum(a)} out of ${fmt(b)}`,
        sub: text("Shade the part, then read the same bar off the percent scale."),
        body: [
          { t: "percentBar", percent: Math.min(pct, 100), value: trimNum(a) },
          {
            t: "note",
            body: parseRich(
              "<b>Which number goes on the bottom:</b> the whole — the thing you are taking a part <b>of</b>. Getting these the wrong way round is the single commonest percent mistake.",
            ),
          },
        ],
      },
    };
  }

  const P = prob.p;
  const dec = rd(P / 100, 4);
  const [sn, sd] = simp(P, 100);
  return {
    kind: "steps",
    title: `Write ${P}% as a decimal and a fraction`,
    lead: bigLine(t(`${P}%`)),
    answerText: `${trimNum(dec)} and ${sn}/${sd}`,
    steps: [
      {
        label: "As a decimal: divide by 100",
        say: text(`Dividing by 100 slides the point two places left, so ${P}% = ${trimNum(dec)}.`),
        show: [line(t(`${P}%`), op("="), hi(trimNum(dec)))],
        ask: [{ label: "Decimal", expect: trimNum(dec), w: 5, mode: "text" }],
      },
      {
        label: "As a fraction: put it over 100, then simplify",
        say: text(`${P}/100 simplifies to ${sn}/${sd}.`),
        show: [bigLine({ t: "frac", num: P, den: 100 }, op("="), { t: "frac", num: sn, den: sd })],
        ask: [{ label: "Simplest top", expect: String(sn), w: 4 }],
      },
    ],
    picture: {
      title: `${P} squares out of 100`,
      sub: text("A hundred-square is the definition of percent, drawn out."),
      body: [
        { t: "hundredSquare", on: Math.min(P, 100) },
        {
          t: "note",
          body: parseRich(
            "<b>Three ways of writing one thing:</b> a percent, a decimal and a fraction are the same number in different clothes. Being able to swap between them quickly is most of what percent questions test.",
          ),
        },
      ],
    },
  };
}

/* ----------------------------------------------------------------- ratio */

export function buildRatio(prob: RatioProblem): StepsModel {
  if (prob.kind === "unit") {
    const { n, total, unit, m, item, sym } = prob;
    const ans = unit * m;
    const single = item.replace(/s$/, "");
    return {
      kind: "steps",
      title: `Cost of ${m} ${item}`,
      lead: bigLine(t(`${n} ${item} cost ${sym}${fmt(total)}. What do ${m} ${item} cost?`)),
      answerText: `${sym}${fmt(ans)}`,
      steps: [
        {
          label: "Find the unit rate — the cost of just one",
          say: text(
            `Divide both sides of the ratio by ${n}: ${sym}${fmt(total)} ÷ ${n} = ${sym}${fmt(unit)} for one ${single}.`,
          ),
          show: [
            line(t(`${sym}${fmt(total)}`), op("÷"), t(String(n)), op("="), hi(`${sym}${fmt(unit)}`), mut("each")),
          ],
          ask: [{ label: "Cost of 1", expect: String(unit), w: 4 }],
        },
        {
          label: `Scale up to ${m}`,
          say: text(`${m} × ${sym}${fmt(unit)} = ${sym}${fmt(ans)}.`),
          show: [bigLine(grn(`${sym}${fmt(ans)}`))],
          ask: [{ label: `Cost of ${m}`, expect: String(ans), w: 5 }],
        },
      ],
      picture: {
        title: "A ratio table walks you there in steps",
        sub: text("Divide down to one, then multiply up to whatever you need."),
        body: [
          {
            t: "ratioTable",
            head: [item, "1", String(n), String(m)],
            rows: [["cost", `${sym}${fmt(unit)}`, `${sym}${fmt(total)}`, `${sym}${fmt(ans)}`]],
            highlight: [0, 3],
          },
          {
            t: "note",
            body: parseRich(
              `<b>Why the unit rate is worth finding:</b> once you know one ${single} costs ${sym}${fmt(unit)}, you can answer any version of the question instantly — 7 of them, 40 of them, whatever. It turns one problem into a tool.`,
            ),
          },
        ],
      },
    };
  }

  const { a, b, k } = prob;
  const ans = b * k;
  return {
    kind: "steps",
    title: `${a} : ${b} = ${a * k} : ?`,
    lead: bigLine(t(`${a} : ${b}  =  ${a * k} : ?`)),
    answerText: String(ans),
    steps: [
      {
        label: "What did the first number get multiplied by?",
        say: text(`${a} became ${a * k}, so the scale factor is ${k}.`),
        show: [line(t(String(a)), op("×"), hi(String(k)), op("="), t(String(a * k)))],
        ask: [{ label: "Scale factor", expect: String(k), w: 3 }],
      },
      {
        label: "Do the same to the second number",
        say: text(
          `${b} × ${k} = ${ans}. A ratio only stays the same if both parts grow by the same factor.`,
        ),
        show: [bigLine(t(`${a * k} : `), grn(String(ans)))],
        ask: [{ label: "Missing number", expect: String(ans), w: 4 }],
      },
    ],
    picture: {
      title: "Equivalent ratios are one ratio, written bigger",
      sub: text("Both parts scale together, exactly like equivalent fractions."),
      body: [
        {
          t: "ratioTable",
          head: ["", "×1", `×${k}`],
          rows: [
            ["first", String(a), String(a * k)],
            ["second", String(b), String(ans)],
          ],
          highlight: [1, 2],
        },
        {
          t: "note",
          body: parseRich(
            "<b>The check:</b> cross-multiply. If the two products match, the ratios are equivalent. Here that is one multiplication each way.",
          ),
        },
      ],
    },
  };
}

/* -------------------------------------------------------------- integers */

export function buildIntegers(prob: IntegerProblem): StepsModel {
  const { kind } = prob;

  if (kind === "mul" || kind === "div") {
    const A = kind === "div" ? prob.a * prob.b : prob.a;
    const B = prob.b;
    const ans = kind === "mul" ? prob.a * prob.b : prob.a;
    const sizeAns = Math.abs(ans);
    const opw = kind === "mul" ? "×" : "÷";

    return {
      kind: "steps",
      title: `${sgnPlain(A)} ${opw} ${sgnPlain(B)}`,
      lead: bigLine(t(`${sgnPlain(A)} ${opw} ${sgnPlain(B)}`)),
      answerText: String(ans),
      steps: [
        {
          label: "Ignore the signs and work out the size",
          say: text(`${Math.abs(A)} ${opw} ${Math.abs(B)} = ${sizeAns}.`),
          show: [line(t(String(Math.abs(A))), op(opw), t(String(Math.abs(B))), op("="), hi(String(sizeAns)))],
          ask: [{ label: "Size", expect: String(sizeAns), w: 4 }],
        },
        {
          label: "Now the sign: same signs give a positive, different signs give a negative",
          say: text(
            A < 0 === B < 0
              ? `Both have the same sign, so the answer is positive: ${ans}.`
              : `The signs are different, so the answer is negative: ${ans}.`,
          ),
          sub: text(
            "Count the negatives: an even number of them cancels out to positive, an odd number leaves it negative.",
          ),
          show: [bigLine(grn(String(ans)))],
          ask: [{ label: "Answer", expect: String(ans), w: 5, mode: "text" }],
        },
      ],
      picture: {
        title: "Why two negatives make a positive",
        sub: text(
          "Multiplying by a negative flips the number line around zero. Flip twice and you are back where you started.",
        ),
        body: [
          line(t("3 × 2 = 6")),
          line(t("3 × (−2) = −6"), mut("— flipped once")),
          line(t("(−3) × (−2) = 6"), mut("— flipped twice, back to positive")),
          { t: "numberLine", min: -8, max: 8, marks: [-6, 0, 6] },
          {
            t: "note",
            body: parseRich(
              "<b>The rule in four lines:</b> + × + = +, − × − = +, + × − = −, − × + = −. Division follows exactly the same pattern. Count how many negatives you have: even means positive, odd means negative.",
            ),
          },
        ],
      },
    };
  }

  const a = prob.a;
  const b = prob.b;
  const effB = kind === "sub" ? -b : b;
  const ans = a + effB;
  const steps = [];

  if (kind === "sub") {
    steps.push({
      label: "Subtracting is the same as adding the opposite",
      say: text(
        `Change the ${b < 0 ? '"minus a negative" into "plus a positive"' : "subtraction into adding a negative"}: ${sgnPlain(a)} − ${sgnPlain(b)} becomes ${sgnPlain(a)} + ${sgnPlain(effB)}.`,
      ),
      sub: b < 0 ? text("Taking away a debt makes you richer — that is why minus a negative goes up.") : undefined,
      show: [line(t(sgnPlain(a)), op("+"), t(sgnPlain(effB)))],
      ask: [{ label: `The opposite of ${sgnPlain(b)}`, expect: String(effB), w: 4, mode: "text" as const }],
    });
  }

  steps.push({
    label: effB < 0 ? "Move left along the number line" : "Move right along the number line",
    say: text(
      `Start at ${a} and move ${Math.abs(effB)} ${effB < 0 ? "left" : "right"}. You land on ${ans}.`,
    ),
    show: [bigLine(t(`${sgnPlain(a)} + ${sgnPlain(effB)} = `), grn(String(ans)))],
    ask: [{ label: "Answer", expect: String(ans), w: 5, mode: "text" as const }],
  });

  const lo = Math.min(a, ans) - 3;
  const rangeHi = Math.max(a, ans) + 3;

  return {
    kind: "steps",
    title: `${sgnPlain(a)} ${kind === "add" ? "+" : "−"} ${sgnPlain(b)}`,
    lead: bigLine(t(`${sgnPlain(a)} ${kind === "add" ? "+" : "−"} ${sgnPlain(b)}`)),
    answerText: String(ans),
    steps,
    picture: {
      title: "Sign tells you which way, size tells you how far",
      sub: text(
        `Start at ${a}. A positive moves right, a negative moves left. Landing on ${ans}.`,
      ),
      body: [
        {
          t: "numberLine",
          min: lo,
          max: rangeHi,
          marks: [lo, 0, rangeHi].filter((v, i, arr) => arr.indexOf(v) === i).sort((x, y) => x - y),
          point: ans,
          pointLabel: String(ans),
          jump: [a, ans],
        },
        {
          t: "note",
          body: parseRich(
            "<b>The one that trips everyone:</b> two minus signs in a row. − (−5) is + 5, because taking away a negative leaves you better off.",
          ),
        },
      ],
    },
  };
}

/* ------------------------------------------------------------- equations */

export function buildEquations(prob: EquationProblem): StepsModel {
  const { kind, x, a } = prob;
  const b = prob.b ?? 0;

  const rhs =
    kind === "add" ? x + a : kind === "sub" ? x - a : kind === "mul" ? a * x : kind === "div" ? x / a : a * x + b;

  const eq =
    kind === "add"
      ? `x + ${a} = ${rhs}`
      : kind === "sub"
        ? `x − ${a} = ${rhs}`
        : kind === "mul"
          ? `${a}x = ${rhs}`
          : kind === "div"
            ? `x ÷ ${a} = ${rhs}`
            : `${a}x + ${b} = ${rhs}`;

  const steps = [];

  if (kind === "two") {
    steps.push({
      label: `Undo the + ${b} first`,
      say: text(
        `Whatever is added last gets undone first. Subtract ${b} from both sides: ${rhs} − ${b} = ${a * x}.`,
      ),
      show: [line(t(`${a}x = `), hi(String(a * x)))],
      ask: [{ label: `${a}x`, expect: String(a * x), w: 4 }],
    });
    steps.push({
      label: `Now undo the × ${a}`,
      say: text(`Divide both sides by ${a}: ${a * x} ÷ ${a} = ${x}.`),
      show: [bigLine(t("x = "), grn(String(x)))],
      ask: [{ label: "x", expect: String(x), w: 4 }],
    });
  } else {
    const undo =
      kind === "add"
        ? `Subtract ${a} from both sides`
        : kind === "sub"
          ? `Add ${a} to both sides`
          : kind === "mul"
            ? `Divide both sides by ${a}`
            : `Multiply both sides by ${a}`;
    const why =
      kind === "add"
        ? `${rhs} − ${a} = ${x}`
        : kind === "sub"
          ? `${rhs} + ${a} = ${x}`
          : kind === "mul"
            ? `${rhs} ÷ ${a} = ${x}`
            : `${rhs} × ${a} = ${x}`;

    steps.push({
      label: "What is being done to x?",
      say: text(
        `x has ${kind === "add" ? `${a} added` : kind === "sub" ? `${a} subtracted` : kind === "mul" ? `been multiplied by ${a}` : `been divided by ${a}`}. To get x on its own, do the opposite.`,
      ),
      show: [line(t(eq))],
      ask: [{ label: "Undo with", expect: String(a), w: 3 }],
    });
    steps.push({
      label: undo,
      say: text(
        `${why}. Whatever you do to one side you must do to the other, or the scales stop balancing.`,
      ),
      show: [bigLine(t("x = "), grn(String(x)))],
      ask: [{ label: "x", expect: String(x), w: 4 }],
    });
  }

  return {
    kind: "steps",
    title: eq,
    lead: bigLine(t(eq)),
    answerText: `x = ${x}`,
    steps,
    picture: {
      title: "Both sides must stay balanced",
      sub: text(
        "An equation is a pair of scales. Take the same amount off both pans and it stays level; take it off only one and it tips.",
      ),
      body: [
        {
          t: "balance",
          left: [t(kind === "mul" ? `${a}x` : kind === "two" ? `${a}x + ${b}` : `x ${kind === "add" ? "+" : "−"} ${a}`)],
          right: [t(String(rhs))],
        },
        {
          t: "note",
          body: parseRich(
            "<b>Undo in reverse order:</b> the last thing done to x is the first thing you undo. That is why a two-step equation loses its + before its ×.",
          ),
        },
      ],
    },
  };
}

/* -------------------------------------------------------------- geometry */

export function buildGeometry(prob: GeometryProblem): StepsModel {
  const u = prob.u;
  const ans = geometryAnswer(prob);

  // The L-shape carries its outer box as w1/h1; every other shape uses w/h.
  const outerW = prob.kind === "ell" ? prob.w1 : prob.w;
  const outerH = prob.kind === "ell" ? prob.h1 : prob.h;

  const shapeNode = {
    t: "shape" as const,
    kind:
      prob.kind === "vol"
        ? ("prism" as const)
        : prob.kind === "ell"
          ? ("ell" as const)
          : prob.kind === "tri"
            ? ("tri" as const)
            : prob.kind === "para"
              ? ("para" as const)
              : ("rect" as const),
    w: outerW,
    h: outerH,
    unit: u,
    extra: prob.kind === "vol" ? prob.d : prob.kind === "ell" ? prob.w2 : undefined,
  };

  const sq = prob.kind === "vol" ? `${u}³` : `${u}²`;

  if (prob.kind === "perim") {
    return {
      kind: "steps",
      title: "Perimeter of a rectangle",
      lead: shapeNode,
      answerText: `${ans} ${u}`,
      steps: [
        {
          label: "Perimeter is the distance all the way round",
          say: text(
            `Walk the edge: ${prob.w} + ${prob.h} + ${prob.w} + ${prob.h}. Opposite sides of a rectangle match, so there are two of each.`,
          ),
          show: [line(t(`${prob.w} + ${prob.h} + ${prob.w} + ${prob.h}`))],
          ask: [{ label: "Total", expect: String(ans), w: 4 }],
        },
        {
          label: "The shortcut: 2 × (length + width)",
          say: text(
            `${prob.w} + ${prob.h} = ${prob.w + prob.h}, and doubling gives ${ans} ${u}.`,
          ),
          show: [bigLine(t(`2 × ${prob.w + prob.h} = `), grn(`${ans} ${u}`))],
          ask: [{ label: `Perimeter (${u})`, expect: String(ans), w: 4 }],
        },
      ],
      picture: {
        title: "Perimeter is a length, not an area",
        sub: text(
          "It is the fence around the field, not the grass inside it — which is why it is measured in plain units, never squared ones.",
        ),
        body: [
          shapeNode,
          {
            t: "note",
            body: parseRich(
              "<b>The commonest mix-up:</b> using the area formula when the question asks for perimeter. Ask yourself whether you are buying fencing or turf.",
            ),
          },
        ],
      },
    };
  }

  // A switch rather than a ternary chain: TypeScript narrows the discriminated union
  // reliably here, and `ell` carries different field names from every other shape.
  let formula: string;
  switch (prob.kind) {
    case "tri":
      formula = `${prob.w} × ${prob.h} ÷ 2`;
      break;
    case "vol":
      formula = `${prob.w} × ${prob.h} × ${prob.d}`;
      break;
    case "ell":
      formula = `${prob.w1} × ${prob.h1} − ${prob.w2} × ${prob.h2}`;
      break;
    default:
      formula = `${prob.w} × ${prob.h}`;
  }

  const why =
    prob.kind === "area"
      ? "Area is how many unit squares fit inside. A rectangle holds exactly length × width of them."
      : prob.kind === "tri"
        ? "A triangle is exactly half of the rectangle that boxes it in — so work out that rectangle, then halve it."
        : prob.kind === "para"
          ? "Slide the slanted end across and a parallelogram becomes a rectangle of the same area. That is why you use the straight height, never the slanted side."
          : prob.kind === "vol"
            ? "Volume is how many unit cubes fit inside: a layer of length × width, stacked depth times."
            : "Cut the L into the big rectangle it would be, then take away the missing notch.";

  return {
    kind: "steps",
    title: geometryTitleFor(prob.kind),
    lead: shapeNode,
    answerText: `${ans} ${sq}`,
    steps: [
      {
        label: "Which formula does this shape need?",
        say: text(why),
        show: [line(t(formula))],
        ask: [{ label: "Product", expect: String(rawProduct(prob)), w: 6 }],
      },
      {
        label: "Work it out",
        say: text(`${formula} = ${ans} ${sq}.`),
        show: [bigLine(grn(`${ans} ${sq}`))],
        ask: [{ label: `Answer (${sq})`, expect: String(ans), w: 6 }],
      },
    ],
    picture: {
      title: "Every formula is really just counting squares",
      sub: text(
        prob.kind === "vol"
          ? "Cubes this time, but the idea is identical — fill the shape and count."
          : "Fill the shape with unit squares and count them. The formula is a shortcut for that counting.",
      ),
      body: [
        shapeNode,
        ...(prob.kind === "area" && "w" in prob && prob.w <= 20 && prob.h <= 16
          ? [{ t: "unitGrid" as const, rows: prob.h, cols: prob.w }]
          : []),
        {
          t: "note",
          body: parseRich(
            `<b>Units matter:</b> area is measured in squared units (${sq}) because you are counting squares. Getting ${u} where ${sq} belongs is a mark lost even when the number is right.`,
          ),
        },
      ],
    },
  };
}

function rawProduct(p: GeometryProblem): number {
  if (p.kind === "tri") return p.w * p.h;
  if (p.kind === "ell") return p.w1 * p.h1;
  if (p.kind === "vol") return p.w * p.h * p.d;
  return ("w" in p ? p.w : 0) * ("h" in p ? p.h : 0);
}

function geometryTitleFor(kind: GeometryProblem["kind"]): string {
  return {
    area: "Area of a rectangle",
    perim: "Perimeter of a rectangle",
    tri: "Area of a triangle",
    para: "Area of a parallelogram",
    vol: "Volume of a box",
    ell: "Area of an L-shape",
  }[kind];
}
