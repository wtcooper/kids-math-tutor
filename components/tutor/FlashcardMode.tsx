"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { card, fams, type FactCard, type FactKind } from "@/lib/math/facts";
import { systemRng } from "@/lib/math/rng";
import { RichText } from "./RichText";
import styles from "./FlashcardMode.module.css";

/**
 * Learn and Drill, ported from docs/math-table.html:3303-3402.
 *
 * Learn is a ladder of the whole table, not a single card: you reveal down it in order,
 * with the skip-counting sequence above and a memory hook for the row you are on. The
 * build notes are explicit that saying the sequence aloud is the fastest way in, which is
 * why the count row is part of the design rather than decoration.
 */

/* ------------------------------------------------------------------ Learn */

export function LearnMode({ kind, level }: { kind: FactKind; level: number }) {
  const families = useMemo(() => fams(level), [level]);
  const [fam, setFam] = useState(families[0]);
  const [shown, setShown] = useState(1);
  const [cover, setCover] = useState(false);

  // A new level is a different set of tables.
  useEffect(() => {
    setFam(families[0]);
    setShown(1);
    setCover(false);
  }, [families]);

  const rows = useMemo(
    () => Array.from({ length: 12 }, (_, i) => card(kind, fam, i + 1)),
    [kind, fam],
  );
  const skip = useMemo(() => Array.from({ length: 12 }, (_, i) => fam * (i + 1)), [fam]);
  const current = rows[Math.min(shown, 12) - 1];

  return (
    <div>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.headTitle}>
            The {fam}s{kind === "div" ? " — divided" : ""}
          </h2>
          <p className={styles.headSub}>
            {kind === "mul"
              ? "Go in order first. The pattern down the right-hand column is what makes them stick."
              : "Every one of these is a multiplication fact read backwards."}
          </p>
        </div>
        <div className={styles.btnRow}>
          <button
            type="button"
            className="btn sm"
            disabled={shown <= 1}
            onClick={() => setShown((s) => Math.max(1, s - 1))}
          >
            Back
          </button>
          <button
            type="button"
            className="btn primary sm"
            disabled={shown >= 12}
            onClick={() => setShown((s) => Math.min(12, s + 1))}
          >
            Reveal next
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setShown(12)}>
            Show all
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setCover((c) => !c)}
          >
            {cover ? "Uncover" : "Cover answers"}
          </button>
        </div>
      </div>

      <div className={styles.famRow}>
        {families.map((f) => (
          <button
            key={f}
            type="button"
            className={`btn sm ${f === fam ? "primary" : ""}`}
            onClick={() => {
              setFam(f);
              setShown(1);
            }}
          >
            {f}s
          </button>
        ))}
      </div>

      {kind === "mul" ? (
        <div className={styles.note}>
          <b>Count by {fam}s:</b>{" "}
          {skip.map((v, i) => (
            <span key={v} className={i < shown ? styles.skipOn : styles.skipOff}>
              {i > 0 ? " · " : ""}
              {v}
            </span>
          ))}
          <br />
          Saying this sequence out loud is the single fastest way to learn a table — the
          answers are already in order.
        </div>
      ) : null}

      <div className={styles.ladder}>
        {rows.map((r, i) => {
          const on = i === shown - 1;
          const vis = i < shown;
          return (
            <div
              key={r.q}
              className={`${styles.rung} ${on ? styles.rungOn : ""} ${
                cover && !on ? styles.rungHid : ""
              } ${vis ? "" : styles.rungDim}`}
            >
              <span className={styles.rq}>{r.q} =</span>
              <span className={styles.ra}>{vis ? r.a : "?"}</span>
              {vis && kind === "mul" ? (
                <span className={styles.rskip}>
                  {i === 0 ? `one ${fam}` : `${i + 1} × ${fam}`}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {current ? (
        <div className={styles.narr}>
          <div className={styles.narrLabel}>Trick for this one</div>
          <p>
            <RichText rich={current.hook} />
          </p>
        </div>
      ) : null}

      <div className={styles.note}>
        <b>How to use this page:</b>{" "}
        reveal them in order once, saying each out loud. Then
        hit &ldquo;Cover answers&rdquo; and go down the list again from memory. When that
        feels easy, switch to Drill — shuffled and out of order is the real test.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Drill */

type Result = "ok" | "miss" | null;

function shuffle(cards: FactCard[]): FactCard[] {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = systemRng.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function fullDeck(kind: FactKind, level: number): FactCard[] {
  const cards: FactCard[] = [];
  for (const f of fams(level)) for (let i = 2; i <= 12; i++) cards.push(card(kind, f, i));
  return shuffle(cards);
}

export function DrillMode({ kind, level }: { kind: FactKind; level: number }) {
  const [deck, setDeck] = useState<FactCard[]>(() => fullDeck(kind, level));
  const [results, setResults] = useState<Result[]>(() => deck.map(() => null));
  const [pos, setPos] = useState(0);
  const [val, setVal] = useState("");
  const [state, setState] = useState<"" | "ok" | "bad">("");
  const [revealed, setRevealed] = useState(false);
  const [missed, setMissed] = useState<FactCard[]>([]);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0, best: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback((cards: FactCard[]) => {
    setDeck(cards);
    setResults(cards.map(() => null));
    setPos(0);
    setVal("");
    setState("");
    setRevealed(false);
    setMissed([]);
  }, []);

  useEffect(() => {
    reset(fullDeck(kind, level));
    setScore({ right: 0, total: 0, streak: 0, best: 0 });
  }, [kind, level, reset]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const advance = useCallback(() => {
    setPos((p) => p + 1);
    setVal("");
    setState("");
    setRevealed(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const check = useCallback(() => {
    if (revealed) {
      advance();
      return;
    }
    const c = deck[pos];
    const v = val.trim();
    if (v === "") return;

    setScore((s) => ({ ...s, total: s.total + 1 }));

    if (v === c.a) {
      setScore((s) => {
        const streak = s.streak + 1;
        return { right: s.right + 1, total: s.total, streak, best: Math.max(s.best, streak) };
      });
      setState("ok");
      setResults((r) => r.map((x, i) => (i === pos ? "ok" : x)));
      // Brief pause on a correct answer so she sees it land, then move on.
      timer.current = setTimeout(advance, 520);
    } else {
      setScore((s) => ({ ...s, streak: 0 }));
      setState("bad");
      setRevealed(true);
      setResults((r) => r.map((x, i) => (i === pos ? "miss" : x)));
      setMissed((m) => (m.some((x) => x.q === c.q) ? m : [...m, c]));
      // Requeue four later — far enough that she has to recall it, not echo it.
      setDeck((d) => {
        const copy = d.slice();
        copy.splice(Math.min(copy.length, pos + 4), 0, c);
        return copy;
      });
      setResults((r) => {
        const copy = r.slice();
        copy.splice(Math.min(copy.length, pos + 4), 0, null);
        return copy;
      });
    }
  }, [revealed, deck, pos, val, advance]);

  if (pos >= deck.length) {
    const pct = score.total ? Math.round((score.right / score.total) * 100) : 0;
    return (
      <div>
        <div className={styles.cardHead}>
          <div>
            <h2 className={styles.headTitle}>Deck finished</h2>
            <p className={styles.headSub}>
              You got {score.right} of {score.total} right ({pct}%).
            </p>
          </div>
        </div>
        {missed.length ? (
          <>
            <p className={styles.centered}>These are the ones to work on:</p>
            <div className={styles.missRow}>
              {missed.map((c) => (
                <span key={c.q} className={styles.missBox}>
                  {c.q} = {c.a}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.allRight}>Every single one correct. That table is done.</p>
        )}
        <div className={styles.centerRow}>
          {missed.length ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => reset(shuffle(missed))}
            >
              Drill just these {missed.length}
            </button>
          ) : null}
          <button
            type="button"
            className={`btn ${missed.length ? "" : "primary"}`}
            onClick={() => reset(fullDeck(kind, level))}
          >
            Shuffle the whole deck again
          </button>
        </div>
      </div>
    );
  }

  const c = deck[pos];

  return (
    <div>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.headTitle}>
            Drill — card {pos + 1} of {deck.length}
          </h2>
          <p className={styles.headSub}>
            Type the answer and press Enter. Missed cards come back around.
          </p>
        </div>
        <div className={styles.btnRow}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => reset(fullDeck(kind, level))}
          >
            Reshuffle
          </button>
        </div>
      </div>

      <div className={styles.deckbar}>
        {results.map((r, i) => (
          <i
            key={i}
            className={
              i === pos ? styles.now : r === "ok" ? styles.done : r === "miss" ? styles.miss : ""
            }
          />
        ))}
      </div>

      <div className={styles.deckwrap}>
        <div
          className={`${styles.fcard} ${state === "ok" ? styles.right : state === "bad" ? styles.wrong : ""}`}
        >
          <div className={styles.fq}>{c.q}</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
          >
            <input
              ref={inputRef}
              className={`${styles.fans} ${state === "ok" ? styles.ok : state === "bad" ? styles.bad : ""}`}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              disabled={revealed}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </form>
          {revealed ? (
            <>
              <div className={styles.freveal}>
                {c.q} = {c.a}
              </div>
              <div className={styles.fhint}>
                <RichText rich={c.hook} />
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className={styles.centerRow}>
        {revealed ? (
          <button type="button" className="btn primary" onClick={advance}>
            Next card →
          </button>
        ) : (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setState("bad");
              setRevealed(true);
              setScore((s) => ({ ...s, streak: 0 }));
              setMissed((m) => (m.some((x) => x.q === c.q) ? m : [...m, c]));
            }}
          >
            Show me
          </button>
        )}
      </div>

      <div className={styles.scorebar}>
        <span className={styles.pill}>
          Correct <b>{score.right}</b> / {score.total}
        </span>
        <span className={`${styles.pill} ${styles.streak}`}>
          Streak <b>{score.streak}</b>
          {score.best > score.streak ? ` · best ${score.best}` : ""}
        </span>
      </div>
    </div>
  );
}
