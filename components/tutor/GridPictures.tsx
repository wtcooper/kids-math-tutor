"use client";

import { useMemo, useState } from "react";
import { decompose } from "@/lib/math/engines/mul-div";
import { buildShare } from "@/lib/math/engines/share";
import { fmt } from "@/lib/math/format";
import { pn, PLACES } from "@/lib/math/number";
import styles from "./GridPictures.module.css";

/**
 * The two interactive pictures: multiplication's area model and long division's
 * base-10 sharing.
 *
 * These are the only pictures in the original that take UI state (`ui.areaShown` and
 * `ui.shareStep`), and they are the reason those fields existed at all. Here the state is
 * local React state, which is what it always wanted to be.
 */

/* ------------------------------------------------------- area model (mul) */

export function AreaModel({ a, b }: { a: number; b: number }) {
  const ax = useMemo(() => decompose(a), [a]);
  const bx = useMemo(() => decompose(b), [b]);
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const total = ax.length * bx.length;
  const revealed = Object.values(shown).filter(Boolean).length;
  const allOn = revealed === total;

  const running = bx.reduce(
    (sum, bv, r) =>
      sum + ax.reduce((s, av, c) => (shown[`${r}-${c}`] ? s + av * bv : s), 0),
    0,
  );

  const totA = ax.reduce((s, v) => s + v, 0);
  const totB = bx.reduce((s, v) => s + v, 0);
  // Column and row sizes are proportional to place value, with a floor so a "2" column
  // is still clickable next to a "300" one.
  const cols = `2.6rem ${ax.map((v) => `${Math.max(v / totA, 0.17).toFixed(3)}fr`).join(" ")}`;
  const rows = `2rem ${bx.map((v) => `minmax(72px, ${Math.max(v / totB, 0.22).toFixed(3)}fr)`).join(" ")}`;

  return (
    <div>
      <div className={styles.picHead}>
        <div>
          <h3 className={styles.picTitle}>
            {fmt(a)} × {fmt(b)} — the area model
          </h3>
          <p className={styles.picSub}>
            Break each number apart by place value, multiply the easy pieces, then add
            them back up.
          </p>
        </div>
        <div className={styles.picBtns}>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              const next: Record<string, boolean> = {};
              bx.forEach((_, r) => ax.forEach((__, c) => (next[`${r}-${c}`] = true)));
              setShown(next);
            }}
          >
            Reveal all
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setShown({})}>
            Clear
          </button>
        </div>
      </div>

      <div
        className={styles.area}
        style={{ gridTemplateColumns: cols, gridTemplateRows: rows }}
      >
        <div className={styles.hdr} />
        {ax.map((v) => (
          <div key={`c${v}`} className={styles.hdr}>
            {fmt(v)}
          </div>
        ))}
        {bx.map((bv, r) => (
          <Row key={`r${bv}`} bv={bv} ax={ax} r={r} shown={shown} setShown={setShown} />
        ))}
      </div>

      <div className={styles.tally}>
        {bx.flatMap((bv, r) =>
          ax.map((av, c) =>
            shown[`${r}-${c}`] ? (
              <div key={`${r}-${c}`} className={styles.line}>
                <span>
                  {fmt(av)} × {fmt(bv)}
                </span>
                <span>{fmt(av * bv)}</span>
              </div>
            ) : null,
          ),
        )}
        <div className={`${styles.line} ${styles.totalLine}`}>
          <span>{allOn ? "Total" : "So far"}</span>
          <span>{fmt(running)}</span>
        </div>
      </div>

      <div className={styles.note}>
        <b>Say it out loud:</b> {fmt(a)} × {fmt(b)} means {fmt(b)} groups of {fmt(a)}.
        Splitting {fmt(a)} into {ax.map(fmt).join(" + ")} and {fmt(b)} into{" "}
        {bx.map(fmt).join(" + ")} turns one hard multiplication into {total} easy ones.
        The stacked method does exactly this — it just hides the boxes.
      </div>

      {allOn ? (
        <div className={styles.banner}>
          {ax.map(fmt).join(" + ")} times {bx.map(fmt).join(" + ")} = {fmt(a * b)}
        </div>
      ) : null}
    </div>
  );
}

function Row({
  bv,
  ax,
  r,
  shown,
  setShown,
}: {
  bv: number;
  ax: number[];
  r: number;
  shown: Record<string, boolean>;
  setShown: (fn: (s: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  return (
    <>
      <div className={styles.hdr}>{fmt(bv)}</div>
      {ax.map((av, c) => {
        const key = `${r}-${c}`;
        const on = !!shown[key];
        return (
          <button
            key={key}
            type="button"
            className={`${styles.acell} ${on ? styles[`t${(r + c) % 4}`] : styles.hidden}`}
            onClick={() => setShown((s) => ({ ...s, [key]: !s[key] }))}
          >
            <span className={styles.mini}>
              {fmt(av)} × {fmt(bv)}
            </span>
            <span className={styles.big}>{on ? fmt(av * bv) : "?"}</span>
          </button>
        );
      })}
    </>
  );
}

/* --------------------------------------------------- sharing / ladder (div) */

function Blocks({ count, place }: { count: number; place: number }) {
  if (count <= 0) return <div className={styles.blocks}><span className={styles.none}>none</span></div>;
  const cls = styles[`p${Math.min(place, 3)}`];
  if (count > 24) {
    return (
      <div className={styles.blocks}>
        <span className={styles.countBadge}>{count}</span>
        <span className={`${styles.blk} ${cls}`} />
      </div>
    );
  }
  return (
    <div className={styles.blocks}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`${styles.blk} ${cls}`} />
      ))}
    </div>
  );
}

