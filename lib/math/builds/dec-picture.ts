/**
 * "Picture it" for adding and subtracting decimals.
 *
 * Ported from docs/math-table.html:2223-2229. This is the only grid topic whose picture
 * is pure explanation rather than an interactive widget — it shows the aligned columns
 * and says, in words, what goes wrong when you line up the right-hand edges instead.
 *
 * It has no steps: the walkthrough lives in the grid model. StepsWorkspace renders the
 * picture only, and TutorApp routes the other modes to the grid.
 */

import { parseRich, text } from "../format";
import { decPlaces, trimNum } from "../number";
import type { StepsModel } from "../types";
import type { DecProblem } from "../topics/dec-addsub";

export function buildDecAddSubPicture(p: DecProblem): StepsModel {
  const { a, b, op } = p;
  const dp = Math.max(decPlaces(a), decPlaces(b), 1);
  const Bs = b.toFixed(dp);
  const ansNum = op === "+" ? a + b : a - b;
  const estimate =
    op === "+" ? Math.round(a) + Math.round(b) : Math.round(a) - Math.round(b);

  return {
    kind: "steps",
    title: `${trimNum(a)} ${op === "+" ? "+" : "−"} ${trimNum(b)}`,
    answerText: trimNum(Math.round(ansNum * 1e6) / 1e6),
    // Deliberately empty: the step-by-step for this topic is the column grid, and the
    // tutor only ever asks this model for its picture.
    steps: [],
    picture: {
      title: "Why lining up the points matters",
      sub: text("Digits only add together if they mean the same thing."),
      body: [
        {
          t: "note",
          body: parseRich(
            `<b>What went wrong when it goes wrong:</b> lining up the right-hand edges instead of the points. Written that way you end up adding tenths to hundredths, which is like adding dimes to pennies and calling them the same. Padding with zeros (writing ${trimNum(b)} as ${Bs}) makes both numbers the same shape so every column matches.`,
          ),
        },
        {
          t: "note",
          body: parseRich(
            `<b>Estimate first:</b> about ${Math.round(a)} ${op === "+" ? "+" : "−"} ${Math.round(b)} ≈ ${estimate}. If your answer is ten times off, a misplaced point is almost always the reason.`,
          ),
        },
      ],
    },
  };
}
