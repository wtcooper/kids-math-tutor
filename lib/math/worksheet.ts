/**
 * Printable worksheets, ported from docs/math-table.html:3406-3432.
 *
 * Ten generated problems plus an answer key; flashcard topics print the whole table
 * instead, because a times table is the worksheet.
 *
 * Returns **data**, not markup — same rule as the rest of lib/math. The original wrote an
 * HTML string into a hidden #printArea; here a React component renders it, so nothing
 * touches innerHTML.
 */

import { runtimeFor } from "./registry";
import { BY_ID } from "@/lib/topics";
import { card, fams } from "./facts";
import { systemRng } from "./rng";

export interface WorksheetItem {
  q: string;
  a: string;
}

export interface Worksheet {
  title: string;
  levelName: string;
  items: WorksheetItem[];
  /** Facts sheets print the whole table in narrow columns rather than a numbered grid. */
  layout: "grid" | "columns";
}

export function buildWorksheet(topicId: string, level: number): Worksheet | null {
  const topic = BY_ID[topicId];
  if (!topic) return null;
  const levelName = topic.levels[level - 1] ?? "";

  if (topic.engine === "facts") {
    const kind = topicId === "facts-div" ? "div" : "mul";
    const items: WorksheetItem[] = [];
    for (const f of fams(level)) {
      for (let i = 2; i <= 12; i++) {
        const c = card(kind, f, i);
        items.push({ q: c.q, a: c.a });
      }
    }
    return { title: topic.name, levelName, items, layout: "columns" };
  }

  const rt = runtimeFor(topicId);
  if (!rt) return null;
  const items = Array.from({ length: 10 }, () => {
    const p = rt.gen(level, systemRng);
    return { q: rt.title(p), a: rt.answer(p) };
  });
  return { title: topic.name, levelName, items, layout: "grid" };
}
