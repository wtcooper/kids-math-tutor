/**
 * Which games exist, what each one teaches, and how it is routed.
 *
 * Kept deliberately free of any Phaser import — this is consumed by the landing page,
 * a Server Component. Importing the engine here is exactly how a 1.2MB dependency ends
 * up in the shared client chunk.
 *
 * `slug` and `impl` are separate on purpose. Crossing serves multiplication facts and
 * division facts from one implementation, and several games will teach `factors` — so
 * neither the route nor the topic can be the identity of a game.
 */

/** The component that gets dynamically imported. Several games may share one. */
export type GameImpl =
  | "crossing"
  | "munchers"
  | "split"
  | "enclosure"
  | "tiles"
  | "cut"
  | "beam"
  | "balance"
  | "machine";

export interface GameMeta {
  /** Route: /play/<slug>. Stable — it is what her bookmarks point at. */
  slug: string;
  impl: GameImpl;
  name: string;
  /** The tutor topic it teaches. Drives the level names and "Open in the tutor". */
  topicId: string;
  /** What the mechanic actually is, not what it drills. */
  blurb: string;
  /**
   * Which half of the open question in plan 02 this one serves. Shown as a chip so the
   * difference between "get faster" and "see why" is visible before she commits.
   */
  focus: "fluency" | "understanding";
  /** Lets one implementation serve several games. */
  variant?: string;
  /**
   * Level names, when the game's own levels are not the topic's.
   *
   * Most games reuse the tutor's level names on purpose, so "Sevens, eights & nines"
   * reads identically in both places. But a game that has to size its own problems —
   * Tiles cannot render the tutor's 999 × 9 — must not borrow labels that describe
   * something else, or the chip says "3 digits × 1 digit" over an 11 × 12 board.
   */
  levelNames?: readonly string[];
}

export const GAMES: readonly GameMeta[] = [
  {
    slug: "crossing-mul",
    impl: "crossing",
    name: "Crossing",
    topicId: "facts-mul",
    blurb:
      "Hop the river on drifting stones. Only the multiples hold your weight — the rest sink.",
    focus: "fluency",
    variant: "mul",
  },
  {
    slug: "crossing-div",
    impl: "crossing",
    name: "Crossing — division",
    topicId: "facts-div",
    blurb:
      "Same river, other question: a stone holds you only if its number divides the target exactly.",
    focus: "fluency",
    variant: "div",
  },
  {
    slug: "munchers",
    impl: "munchers",
    name: "Munchers",
    topicId: "factors",
    blurb: "Move around the grid and eat only the numbers that fit the rule.",
    focus: "fluency",
  },
  {
    slug: "split",
    impl: "split",
    name: "Split",
    topicId: "factors",
    blurb:
      "Shoot a rock and it breaks into two factors. Primes will not break — so you have to fly around what you made.",
    focus: "understanding",
  },
  {
    slug: "enclosure",
    impl: "enclosure",
    name: "Enclosure",
    topicId: "geometry",
    blurb:
      "Walk a fence around exactly the area asked for. The fence you spend is the perimeter.",
    focus: "understanding",
    levelNames: [
      "Small fields",
      "Watch the fence",
      "Bigger fields",
      "Tight fence",
    ],
  },
  {
    slug: "tiles",
    impl: "tiles",
    name: "Tiles",
    topicId: "mul",
    blurb:
      "Cover a rectangle with hundreds, strips and squares. The pile you use is the partial products.",
    focus: "understanding",
    levelNames: [
      "Teens × teens",
      "Up to 24 × 14",
      "Up to 24 × 24",
      "Up to 34 × 24",
    ],
  },
  {
    slug: "cut",
    impl: "cut",
    name: "Cut",
    topicId: "frac-equiv",
    blurb:
      "Slice a brick until the pieces fill the gap exactly. Same width of wall, different name.",
    focus: "understanding",
    levelNames: ["Halves & quarters", "Sixths & eighths", "Twelfths", "Sixteenths & more"],
  },
  {
    slug: "beam",
    impl: "beam",
    name: "Split the Beam",
    topicId: "frac-addsub",
    blurb:
      "One beam, several machines. Only one splitter setting can pay them all in whole strands.",
    focus: "understanding",
    levelNames: ["Two machines", "Trickier pairs", "Awkward pairs", "Three machines"],
  },
  {
    slug: "balance",
    impl: "balance",
    name: "Balance",
    topicId: "equations",
    blurb:
      "Take the same thing off both pans until one bag stands alone. Whatever balances it is x.",
    focus: "understanding",
    levelNames: ["x + a = b", "n bags", "n bags and stones", "Bags on both sides"],
  },
  {
    slug: "machine",
    impl: "machine",
    name: "The Machine Shop",
    topicId: "pemdas",
    blurb:
      "Fit operators into a machine until the outlet reads the order slip. The wiring is the precedence.",
    focus: "understanding",
    levelNames: [
      "One operator",
      "Two operators",
      "A hopper",
      "It must work for any n",
    ],
  },
];

export const GAME_BY_SLUG: Readonly<Record<string, GameMeta>> = Object.fromEntries(
  GAMES.map((g) => [g.slug, g]),
);

/** Every game that teaches a topic — the tutor shows these as Play buttons. */
export function gamesForTopic(topicId: string): GameMeta[] {
  return GAMES.filter((g) => g.topicId === topicId);
}
