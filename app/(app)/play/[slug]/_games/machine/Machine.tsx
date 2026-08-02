"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import {
  ALL_OPS,
  genMachine,
  machineWorks,
  type Node,
  type Op,
  runResults,
  tidyText,
  withOps,
} from "./machine-model";
import styles from "./Machine.module.css";

const HOW_TO: HowTo = {
  goal: "Fit operators into the machine so the outlet reads the number on the order slip.",
  controls: [
    "Tap an empty socket, then tap the operator you want to drop in.",
    "Tap a socket again to pull the operator back out.",
  ],
  rules: [
    "Whatever is wired deeper inside happens first — that is what the shape means.",
    "The hopper marked n holds a different number on each run.",
    "On the later jobs the machine is tested on several inputs, so one lucky run is not enough.",
    "Nothing is timed and a wrong fit costs nothing — the readout just shows the wrong number.",
  ],
};

/** Draw the machine as nested boxes: depth is precedence, visibly. */
function MachineNode({
  node,
  path,
  ops,
  selected,
  onSelect,
  slotIndex,
}: {
  node: Node;
  path: string;
  ops: (Op | null)[];
  selected: number | null;
  onSelect: (i: number) => void;
  slotIndex: { current: number };
}) {
  if (node.kind === "num") return <span className={styles.leaf}>{node.value}</span>;
  if (node.kind === "hopper")
    return (
      <span className={styles.hopper} title="the hopper — a different number each run">
        n
      </span>
    );

  const left = <MachineNode node={node.left} path={`${path}L`} ops={ops} selected={selected} onSelect={onSelect} slotIndex={slotIndex} />;
  const i = slotIndex.current++;
  const right = <MachineNode node={node.right} path={`${path}R`} ops={ops} selected={selected} onSelect={onSelect} slotIndex={slotIndex} />;

  return (
    <span className={styles.node}>
      {left}
      <button
        type="button"
        className={`${styles.socket} ${ops[i] ? styles.filled : ""} ${selected === i ? styles.sel : ""}`}
        onClick={() => onSelect(i)}
        aria-label={ops[i] ? `operator ${ops[i]}, tap to change` : "empty socket"}
      >
        {ops[i] ?? "?"}
      </button>
      {right}
    </span>
  );
}

export default function Machine({ slug, topicId, name, concept, levels, initialLevel, seed }: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const puzzle = useMemo(() => {
    const rng = makeRng(mulberry32(seed + nonce * 7919 + level * 1289));
    return genMachine(level, (a, b) => rng.int(a, b));
  }, [level, nonce, seed]);

  const [ops, setOps] = useState<(Op | null)[]>(() => Array(puzzle.slotCount).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [key, setKey] = useState(0);
  const [done, setDone] = useState(false);

  if (key !== nonce) {
    setKey(nonce);
    setOps(Array(puzzle.slotCount).fill(null));
    setSelected(null);
    setDone(false);
  }

  const place = useCallback(
    (op: Op) => {
      if (selected === null || done) return;
      setOps((prev) => {
        const next = [...prev];
        next[selected] = op;
        if (machineWorks(puzzle, next)) {
          recorder.record({
            type: "attempt",
            prompt: { shape: tidyText(puzzle.shape), targets: puzzle.targets },
            response: { ops: next, ok: true },
            elapsedMs: 0,
          });
          void recorder.flush();
          setDone(true);
        }
        return next;
      });
      setSelected(null);
    },
    [selected, done, puzzle, recorder],
  );

  const clearSocket = useCallback(
    (i: number) => {
      if (done) return;
      if (ops[i]) {
        setOps((prev) => {
          const next = [...prev];
          next[i] = null;
          return next;
        });
        setSelected(null);
        return;
      }
      setSelected((s) => (s === i ? null : i));
    },
    [done, ops],
  );

  const newProblem = useCallback(() => setNonce((n) => n + 1), []);
  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setNonce((n) => n + 1);
  }, []);

  const results = runResults(puzzle, ops);
  const built = ops.every(Boolean) ? withOps(puzzle.shape, ops) : null;
  const slotIndex = { current: 0 };

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Drop operators into the sockets until the outlet matches the order slip."
      howTo={HOW_TO}
      status={
        <>
          <span className={styles.pip}>
            {puzzle.usesHopper
              ? `${puzzle.runs.length} test run${puzzle.runs.length === 1 ? "" : "s"}`
              : "one run"}
          </span>
          {built ? (
            <span className={styles.mono}>{tidyText(built)}</span>
          ) : (
            <span className={styles.soft}>fill every socket</span>
          )}
          <button
            type="button"
            className={styles.mini}
            onClick={() => {
              setOps(Array(puzzle.slotCount).fill(null));
              setSelected(null);
            }}
          >
            Empty the sockets
          </button>
        </>
      }
    >
      <div className={styles.stage}>
        <div className={styles.machineRow}>
          <span className={styles.label}>The machine</span>
          <div className={styles.machine}>
            <MachineNode
              node={puzzle.shape}
              path=""
              ops={ops}
              selected={selected}
              onSelect={clearSocket}
              slotIndex={slotIndex}
            />
          </div>
        </div>

        <div className={styles.tray}>
          <span className={styles.label}>Parts bin</span>
          {ALL_OPS.map((o) => (
            <button
              key={o}
              type="button"
              className={styles.part}
              onClick={() => place(o)}
              disabled={selected === null || done}
            >
              {o}
            </button>
          ))}
          {selected === null && !done ? (
            <span className={styles.soft}>tap a socket first</span>
          ) : null}
        </div>

        <div className={styles.bench}>
          <span className={styles.label}>Test bench</span>
          <table className={styles.runs}>
            <thead>
              <tr>
                {puzzle.usesHopper ? <th>hopper n</th> : <th>run</th>}
                <th>outlet reads</th>
                <th>order slip</th>
              </tr>
            </thead>
            <tbody>
              {puzzle.runs.map((r, i) => {
                const got = results[i];
                const ok = got !== null && got === puzzle.targets[i];
                return (
                  <tr key={i}>
                    <td className={styles.mono}>{puzzle.usesHopper ? r : i + 1}</td>
                    <td className={`${styles.mono} ${got === null ? "" : ok ? styles.good : styles.bad}`}>
                      {got === null ? "—" : got}
                    </td>
                    <td className={styles.mono}>{puzzle.targets[i]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {puzzle.runs.length > 1 ? (
            <p className={styles.hint}>
              The same machine has to satisfy every row. One good row is luck.
            </p>
          ) : null}
        </div>

        {done ? (
          <div className={styles.overlay}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.h2}>It runs.</h2>
              <p className={styles.sub}>
                Written down, that machine is:
              </p>
              <p className={styles.expr}>{built ? tidyText(built) : ""}</p>
              <p className={styles.note}>
                {puzzle.usesHopper
                  ? puzzle.runs.length > 1
                    ? `And it holds for n = ${puzzle.runs.join(", ")} — it works for any n, not just the one you tried.`
                    : "The hopper takes a different number each run, so n stands for whatever is loaded."
                  : "Whatever is wired deeper runs first — that is all the order of operations is."}
              </p>
              <div className={styles.actions}>
                <button type="button" className="btn primary" onClick={newProblem}>
                  Next order
                </button>
                <Link className="btn" href={tutorHref(topicId, { level })}>
                  See this in the tutor
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GameChrome>
  );
}
