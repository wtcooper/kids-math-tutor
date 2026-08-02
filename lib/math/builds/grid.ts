/**
 * Grid models: the column-arithmetic topics rendered as data.
 *
 * The original built these with an imperative `Row` accumulator that emitted HTML. That
 * primitive has no natural React analogue, so it is replaced by a `Cell[]` grid the
 * renderer consumes — the single highest-leverage change in the whole port.
 *
 * Phases drive Watch it: folding phases 0..idx yields a small reveal descriptor, and the
 * renderer draws whatever that says is visible.
 */

import { buildColumn, padPair, type AddStep, type ColumnModel, type SubStep } from "../engines/column";
import { buildDivModel, buildMulModel, type DivModel, type MulModel } from "../engines/mul-div";
import { decColumns, type DecProblem } from "../topics/dec-addsub";
import { fmt } from "../format";
import { trimNum } from "../number";
import type { AddSubProblem } from "../topics/add-sub";
import type { DivProblem, MulProblem } from "../topics/mul-div";

export type CellKind =
  | "digit"
  | "carry"
  | "borrow"
  | "struck"
  | "sign"
  | "answer"
  | "dot"
  | "blank"
  | "placeholder";

export interface Cell {
  /** 1-based grid column. */
  col: number;
  text: string;
  kind: CellKind;
  /** Revealed only at or after this phase index. */
  from?: number;
  /** A blank the student fills in You try. */
  slot?: number;
}

export interface GridRow {
  /** Visual role, used for spacing and the underline. */
  kind: "carry" | "top" | "bottom" | "sum" | "partial" | "quotient" | "rule";
  cells: Cell[];
  /** Draw a rule under this row. */
  underline?: boolean;
  from?: number;
}

export interface GridSlot {
  idx: number;
  expect: string;
  /** Which phase this slot belongs to, so You try can reveal in order. */
  phase: number;
  label: string;
}

export interface GridModel {
  kind: "grid";
  title: string;
  cols: number;
  rows: GridRow[];
  /** Narration per phase. */
  narration: { label: string; main: string; sub?: string }[];
  slots: GridSlot[];
  answerText: string;
  /** Long division only: which of D-M-S-B the current phase is on. */
  dmsb?: (0 | 1 | 2 | 3)[];
  /** Where the decimal point sits, as a grid column; absent for whole numbers. */
  dotCol?: number;
}

/* ---------------------------------------------------------- add / subtract */

