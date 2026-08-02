"use client";

import { useEffect, useState } from "react";
import styles from "./HowToPlay.module.css";

/**
 * Every game explains itself before she plays it.
 *
 * The first round of testing failed on exactly this: the mechanics were fine and nobody
 * could tell what they were supposed to do. So this is not optional decoration — it is a
 * required prop on GameChrome, which means a new game cannot ship without one.
 *
 * It opens by itself the first time a game is opened and never again, because a panel you
 * have to dismiss every single time is worse than no panel.
 */

export interface HowTo {
  /** One sentence. What counts as winning. */
  goal: string;
  /** How you actually move. Keep each under a dozen words. */
  controls: string[];
  /** What the game will not do to you — the anxiety-shaped promises are the point. */
  rules: string[];
}

function seenKey(slug: string) {
  return `mathtable:howto:${slug}`;
}

export function HowToPlay({ slug, title, howTo }: { slug: string; title: string; howTo: HowTo }) {
  const [open, setOpen] = useState(false);

  // In an effect, not in useState: localStorage does not exist during the server render,
  // and reading it in an initialiser is a hydration mismatch.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(seenKey(slug))) setOpen(true);
    } catch {
      // Private mode or storage disabled. Showing it every time beats crashing.
      setOpen(true);
    }
  }, [slug]);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(seenKey(slug), "1");
    } catch {
      /* nothing to do — it just opens again next time */
    }
  };

  return (
    <>
      <button type="button" className={styles.helpBtn} onClick={() => setOpen(true)}>
        How to play
      </button>

      {open ? (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={`How to play ${title}`}>
          <div className={styles.card}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.goal}>{howTo.goal}</p>

            <h3 className={styles.h3}>How to move</h3>
            <ul className={styles.list}>
              {howTo.controls.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>

            <h3 className={styles.h3}>Good to know</h3>
            <ul className={styles.list}>
              {howTo.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            <button type="button" className="btn primary" onClick={close}>
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
