/**
 * The flashcard engine — multiplication and division facts.
 *
 * Ported from docs/math-table.html:736-785. `factHook` and `SPECIAL_HOOKS` are copied
 * word for word on purpose: the game must show *the same sentence* the tutor shows for
 * 7 × 8, not a paraphrase. A shared object across both contexts is what turns a
 * far-transfer problem into a near-transfer one, and it costs nothing to keep exact.
 *
 * Hook text carries <b> markup in the original; parseRich turns it into tokens so no
 * renderer ever needs dangerouslySetInnerHTML.
 */

import { parseRich, type Rich } from "./format";
import type { Rng } from "./rng";

export const SPECIAL_HOOKS: Record<string, string> = {
  "7x8": "Say it as a countdown: <b>5, 6, 7, 8</b> — 56 = 7 × 8.",
  "6x7":
    '42 is the odd one out. "Six times seven is forty-two" — say it as a rhyme until it sticks.',
  "6x8": '"Six times eight is forty-eight" — it rhymes, which is why it sticks.',
  "7x7": "49 — one less than 50. Think 7 × 7 = 50 − 1.",
  "8x8": '"I ate and ate and got sick on the floor — 8 × 8 is 64."',
  "12x12": "144 is a gross (a dozen dozen). Worth knowing on sight.",
};

export function factHookHtml(a: number, b: number, prod: number): string {
  const key = `${Math.min(a, b)}x${Math.max(a, b)}`;
  if (SPECIAL_HOOKS[key]) return SPECIAL_HOOKS[key];
  if (a === b) return `A square number: ${a} × ${a} = ${prod}.`;

  const o =
    a === 10 || a === 11 || a === 5 || a === 9 || a === 4 || a === 8 || a === 6 || a === 3 || a === 2 || a === 1
      ? b
      : a;
  const k = o === b ? a : b;

  if (k === 1) return "Times one — the number stays exactly the same.";
  if (k === 10) return "Times ten — write the number and add a zero.";
  if (k === 11 && o < 10)
    return `Times eleven under 10: double the digit — ${o} becomes ${o}${o}.`;
  if (k === 5)
    return `Times five is half of times ten: 10 × ${o} = ${10 * o}, and half of that is ${prod}.`;
  if (k === 9)
    return `Times nine: ${o} × 10 = ${o * 10}, then take away one ${o} → ${prod}. Check: ${String(prod).split("").join(" + ")} = 9.`;
  if (k === 4) return `Times four is double-double: ${o} → ${o * 2} → ${prod}.`;
  if (k === 8)
    return `Times eight is double three times: ${o} → ${o * 2} → ${o * 4} → ${prod}.`;
  if (k === 6) return `Times six: ${o} × 5 = ${o * 5}, then add one more ${o} → ${prod}.`;
  if (k === 3)
    return `Times three: double it, then add one more — ${o * 2} + ${o} = ${prod}.`;
  if (k === 2) return "Times two is just doubling.";
  if (k === 12)
    return `Times twelve: ${o} × 10 = ${o * 10}, plus ${o} × 2 = ${o * 2} → ${prod}.`;
  return `${o} × ${k} = ${prod}.`;
}

export interface FactLevel {
  name: string;
  fams: number[];
}

export const FACT_LEVELS: readonly FactLevel[] = [
  { name: "Twos, fives & tens — the patterns", fams: [2, 5, 10] },
  { name: "Threes, fours & sixes", fams: [3, 4, 6] },
  { name: "Sevens, eights & nines — the hard ones", fams: [7, 8, 9] },
  { name: "Elevens & twelves", fams: [11, 12] },
  { name: "Mixed review — everything", fams: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
];

export type FactKind = "mul" | "div";

export interface FactCard {
  /** Display question, e.g. "7 × 8" or "56 ÷ 7". */
  q: string;
  /** Expected answer as a string, matching the input the tutor accepts. */
  a: string;
  hook: Rich;
  /** The times-table this card belongs to. */
  fam: number;
  /** The other operand. */
  other: number;
}

/** Which times-tables a level draws from. Levels are 1-based, as in the tutor. */
export function fams(level: number): number[] {
  return FACT_LEVELS[level - 1].fams;
}

export function card(kind: FactKind, f: number, i: number): FactCard {
  const prod = f * i;
  const hookHtml = factHookHtml(f, i, prod);
  return kind === "mul"
    ? { q: `${f} × ${i}`, a: String(prod), hook: parseRich(hookHtml), fam: f, other: i }
    : {
        q: `${prod} ÷ ${f}`,
        a: String(i),
        hook: parseRich(`Ask yourself: ${f} times what makes ${prod}? ${hookHtml}`),
        fam: f,
        other: i,
      };
}

/** Every card in a level, in table order — what Learn mode walks through. */
export function deckFor(kind: FactKind, level: number): FactCard[] {
  const out: FactCard[] = [];
  for (const f of fams(level)) {
    for (let i = 2; i <= 12; i++) out.push(card(kind, f, i));
  }
  return out;
}

/** Shuffled deck for Drill mode. Fisher-Yates, so every ordering is equally likely. */
export function shuffledDeck(kind: FactKind, level: number, rng: Rng): FactCard[] {
  const deck = deckFor(kind, level);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