function columnGrid(
  m: ColumnModel,
  title: string,
  answerText: string,
  dotCol?: number,
): GridModel {
  const n = m.n;
  // Column 1 is reserved for the operator sign, and for addition's leading carry digit.
  const colOf = (i: number) => i + 2;
  const cols = n + 1;

  const carry: Cell[] = [];
  const top: Cell[] = [];
  const bottom: Cell[] = [];
  const sum: Cell[] = [];
  const slots: GridSlot[] = [];
  const narration: GridModel["narration"] = [];

  m.A.forEach((d, i) => top.push({ col: colOf(i), text: String(d), kind: "digit" }));
  m.B.forEach((d, i) => bottom.push({ col: colOf(i), text: String(d), kind: "digit" }));
  bottom.push({ col: 1, text: m.op === "+" ? "+" : "−", kind: "sign" });

  m.steps.forEach((raw, phase) => {
    const col = raw.col;
    if (m.op === "+") {
      const s = raw as AddStep;
      sum.push({
        col: colOf(col),
        text: String(s.write),
        kind: "answer",
        from: phase,
        slot: slots.length,
      });
      slots.push({
        idx: slots.length,
        expect: String(s.write),
        phase,
        label: `Column ${n - col}`,
      });
      if (s.carryOut > 0 && col > 0) {
        carry.push({
          col: colOf(col - 1),
          text: String(s.carryOut),
          kind: "carry",
          from: phase,
        });
      }
      narration.push({
        label: `Add the ${placeName(n - col)} column`,
        main:
          s.carryIn > 0
            ? `${s.a} + ${s.b} + ${s.carryIn} carried = ${s.tot}.`
            : `${s.a} + ${s.b} = ${s.tot}.`,
        sub:
          s.carryOut > 0
            ? `That is more than 9, so write ${s.write} and carry the ${s.carryOut}.`
            : undefined,
      });
    } else {
      const s = raw as SubStep;
      if (s.borrowed) {
        carry.push({
          col: colOf(s.borrowed.from),
          text: String(m.work ? s.workSnapshot[s.borrowed.from] : ""),
          kind: "borrow",
          from: phase,
        });
        top
          .filter((c) => c.col === colOf(s.borrowed!.from))
          .forEach((c) => (c.kind = "struck"));
        s.borrowed.chain.forEach((z) => {
          carry.push({ col: colOf(z), text: "9", kind: "borrow", from: phase });
        });
        carry.push({ col: colOf(col), text: String(s.top), kind: "borrow", from: phase });
      }
      sum.push({
        col: colOf(col),
        text: String(s.write),
        kind: "answer",
        from: phase,
        slot: slots.length,
      });
      slots.push({
        idx: slots.length,
        expect: String(s.write),
        phase,
        label: `Column ${n - col}`,
      });
      narration.push({
        label: `Subtract the ${placeName(n - col)} column`,
        main: s.borrowed
          ? `${s.a} is smaller than ${s.b}, so borrow: ${s.top} − ${s.b} = ${s.write}.`
          : `${s.top} − ${s.b} = ${s.write}.`,
        sub: s.borrowed
          ? s.borrowed.chain.length > 0
            ? "The next digit along is a zero, so the borrow has to travel further left — every zero it passes becomes a 9."
            : "Take one from the column to the left; it is worth ten here."
          : undefined,
      });
    }
  });

  if (m.op === "+" && m.lead) {
    const phase = m.steps.length;
    sum.push({ col: 1, text: String(m.lead), kind: "answer", from: phase, slot: slots.length });
    slots.push({ idx: slots.length, expect: String(m.lead), phase, label: "Leading digit" });
    narration.push({
      label: "One last carry to write down",
      main: `The final carry has nowhere to go but a new column on the left: ${m.lead}.`,
    });
  }

  narration.push({ label: "Done", main: `The answer is ${answerText}.` });

  return {
    kind: "grid",
    title,
    cols,
    rows: [
      { kind: "carry", cells: carry },
      { kind: "top", cells: top },
      { kind: "bottom", cells: bottom, underline: true },
      { kind: "sum", cells: sum },
    ],
    narration,
    slots,
    answerText,
    dotCol,
  };
}

function placeName(fromRight: number): string {
  return ["ones", "tens", "hundreds", "thousands", "ten-thousands"][fromRight - 1] ?? "next";
}

export function buildAdd(p: AddSubProblem): GridModel {
  const [as, bs] = padPair(p.a, p.b);
  return columnGrid(buildColumn("+", as, bs, -1), `${fmt(p.a)} + ${fmt(p.b)}`, fmt(p.a + p.b));
}

export function buildSub(p: AddSubProblem): GridModel {
  const A = String(p.a);
  const m = buildColumn("-", A, String(p.b).padStart(A.length, "0"), -1);
  return columnGrid(m, `${fmt(p.a)} − ${fmt(p.b)}`, fmt(p.a - p.b));
}

export function buildDecAddSub(p: DecProblem): GridModel {
  const { model, dotAt } = decColumns(p);
  const ansNum = p.op === "+" ? p.a + p.b : p.a - p.b;
  return columnGrid(
    model,
    `${trimNum(p.a)} ${p.op === "+" ? "+" : "−"} ${trimNum(p.b)}`,
    trimNum(Math.round(ansNum * 1e6) / 1e6),
    dotAt + 2,
  );
}

/* --------------------------------------------------------- multiplication */

