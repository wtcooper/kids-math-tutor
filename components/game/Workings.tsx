"use client";

import { useEffect, useState } from "react";
import styles from "./Workings.module.css";

/**
 * The tutor's voice, beside the board.
 *
 * The tutor narrates every step — "the 4 and the 8 make 12, so write the 2 and carry the
 * 1". The games said one line and then nothing, so when she got stuck there was nowhere to
 * go but out. This is the missing half.
 *
 * Three parts, in this order because that is the order she needs them:
 *
 * 1. **now** — what to do at this exact moment, one line, updating with the state.
 * 2. **lines** — the arithmetic so far, written the way the tutor writes it, so the game
 *    and the homework are visibly the same notation.
 * 3. **hint** — never volunteered and never penalised. Asking costs nothing; that is the
 *    whole point given how this age group treats getting stuck.
 */

export interface WorkingLine {
  text: string;
  /** `current` is the step she is on; `done` is behind her; `todo` is not reached yet. */
  state?: "done" | "current" | "todo";
}

export interface Workings {
  now: string;
  lines?: WorkingLine[];
  hint?: string;
  /** Optional heading above the lines, e.g. "Multiples of 7". */
  listTitle?: string;
}

export function WorkingsPanel({ workings, resetKey }: { workings: Workings; resetKey?: unknown }) {
  const [showHint, setShowHint] = useState(false);

  // A new problem should not inherit the last one's revealed hint.
  useEffect(() => {
    setShowHint(false);
  }, [resetKey]);

  return (
    <aside className={styles.panel} aria-label="Working it out">
      <h3 className={styles.h3}>Working it out</h3>
      <p className={styles.now}>{workings.now}</p>

      {workings.lines && workings.lines.length > 0 ? (
        <>
          {workings.listTitle ? (
            <h4 className={styles.listTitle}>{workings.listTitle}</h4>
          ) : null}
          <ol className={styles.lines}>
            {workings.lines.map((l, i) => (
              <li key={`${i}-${l.text}`} className={styles[l.state ?? "done"]}>
                {l.text}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {workings.hint ? (
        showHint ? (
          <p className={styles.hint}>{workings.hint}</p>
        ) : (
          <button type="button" className={styles.hintBtn} onClick={() => setShowHint(true)}>
            Give me a hint
          </button>
        )
      ) : null}
    </aside>
  );
}
