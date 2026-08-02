"use client";

import dynamic from "next/dynamic";
import type { GameId } from "@/lib/games";

/**
 * Must be a Client Component: next/dynamic with `ssr: false` is not allowed in a Server
 * Component.
 *
 * The loaders are a static record of import thunks rather than a template string, so
 * Turbopack can statically analyse them and give each game its own chunk. Phaser (~1.2MB)
 * is reachable only from here, which keeps it out of the shared client bundle — hence the
 * rule that nothing in lib/ or any Server Component may import it.
 */

const Loading = () => (
  <div style={{ padding: 40, color: "var(--ink3)", textAlign: "center" }}>Loading…</div>
);

const LOADERS = {
  threading: dynamic(() => import("./_games/threading/Threading"), {
    ssr: false,
    loading: Loading,
  }),
  munchers: dynamic(() => import("./_games/munchers/Munchers"), {
    ssr: false,
    loading: Loading,
  }),
} satisfies Record<GameId, unknown>;

export function GameHost({
  gameId,
  variant,
  topicId,
  levels,
  initialLevel,
}: {
  gameId: GameId;
  variant: string;
  topicId: string;
  levels: readonly string[];
  initialLevel: number;
}) {
  const Game = LOADERS[gameId];
  return (
    <Game
      topicId={topicId}
      variant={variant}
      levels={levels}
      initialLevel={initialLevel}
    />
  );
}
