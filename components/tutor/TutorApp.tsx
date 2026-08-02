"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { BY_ID, GROUPS, TOPICS, topicsInGroup } from "@/lib/topics";
import { ABOUT } from "@/lib/topics.about";
import { GAMES } from "@/lib/games";
import { runtimeFor } from "@/lib/math/registry";
import { buildWorksheet, type Worksheet } from "@/lib/math/worksheet";
import type { FactKind } from "@/lib/math/facts";
import { PracticeMode } from "./PracticeMode";
import { DrillMode, LearnMode } from "./FlashcardMode";
import { StepsWorkspace } from "./StepsWorkspace";
import { GridWorkspace } from "./GridWorkspace";
import { CustomNumbers } from "./CustomNumbers";
import { WorksheetSheet } from "./Worksheet";
import styles from "./TutorApp.module.css";

/**
 * The tutor, as one page — the same shape as the original single-file app.
 *
 * Topic and level are dropdowns; modes are tabs; the header carries "New problem" (or
 * "Reshuffle deck" for flashcards) and "Print a worksheet"; and the four whole-number
 * topics get the "use your own numbers" box so she can work from her actual homework.
 */

type Mode = "learn" | "drill" | "picture" | "watch" | "try" | "practice";

const ALL_MODES: Mode[] = ["learn", "drill", "picture", "watch", "try", "practice"];
const DEFAULT_TOPIC = "facts-mul";

export function TutorApp({
  initialTopicId,
  initialLevel,
  initialMode,
  seed,
}: {
  initialTopicId?: string;
  initialLevel?: number;
  initialMode?: string;
  /** Server-supplied, so the first problem is identical on both sides of hydration. */
  seed: number;
}) {
  const [topicId, setTopicId] = useState(
    initialTopicId && BY_ID[initialTopicId] ? initialTopicId : DEFAULT_TOPIC,
  );
  // Each topic remembers the level you were last on, like the original's levelMemo.
  const [levelMemo, setLevelMemo] = useState<Record<string, number>>(() =>
    initialTopicId && initialLevel ? { [initialTopicId]: initialLevel } : {},
  );
  // Bumping this regenerates the current problem — the header's "New problem".
  const [nonce, setNonce] = useState(0);
  // A problem forced in from outside: "use your own numbers", or "walk me through it"
  // handing Practice's current problem to Watch it.
  const [forced, setForced] = useState<unknown>(null);
  const [sheet, setSheet] = useState<Worksheet | null>(null);

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
        ? // add / sub / dec-addsub had picture() returning null in the original — the
          // grid is the picture. mul and div did have one, and they are the two
          // interactive ones.
          ((["mul", "div", "dec-addsub"].includes(topicId)
            ? [["picture", "Picture it"] as [Mode, string]]
            : []) as [Mode, string][]).concat([
            ["watch", "Watch it"],
            ["try", "You try"],
            ["practice", "Practice"],
          ])
        : [["practice", "Practice"]];

  const [mode, setMode] = useState<Mode>(() => {
    const wanted = initialMode as Mode | undefined;
    return wanted && ALL_MODES.includes(wanted) ? wanted : "learn";
  });
  const activeMode: Mode = modes.some(([m]) => m === mode) ? mode : modes[0][0];

  const switchTopic = useCallback((next: string) => {
    setTopicId(next);
    setForced(null);
    // Reset to a mode this engine actually has, the way switchTopic did.
    setMode(BY_ID[next].engine === "facts" ? "learn" : "watch");
  }, []);

  const setLevel = useCallback(
    (n: number) => {
      setLevelMemo((m) => ({ ...m, [topicId]: n }));
      setForced(null);
    },
    [topicId],
  );

  const newProblem = useCallback(() => {
    setForced(null);
    setNonce((n) => n + 1);
  }, []);

  /** Practice's "Walk me through it": same problem, shown step by step. */
  const walkThrough = useCallback((problem: unknown) => {
    setForced(problem);
    setMode("watch");
  }, []);

  const useOwnNumbers = useCallback(
    (problem: unknown) => {
      setForced(problem);
      if (activeMode === "practice") setMode("watch");
    },
    [activeMode],
  );

  const printWorksheet = useCallback(() => {
    setSheet(buildWorksheet(topicId, level));
    // Let React paint the sheet before the print dialog reads the document.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }, [topicId, level]);

  const game = GAMES[topicId];
  // Deliberately not keyed on the mode: switching tabs keeps the current problem, the way
  // the original did (math-table.html:3626 sets S.mode and re-renders, it never calls
  // newProblem). Watching a problem worked and then trying that same one is the point.
  const workspaceKey = `${topicId}-${level}-${nonce}-${forced ? "forced" : "gen"}`;
  // Each remount needs a different first problem, or "New problem" would hand back the
  // same one. 7919 is just a prime stride so consecutive nonces don't correlate.
  const workspaceSeed = seed + nonce * 7919;

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
          <button type="button" className="btn ghost" onClick={printWorksheet}>
            Print a worksheet
          </button>
          <button type="button" className="btn primary" onClick={newProblem}>
            {isFacts ? "Reshuffle deck" : "New problem"}
          </button>
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

      {runtime?.custom && !isFacts ? (
        <CustomNumbers spec={runtime.custom} onSet={useOwnNumbers} />
      ) : null}

      <details className={styles.about}>
        <summary>What is this topic about?</summary>
        <div className={styles.aboutBody}>{ABOUT[topicId]}</div>
      </details>

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
            <DrillMode
              key={`${kind}-${level}-${nonce}`}
              kind={kind}
              level={level}
              seed={workspaceSeed}
            />
          ) : (
            <LearnMode key={`${kind}-${level}`} kind={kind} level={level} />
          )
        ) : runtime?.gridBuild && activeMode !== "practice" ? (
          <GridWorkspace
            key={workspaceKey}
            runtime={runtime}
            level={level}
            mode={activeMode as "picture" | "watch" | "try"}
            forcedProblem={forced}
            onNewProblem={newProblem}
            seed={workspaceSeed}
          />
        ) : runtime?.build && activeMode !== "practice" ? (
          <StepsWorkspace
            key={workspaceKey}
            runtime={runtime}
            level={level}
            mode={activeMode as "picture" | "watch" | "try"}
            forcedProblem={forced}
            onNewProblem={newProblem}
            seed={workspaceSeed}
          />
        ) : runtime ? (
          <PracticeMode
            key={`${topicId}-${level}-${nonce}`}
            runtime={runtime}
            level={level}
            seed={workspaceSeed}
            onWalkThrough={runtime.build || runtime.gridBuild ? walkThrough : undefined}
          />
        ) : null}
      </section>

      <p className={styles.footNote}>
        {TOPICS.length} topics · {TOPICS.reduce((n, tp) => n + tp.levels.length, 0)} levels
      </p>

      {/* Hidden on screen; the print stylesheet shows only this. */}
      <WorksheetSheet sheet={sheet} />
    </main>
  );
}
