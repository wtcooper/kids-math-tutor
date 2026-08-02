"use client";

import Link from "next/link";
import { factorsOf } from "@/lib/math/number";
import { tutorHref } from "@/lib/topics";
import type { RuleKind } from "./GridScene";
import styles from "@/components/game/RoundEnd.module.css";
import local from "./FactorRoundEnd.module.css";

export interface FactorRoundResult {
  rule: RuleKind;
  a: number;
  b?: number;
  eaten: number[];
  yours: number;
  grumps: number;
  gcf?: number;
}

/**
 * The board rewritten in the tutor's own idiom.
 *
 * `48 = 1, 2, 3, 4, 6, 8, 12, 16, 24, 48` with the ones she ate boxed — which is exactly
 * what the tutor's `factors` topic emits for its step 1. Same representation, same
 * markup vocabulary, so the game and the tutor are showing one object rather than two
 * lookalikes. That shared object is the near-transfer lever.
 */
export function FactorRoundEnd({
  topicId,
  level,
  result,
  onAgain,
}: {
  topicId: string;
  level: number;
  result: FactorRoundResult;
  onAgain: () => void;
}) {
  const { rule, a, b, eaten, gcf, yours, grumps } = result;
  const showList = rule === "factors" || rule === "common";
  const list = showList ? factorsOf(a) : [];

  return (
    <div className={styles.scrim}>
      <div className={`card ${styles.panel}`}>
        <h2 className={styles.title}>
          {yours > grumps
            ? "Board cleared — you won it"
            : yours === grumps
              ? "Board cleared — dead heat"
              : "Board cleared"}
        </h2>

        <p className={local.tally}>
          <span className={local.you}>You {yours}</span>
          <span className={local.them}>Grumps {grumps}</span>
        </p>

        {rule === "common" && gcf !== undefined ? (
          <p className={styles.lede}>
            The last one you ate was <strong>{gcf}</strong> — and that is the greatest
            common factor of {a} and {b}.
          </p>
        ) : (
          <p className={styles.lede}>
            {rule === "primes"
              ? "Those were the primes — the numbers with no factors but 1 and themselves."
              : rule === "multiples"
                ? `Every one of those counts up in ${a}s.`
                : `Every one of those divides into ${a} exactly.`}
          </p>
        )}

        {showList ? (
          <div className={local.factorLine}>
            <span className={local.lhs}>{a} =</span>
            <span className={local.items}>
              {list.map((n, i) => (
                <span key={n}>
                  {i > 0 ? <span className={local.sep}>, </span> : null}
                  <span className={eaten.includes(n) ? local.box : local.mut}>{n}</span>
                </span>
              ))}
            </span>
          </div>
        ) : null}

        {rule === "common" && b !== undefined ? (
          <div className={local.factorLine}>
            <span className={local.lhs}>{b} =</span>
            <span className={local.items}>
              {factorsOf(b).map((n, i) => (
                <span key={n}>
                  {i > 0 ? <span className={local.sep}>, </span> : null}
                  <span className={eaten.includes(n) ? local.box : local.mut}>{n}</span>
                </span>
              ))}
            </span>
          </div>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className="btn primary" onClick={onAgain}>
            New board
          </button>
          <Link className="btn" href={tutorHref(topicId, { level })}>
            See this in the tutor
          </Link>
        </div>
      </div>
    </div>
  );
}