export function SharePicture({
  dividend,
  divisor,
  quotient,
  remainder,
  chunkSteps,
}: {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  /** For the chunk ladder: {chunk, amount} per non-zero quotient digit. */
  chunkSteps: { chunk: number; amount: number }[];
}) {
  const share = useMemo(() => buildShare(dividend, divisor), [dividend, divisor]);
  const maxStep = share.stages.length - 1;
  const [step, setStep] = useState(0);

  // Big divisors and big dividends get the chunking ladder instead: sharing 9,000 blocks
  // into 37 groups is not something you can draw.
  if (divisor > 9 || dividend > 9999) {
    let running = dividend;
    return (
      <div>
        <h3 className={styles.picTitle}>
          {fmt(dividend)} ÷ {divisor} — take it in chunks
        </h3>
        <p className={styles.picSub}>
          Division is repeated subtraction. Instead of one at a time, pull out big
          friendly chunks.
        </p>
        <div className={styles.ladderWrap}>
          <div className={styles.ladder}>
            <div className={styles.lrow}>
              <span className={styles.lval}>{fmt(dividend)}</span>
            </div>
            {chunkSteps.map((c, i) => {
              running -= c.amount;
              return (
                <div key={i}>
                  <div className={`${styles.lrow} ${styles.lsub}`}>
                    <span className={styles.lval}>− {fmt(c.amount)}</span>
                    <span className={styles.lnote}>
                      {fmt(c.chunk)} groups of {divisor}
                    </span>
                  </div>
                  <div className={styles.lrow}>
                    <span className={styles.lval}>{fmt(running)}</span>
                  </div>
                </div>
              );
            })}
            <div className={`${styles.lrow} ${styles.lfin}`}>
              <span className={styles.lval}>
                {fmt(quotient)} groups
                {remainder > 0 ? `, ${remainder} left over` : ""}
              </span>
              <span className={styles.lnote}>add up the chunks</span>
            </div>
          </div>
        </div>
        <div className={styles.note}>
          <b>The bridge to long division:</b> those chunks —{" "}
          {chunkSteps.map((c) => fmt(c.chunk)).join(", ")} — are exactly the digits that
          end up on top of the division bracket. Long division is this ladder in shorthand.
        </div>
      </div>
    );
  }

  const done = step >= maxStep;

  return (
    <div>
      <div className={styles.picHead}>
        <div>
          <h3 className={styles.picTitle}>
            {fmt(dividend)} ÷ {divisor} — sharing it out
          </h3>
          <p className={styles.picSub}>
            Start with the biggest blocks and share fairly. Whatever will not split, trade
            down to the next size.
          </p>
        </div>
        <div className={styles.picBtns}>
          <button
            type="button"
            className="btn sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </button>
          <button
            type="button"
            className="btn primary sm"
            disabled={done}
            onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
          >
            Share the next place
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setStep(maxStep)}>
            Show all
          </button>
        </div>
      </div>

      {share.stages.slice(0, step + 1).map((s) => {
        const nextName = s.place > 0 ? PLACES[s.place - 1] : null;
        return (
          <div key={s.place} className={styles.stage}>
            <h4 className={styles.stageTitle}>
              {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
            </h4>
            <p className={styles.say}>
              We have {s.avail} {pn(s.avail, s.place)}
              {s.carryIn > 0
                ? ` (${s.digit} from the number, plus ${s.carryIn} ${pn(s.carryIn, s.place + 1)} traded in for ${s.carryIn * 10} more)`
                : ""}
              . Share them into {divisor} equal groups.
            </p>

            <div className={styles.groups}>
              {Array.from({ length: divisor }, (_, g) => (
                <div key={g} className={styles.grp}>
                  <div className={styles.cap}>group {g + 1}</div>
                  <Blocks count={s.each} place={s.place} />
                </div>
              ))}
              {s.left > 0 ? (
                <div className={`${styles.grp} ${styles.grpLeft}`}>
                  <div className={styles.cap}>left over</div>
                  <Blocks count={s.left} place={s.place} />
                </div>
              ) : null}
            </div>

            <p className={styles.say}>
              {s.each === 0 ? (
                "Not enough to give each group even one. Everything gets traded down."
              ) : (
                <>
                  Each group gets <b>{s.each}</b> {pn(s.each, s.place)}. That {s.each} is
                  the {s.name} digit of the answer.
                </>
              )}
            </p>

            {s.left > 0 ? (
              <div className={styles.trade}>
                {s.place > 0
                  ? `${s.left} ${pn(s.left, s.place)} will not split evenly → trade ${s.left === 1 ? "it" : "them"} for ${s.left * 10} ${nextName}.`
                  : `${s.left} left over — that is the remainder.`}
              </div>
            ) : null}
          </div>
        );
      })}

      {done ? (
        <div className={styles.banner}>
          Each group ends up with {fmt(quotient)}
          {remainder > 0 ? `, and ${remainder} left over` : ""}.
        </div>
      ) : null}
    </div>
  );
}
