"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMOS } from "@/lib/games/demos";
import styles from "./ShowMe.module.css";

/**
 * "Show me" — a stepped walkthrough of one real session, in pictures.
 *
 * Real captures of the game being played, one plain sentence per frame, advanced by a
 * Next button (an auto-playing version was tried and cut: for screenshots, self-pacing
 * beats a timer — kids click faster than they wait). It opens by itself on a game's
 * first visit and replaced the old wall-of-text rules panel outright; the captions
 * carry the rules now. Frames live at `/demos/<slug>/<n>.jpg` and are re-shot by
 * script whenever a game's look changes.
 */

function watchedKey(slug: string) {
  return `mathtable:watched:${slug}`;
}

export function ShowMe({ slug, title }: { slug: string; title: string }) {
  const steps = DEMOS[slug];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // First visit: the walkthrough opens itself, once.
  useEffect(() => {
    if (!steps?.length) return;
    try {
      if (!window.localStorage.getItem(watchedKey(slug))) setOpen(true);
    } catch {
      /* private mode — just don't auto-open */
    }
  }, [slug, steps]);

  // Preload every frame once open, so Next never shows a half-loaded image.
  useEffect(() => {
    if (!open || !steps) return;
    steps.forEach((_, i) => {
      const img = new Image();
      img.src = `/demos/${slug}/${i + 1}.jpg`;
    });
  }, [open, slug, steps]);

  const close = useCallback(() => {
    setOpen(false);
    setStep(0);
    try {
      window.localStorage.setItem(watchedKey(slug), "1");
    } catch {
      /* nothing to do */
    }
  }, [slug]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight" || e.key === "Enter")
        setStep((s) => Math.min((steps?.length ?? 1) - 1, s + 1));
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
          aria-label={`How to play ${title}, step by step`}
        >
          <div className={styles.card}>
            <div className={styles.screen}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={step} className={styles.img} src={`/demos/${slug}/${step + 1}.jpg`} alt="" />
              <button type="button" className={styles.skip} onClick={close} aria-label="Skip">
                Skip ✕
              </button>
            </div>

            <p key={`c${step}`} className={styles.caption}>
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
