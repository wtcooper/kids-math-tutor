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
  genBeam,
  lcd,
  settingWorks,
  strandsFor,
  totalDemand,
} from "./beam-model";
import styles from "./Beam.module.css";

const HOW_TO: HowTo = {
  goal: "Power every machine at once from a single beam of light.",
  controls: [
    "Choose how many strands to split the beam into.",
    "Then give each machine strands until it has what it asked for.",
  ],
  rules: [
    "One splitter, one setting — every machine is paid in strands of the same size.",
    "A machine asking for 1/2 and one asking for 1/3 cannot both be paid in halves or in thirds.",
    "If a setting cannot pay everyone in whole strands, it is the wrong setting.",
    "Change the setting as often as you like. Nothing is timed.",
  ],
};

const BEAM_W = 620;

export default function Beam({ slug, topicId, name, concept, levels, initialLevel, seed }: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const problem = useMemo(() => {
    const rng = makeRng(mulberry32(seed + nonce * 7919 + level * 641));
    return genBeam(level, (a, b) => rng.int(a, b));
  }, [level, nonce, seed]);

  const { demands, settings } = problem;
  const need = useMemo(() => lcd(demands), [demands]);

  const [setting, setSetting] = useState<number | null>(null);
  const [given, setGiven] = useState<number[]>(() => demands.map(() => 0));
  const [done, setDone] = useState(false);

  const reset = useCallback(() => {
    setSetting(null);
    setGiven(demands.map(() => 0));
    setDone(false);
  }, [demands]);

  const newProblem = useCallback(() => {
    setNonce((n) => n + 1);
    setSetting(null);
    setDone(false);
    setGiven([]);
  }, []);

  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setNonce((n) => n + 1);
    setSetting(null);
    setDone(false);
    setGiven([]);
  }, []);

  const chooseSetting = useCallback(
    (s: number) => {
      setSetting(s);
      setGiven(demands.map(() => 0));
    },
    [demands],
  );

  const workable = setting !== null && settingWorks(demands, setting);
  const wanted = setting === null ? [] : demands.map((d) => strandsFor(d, setting));
  const usedStrands = given.reduce((a, b) => a + b, 0);

  const give = useCallback(
    (i: number, by: number) => {
      if (done || setting === null) return;
      setGiven((prev) => {
        const next = [...prev];
        next[i] = Math.max(0, (next[i] ?? 0) + by);
        const total = next.reduce((a, b) => a + b, 0);
        if (total > setting) return prev;

        const all = demands.every((d, k) => {
          const w = strandsFor(d, setting);
          return w !== null && next[k] === w;
        });
        if (all) {
          recorder.record({
            type: "attempt",
            prompt: { demands: demands.map((d) => `${d.n}/${d.d}`), lcd: need },
            response: { setting, given: next, ok: true },
            elapsedMs: 0,
          });
          void recorder.flush();
          setDone(true);
        }
        return next;
      });
    },
    [done, setting, demands, need, recorder],
  );

  const total = totalDemand(demands);
  const strandW = setting ? BEAM_W / setting : BEAM_W;

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Split the beam so every machine can be paid in whole strands, then feed them."
      howTo={HOW_TO}
      status={
        <>
          <span className={styles.pip}>
            {demands.map((d) => `${d.n}/${d.d}`).join(" + ")} needed
          </span>
          {setting ? (
            <span className={workable ? styles.ok : styles.bad}>
              Split into {setting}
              {workable ? "" : " — cannot pay everyone"}
            </span>
          ) : (
            <span className={styles.soft}>Choose a splitter setting</span>
          )}
          <button type="button" className={styles.mini} onClick={reset}>
            Start over
          </button>
        </>
      }
    >
      <div className={styles.stage}>
        <div className={styles.settings}>
          <span className={styles.label}>Splitter</span>
          {settings.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.setting} ${setting === s ? styles.on : ""}`}
              onClick={() => chooseSetting(s)}
              disabled={done}
            >
              {s} strands
            </button>
          ))}
        </div>

        <svg
          className={styles.beam}
          viewBox={`0 0 ${BEAM_W} 76`}
          role="img"
          aria-label={setting ? `Beam split into ${setting} strands` : "Beam, not yet split"}
        >
          <rect x={0} y={18} width={BEAM_W} height={40} rx={6} fill="#fdf3d8" stroke="#e3cf9b" />
          {setting
            ? Array.from({ length: setting }, (_, i) => {
                // Colour each strand by the machine it has been routed to.
                let acc = 0;
                let owner = -1;
                for (let k = 0; k < given.length; k++) {
                  if (i >= acc && i < acc + (given[k] ?? 0)) owner = k;
                  acc += given[k] ?? 0;
                }
                return (
                  <rect
                    key={i}
                    x={i * strandW + 1}
                    y={19}
                    width={strandW - 2}
                    height={38}
                    rx={3}
                    fill={owner >= 0 ? MACHINE_FILL[owner % MACHINE_FILL.length] : "#fdf3d8"}
                    stroke={owner >= 0 ? MACHINE_STROKE[owner % MACHINE_STROKE.length] : "#e3cf9b"}
                  />
                );
              })
            : null}
          <text x={0} y={12} className={styles.cap}>
            {setting ? `One beam, cut into ${setting}` : "One beam"}
          </text>
          <text x={BEAM_W} y={72} textAnchor="end" className={styles.cap}>
            {setting ? `${setting - usedStrands} strands spare` : ""}
          </text>
        </svg>

        <div className={styles.machines}>
          {demands.map((d, i) => {
            const want = wanted[i];
            const has = given[i] ?? 0;
            const satisfied = want !== null && has === want;
            return (
              <div key={d.name} className={`${styles.machine} ${satisfied ? styles.lit : ""}`}>
                <div className={styles.machineHead}>
                  <span
                    className={styles.swatch}
                    style={{ background: MACHINE_FILL[i % MACHINE_FILL.length] }}
                  />
                  <span className={styles.machineName}>{d.name}</span>
                </div>
                <div className={styles.wants}>
                  wants{" "}
                  <span className={styles.frac}>
                    <span>{d.n}</span>
                    <span className={styles.bar} />
                    <span>{d.d}</span>
                  </span>{" "}
                  of the beam
                </div>
                <div className={styles.need}>
                  {setting === null
                    ? "split the beam first"
                    : want === null
                      ? `no whole number of ${setting}ths makes ${d.n}/${d.d}`
                      : `= ${want} strand${want === 1 ? "" : "s"}`}
                </div>
                <div className={styles.feed}>
                  <button
                    type="button"
                    className={styles.step}
                    onClick={() => give(i, -1)}
                    disabled={done || has === 0}
                  >
                    −
                  </button>
                  <span className={styles.count}>{has}</span>
                  <button
                    type="button"
                    className={styles.step}
                    onClick={() => give(i, 1)}
                    disabled={done || setting === null || usedStrands >= setting}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {done ? (
          <div className={styles.overlay}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.h2}>All lit.</h2>
              <p className={styles.sub}>
                One splitter setting had to pay every machine in whole strands. That
                setting is the common denominator.
              </p>
              <div className={styles.sum}>
                {demands.map((d, i) => (
                  <span key={d.name}>
                    {i > 0 ? <span className={styles.plus}>+</span> : null}
                    <span className={styles.frac}>
                      <span>{d.n}</span>
                      <span className={styles.bar} />
                      <span>{d.d}</span>
                    </span>
                    <span className={styles.arrow}>→</span>
                    <span className={`${styles.frac} ${styles.hi}`}>
                      <span>{strandsFor(d, setting!)}</span>
                      <span className={styles.bar} />
                      <span>{setting}</span>
                    </span>
                  </span>
                ))}
              </div>
              <p className={styles.note}>
                Together they draw {total.n}/{total.d} of the beam
                {setting !== need
                  ? ` · ${need} strands would also have worked, and is the smallest that does.`
                  : ` · ${need} is the smallest splitter setting that works.`}
              </p>
              <div className={styles.actions}>
                <button type="button" className="btn primary" onClick={newProblem}>
                  Next machine room
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

const MACHINE_FILL = ["#dce7d6", "#f0dcc8", "#e8dbef", "#d9e4ee"];
const MACHINE_STROKE = ["#8aa683", "#c99a6f", "#a98cb8", "#8ba4bb"];