export function buildMul(p: MulProblem): GridModel {
  const m: MulModel = buildMulModel(p.a, p.b);
  const cols = m.cols;
  const right = (offsetFromRight: number) => cols - offsetFromRight;

  const top: Cell[] = m.A.split("").map((d, i) => ({
    col: right(m.A.length - i),
    text: d,
    kind: "digit" as const,
  }));
  const bottom: Cell[] = m.B.split("").map((d, i) => ({
    col: right(m.B.length - i),
    text: d,
    kind: "digit" as const,
  }));
  bottom.push({ col: right(m.A.length) - 1, text: "×", kind: "sign" });

  const carry: Cell[] = [];
  const rows: GridRow[] = [
    { kind: "carry", cells: carry },
    { kind: "top", cells: top },
    { kind: "bottom", cells: bottom, underline: true },
  ];

  const slots: GridSlot[] = [];
  const narration: GridModel["narration"] = [];
  let phase = 0;

  m.parts.forEach((part, partIdx) => {
    const cells: Cell[] = [];

    // A shift phase of its own for every row after the first — the placeholder zeros are
    // the thing kids skip, so they get their own step and their own explanation.
    if (part.j > 0) {
      for (let z = 0; z < part.j; z++) {
        cells.push({ col: right(z + 1), text: "0", kind: "placeholder", from: phase });
      }
      narration.push({
        label: `Shift across for the ${part.bd}`,
        main: `This ${part.bd} is really ${part.bd}${"0".repeat(part.j)}, so its row starts ${part.j} place${part.j === 1 ? "" : "s"} to the left.`,
        sub: "The placeholder zero is not decoration — it is what makes the place value right.",
      });
      phase++;
    }

    // Then one phase per digit of the partial product, exactly as the original walked it.
    part.digitSteps.forEach((d, x) => {
      const offset = x + 1 + part.j;
      cells.push({
        col: right(offset),
        text: String(d.write),
        kind: "answer",
        from: phase,
        slot: slots.length,
      });
      slots.push({
        idx: slots.length,
        expect: String(d.write),
        phase,
        label: `${part.bd} × row, digit ${x + 1}`,
      });

      if (!d.last && d.carryOut && d.carryOut > 0) {
        carry.push({
          col: right(offset + 1),
          text: String(d.carryOut),
          kind: "carry",
          from: phase,
        });
      }

      narration.push(
        d.last
          ? {
              label: "Write the last carry",
              main: `Nothing left to multiply, so the carried ${d.carryIn} goes straight down.`,
            }
          : {
              label: `${d.ad} × ${part.bd}${d.carryIn ? ` , plus ${d.carryIn} carried` : ""}`,
              main:
                d.carryIn > 0
                  ? `${d.ad} × ${part.bd} = ${d.raw}, plus the ${d.carryIn} carried makes ${d.tot}.`
                  : `${d.ad} × ${part.bd} = ${d.raw}.`,
              sub:
                d.carryOut && d.carryOut > 0
                  ? `Write the ${d.write} and carry the ${d.carryOut}.`
                  : undefined,
            },
      );
      phase++;
    });

    rows.push({
      kind: "partial",
      cells,
      underline: m.parts.length > 1 && partIdx === m.parts.length - 1,
    });
  });

  if (m.parts.length > 1) {
    const digits = String(m.product).split("");
    const sumCells: Cell[] = digits.map((d, i) => ({
      col: right(digits.length - i),
      text: d,
      kind: "answer" as const,
      from: phase,
      slot: slots.length + i,
    }));
    digits.forEach((d, i) => {
      slots.push({ idx: slots.length, expect: d, phase, label: `Total digit ${i + 1}` });
    });
    rows.push({ kind: "sum", cells: sumCells, from: phase });
    narration.push({
      label: "Add the partial products",
      main: `${m.parts.map((x) => fmt(x.value)).join(" + ")} = ${fmt(m.product)}.`,
    });
    phase++;
  }

  narration.push({ label: "Done", main: `The answer is ${fmt(m.product)}.` });

  return {
    kind: "grid",
    title: `${fmt(p.a)} × ${fmt(p.b)}`,
    cols,
    rows,
    narration,
    slots,
    answerText: fmt(m.product),
  };
}

/* ------------------------------------------------------------ long division */

export interface DivGridModel extends Omit<GridModel, "kind"> {
  kind: "div";
  divisor: number;
  dividendDigits: number[];
  /** One entry per division step, in D-M-S-B order within the step. */
  divSteps: {
    quotient: number;
    product: number;
    remainder: number;
    bring: number | null;
    hidden: boolean;
    col: number;
  }[];
  remainder: number;
  dividend: number;
  /** Which of D-M-S-B each phase belongs to. */
  dmsb: (0 | 1 | 2 | 3)[];
  /** What each phase reveals, so the bracket can draw progressively. */
  reveals: { step: number; part: "skip" | "q" | "p" | "r" | "b" }[];
}

