"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Topic } from "@/lib/topics";
import { runtimeFor } from "@/lib/math/registry";
import type { FactKind } from "@/lib/math/facts";
import { PracticeMode } from "./PracticeMode";
import { DrillMode, LearnMode } from "./FlashcardMode";
import styles from "./TutorShell.module.css";

/**
 * Topic + level + mode selection.
 *
 * Level and mode live in the URL, so /tutor/frac-addsub?level=3&mode=practice is a real
 * deep link — back button, bookmark and the games' "See this in the tutor" all work with
 * no injected bootstrap script.
 */

type Mode = "learn" | "drill" | "practice";

export function TutorShell({
  topic,
  blurb,
  level,
  mode,
  playHref,
}: {
  topic: Topic;
  blurb?: string;
  level: number;
  mode: Mode;
  playHref?: string;
}) {
  const router = useRouter();
  const [showAbout, setShowAbout] = useState(false);
  const runtime = useMemo(() => runtimeFor(topic.id), [topic.id]);
  const isFacts = topic.engine === "facts";
  const kind: FactKind = topic.id === "facts-div" ? "div" : "mul";

  const modes: [Mode, string][] = isFacts
    ? [
        ["learn", "Learn"],
        ["drill", "Drill"],
      ]
    : [["practice", "Practice"]];

  const go = useCallback(
    (next: { level?: number; mode?: Mode }) => {
      const q = new URLSearchParams();
      q.set("level", String(next.level ?? level));
      q.set("mode", next.mode ?? mode);
      router.replace(`/tutor/${topic.id}?${q}`, { scroll: false });
    },
    [router, topic.id, level, mode],
  );

  return (
    <main className="wrap">
      <header className={styles.head}>
        <div>
          <Link href="/" className={styles.back}>
            ← All topics
          </Link>
          <h1 className={styles.title}>{topic.name}</h1>
          <p className={styles.tagline}>{topic.tagline}</p>
        </div>
        <div className={styles.headActions}>
          {playHref ? (
            <Link className="btn sage sm" href={playHref}>
              Play it
            </Link>
          ) : null}
          <a className="btn ghost sm" href="/sign-out">
            Sign out
          </a>
        </div>
      </header>

      {blurb ? (
        <div className={styles.about}>
          <button
            type="button"
            className={styles.aboutToggle}
            onClick={() => setShowAbout((v) => !v)}
            aria-expanded={showAbout}
          >
            What is this topic about?
          </button>
          {showAbout ? <p className={styles.aboutBody}>{blurb}</p> : null}
        </div>
      ) : null}

      <div className={styles.controls}>
        <div className={styles.levels}>
          {topic.levels.map((name, i) => {
            const n = i + 1;
            return (
              <button
                key={name}
                type="button"
                className={`${styles.level} ${n === level ? styles.on : ""}`}
                onClick={() => go({ level: n })}
              >
                {name}
              </button>
            );
          })}
        </div>

        {modes.length > 1 ? (
          <div className={styles.modes}>
            {modes.map(([m, label]) => (
              <button
                key={m}
                type="button"
                className={`${styles.mode} ${m === mode ? styles.on : ""}`}
                onClick={() => go({ mode: m })}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <section className="card">
        {isFacts ? (
          mode === "drill" ? (
            <DrillMode key={`${kind}-${level}`} kind={kind} level={level} />
          ) : (
            <LearnMode key={`${kind}-${level}`} kind={kind} level={level} />
          )
        ) : runtime ? (
          <PracticeMode key={`${topic.id}-${level}`} runtime={runtime} level={level} />
        ) : (
          <p className={styles.missing}>This topic is not wired up yet.</p>
        )}
      </section>

      <p className={styles.legacy}>
        Want every topic on one page? <a href="/tutor">Open the full Math Tutor</a>.
      </p>
    </main>
  );
}
