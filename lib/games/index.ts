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
  /** The game itself. Two topics can share one game. */
  name: string;
  /** How the card is titled — Threading serves two topics, so they need telling apart. */
  cardName: string;
  /** Passed to the game so one implementation can serve several topics. */
  variant?: string;
}

export const GAMES: Readonly<Record<string, GameMeta>> = {
  "facts-mul": {
    id: "threading",
    name: "Threading",
    cardName: "Threading — times tables",
    variant: "mul",
  },
  "facts-div": {
    id: "threading",
    name: "Threading",
    cardName: "Threading — division facts",
    variant: "div",
  },
  factors: { id: "munchers", name: "Munchers", cardName: "Munchers" },
};

export function gameFor(topicId: string): GameMeta | undefined {
  return GAMES[topicId];
}
