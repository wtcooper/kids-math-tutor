/**
 * Whole-tutor integrity sweep.
 *
 * Builds every model for every topic × level over many seeds and asserts it is
 * well-formed. This is the test that outlives the oracle: the differential suites prove
 * the port matches the original, this proves the port is coherent on its own.
 *
 * It encodes the *shapes* of bugs BUILD-NOTES records rather than their instances —
 * which is exactly why the original's equivalents kept finding more.
 */
import { describe, expect, it } from "vitest";
import { runtimeFor } from "@/lib/math/registry";
import { TOPICS } from "@/lib/topics";
import { ABOUT } from "@/lib/topics.about";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import { deckFor } from "@/lib/math/facts";

const SAMPLES = 40;
const nonFacts = TOPICS.filter((t) => t.engine !== "facts");

describe("every topic is wired up", () => {
  it("has a runtime, a blurb, and levels", () => {
    for (const topic of TOPICS) {
      expect(topic.levels.length, topic.id).toBeGreaterThan(0);
      expect(ABOUT[topic.id], `${topic.id} blurb`).toBeTruthy();
      if (topic.engine !== "facts") {
        expect(runtimeFor(topic.id), `${topic.id} runtime`).toBeDefined();
      }
    }
  });

  it("every non-flashcard topic can drive Watch it and You try", () => {
    for (const topic of nonFacts) {
      const rt = runtimeFor(topic.id)!;
      expect(
        Boolean(rt.build || rt.gridBuild),
        `${topic.id} has no step model`,
      ).toBe(true);
    }
  });
});

describe("flashcard decks are complete", () => {
  it("every card in every level has a question, answer and hook", () => {
    for (const topic of TOPICS.filter((t) => t.engine === "facts")) {
      const kind = topic.id === "facts-div" ? "div" : "mul";
      for (let lvl = 1; lvl <= topic.levels.length; lvl++) {
        const deck = deckFor(kind, lvl);
        expect(deck.length, `${topic.id} L${lvl}`).toBeGreaterThan(0);
        for (const c of deck) {
          expect(c.q, `${topic.id} L${lvl}`).toBeTruthy();
          expect(c.a, `${topic.id} L${lvl} ${c.q}`).toBeTruthy();
          expect(c.hook.length, `${topic.id} L${lvl} ${c.q} hook`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("the answer the tutor shows is one it would accept", () => {
  it("holds for every single-field topic at every level", () => {
    for (const topic of nonFacts) {
      const rt = runtimeFor(topic.id)!;
      if (rt.fields.length !== 1) continue;
      for (let lvl = 1; lvl <= topic.levels.length; lvl++) {
        const rng = makeRng(mulberry32(3000 + lvl));
        for (let i = 0; i < SAMPLES; i++) {
          const p = rt.gen(lvl, rng);
          const shown = rt.answer(p);
          expect(
            rt.check(p, { [rt.fields[0].key]: shown }),
            `${topic.id} L${lvl}: shows "${shown}" for ${rt.title(p)} but rejects it`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("step models are complete and never leak an undefined", () => {
  it("every step has a label, narration, something to show, and valid asks", () => {
    for (const topic of nonFacts) {
      const rt = runtimeFor(topic.id)!;
      if (!rt.build) continue;
      for (let lvl = 1; lvl <= topic.levels.length; lvl++) {
        const rng = makeRng(mulberry32(4000 + lvl));
        for (let i = 0; i < SAMPLES; i++) {
          const p = rt.gen(lvl, rng);
          const tag = `${topic.id} L${lvl} — ${rt.title(p)}`;
          const m = rt.build(p);

          expect(m.steps.length, tag).toBeGreaterThan(0);
          expect(m.answerText, tag).toBeTruthy();
          expect(m.title, tag).toBeTruthy();

          m.steps.forEach((s, si) => {
            expect(s.label, `${tag} step ${si}`).toBeTruthy();
            expect(s.say.length, `${tag} step ${si} narration`).toBeGreaterThan(0);
            expect(s.show.length, `${tag} step ${si} shows nothing`).toBeGreaterThan(0);
            for (const a of s.ask ?? []) {
              expect(
                ["", "undefined", "NaN", "null"],
                `${tag} step ${si} expects "${a.expect}"`,
              ).not.toContain(String(a.expect));
            }
          });

          if (m.picture) {
            expect(m.picture.body.length, `${tag} picture`).toBeGreaterThan(0);
            expect(m.picture.title, `${tag} picture title`).toBeTruthy();
          }
        }
      }
    }
  });

  it("no rendered text contains a stray undefined or NaN", () => {
    for (const topic of nonFacts) {
      const rt = runtimeFor(topic.id)!;
      if (!rt.build) continue;
      for (let lvl = 1; lvl <= topic.levels.length; lvl++) {
        const rng = makeRng(mulberry32(4500 + lvl));
        for (let i = 0; i < SAMPLES; i++) {
          const p = rt.gen(lvl, rng);
          const blob = JSON.stringify(rt.build(p));
          expect(blob, `${topic.id} L${lvl} — ${rt.title(p)}`).not.toMatch(
            /undefined|NaN|\[object Object\]/,
          );
        }
      }
    }
  });
});

describe("grid models are complete", () => {
  it("every column topic yields narration, slots and an answer", () => {
    for (const topic of nonFacts) {
      const rt = runtimeFor(topic.id)!;
      if (!rt.gridBuild) continue;
      for (let lvl = 1; lvl <= topic.levels.length; lvl++) {
        const rng = makeRng(mulberry32(5000 + lvl));
        for (let i = 0; i < SAMPLES; i++) {
          const p = rt.gen(lvl, rng);
          const tag = `${topic.id} L${lvl} — ${rt.title(p)}`;
          const m = rt.gridBuild(p);

          expect(m.narration.length, tag).toBeGreaterThan(0);
          expect(m.slots.length, `${tag} has no answer boxes`).toBeGreaterThan(0);
          expect(m.answerText, tag).toBeTruthy();

          for (const s of m.slots) {
            expect(["", "undefined", "NaN"], `${tag} slot`).not.toContain(s.expect);
          }
          // Filling every slot with its expected value must spell the answer.
          for (const n of m.narration) {
            expect(n.label, `${tag} narration label`).toBeTruthy();
            expect(n.main, `${tag} narration body`).toBeTruthy();
          }
        }
      }
    }
  });

  it("every Watch it step changes something", () => {
    // The bug that produced the original's whole step-integrity suite: addition revealed
    // the leading carry a step early, so one step altered nothing (BUILD-NOTES issue 6).
    for (const topic of nonFacts) {
      const rt = runtimeFor(topic.id)!;
      if (!rt.gridBuild) continue;
      for (let lvl = 1; lvl <= topic.levels.length; lvl++) {
        const rng = makeRng(mulberry32(6000 + lvl));
        for (let i = 0; i < SAMPLES; i++) {
          const p = rt.gen(lvl, rng);
          const m = rt.gridBuild(p);
          if (m.kind === "div") continue;

          const visibleAt = (reveal: number) =>
            JSON.stringify(
              m.rows.map((r) =>
                r.cells.filter((c) => c.from === undefined || c.from < reveal).map((c) => `${c.col}:${c.text}`),
              ),
            );
          for (let step = 1; step < m.narration.length - 1; step++) {
            expect(
              visibleAt(step + 1),
              `${topic.id} L${lvl} step ${step} changed nothing — ${rt.title(p)}`,
            ).not.toBe(visibleAt(step));
          }
        }
      }
    }
  });
});
