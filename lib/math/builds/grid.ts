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

  const rows: GridRow[] = [
    { kind: "top", cells: top },
    { kind: "bottom", cells: bottom, underline: true },
  ];

  const slots: GridSlot[] = [];
  const narration: GridModel["narration"] = [];
  let phase = 0;

  m.parts.forEach((part) => {
    const cells: Cell[] = [];
    // Placeholder zeros push each partial product one place further left.
    for (let z = 0; z < part.j; z++) {
      cells.push({ col: right(z + 1), text: "0", kind: "placeholder", from: phase });
    }
    part.digits.split("").forEach((d, i) => {
      const offset = part.digits.length - i + part.j;
      cells.push({
        col: right(offset),
        text: d,
        kind: "answer",
        from: phase,
        slot: slots.length,
      });
      slots.push({
        idx: slots.length,
        expect: d,
        phase,
        label: `${part.bd} × row, digit ${i + 1}`,
      });
    });
    narration.push({
      label:
        part.j === 0
          ? `Multiply everything by the ${part.bd}`
          : `Now the ${part.bd} — shift one place left first`,
      main: `${fmt(p.a)} × ${part.bd} = ${fmt(part.bd * p.a)}${part.j ? `, then add ${part.j} zero${part.j === 1 ? "" : "s"} → ${fmt(part.value)}` : ""}.`,
      sub:
        part.j > 0
          ? "The placeholder zero is there because this digit is worth ten times more."
          : undefined,
    });
    rows.push({
      kind: "partial",
      cells,
      from: phase,
      underline: m.parts.length > 1 && part.j === m.parts.length - 1,
    });
    phase++;
  });

  if (m.parts.length > 1) {
    const sumCells: Cell[] = String(m.product)
      .split("")
      .map((d, i, arr) => ({
        col: right(arr.length - i),
        text: d,
        kind: "answer" as const,
        from: phase,
        slot: slots.length + i,
      }));
    String(m.product)
      .split("")
      .forEach((d, i) => {
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
}

export function buildDiv(p: DivProblem): DivGridModel {
  const m: DivModel = buildDivModel(p.dividend, p.divisor);
  const slots: GridSlot[] = [];
  const narration: GridModel["narration"] = [];

  m.steps.forEach((s, i) => {
    if (!s.hidden) {
      slots.push({
        idx: slots.length,
        expect: String(s.q),
        phase: i,
        label: `Quotient digit ${i + 1}`,
      });
    }
    narration.push({
      label: s.hidden
        ? `${s.cur} is smaller than ${p.divisor} — nothing goes above it yet`
        : `How many ${p.divisor}s fit into ${s.cur}?`,
      main: s.hidden
        ? `You cannot make a whole ${p.divisor} out of ${s.cur}, so carry the digit along and try again with the next one.`
        : `${p.divisor} goes into ${s.cur} ${s.q} time${s.q === 1 ? "" : "s"}. ${s.q} × ${p.divisor} = ${s.p}, and ${s.cur} − ${s.p} = ${s.r}.`,
      sub:
        s.bring !== null && !s.hidden
          ? `Bring down the ${s.bring} and go round again.`
          : undefined,
    });
  });

  narration.push({
    label: "Done",
    main:
      m.remainder > 0
        ? `${fmt(m.quotient)} remainder ${m.remainder}.`
        : `It divides exactly: ${fmt(m.quotient)}.`,
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
    // D-M-S-B strip: one entry per step, all four moves in order.
    dmsb: m.steps.map(() => 0 as const),
  };
}
