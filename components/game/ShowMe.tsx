"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMOS } from "@/lib/games/demos";
import styles from "./ShowMe.module.css";

/**
 * "Watch how to play" — the walkthrough as a little video.
 *
 * Kids don't read the how-to panel; they press play. So the first thing a game shows a
 * new player is this: real captures of a session, auto-advancing with one narrated line
 * per shot, a big ▶ to start and a progress bar across the bottom. It opens by itself
 * on a game's first visit (replacing the old wall-of-text panel, which stays available
 * behind the "How to play" button for reference) and never auto-opens again.
 *
 * It is a slideshow wearing a video's clothes on purpose: the frames are re-capturable
 * screenshots, so when a game's look changes the "video" can be re-shot by script
 * rather than re-edited by hand.
 */

function watchedKey(slug: string) {
  return `mathtable:watched:${slug}`;
}

/** Long enough to read the line aloud, never shorter than a beat. */
function stepMs(caption: string) {
  return Math.max(3800, 2200 + caption.length * 55);
}

export function ShowMe({ slug, title }: { slug: string; title: string }) {
  const steps = DEMOS[slug];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  /** Cover → playing → finished; the cover is the poster frame with the big ▶. */
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // First visit: the video opens itself, sitting on its poster frame.
  useEffect(() => {
    if (!steps?.length) return;
    try {
      if (!window.localStorage.getItem(watchedKey(slug))) setOpen(true);
    } catch {
      /* private mode — just don't auto-open */
    }
  }, [slug, steps]);

  // Preload every frame once open, so playback never shows a half-loaded image.
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
    setPlaying(false);
    setStarted(false);
    setFinished(false);
    try {
      window.localStorage.setItem(watchedKey(slug), "1");
    } catch {
      /* nothing to do */
    }
  }, [slug]);

  const play = useCallback(() => {
    setStarted(true);
    setFinished(false);
    setPlaying(true);
  }, []);

  const replay = useCallback(() => {
    setStep(0);
    setFinished(false);
    setPlaying(true);
  }, []);

  // The projector: while playing, advance on a per-caption clock.
  useEffect(() => {
    if (!open || !playing || !steps) return;
    timer.current = setTimeout(() => {
      if (step < steps.length - 1) {
        setStep(step + 1);
      } else {
        setPlaying(false);
        setFinished(true);
      }
    }, stepMs(steps[step]));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, playing, step, steps]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === " ") {
        e.preventDefault();
        if (!started) play();
        else setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        setPlaying(false);
        setStep((s) => Math.min((steps?.length ?? 1) - 1, s + 1));
      } else if (e.key === "ArrowLeft") {
        setPlaying(false);
        setStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, started, play, steps]);

  if (!steps?.length) return null;

  return (
    <>
      <button type="button" className={styles.btn} onClick={() => setOpen(true)}>
        <span aria-hidden className={styles.btnPlay}>▶</span> Watch how to play
      </button>

      {open ? (
        <div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label={`How to play ${title}, as a walkthrough`}
        >
          <div className={styles.card}>
            <div className={styles.screen}>
              {/* key restarts the slow zoom so every frame drifts like footage. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={step}
                className={`${styles.img} ${playing ? styles.imgLive : ""}`}
                src={`/demos/${slug}/${step + 1}.jpg`}
                alt=""
              />

              {!started ? (
                <button type="button" className={styles.cover} onClick={play}>
                  <span className={styles.coverPlay} aria-hidden>▶</span>
                  <span className={styles.coverTitle}>Watch how to play</span>
                  <span className={styles.coverSub}>about half a minute</span>
                </button>
              ) : null}

              {finished ? (
                <div className={styles.endCard}>
                  <button type="button" className="btn primary" onClick={close}>
                    Let me play
                  </button>
                  <button type="button" className={`btn ${styles.endGhost}`} onClick={replay}>
                    ▶ Watch again
                  </button>
                </div>
              ) : null}

              <button type="button" className={styles.skip} onClick={close} aria-label="Skip">
                Skip ✕
              </button>
            </div>

            {/* One narrated line per frame, restated fresh so it fades in with the shot. */}
            <p key={`c${step}`} className={styles.caption}>
              {started ? steps[step] : " "}
            </p>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.playPause}
                onClick={() => (!started ? play() : setPlaying((p) => !p))}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <div className={styles.track} aria-hidden>
                {steps.map((s, i) => (
                  <span key={i} className={styles.seg}>
                    <span
                      className={
                        i < step
                          ? styles.segDone
                          : i === step && playing
                            ? styles.segLive
                            : i === step && started
                              ? styles.segDone
                              : styles.segTodo
                      }
                      style={
                        i === step && playing
                          ? { animationDuration: `${stepMs(s)}ms` }
                          : undefined
                      }
                    />
                  </span>
                ))}
              </div>
              <span className={styles.count}>
                {started ? `${step + 1} / ${steps.length}` : `${steps.length} steps`}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
