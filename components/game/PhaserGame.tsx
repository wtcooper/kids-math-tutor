"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import styles from "./PhaserGame.module.css";

/**
 * Canvas lifecycle for every game.
 *
 * Five things here are not cosmetic:
 *
 * 1. `cancelled` — React 19 StrictMode double-invokes effects in dev, and the first
 *    cleanup runs *before* `await import("phaser")` resolves. Without the flag you get
 *    two Phaser.Games, two canvases, doubled input and two RAF loops. This is the
 *    Phaser-in-React bug.
 * 2. Pre-boot destroy — `destroy()` defers to the end of the current game step, so
 *    calling it before boot completes leaves an orphaned RAF loop burning CPU against a
 *    detached canvas. Defer to the `ready` event.
 * 3. Empty deps — the game is never recreated on prop change; changes go through the bus.
 * 4. A per-mount emitter passed via `game.registry`, not a module-level singleton. The
 *    official phaserjs/template-nextjs exports a module-scope EventBus; here that would
 *    leak listeners across mounts and route changes, which means duplicate database
 *    writes.
 * 5. No React children inside the host div — Phaser appends the canvas there, so the HUD
 *    must be a sibling or reconciliation fights the engine.
 */

export type GameEvent =
  | { type: "attempt"; prompt: unknown; response: unknown; elapsedMs: number }
  /** Live board state for the HUD — score, what is left. Never persisted. */
  | { type: "state"; payload: unknown }
  | { type: "round:complete"; payload: unknown }
  | { type: "session:end" };

export interface GameBus {
  emit(event: GameEvent): void;
  /** Host → game. Returns an unsubscribe. */
  onCommand(fn: (cmd: GameCommand) => void): () => void;
  send(cmd: GameCommand): void;
}

export type GameCommand =
  | { type: "level:set"; level: number }
  | { type: "pause" }
  | { type: "resume" }
  /** Board-editing games put their undo and reset in the HTML chrome, not the canvas. */
  | { type: "undo" }
  | { type: "reset" }
  | { type: "next" };

function makeBus(onEvent: (e: GameEvent) => void): GameBus {
  const listeners = new Set<(cmd: GameCommand) => void>();
  return {
    emit: onEvent,
    onCommand(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    send(cmd) {
      listeners.forEach((fn) => fn(cmd));
    },
  };
}

type HostWithGame = HTMLDivElement & { __phaserGame?: Phaser.Game };

export interface PhaserGameProps {
  /** Built lazily so the Phaser module is only imported inside the effect. */
  createScenes: (phaser: typeof Phaser) => Phaser.Types.Scenes.SceneType[];
  onEvent: (e: GameEvent) => void;
  busRef?: React.MutableRefObject<GameBus | null>;
}

export const DESIGN_WIDTH = 1024;
export const DESIGN_HEIGHT = 576;

export function PhaserGame({ createScenes, onEvent, busRef }: PhaserGameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  // Kept in a ref so the effect can stay dependency-free without going stale.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let cancelled = false;
    const bus = makeBus((e) => onEventRef.current(e));
    if (busRef) busRef.current = bus;

    void (async () => {
      const PhaserMod = (await import("phaser")).default;
      if (cancelled || !hostRef.current || gameRef.current) return;

      const game = new PhaserMod.Game({
        type: PhaserMod.AUTO,
        parent: hostRef.current,
        backgroundColor: "#FAF6EF",
        scale: {
          mode: PhaserMod.Scale.FIT,
          autoCenter: PhaserMod.Scale.CENTER_BOTH,
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
        },
        scene: createScenes(PhaserMod),
      });

      game.registry.set("bus", bus);
      gameRef.current = game;
      // Automation seam. A canvas has no DOM to query, so without a handle on the running
      // game there is no way to test a game's *rules* in a browser — only to take
      // screenshots and guess. Hung off the host element rather than `window` so it
      // cannot collide with anything and dies with the component.
      (hostRef.current as HostWithGame).__phaserGame = game;
    })();

    return () => {
      cancelled = true;
      if (busRef) busRef.current = null;
      if (hostRef.current) delete (hostRef.current as HostWithGame).__phaserGame;
      const g = gameRef.current;
      gameRef.current = null;
      if (!g) return;
      if (g.isBooted) g.destroy(true);
      else g.events.once("ready", () => g.destroy(true));
    };
    // Intentionally empty: recreating the game on prop change would restart play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className={styles.host} data-phaser-host="" />;
}
