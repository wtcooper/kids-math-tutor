"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { deckFor, shuffledDeck, type FactCard, type FactKind } from "@/lib/math/facts";
import { systemRng } from "@/lib/math/rng";
import { RichText } from "./RichText";
import styles from "./FlashcardMode.module.css";

/**
 * Learn walks one table in order with its memory hook; Drill shuffles and requeues what
 * she misses. No timer in either — the deck ends when the deck ends.
 */

export function LearnMode({ kind, level }: { kind: FactKind; level: number }) {
  const deck = useMemo(() => deckFor(kind, level), [kind, level]);
  const [idx, setIdx] = useState(0);
  const [covered, setCovered] = useState(true);
  const card = deck[idx];

  return (
    <div className={styles.wrap}>
      <div className={styles.learnHead}>
        <span className={styles.counter}>
          {idx + 1} of {deck.length}
        </span>
      </div>

      <div className={styles.card}>
        <p className={styles.q}>{card.q}</p>
        {covered ? (
          <button
            type="button"
            className="btn"
            onClick={() => setCovered(false)}
          >
            Show the answer
          </button>
        ) : (
          <p className={styles.a}>{card.a}</p>
        )}
        {!covered ? (
          <p className={styles.hook}>
            <RichText rich={card.hook} />
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn sm"
          disabled={idx === 0}
          onClick={() => {
            setIdx((i) => Math.max(0, i - 1));
            setCovered(true);
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          className="btn primary sm"
          disabled={idx >= deck.length - 1}
          onClick={() => {
            setIdx((i) => Math.min(deck.length - 1, i + 1));
            setCovered(true);
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function DrillMode({ kind, level }: { kind: FactKind; level: number }) {
  const [deck, setDeck] = useState<FactCard[]>(() =>
    shuffledDeck(kind, level, systemRng),
  );
  const [pos, setPos] = useState(0);
  const [value, setValue] = useState("");
  const [state, setState] = useState<"asking" | "right" | "wrong">("asking");
  const [missed, setMissed] = useState<FactCard[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const card = deck[pos];
  const done = pos >= deck.length;

  const submit = useCallback(() => {
    if (state !== "asking") {
      setPos((p) => p + 1);
      setValue("");
      setState("asking");
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (value.trim() === card.a) {
      setState("right");
    } else {
      setState("wrong");
      setMissed((m) => (m.some((c) => c.q === card.q) ? m : [...m, card]));
      // Requeue four cards later, the way the original deck did — far enough that she
      // has to recall it rather than echo it.
      setDeck((d) => {
        const copy = d.slice();
        copy.splice(Math.min(pos + 4, copy.length), 0, card);
        return copy;
      });
    }
  }, [state, value, card, pos]);

  const restart = useCallback(() => {
    setDeck(shuffledDeck(kind, level, systemRng));
    setPos(0);
    setValue("");
    setState("asking");
    setMissed([]);
  }, [kind, level]);

  if (done) {
    return (
      <div className={styles.wrap}>
        <h3 className={styles.summaryTitle}>
          {missed.length === 0 ? "Every one, clean." : "Worth another look"}
        </h3>
        {missed.length > 0 ? (
          <ul className={styles.missList}>
            {missed.map((m) => (
              <li key={m.q}>
                <span className={styles.missQ}>
                  {m.q} = {m.a}
                </span>
                <span className={styles.missHook}>
                  <RichText rich={m.hook} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <button type="button" className="btn primary" onClick={restart}>
          Go again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.progress}>
        <i style={{ width: `${(pos / deck.length) * 100}%` }} />
      </div>

      <div className={styles.card}>
        <p className={styles.q}>{card.q}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            className={`${styles.answer} ${
              state === "right" ? styles.ok : state === "wrong" ? styles.bad : ""
            }`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={state !== "asking"}
            inputMode="numeric"
            autoComplete="off"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <button type="submit" className="btn primary">
            {state === "asking" ? "Check" : "Next"}
          </button>
        </form>
        {state === "wrong" ? (
          <p className={styles.hook}>
            <strong>{card.q} = {card.a}</strong> · <RichText rich={card.hook} />
          </p>
        ) : null}
      </div>
    </div>
  );
}
