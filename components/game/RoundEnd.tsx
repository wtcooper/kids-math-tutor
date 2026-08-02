"use client";

import Link from "next/link";
import type { Rich } from "@/lib/math/format";
import { RichText } from "@/components/tutor/RichText";
import { tutorHref } from "@/lib/topics";
import styles from "./RoundEnd.module.css";

export interface MissedFact {
  q: string;
  a: string;
  hook: Rich;
}

/**
 * The round-end panel — and the whole point of the project.
 *
 * This is React DOM rendered with the tutor's own tokens and components, not Phaser text.
 * The `hook` here is *the identical sentence* the tutor shows for 7 × 8, and the notation
 * is set in the same monospace face. A shared object across both contexts is what turns a
 * far-transfer problem into a near-transfer one; a canvas lookalike would not.
 *
 * The link is the return leg of the loop the research says nobody else ships, because
 * nobody else owns both halves.
 */
export function RoundEnd({
  topicId,
  level,
  missed,
  onAgain,
}: {
  topicId: string;
  level: number;
  missed: MissedFact[];
  onAgain: () => void;
}) {
  const clean = missed.length === 0;

  return (
    <div className={styles.scrim}>
      <div className={`card ${styles.panel}`}>
        <h2 className={styles.title}>{clean ? "All of them clean." : "Worth another look"}</h2>

        {clean ? (
          <p className={styles.lede}>
            Every link in that round was right. Same again, or move up a table?
          </p>
        ) : (
          <ul className={styles.list}>
            {missed.map((m) => (
              <li key={m.q} className={styles.item}>
                <div className={styles.fact}>
                  <span className={styles.q}>{m.q}</span>
                  <span className={styles.eq}>=</span>
                  <span className={styles.a}>{m.a}</span>
                </div>
                <p className={styles.hook}>
                  <RichText rich={m.hook} />
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <button type="button" className="btn primary" onClick={onAgain}>
            Play again
          </button>
          <Link className="btn" href={tutorHref(topicId, { level, mode: "learn" })}>
            See this in the tutor
          </Link>
        </div>
      </div>
    </div>
  );
}
