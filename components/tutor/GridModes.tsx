"use client";

import { useCallback, useMemo, useState } from "react";
import type { DivGridModel, GridModel } from "@/lib/math/builds/grid";
import styles from "./GridModes.module.css";

/**
 * Column arithmetic: Watch it and You try.
 *
 * Two behaviours carried over deliberately:
 *
 * - **The leading carry has its own phase.** The original revealed it as soon as every
 *   column was done, so step 2 of 4 already read "132" and step 3 added nothing — the
 *   bug that produced the whole step-integrity test suite (BUILD-NOTES issue 6).
 * - **Scratch marks survive a re-render.** Answering a box used to redraw the grid and
 *   wipe her regrouping working (issue 12). They live in state here, keyed by column.
 */

function Grid(props: {
  model: GridModel;
  /** Phases strictly below this are shown. */
  reveal: number;
  answers?: Record<number, { val: string; state: "" | "ok" | "given" }>;
  onAnswer?: (slot: number, val: string) => void;
  scratch?: Record<number, string>;
  onScratch?: (col: number, val: string) => void;
  interactive?: boolean;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        <GridRows {...props} />
      </div>
    </div>
  );
}

/** The rows themselves, shared by the plain grid and the division bracket. */
function GridRows({
  model,
  reveal,
  answers,
  onAnswer,
  scratch,
  onScratch,
  interactive,
}: {
  model: GridModel | DivGridModel;
  reveal: number;
  answers?: Record<number, { val: string; state: "" | "ok" | "given" }>;
  onAnswer?: (slot: number, val: string) => void;
  scratch?: Record<number, string>;
  onScratch?: (col: number, val: string) => void;
  interactive?: boolean;
}) {
  const template = `repeat(${model.cols}, var(--cw))`;

  return (
    <>
        {model.rows.map((row, ri) => {
          // In You try every row is on screen from the start — she needs to see the whole
          // shape of the work to fill it in. Only Watch it reveals row by row.
          const rowHidden = !interactive && row.from !== undefined && row.from >= reveal;
          if (rowHidden) return null;
          return (
            <div
              key={ri}
              className={`${styles.row} ${styles[row.kind]} ${row.underline ? styles.ruled : ""}`}
              style={{ gridTemplateColumns: template }}
            >
              {row.cells.map((cell, ci) => {
                const isSlot = interactive && cell.slot !== undefined;

                // In You try the carry row is entirely hers — the app must not pre-fill
                // the regrouping she is being asked to do. Struck digits still show,
                // since those are part of the printed problem.
                if (interactive && (cell.kind === "carry" || cell.kind === "borrow")) {
                  return null;
                }

                // Every answer box is present from the start — she works down the columns
                // herself. Only non-answer reveals follow the phase.
                if (!isSlot && cell.from !== undefined && cell.from >= reveal) return null;

                if (isSlot) {
                  const st = answers?.[cell.slot!];
                  return (
                    <input
                      key={ci}
                      className={`${styles.cell} ${styles.input} ${
                        st?.state === "ok" ? styles.ok : st?.state === "given" ? styles.given : ""
                      }`}
                      style={{ gridColumn: cell.col, gridRow: 1 }}
                      value={st?.val ?? ""}
                      onChange={(e) => onAnswer?.(cell.slot!, e.target.value)}
                      disabled={st?.state === "ok" || st?.state === "given"}
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`answer column ${cell.col}`}
                    />
                  );
                }

                return (
                  <span
                    key={ci}
                    className={`${styles.cell} ${styles[cell.kind]}`}
                    style={{ gridColumn: cell.col, gridRow: 1 }}
                  >
                    {cell.text}
                  </span>
                );
              })}

              {/*
                Her own regrouping working, above the digits. Kept in React state rather
                than on the model: answering a box re-renders the grid, and the original
                lost her carries every time until they were re-emitted (BUILD-NOTES 12).
                Column 1 is the operator column, so it never gets one.
              */}
              {/* A partial rule, as long division draws under each product. */}
              {row.underlineFrom !== undefined && row.underlineTo !== undefined ? (
                <span
                  className={styles.partialRule}
                  style={{
                    gridColumn: `${row.underlineFrom} / ${row.underlineTo + 1}`,
                    gridRow: 1,
                  }}
                />
              ) : null}

              {interactive && row.kind === "carry"
                ? (model.scratchCols ?? []).map((col) => (
                      <input
                        key={`s${col}`}
                        className={`${styles.cell} ${styles.scratchBox}`}
                        style={{ gridColumn: col, gridRow: 1 }}
                        value={scratch?.[col] ?? ""}
                        onChange={(e) => onScratch?.(col, e.target.value)}
                        inputMode="numeric"
                        maxLength={2}
                        aria-label={`working, column ${col}`}
                      />
                  ))
                : null}
            </div>
          );
        })}
    </>
  );
}

/**
 * Long division is the same column grid as everything else — the bracket and the divisor
 * are chrome around it. Rendering it any other way is what made the columns fail to line
 * up, because the products and remainders must sit under the digits they came from.
 */
