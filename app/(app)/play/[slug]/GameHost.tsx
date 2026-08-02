"use client";

import dynamic from "next/dynamic";
import type { GameImpl } from "@/lib/games";

/**
 * Must be a Client Component: next/dynamic with `ssr: false` is not allowed in a Server
 * Component.
 *
 * The loaders are a static record of import thunks rather than a template string, so
 * Turbopack can statically analyse them and give each game its own chunk. Phaser (~1.2MB)
 * is reachable only from the arcade entries, which keeps it out of the shared client
 * bundle — hence the rule that nothing in lib/ or any Server Component may import it.
 * The puzzle games pull in no engine at all, so they must never import from an arcade
 * game's folder.
 */

const Loading = () => (
  <div style={{ padding: 40, color: "var(--ink3)", textAlign: "center" }}>Loading…</div>
);

const LOADERS = {
  crossing: dynamic(() => import("./_games/crossing/Crossing"), {
    ssr: false,
    loading: Loading,
  }),
  munchers: dynamic(() => import("./_games/munchers/Munchers"), {
    ssr: false,
    loading: Loading,
  }),
  split: dynamic(() => import("./_games/split/Split"), { ssr: false, loading: Loading }),
  enclosure: dynamic(() => import("./_games/enclosure/Enclosure"), {
    ssr: false,
    loading: Loading,
  }),
  tiles: dynamic(() => import("./_games/tiles/Tiles"), { ssr: false, loading: Loading }),
  cut: dynamic(() => import("./_games/cut/Cut"), { ssr: false, loading: Loading }),
  beam: dynamic(() => import("./_games/beam/Beam"), { ssr: false, loading: Loading }),
  balance: dynamic(() => import("./_games/balance/Balance"), {
    ssr: false,
    loading: Loading,
  }),
  machine: dynamic(() => import("./_games/machine/Machine"), {
    ssr: false,
    loading: Loading,
  }),
  bakery: dynamic(() => import("./_games/bakery/Bakery"), {
    ssr: false,
    loading: Loading,
  }),
  build: dynamic(() => import("./_games/build/BuildWorld"), {
    ssr: false,
    loading: Loading,
  }),
} satisfies Record<GameImpl, unknown>;

/** Every game component takes exactly this. */
export interface GameProps {
  /** Route slug — what attempts are recorded against. */
  slug: string;
  topicId: string;
  name: string;
  variant: string;
  levels: readonly string[];
  initialLevel: number;
  /** Seeds the first board so server and client agree. */
  seed: number;
}

export function GameHost({ impl, ...props }: GameProps & { impl: GameImpl }) {
  const Game = LOADERS[impl];
  return <Game {...props} />;
}
