/**
 * The Beast Book — a collection that grows out of practice, across every game.
 *
 * Each mathematical family has a creature. Playing ANY game feeds the creature of that
 * game's topic: attempts become care points, care points hatch the egg and grow the
 * beast through its stages. No game mechanics change anywhere — this is pure
 * persistence-shaped motivation ("building beats scoring", plan 02), aimed straight at
 * the nine-year-old.
 *
 * Points count attempts, not correct answers, on purpose: the book rewards showing up
 * and trying, never punishes being wrong, and cannot be gamed faster than practising.
 *
 * Storage is localStorage for now (same as the Depths save). Stage changes raise a
 * `beast:stage` CustomEvent so the chrome can toast "your egg hatched!" wherever she is.
 */

export interface BeastSpec {
  family: string;
  name: string;
  /** What feeding it means, in kid words. */
  diet: string;
  /** Base hue for the drawn creature. */
  hue: string;
  topicIds: readonly string[];
}

export const BEASTS: readonly BeastSpec[] = [
  {
    family: "tally-fox",
    name: "Tally Fox",
    diet: "times tables and division facts",
    hue: "#D98E5F",
    topicIds: ["facts-mul", "facts-div"],
  },
  {
    family: "prime-beetle",
    name: "Prime Beetle",
    diet: "factors, multiples and primes",
    hue: "#A97FD6",
    topicIds: ["factors"],
  },
  {
    family: "brick-tortoise",
    name: "Brick Tortoise",
    diet: "area, perimeter and volume",
    hue: "#6D8E68",
    topicIds: ["geometry"],
  },
  {
    family: "gear-owl",
    name: "Gear Owl",
    diet: "long multiplication and order of operations",
    hue: "#5B7C99",
    topicIds: ["mul", "pemdas"],
  },
  {
    family: "half-newt",
    name: "Half-Newt",
    diet: "fractions of every kind",
    hue: "#6FC3E8",
    topicIds: ["frac-equiv", "frac-addsub"],
  },
  {
    family: "balance-dragon",
    name: "Balance Dragon",
    diet: "equations and percents",
    hue: "#C4452F",
    topicIds: ["equations", "percent"],
  },
];

export const STAGES = ["egg", "hatchling", "grown", "elder"] as const;
export type Stage = (typeof STAGES)[number];

/** Care points needed to REACH each stage. The egg is found on the very first point. */
export const STAGE_AT: Record<Stage, number> = {
  egg: 1,
  hatchling: 25,
  grown: 90,
  elder: 200,
};

export function stageFor(points: number): Stage | null {
  if (points >= STAGE_AT.elder) return "elder";
  if (points >= STAGE_AT.grown) return "grown";
  if (points >= STAGE_AT.hatchling) return "hatchling";
  if (points >= STAGE_AT.egg) return "egg";
  return null;
}

/** Points still needed for the next stage, or null at the top. */
export function nextStageAt(points: number): { stage: Stage; at: number } | null {
  for (const stage of STAGES) {
    if (points < STAGE_AT[stage]) return { stage, at: STAGE_AT[stage] };
  }
  return null;
}

export function beastForTopic(topicId: string): BeastSpec | undefined {
  return BEASTS.find((b) => b.topicIds.includes(topicId));
}

const STORE_KEY = "mathtable:beasts:v1";

export type BeastPoints = Record<string, number>;

export function loadBeasts(): BeastPoints {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as BeastPoints;
  } catch {
    /* fresh book */
  }
  return {};
}

/**
 * Feed the creature of a topic. Fires `beast:stage` on a stage change so whatever page
 * she is on can celebrate it. Safe to call anywhere; no-ops server-side.
 */
export function feedBeast(topicId: string, points = 1): void {
  if (typeof window === "undefined") return;
  const beast = beastForTopic(topicId);
  if (!beast) return;
  try {
    const store = loadBeasts();
    const before = store[beast.family] ?? 0;
    const after = before + points;
    store[beast.family] = after;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    const was = stageFor(before);
    const now = stageFor(after);
    if (was !== now && now) {
      window.dispatchEvent(
        new CustomEvent("beast:stage", { detail: { family: beast.family, name: beast.name, stage: now } }),
      );
    }
  } catch {
    /* the practice still counts even if the book can't be written */
  }
}
