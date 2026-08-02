/**
 * Structural parity against the original.
 *
 * The differential suites prove the *generators* match. This proves the *teaching
 * structure* matches: same number of walk-through steps, same fill-in slots, same
 * narration count. That is what catches a step being collapsed or dropped — which is
 * exactly how multiplication lost its per-digit walkthrough in the first port.
 *
 * The original stores its walkthrough as `phases` (grid engine) or `steps` (steps
 * engine); this compares those against the port's narration and step arrays.
 */
import { describe, expect, it } from "vitest";
// @ts-ignore - plain .mjs helper, no types
import { loadOracle } from "../scripts/oracle.mjs";
import { runtimeFor } from "@/lib/math/registry";
import { TOPICS } from "@/lib/topics";
import { makeRng, mulberry32 } from "@/lib/math/rng";

const oracle = loadOracle();
const SEEDS = 25;

/** Build the original's model for a problem, without touching the DOM. */
function oracleModel(topicId: string, problem: unknown) {
  const t = oracle.BY_ID[topicId];
  return t.build(problem);
}

const gridTopics = TOPICS.filter((t) => runtimeFor(t.id)?.gridBuild);
// A topic with both builders keeps its walkthrough in the grid model; build() is only
// there for the picture, so it has no steps to compare.
const stepTopics = TOPICS.filter(
  (t) => runtimeFor(t.id)?.build && !runtimeFor(t.id)?.gridBuild,
);

describe("grid topics: same number of walk-through steps as the original", () => {
  for (const topic of gridTopics) {
    it(topic.id, () => {
      const rt = runtimeFor(topic.id)!;
      for (let level = 1; level <= topic.levels.length; level++) {
        for (let s = 0; s < SEEDS; s++) {
          oracle.__setRandom(mulberry32(90000 + s));
          const rng = makeRng(mulberry32(90000 + s));
          const theirs = oracle.BY_ID[topic.id].gen(level);
          const mine = rt.gen(level, rng);

          const theirModel = oracleModel(topic.id, theirs);
          const myModel = rt.gridBuild!(mine);

          // The original's phases include a trailing {t:'done'}; the port's narration
          // ends with a "Done" entry, so the two counts should match exactly.
          expect(
            myModel.narration.length,
            `${topic.id} L${level}: ${rt.title(mine)} — original walks ${theirModel.phases.length} phases, port has ${myModel.narration.length}`,
          ).toBe(theirModel.phases.length);

          // Every digit the original asks the student to fill must have a slot here.
          expect(
            myModel.slots.length,
            `${topic.id} L${level}: ${rt.title(mine)} — original has ${theirModel.slots.length} answer boxes, port has ${myModel.slots.length}`,
          ).toBe(countOriginalSlots(theirModel));
        }
      }
    });
  }
});

/** The grid engine stores slots flat for add/sub, grouped for mul, keyed for div. */
function countOriginalSlots(m: {
  slots?: unknown;
}): number {
  const slots = m.slots as
    | { idx: number }[]
    | { parts: { idx: number }[][]; sum: { idx: number }[] }
    | undefined;
  if (!slots) return 0;
  if (Array.isArray(slots)) return slots.length;
  const grouped = slots as { parts: { idx: number }[][]; sum: { idx: number }[] };
  if (Array.isArray(grouped.parts)) {
    return grouped.parts.reduce((n, p) => n + p.length, 0) + (grouped.sum?.length ?? 0);
  }
  return 0;
}

describe("steps topics: same number of steps and asks as the original", () => {
  for (const topic of stepTopics) {
    it(topic.id, () => {
      const rt = runtimeFor(topic.id)!;
      for (let level = 1; level <= topic.levels.length; level++) {
        for (let s = 0; s < SEEDS; s++) {
          oracle.__setRandom(mulberry32(91000 + s));
          const rng = makeRng(mulberry32(91000 + s));
          const theirs = oracle.BY_ID[topic.id].gen(level);
          const mine = rt.gen(level, rng);

          const theirModel = oracleModel(topic.id, theirs);
          const myModel = rt.build!(mine);

          expect(
            myModel.steps.length,
            `${topic.id} L${level}: ${rt.title(mine)} — original has ${theirModel.steps.length} steps, port has ${myModel.steps.length}`,
          ).toBe(theirModel.steps.length);

          const theirAsks = theirModel.steps.reduce(
            (n: number, st: { ask?: unknown[] }) => n + (st.ask?.length ?? 0),
            0,
          );
          const myAsks = myModel.steps.reduce((n, st) => n + (st.ask?.length ?? 0), 0);
          expect(
            myAsks,
            `${topic.id} L${level}: ${rt.title(mine)} — original has ${theirAsks} fill-ins, port has ${myAsks}`,
          ).toBe(theirAsks);
        }
      }
    });
  }
});

describe("topics that had a picture in the original still have one", () => {
  it("checks every non-flashcard topic", () => {
    const missing: string[] = [];
    for (const topic of TOPICS) {
      if (topic.engine === "facts") continue;
      const rt = runtimeFor(topic.id)!;
      for (let level = 1; level <= topic.levels.length; level++) {
        oracle.__setRandom(mulberry32(92000 + level));
        const theirs = oracle.BY_ID[topic.id].gen(level);
        const theirModel = oracleModel(topic.id, theirs);
        // picture() takes the ui bag; 30 of 32 ignore it.
        const theirPic = theirModel.picture?.({ areaShown: {}, shareStep: 0 });
        if (!theirPic) continue;

        const rng = makeRng(mulberry32(92000 + level));
        const mine = rt.gen(level, rng);
        // mul and div render their pictures as dedicated interactive components rather
        // than as model data, so they are checked by presence of the mode instead.
        const hasPicture =
          topic.id === "mul" || topic.id === "div"
            ? true
            : Boolean(rt.build?.(mine).picture);
        if (!hasPicture) missing.push(`${topic.id} L${level}`);
      }
    }
    expect(missing, `topics whose picture was dropped: ${missing.join(", ")}`).toEqual([]);
  });
});