function DivGrid({
  model,
  reveal,
  answers,
  onAnswer,
  interactive,
}: {
  model: DivGridModel;
  reveal: number;
  answers?: Record<number, { val: string; state: "" | "ok" | "given" }>;
  onAnswer?: (slot: number, val: string) => void;
  interactive?: boolean;
}) {
  return (
    <div className={`${styles.wrap} ${styles.divWrap}`}>
      <div className={styles.longDiv}>
        <div className={styles.divisor}>{model.divisor}</div>
        <div className={styles.bracket}>
          <GridRows
            model={model}
            reveal={reveal}
            answers={answers}
            onAnswer={onAnswer}
            interactive={interactive}
          />
        </div>
      </div>
      {model.remainder > 0 && reveal > model.narration.length - 1 ? (
        <p className={styles.remainderTag}>remainder {model.remainder}</p>
      ) : null}
    </div>
  );
}

/** The D-M-S-B strip: which of the four moves this step is on. */
function Dmsb({ active }: { active: number }) {
  const MOVES: [string, string][] = [
    ["D", "Divide"],
    ["M", "Multiply"],
    ["S", "Subtract"],
    ["B", "Bring down"],
  ];
  return (
    <div className={styles.dmsb}>
      {MOVES.map(([k, label], i) => (
        <div
          key={k}
          className={`${styles.move} ${i === active ? styles.moveOn : i < active ? styles.movePast : ""}`}
        >
          <b>{k}</b>
          {label}
        </div>
      ))}
    </div>
  );
}

export function GridWatch({ model }: { model: GridModel | DivGridModel }) {
  const [idx, setIdx] = useState(0);
  const last = model.narration.length - 1;
  const step = model.narration[Math.min(idx, last)];
  const isDiv = model.kind === "div";

  return (
    <div>
      <div className={styles.progress}>
        <i style={{ width: `${(idx / last) * 100}%` }} />
      </div>

      {isDiv ? (
        <DivGrid model={model as DivGridModel} reveal={idx + 1} />
      ) : (
        <Grid model={model as GridModel} reveal={idx + 1} />
      )}

      {isDiv && idx < last ? (
        <Dmsb active={(model as DivGridModel).dmsb[idx] ?? 0} />
      ) : null}

      <div className={styles.narr}>
        <div className={styles.narrLabel}>{step.label}</div>
        <p className={styles.narrMain}>{step.main}</p>
        {step.sub ? <p className={styles.narrSub}>{step.sub}</p> : null}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className="btn sm"
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
        >
          ← Back
        </button>
        <button
          type="button"
          className="btn primary sm"
          disabled={idx >= last}
          onClick={() => setIdx((i) => Math.min(last, i + 1))}
        >
          Next step →
        </button>
        <button
          type="button"
          className="btn ghost sm"
          disabled={idx >= last}
          onClick={() => setIdx(last)}
        >
          Show all
        </button>
        {idx > 0 ? (
          <button type="button" className="btn ghost sm" onClick={() => setIdx(0)}>
            Restart
          </button>
        ) : null}
        <span className={styles.counter}>
          {idx + 1} of {last + 1}
        </span>
      </div>
    </div>
  );
}

export function GridTry({
  model,
  onSolved,
}: {
  model: GridModel | DivGridModel;
  onSolved?: (clean: boolean) => void;
}) {
  const [answers, setAnswers] = useState<
    Record<number, { val: string; state: "" | "ok" | "given" }>
  >({});
  // Kept out of the model so answering a box cannot wipe her working.
  const [scratch, setScratch] = useState<Record<number, string>>({});
  const [helped, setHelped] = useState(false);

  const slots = model.slots;
  const firstOpen = useMemo(
    () => slots.findIndex((s) => (answers[s.idx]?.state ?? "") === ""),
    [slots, answers],
  );
  const solved = firstOpen === -1;
  const reveal = solved ? model.narration.length : slots[firstOpen].phase + 1;

  const onAnswer = useCallback(
    (slot: number, val: string) => {
      setAnswers((prev) => {
        const expect = slots.find((s) => s.idx === slot)?.expect ?? "";
        const ok = val.trim() === expect;
        const next = { ...prev, [slot]: { val, state: ok ? ("ok" as const) : ("" as const) } };
        if (ok && slots.every((s) => (next[s.idx]?.state ?? "") !== "")) {
          onSolved?.(!helped);
        }
        return next;
      });
    },
    [slots, onSolved, helped],
  );

  const showStep = useCallback(() => {
    if (firstOpen < 0) return;
    setHelped(true);
    const phase = slots[firstOpen].phase;
    setAnswers((prev) => {
      const next = { ...prev };
      slots.forEach((s) => {
        if (s.phase === phase && (prev[s.idx]?.state ?? "") === "") {
          next[s.idx] = { val: s.expect, state: "given" };
        }
      });
      return next;
    });
  }, [firstOpen, slots]);

  return (
    <div>
      {model.kind === "div" ? (
        <DivGrid
          model={model as DivGridModel}
          reveal={reveal}
          answers={answers}
          onAnswer={onAnswer}
          interactive
        />
      ) : (
        <Grid
          model={model as GridModel}
          reveal={reveal}
          answers={answers}
          onAnswer={onAnswer}
          scratch={scratch}
          onScratch={(col, val) => setScratch((s) => ({ ...s, [col]: val }))}
          interactive
        />
      )}

      {solved ? (
        <p className={styles.solved}>
          {helped ? "Worked through — some columns were shown." : "All of it, on your own."}{" "}
          <strong>{model.answerText}</strong>
        </p>
      ) : (
        <>
          <p className={styles.hintLine}>{model.narration[reveal - 1]?.label}</p>
          <div className={styles.controls}>
            <button type="button" className="btn sm" onClick={showStep}>
              Show me this step
            </button>
          </div>
        </>
      )}
    </div>
  );
}