export function buildDiv(p: DivProblem): DivGridModel {
  const m: DivModel = buildDivModel(p.dividend, p.divisor);
  const D = p.divisor;
  const slots: GridSlot[] = [];
  const narration: GridModel["narration"] = [];
  /** Which of D-M-S-B each phase is, for the strip. */
  const dmsb: (0 | 1 | 2 | 3)[] = [];
  /** How much of each division step is revealed at each phase. */
  const reveals: { step: number; part: "skip" | "q" | "p" | "r" | "b" }[] = [];

  let phase = 0;

  m.steps.forEach((s, i) => {
    if (s.hidden) {
      // The 372 ÷ 5 case: nothing goes above the first digit, and the original explains
      // why rather than silently skipping it.
      const next = m.steps[i + 1];
      narration.push({
        label: "Look further",
        main: `Does ${D} fit into ${s.cur}? No — ${D} is bigger than ${s.cur}.`,
        sub: `So take the first two digits together and ask about ${next ? next.cur : s.cur} instead. Nothing is written above the ${s.cur} yet.`,
      });
      dmsb.push(0);
      reveals.push({ step: i, part: "skip" });
      phase++;
      return;
    }

    // D — divide
    narration.push({
      label: "Divide",
      main: `How many ${D}s fit into ${s.cur}? ${s.q}. Write it above the ${PLACE_NAMES[m.n - 1 - i] ?? "next"} digit.`,
      sub:
        s.q === 0
          ? `${D} is bigger than ${s.cur}, so it fits zero times. Write the 0 anyway — it holds the place.`
          : `Check: ${D} × ${s.q} = ${s.p} which fits, but ${D} × ${s.q + 1} = ${D * (s.q + 1)} is too big.`,
    });
    dmsb.push(0);
    reveals.push({ step: i, part: "q" });
    slots.push({
      idx: slots.length,
      expect: String(s.q),
      phase,
      label: `How many ${D}s fit into ${s.cur}?`,
    });
    phase++;

    // M — multiply
    narration.push({
      label: "Multiply",
      main: `${s.q} × ${D} = ${s.p}. Write ${s.p} underneath ${s.cur}.`,
      sub: `That is the part of ${s.cur} we can actually hand out in groups of ${D}.`,
    });
    dmsb.push(1);
    reveals.push({ step: i, part: "p" });
    // One box per digit of the product — she writes it out, not just the answer.
    String(s.p)
      .split("")
      .forEach((d, x) =>
        slots.push({
          idx: slots.length,
          expect: d,
          phase,
          label: `${s.q} × ${D}, digit ${x + 1}`,
        }),
      );
    phase++;

    // S — subtract
    narration.push({
      label: "Subtract",
      main: `${s.cur} − ${s.p} = ${s.r}. That is what is left over.`,
      sub: `${s.r} is smaller than ${D}, which is exactly what we want.`,
    });
    dmsb.push(2);
    reveals.push({ step: i, part: "r" });
    String(s.r)
      .split("")
      .forEach((d, x) =>
        slots.push({
          idx: slots.length,
          expect: d,
          phase,
          label: `${s.cur} − ${s.p}, digit ${x + 1}`,
        }),
      );
    phase++;

    // B — bring down
    if (s.bring !== null) {
      const next = m.steps[i + 1];
      narration.push({
        label: "Bring down",
        main: `Bring down the next digit, ${s.bring}. Now we are working with ${next ? next.cur : s.bring}.`,
        sub: "Then start the cycle over: divide, multiply, subtract, bring down.",
      });
      dmsb.push(3);
      reveals.push({ step: i, part: "b" });
      phase++;
    }
  });

  const ansText = m.remainder > 0 ? `${fmt(m.quotient)} remainder ${m.remainder}` : fmt(m.quotient);
  narration.push({
    label: "Done",
    main: `${fmt(m.dividend)} ÷ ${D} = ${ansText}.`,
    sub:
      m.remainder > 0
        ? `Check it: ${fmt(m.quotient)} × ${D} = ${fmt(m.quotient * D)}, plus ${m.remainder} = ${fmt(m.dividend)}. ✓`
        : `Check it: ${fmt(m.quotient)} × ${D} = ${fmt(m.dividend)}. ✓`,
  });

  return {
    kind: "div",
    title: `${fmt(p.dividend)} ÷ ${p.divisor}`,
    cols: m.cols,
    rows: [],
    narration,
    slots,
    answerText: m.remainder ? `${fmt(m.quotient)} r${m.remainder}` : fmt(m.quotient),
    divisor: p.divisor,
    dividend: p.dividend,
    dividendDigits: m.ds,
    divSteps: m.steps.map((s) => ({
      quotient: s.q,
      product: s.p,
      remainder: s.r,
      bring: s.bring,
      hidden: s.hidden,
      col: s.i,
    })),
    remainder: m.remainder,
    dmsb,
    reveals,
  };
}

const PLACE_NAMES = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten-thousands",
] as const;
