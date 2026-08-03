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
  | "machine"
  | "bakery"
  | "build";

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
   * The maths, named. Shown on the card and in the how-to.
   *
   * A blurb that only describes the mechanic ("cover a rectangle with tiles") reads as a
   * shape puzzle, and a kid has no way to know what they are practising. Every game says
   * its concept in a sentence, in the notation they will meet it in.
   */
  concept: string;
  /**
   * Which half of the open question in plan 02 this one serves. Shown as a chip so the
   * difference between "get faster" and "see why" is visible before she commits.
   */
  focus: "fluency" | "understanding";
  /**
   * The practice area in one glance: broad domain, then the specific skill. Always
   * visible at the top of the game page — the concept sentence explains, this names.
   */
  practises: string;
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
      "Hop the river by stepping the times table in order. Other multiples are there to tempt you.",
    concept:
      "Skip counting through a times table in order — 3, 6, 9, 12. Knowing a number is a multiple is not enough; you need the one that comes next.",
    focus: "fluency",
    practises: "Multiplication — times tables, skip counting in order",
    variant: "mul",
  },
  {
    slug: "crossing-div",
    impl: "crossing",
    name: "Crossing — division",
    topicId: "facts-div",
    blurb:
      "Same river, other question: step the factors of the target in order, smallest first.",
    concept:
      "Listing what divides a number, smallest first — the question behind every division fact: does this go in exactly?",
    focus: "fluency",
    practises: "Division — the factors of a number, smallest first",
    variant: "div",
  },
  {
    slug: "munchers",
    impl: "munchers",
    name: "Munchers",
    topicId: "factors",
    blurb: "Move around the grid and eat only the numbers that fit the rule.",
    concept:
      "Factors, multiples, primes, and the greatest common factor of two numbers.",
    focus: "fluency",
    practises: "Multiplication & division — factors, multiples, primes, GCF",
  },
  {
    slug: "split",
    impl: "split",
    name: "Split",
    topicId: "factors",
    blurb:
      "Shoot a rock and say how it shatters into equal rocks — 12 into three 4s, then each 4 into two 2s. Primes will not break, so you have to fly around what you made.",
    concept:
      "Factors and primes by sharing: every break is a division that comes out exact — 12 ÷ 3 = 4, so 12 is three 4s — down until only primes are left.",
    focus: "understanding",
    practises: "Division & primes — breaking a number into equal parts",
  },
  {
    slug: "enclosure",
    impl: "enclosure",
    name: "Enclosure",
    topicId: "geometry",
    blurb:
      "Walk a fence around exactly the area asked for. The fence you spend is the perimeter.",
    concept:
      "Area against perimeter: the squares inside versus the distance around, and why 12 squares can cost 14 fence or 26.",
    focus: "understanding",
    practises: "Geometry — area and perimeter",
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
      "Cut a rectangle in two directions, then work out the area of each piece. The four pieces are the answer.",
    concept:
      "The distributive property. 23 × 14 = (20 + 3) × (10 + 4) = 200 + 80 + 30 + 12 — you work out each part yourself.",
    focus: "understanding",
    practises: "Multiplication — multi-digit, the distributive property",
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
    concept:
      "Equivalent fractions and simplifying: 3/4 = 6/8 = 9/12, all the same width of wall.",
    focus: "understanding",
    practises: "Fractions — equivalent fractions and simplifying",
    levelNames: ["Halves & quarters", "Sixths & eighths", "Twelfths", "Sixteenths & more"],
  },
  {
    slug: "beam",
    impl: "beam",
    name: "Split the Beam",
    topicId: "frac-addsub",
    blurb:
      "One beam, several machines. Only one splitter setting can pay them all in whole strands.",
    concept:
      "Adding fractions with different denominators — 1/4 + 2/3 needs twelfths before it can be added at all.",
    focus: "understanding",
    practises: "Fractions — adding with unlike denominators",
    levelNames: ["Two machines", "Trickier pairs", "Awkward pairs", "Three machines"],
  },
  {
    slug: "balance",
    impl: "balance",
    name: "Balance",
    topicId: "equations",
    blurb:
      "Take the same thing off both pans until one bag stands alone. Whatever balances it is x.",
    concept:
      "Solving equations: 4x + 5 = 3x + 13, by doing the same thing to both sides until x is alone.",
    focus: "understanding",
    practises: "Algebra — solving equations for x",
    levelNames: ["x + a = b", "n bags", "n bags and stones", "Bags on both sides"],
  },
  {
    slug: "machine",
    impl: "machine",
    name: "The Machine Shop",
    topicId: "pemdas",
    blurb:
      "Fit operators into a machine until the outlet reads the order slip. The wiring is the precedence.",
    concept:
      "Order of operations, then variables — an expression that has to give the right answer for every n, not just one.",
    focus: "understanding",
    practises: "Arithmetic — order of operations, then variables",
    levelNames: [
      "One operator",
      "Two operators",
      "A hopper",
      "It must work for any n",
    ],
  },
  {
    slug: "bakery",
    impl: "bakery",
    name: "The Bakery",
    topicId: "percent",
    blurb:
      "Buy flour, bake, set a price. Nothing is marked right — the till just tells you how the day went.",
    concept:
      "Unit rates (price per pound), percent markup, and percent off.",
    focus: "understanding",
    practises: "Percents & division — unit rates, markup, discounts",
    levelNames: ["Two sacks", "More markups", "Three sacks", "Tight margins"],
  },
  {
    slug: "build",
    impl: "build",
    name: "Build World",
    topicId: "geometry",
    blurb:
      "Build the commission — an exact floor, an exact number of blocks, or a plan scaled up.",
    concept:
      "Area, volume and scale: floor area, blocks in a box, and a plan enlarged by a ratio.",
    focus: "understanding",
    practises: "Geometry — area, volume and scale",
    levelNames: ["Floors", "Silos", "Anything goes", "Tight commissions"],
  },
];

export const GAME_BY_SLUG: Readonly<Record<string, GameMeta>> = Object.fromEntries(
  GAMES.map((g) => [g.slug, g]),
);

/** Every game that teaches a topic — the tutor shows these as Play buttons. */
export function gamesForTopic(topicId: string): GameMeta[] {
  return GAMES.filter((g) => g.topicId === topicId);
}
