"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BEASTS,
  type BeastPoints,
  loadBeasts,
  nextStageAt,
  stageFor,
} from "@/lib/beasts";
import { GAMES } from "@/lib/games";
import { Beast } from "./Beast";
import styles from "./BeastBook.module.css";

const STAGE_WORDS: Record<string, string> = {
  egg: "an egg — keep practising and it will hatch",
  hatchling: "a hatchling",
  grown: "fully grown",
  elder: "an elder",
};

/** The Book itself: every family, its stage, and what feeds it. */
export function BeastBook() {
  const [points, setPoints] = useState<BeastPoints | null>(null);

  useEffect(() => {
    setPoints(loadBeasts());
    const onStage = () => setPoints(loadBeasts());
    window.addEventListener("beast:stage", onStage);
    return () => window.removeEventListener("beast:stage", onStage);
  }, []);

  const found = points ? BEASTS.filter((b) => (points[b.family] ?? 0) > 0).length : 0;

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <Link href="/" className={styles.back}>
            ← All topics
          </Link>
          <h1 className={styles.title}>The Beast Book</h1>
          <p className={styles.sub}>
            Every kind of maths has a creature. Playing any game feeds the creature of
            that game&apos;s topic — practice hatches them, and keeps them growing.
          </p>
        </div>
        <span className={styles.count}>
          {found} of {BEASTS.length} discovered
        </span>
      </header>

      <div className={styles.grid}>
        {BEASTS.map((b) => {
          const p = points?.[b.family] ?? 0;
          const stage = stageFor(p);
          const next = nextStageAt(p);
          const fedBy = GAMES.filter((g) => b.topicIds.includes(g.topicId)).map((g) => g.name);
          return (
            <div key={b.family} className={`${styles.card} ${stage ? "" : styles.unfound}`}>
              <div className={styles.portrait}>
                <Beast family={b.family} hue={b.hue} stage={stage} />
              </div>
              <h2 className={styles.name}>{stage ? b.name : "???"}</h2>
              <p className={styles.stage}>
                {stage ? STAGE_WORDS[stage] : "not discovered yet"}
              </p>
              {next ? (
                <div className={styles.meter} aria-label={`${p} care points`}>
                  <div
                    className={styles.meterFill}
                    style={{ width: `${Math.min(100, (p / next.at) * 100)}%`, background: b.hue }}
                  />
                </div>
              ) : (
                <p className={styles.maxed}>as grand as they grow</p>
              )}
              <p className={styles.diet}>
                eats {b.diet}
                {fedBy.length ? ` — fed by ${fedBy.join(", ")}` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
