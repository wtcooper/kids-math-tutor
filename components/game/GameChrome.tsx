"use client";

import Link from "next/link";
import { tutorHref } from "@/lib/topics";
import { GAME_BY_SLUG } from "@/lib/games";
import type { HowTo } from "./HowToPlay";
import { ShowMe } from "./ShowMe";
import { WorkingsPanel, type Workings } from "./Workings";
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
  workings,
  workingsKey,
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
  /** The tutor's voice for this board: what to do now, the arithmetic, a hint. */
  workings?: Workings;
  /** Changes when a new problem starts, so a revealed hint does not carry over. */
  workingsKey?: unknown;
  children: React.ReactNode;
}) {
  // What this game practises, named at a glance — domain first, then the skill.
  // Looked up here rather than threaded through every game component.
  const practises = GAME_BY_SLUG[slug]?.practises;

  return (
    <main className={styles.wrap}>
      {practises ? (
        <p className={styles.practises}>
          <span className={styles.practisesLabel}>Practising</span>
          {practises}
        </p>
      ) : null}
      {/* One compact row: the world below is what gets the screen. The concept is one
          tap away behind a chip rather than a permanent card — still in the how-to too. */}
      <header className={styles.head}>
        <div className={styles.headLead}>
          <Link href="/" className={styles.back}>
            ← All topics
          </Link>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.instructions}>{instructions}</p>
        </div>
        <div className={styles.headActions}>
          <details className={styles.conceptChip}>
            <summary>The maths</summary>
            <p className={styles.conceptPop}>{concept}</p>
          </details>
          {/* The walkthrough video replaced the old text panel outright — kids press
              play, they don't read. Its captions carry the rules now. */}
          <ShowMe slug={slug} title={title} />
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
        {status ? <div className={styles.status}>{status}</div> : null}
      </div>

      {/* The board and the tutor's voice, side by side. The panel wraps underneath on a
          narrow screen rather than squeezing the board. */}
      <div className={styles.play}>
        <div className={styles.stage}>{children}</div>
        {workings ? <WorkingsPanel workings={workings} resetKey={workingsKey} /> : null}
      </div>

      {/* CSS-only. A JS orientation lock needs fullscreen and is unavailable on iOS. */}
      <div className={styles.rotate}>
        <p>Turn your phone sideways to play.</p>
      </div>
    </main>
  );
}
