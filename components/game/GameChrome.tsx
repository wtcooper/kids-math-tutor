"use client";

import Link from "next/link";
import { tutorHref } from "@/lib/topics";
import styles from "./GameChrome.module.css";

/**
 * Everything around the canvas: level picker, instructions, the way back.
 *
 * Level *names* rather than numbers, and they are the tutor's own strings — so
 * "Sevens, eights & nines — the hard ones" reads identically in the game and in the
 * tutor, and nothing anywhere shows a grade or an age.
 */
export function GameChrome({
  title,
  topicId,
  levels,
  level,
  onLevel,
  instructions,
  children,
}: {
  title: string;
  topicId: string;
  levels: readonly string[];
  level: number;
  onLevel: (level: number) => void;
  instructions: string;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <Link href="/" className={styles.back}>
            ← All topics
          </Link>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.instructions}>{instructions}</p>
        </div>
        <Link className="btn sm" href={tutorHref(topicId, { level })}>
          Open in the tutor
        </Link>
      </header>

      <div className={styles.levels}>
        {levels.map((name, i) => {
          const n = i + 1;
          return (
            <button
              key={name}
              type="button"
              className={`${styles.level} ${n === level ? styles.on : ""}`}
              onClick={() => onLevel(n)}
            >
              {name}
            </button>
          );
        })}
      </div>

      <div className={styles.stage}>{children}</div>

      {/* CSS-only. A JS orientation lock needs fullscreen and is unavailable on iOS. */}
      <div className={styles.rotate}>
        <p>Turn your phone sideways to play.</p>
      </div>
    </main>
  );
}
