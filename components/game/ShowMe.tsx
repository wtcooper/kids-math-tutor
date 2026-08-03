"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMOS } from "@/lib/games/demos";
import styles from "./ShowMe.module.css";

/**
 * "Show me" — a stepped walkthrough of one real session, in pictures.
 *
 * The how-to panel explains; this demonstrates. It exists because a play-tester read
 * the Machine Shop's whole panel and still had no idea what to do — a walkthrough of
 * an actual round, one sentence per picture, is what a kid can actually follow.
 *
 * Images are real captures of the game being played, at `/demos/<slug>/<n>.jpg`.
 */
export function ShowMe({ slug, title }: { slug: string; title: string }) {
  const steps = DEMOS[slug];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    setStep(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setStep((s) => Math.min(steps.length - 1, s + 1));
      else if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps]);

  if (!steps?.length) return null;

  const last = step === steps.length - 1;

  return (
    <>
      <button type="button" className={styles.btn} onClick={() => setOpen(true)}>
        Show me
      </button>

      {open ? (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label={`How a round of ${title} is played`}
        >
          <div className={styles.card}>
            <div className={styles.imgWrap}>
              {/* Plain img, not next/image: these are fixed-size local captures and the
                  stepper swaps them faster than the optimizer round-trip. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={step}
                className={styles.img}
                src={`/demos/${slug}/${step + 1}.jpg`}
                alt=""
              />
            </div>
            <p className={styles.caption}>
              <span className={styles.stepNo}>
                {step + 1} of {steps.length}
              </span>
              {steps[step]}
            </p>
            <div className={styles.controls}>
              <button
                type="button"
                className="btn sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                Back
              </button>
              <div className={styles.dots} aria-hidden>
                {steps.map((_, i) => (
                  <span key={i} className={i === step ? styles.dotOn : styles.dot} />
                ))}
              </div>
              {last ? (
                <button type="button" className="btn primary sm" onClick={close}>
                  Got it — let me play
                </button>
              ) : (
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
