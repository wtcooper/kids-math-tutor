"use client";

import Link from "next/link";
import { tutorHref } from "@/lib/topics";
import { HowToPlay, type HowTo } from "./HowToPlay";
import styles from "./GameChrome.module.css";

/**
 * Everything around the canvas: level picker, instructions, the way back.
 *
 * Level *names* rather than numbers, and they are the tutor's own strings — so
 * "Sevens, eights & nines — the hard ones" reads identically in the game and in the
 * tutor, and nothing anywhere shows a grade or an age.
 *
 * `howTo` is required, not optional. The first play-test failed because three finished
 * games gave no indication of what to do; making the explanation part of the frame is how
 * that stops being possible.
 */
export function GameChrome({
  slug,
  title,
  topicId,
  levels,
  level,
  onLevel,
  instructions,
  concept,
  howTo,
  status,
  children,
}: {
  slug: string;
  title: string;
  topicId: string;
  levels: readonly string[];
  level: number;
  onLevel: (level: number) => void;
  /** The one-line reminder that stays on screen the whole time. */
  instructions: string;
  /** The maths, named — repeated here so it is on screen during play, not only on the card. */
  concept: string;
  howTo: HowTo;
  /** Live state — score, what's left, whose turn. Rendered beside the instructions. */
  status?: React.ReactNode;
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
          <p className={styles.concept}>
            <span className={styles.conceptLabel}>The maths</span>
            {concept}
          </p>
        </div>
        <div className={styles.headActions}>
          <HowToPlay slug={slug} title={title} concept={concept} howTo={howTo} />
          <Link className="btn sm" href={tutorHref(topicId, { level })}>
            Open in the tutor
          </Link>
        </div>
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

      {status ? <div className={styles.status}>{status}</div> : null}

      <div className={styles.stage}>{children}</div>

      {/* CSS-only. A JS orientation lock needs fullscreen and is unavailable on iOS. */}
      <div className={styles.rotate}>
        <p>Turn your phone sideways to play.</p>
      </div>
    </main>
  );
}
