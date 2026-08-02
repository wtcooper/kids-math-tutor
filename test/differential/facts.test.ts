/**
 * Differential test: the ported facts engine vs the original tutor.
 *
 * The original had four Playwright suites that found ten real bugs; they are not in this
 * repo. So the port's safety net is equivalence against the original implementation,
 * executed in node:vm by scripts/oracle.mjs.
 *
 * Only the mathematics is asserted. Rendering is *expected* to differ — that is the
 * entire point of the port.
 *
 * When docs/math-table.html is archived at cutover, these get skipped and the invariant
 * tests take over.
 */
import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs helper, no types
import { loadOracle } from "../../scripts/oracle.mjs";
import { FACT_LEVELS, card, fams, factHookHtml, deckFor } from "@/lib/math/facts";
import { richToText } from "@/lib/math/format";

const mt = loadOracle();
const oracleMul = mt.BY_ID["facts-mul"];
const oracleDiv = mt.BY_ID["facts-div"];

describe("facts: level tables", () => {
  it("exposes the same level names", () => {
    expect(FACT_LEVELS.map((l) => l.name)).toEqual(oracleMul.levels);
  });

  it("draws each level from the same times-tables", () => {
    for (let level = 1; level <= FACT_LEVELS.length; level++) {
      expect(fams(level)).toEqual(oracleMul.fams(level));
    }
  });
});

describe("facts: every card in every table matches the original", () => {
  // 11 families x 11 multipliers, both operations — exhaustive, not sampled.
  const families = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  it("multiplication", () => {
    for (const f of families) {
      for (let i = 2; i <= 12; i++) {
        const mine = card("mul", f, i);
        const theirs = oracleMul.card(f, i);
        expect({ q: mine.q, a: mine.a, fam: mine.fam, other: mine.other }).toEqual({
          q: theirs.q,
          a: theirs.a,
          fam: theirs.fam,
          other: theirs.other,
        });
        // The hook is the shared object across tutor and game, so it must be identical
        // text — not merely similar.
        expect(factHookHtml(f, i, f * i)).toBe(
          theirs.hook,
        );
      }
    }
  });

  it("division", () => {
    for (const f of families) {
      for (let i = 2; i <= 12; i++) {
        const mine = card("div", f, i);
        const theirs = oracleDiv.card(f, i);
        expect({ q: mine.q, a: mine.a, fam: mine.fam, other: mine.other }).toEqual({
          q: theirs.q,
          a: theirs.a,
          fam: theirs.fam,
          other: theirs.other,
        });
        // Division hooks wrap the multiplication hook, so compare the flattened text.
        expect(richToText(mine.hook)).toBe(stripTags(theirs.hook));
      }
    }
  });
});

describe("facts: decks", () => {
  it("builds the same cards a level's Learn mode walks through", () => {
    for (let level = 1; level <= FACT_LEVELS.length; level++) {
      const mine = deckFor("mul", level).map((c) => c.q);
      const theirs: string[] = [];
      for (const f of oracleMul.fams(level)) {
        for (let i = 2; i <= 12; i++) theirs.push(oracleMul.card(f, i).q);
      }
      expect(mine).toEqual(theirs);
    }
  });
});

function stripTags(s: string): string {
  return s.replace(/<\/?b>/g, "");
}
