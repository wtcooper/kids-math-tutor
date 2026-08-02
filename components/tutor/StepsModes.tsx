"use client";

import { useCallback, useMemo, useState } from "react";
import type { StepsModel } from "@/lib/math/types";
import { Nodes, Node } from "./Nodes";
import { RichText } from "./RichText";
import styles from "./StepsModes.module.css";

/**
 * Watch it, You try, and Picture it for the `steps` engine.
 *
 * Two rules carried over from the original, both of which were bugs first:
 *
 * - **Steps past the current one are hidden entirely.** In You Try, step 2's label read
 *   "Rewrite both fractions over 20" while step 1 was still asking for the common
 *   denominator — the label gave away the answer (BUILD-NOTES issue 5).
 * - **"Show me this step" fills in amber, not green**, so a run where she was helped is
 *   visibly different from one she earned.
 */

export function PictureIt({ model }: { model: StepsModel }) {
  if (!model.picture) return null;
  return (
    <div>
      <h3 className={styles.picTitle}>{model.picture.title}</h3>
      <p className={styles.picSub}>
        <RichText rich={model.picture.sub} />
      </p>
      <Nodes nodes={model.picture.body} />
    </div>
  );
}

export function WatchIt({ model }: { model: StepsModel }) {
  const [idx, setIdx] = useState(0);
  const last = model.steps.length;
  const atEnd = idx >= last;
  const step = atEnd ? null : model.steps[idx];

  return (
    <div>
      {model.lead ? (
        <div className={styles.lead}>
          <Node node={model.lead} />
        </div>
      ) : null}

      <div className={styles.progress}>
        <i style={{ width: `${(idx / last) * 100}%` }} />
      </div>

      {step ? (
        <div className={styles.stepBox}>
          <div className={styles.stepLabel}>
            <span className={styles.stepNum}>{idx + 1}</span>
            {step.label}
          </div>
          <div className={styles.work}>
            <Nodes nodes={step.show} />
          </div>
          <p className={styles.say}>
            <RichText rich={step.say} />
          </p>
          {step.sub ? (
            <p className={styles.sub}>
              <RichText rich={step.sub} />
            </p>
          ) : null}
        </div>
      ) : (
        <div className={styles.stepBox}>
          <div className={styles.stepLabel}>
            <span className={`${styles.stepNum} ${styles.done}`}>✓</span>
            All the way through
          </div>
          <p className={styles.answer}>{model.answerText}</p>
        </div>
      )}

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
          disabled={atEnd}
          onClick={() => setIdx((i) => Math.min(last, i + 1))}
        >
          Next step →
        </button>
        <button
          type="button"
          className="btn ghost sm"
          disabled={atEnd}
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
          {Math.min(idx + 1, last)} of {last}
        </span>
      </div>
    </div>
  );
}

interface SlotState {
  val: string;
  state: "" | "ok" | "given";
}

export function YouTry({
  model,
  onSolved,
}: {
  model: StepsModel;
  onSolved?: (clean: boolean) => void;
}) {
  // Slots are flattened from the step tree, but kept SEPARATE from the model. The
  // original mutated slot objects on the model in place, so model and view state were the
  // same objects — in React that produces stale renders that are miserable to trace.
  const slots = useMemo(
    () =>
      model.steps.flatMap((s, si) =>
        (s.ask ?? []).map((a) => ({ ...a, step: si })),
      ),
    [model],
  );

  const [answers, setAnswers] = useState<Record<number, SlotState>>({});
  const [helped, setHelped] = useState(false);

  const firstUnsolved = slots.findIndex((_, i) => (answers[i]?.state ?? "") === "");
  const currentStep =
    firstUnsolved === -1 ? model.steps.length : slots[firstUnsolved].step;
  const solved = firstUnsolved === -1;

  const set = useCallback(
    (i: number, val: string) => {
      setAnswers((prev) => {
        const expect = slots[i].expect;
        const ok = val.trim() === String(expect).trim();
        const next = { ...prev, [i]: { val, state: ok ? ("ok" as const) : ("" as const) } };
        if (ok && Object.values(next).filter((s) => s.state !== "").length === slots.length) {
          onSolved?.(!helped);
        }
        return next;
      });
    },
    [slots, onSolved, helped],
  );

  const showStep = useCallback(() => {
    if (firstUnsolved < 0) return;
    setHelped(true);
    setAnswers((prev) => {
      const next = { ...prev };
      // Fill every slot belonging to the current step, in amber.
      slots.forEach((s, i) => {
        if (s.step === currentStep && (prev[i]?.state ?? "") === "") {
          next[i] = { val: String(s.expect), state: "given" };
        }
      });
      return next;
    });
  }, [firstUnsolved, slots, currentStep]);

  let slotCursor = 0;

  return (
    <div>
      {model.lead ? (
        <div className={styles.lead}>
          <Node node={model.lead} />
        </div>
      ) : null}

      <ol className={styles.steps}>
        {model.steps.map((s, si) => {
          const mine = slots
            .map((sl, i) => ({ sl, i }))
            .filter(({ sl }) => sl.step === si);
          mine.forEach(() => slotCursor++);

          if (si > currentStep) {
            // Future steps are hidden entirely — a label like "Rewrite both fractions
            // over 20" tells her the answer to the step she is on.
            return null;
          }

          const done = si < currentStep;
          return (
            <li key={si} className={`${styles.step} ${done ? styles.stepDone : ""}`}>
              <div className={styles.stepLabel}>
                <span className={`${styles.stepNum} ${done ? styles.done : ""}`}>
                  {done ? "✓" : si + 1}
                </span>
                {s.label}
              </div>

              <div className={styles.work}>
                <Nodes nodes={s.show} />
              </div>

              {mine.length > 0 ? (
                <div className={styles.askRow}>
                  {mine.map(({ sl, i }) => {
                    const st = answers[i] ?? { val: "", state: "" as const };
                    return (
                      <label key={i} className={styles.ask}>
                        <span className={styles.askLabel}>{sl.label}</span>
                        <input
                          className={`${styles.askInput} ${
                            st.state === "ok"
                              ? styles.ok
                              : st.state === "given"
                                ? styles.given
                                : ""
                          }`}
                          value={st.val}
                          onChange={(e) => set(i, e.target.value)}
                          disabled={st.state !== ""}
                          inputMode={sl.mode === "text" ? "text" : "numeric"}
                          autoComplete="off"
                          size={sl.w ?? 4}
                        />
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {si === currentStep ? (
                <p className={styles.say}>
                  <RichText rich={s.say} />
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {model.steps.length > currentStep + 1 && !solved ? (
        <p className={styles.remaining}>
          {model.steps.length - currentStep - 1} more step
          {model.steps.length - currentStep - 1 === 1 ? "" : "s"} after this one.
        </p>
      ) : null}

      {solved ? (
        <p className={styles.solved}>
          {helped ? "Worked through — some steps were shown." : "All of it, on your own."}{" "}
          <strong>{model.answerText}</strong>
        </p>
      ) : (
        <div className={styles.controls}>
          <button type="button" className="btn sm" onClick={showStep}>
            Show me this step
          </button>
        </div>
      )}
    </div>
  );
}
