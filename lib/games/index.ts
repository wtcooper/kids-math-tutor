/**
 * Which topics have a game, and which game.
 *
 * Kept deliberately free of any Phaser import — this is consumed by the landing page,
 * a Server Component. Importing the engine here is exactly how a 1.2MB dependency ends
 * up in the shared client chunk.
 */

export type GameId = "threading" | "munchers";

export interface GameMeta {
  id: GameId;
  name: string;
  /** Passed to the game so one implementation can serve several topics. */
  variant?: string;
}

export const GAMES: Readonly<Record<string, GameMeta>> = {
  "facts-mul": { id: "threading", name: "Threading", variant: "mul" },
  "facts-div": { id: "threading", name: "Threading", variant: "div" },
  factors: { id: "munchers", name: "Munchers" },
};

export function gameFor(topicId: string): GameMeta | undefined {
  return GAMES[topicId];
}
