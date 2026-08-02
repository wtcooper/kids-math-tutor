"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { BY_ID, GROUPS, TOPICS, topicsInGroup } from "@/lib/topics";
import { ABOUT } from "@/lib/topics.about";
import { GAMES } from "@/lib/games";
import { runtimeFor } from "@/lib/math/registry";
import type { FactKind } from "@/lib/math/facts";
import { PracticeMode } from "./PracticeMode";
import { DrillMode, LearnMode } from "./FlashcardMode";
import { StepsWorkspace } from "./StepsWorkspace";
import { GridWorkspace } from "./GridWorkspace";
import styles from "./TutorApp.module.css";

/**
 * The tutor, as one page.
 *
 * Topic and level are dropdowns exactly as in the original — a grouped <select> of all 21
 * topics and a second one for that topic's levels. Modes are tabs, and which tabs exist
 * depends on the engine: flashcards get Learn/Drill, column arithmetic gets Watch/You
 * try/Practice, and everything else adds Picture it.
 *
 * State lives here rather than in the URL so switching topics is instant, but the page
 * still accepts ?topic=&level=&mode= so the games can deep-link in.
 */

type Mode = "learn" | "drill" | "picture" | "watch" | "try" | "practice";

const DEFAULT_TOPIC = "facts-mul";

export function TutorApp({
  initialTopicId,
  initialLevel,
  initialMode,
}: {
  initialTopicId?: string;
  initialLevel?: number;
  initialMode?: string;
}) {
  const [topicId, setTopicId] = useState(
    initialTopicId && BY_ID[initialTopicId] ? initialTopicId : DEFAULT_TOPIC,
  );
  // Each topic remembers the level you were last on, like the original's levelMemo.
  const [levelMemo, setLevelMemo] = useState<Record<string, number>>(() =>
    initialTopicId && initialLevel ? { [initialTopicId]: initialLevel } : {},
  );
  const [showAbout, setShowAbout] = useState(false);

  const topic = BY_ID[topicId];
  const runtime = useMemo(() => runtimeFor(topicId), [topicId]);
  const isFacts = topic.engine === "facts";
  const kind: FactKind = topicId === "facts-div" ? "div" : "mul";

  const level = Math.min(levelMemo[topicId] ?? 1, topic.levels.length);

  const modes: [Mode, string][] = isFacts
    ? [
        ["learn", "Learn"],
        ["drill", "Drill"],
      ]
    : runtime?.build
      ? [
          ["picture", "Picture it"],
          ["watch", "Watch it"],
          ["try", "You try"],
          ["practice", "Practice"],
        ]
      : runtime?.gridBuild
        ? // Column arithmetic has no Picture it: the original's add/sub/mul/div pictures
          // returned null, because the grid itself is the picture.
          [
            ["watch", "Watch it"],
            ["try", "You try"],
            ["practice", "Practice"],
          ]
        : [["practice", "Practice"]];

  const [mode, setMode] = useState<Mode>(() => {
    const wanted = initialMode as Mode | undefined;
    return wanted && ["learn", "drill", "picture", "watch", "try", "practice"].includes(wanted)
      ? wanted
      : "learn";
  });

  const activeMode: Mode = modes.some(([m]) => m === mode) ? mode : modes[0][0];

  const switchTopic = useCallback(
    (next: string) => {
      setTopicId(next);
      const nextTopic = BY_ID[next];
      // Reset to a mode this engine actually has, the way switchTopic did.
      setMode(nextTopic.engine === "facts" ? "learn" : "watch");
    },
    [],
  );

  const setLevel = useCallback(
    (n: number) => setLevelMemo((m) => ({ ...m, [topicId]: n })),
    [topicId],
  );

  const game = GAMES[topicId];

  return (
    <main className="wrap">
      <header className={styles.top}>
        <div>
          <Link href="/" className={styles.back}>
            ← Home
          </Link>
          <h1 className={styles.title}>The Math Tutor</h1>
          <p className={styles.subtitle}>{topic.tagline}</p>
        </div>
        <div className={styles.topActions}>
          {game ? (
            <Link className="btn sage sm" href={`/play/${topicId}?level=${level}`}>
              Play {game.name}
            </Link>
          ) : null}
          <a className="btn ghost sm" href="/sign-out">
            Sign out
          </a>
        </div>
      </header>

      <div className={styles.pickers}>
        <label className={styles.picker}>
          <span className={styles.pickerLabel}>Topic</span>
          <select
            className={styles.select}
            value={topicId}
            onChange={(e) => switchTopic(e.target.value)}
          >
            {GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {topicsInGroup(group).map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className={styles.picker}>
          <span className={styles.pickerLabel}>Level</span>
          <select
            className={styles.select}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            {topic.levels.map((name, i) => (
              <option key={name} value={i + 1}>
                {i + 1} · {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.aboutRow}>
        <button
          type="button"
          className={styles.aboutToggle}
          onClick={() => setShowAbout((v) => !v)}
          aria-expanded={showAbout}
        >
          What is this topic about?
        </button>
      </div>
      {showAbout ? <p className={styles.aboutBody}>{ABOUT[topicId]}</p> : null}

      <div className={styles.modes}>
        {modes.map(([m, label]) => (
          <button
            key={m}
            type="button"
            className={`${styles.mode} ${m === activeMode ? styles.on : ""}`}
            onClick={() => setMode(m)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="card">
        {isFacts ? (
          activeMode === "drill" ? (
            <DrillMode key={`${kind}-${level}`} kind={kind} level={level} />
          ) : (
            <LearnMode key={`${kind}-${level}`} kind={kind} level={level} />
          )
        ) : runtime?.gridBuild && activeMode !== "practice" ? (
          <GridWorkspace
            key={`${topicId}-${level}-${activeMode}`}
            runtime={runtime}
            level={level}
            mode={activeMode === "try" ? "try" : "watch"}
          />
        ) : runtime?.build && activeMode !== "practice" ? (
          <StepsWorkspace
            key={`${topicId}-${level}-${activeMode}`}
            runtime={runtime}
            level={level}
            mode={activeMode as "picture" | "watch" | "try"}
          />
        ) : runtime ? (
          <PracticeMode key={`${topicId}-${level}`} runtime={runtime} level={level} />
        ) : null}
      </section>

      <p className={styles.footNote}>
        {TOPICS.length} topics · {TOPICS.reduce((n, tp) => n + tp.levels.length, 0)} levels
      </p>
    </main>
  );
}
