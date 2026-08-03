/**
 * Rapids — the rules of the river, pure and testable.
 *
 * A run is a sequence of GATES: two openings, each carrying a value, exactly one of
 * which is right. The raft never stops; steering through the correct opening IS the
 * answer. Which values appear depends on the level:
 *
 *  - count-easy / count-hard: skip counting a times table in order. The wrong opening
 *    carries another multiple of the same table (or a near miss), so recognising "a
 *    multiple" is never enough — you need the one that comes NEXT.
 *  - frac-compare: two fractions; steer through the bigger one.
 *  - frac-match: a target like 3/4 on the banner; steer through the opening whose
 *    fraction is EQUAL to it, dressed in a different denominator.
 *
 * All fraction comparisons are integer cross-multiplication — no floats near the water.
 */

export type RapidsKind = "count-easy" | "count-hard" | "frac-compare" | "frac-match";

export const RAPIDS_LEVELS: readonly { kind: RapidsKind; name: string }[] = [
  { kind: "count-easy", name: "The count — friendly tables" },
  { kind: "count-hard", name: "The count — the hard tables" },
  { kind: "frac-compare", name: "The bigger fraction" },
  { kind: "frac-match", name: "Match the fraction" },
];

export interface Frac {
  n: number;
  d: number;
}

export interface Gate {
  /** What the banner asks for this gate. */
  prompt: string;
  /** Display strings for the two openings, left then right. */
  sides: [string, string];
  /** Which opening holds: 0 = left, 1 = right. */
  correct: 0 | 1;
  /** For the attempt record and the workings panel. */
  meta: Record<string, unknown>;
}

export interface RunState {
  kind: RapidsKind;
  /** count-*: the table being stepped and how far along it we are. */
  base: number;
  k: number;
  /** frac-match: the target being matched. */
  target?: Frac;
}

type Rnd = (a: number, b: number) => number;

const cmp = (a: Frac, b: Frac) => a.n * b.d - b.n * a.d;
const equiv = (a: Frac, b: Frac) => cmp(a, b) === 0;
const fracText = (f: Frac) => `${f.n}/${f.d}`;

export function makeRun(kind: RapidsKind, rnd: Rnd): RunState {
  if (kind === "count-easy") return { kind, base: [2, 3, 4, 5, 10][rnd(0, 4)], k: rnd(1, 4) };
  if (kind === "count-hard") return { kind, base: [6, 7, 8, 9, 11, 12][rnd(0, 5)], k: rnd(1, 4) };
  if (kind === "frac-match") {
    const targets: Frac[] = [
      { n: 1, d: 2 },
      { n: 1, d: 3 },
      { n: 2, d: 3 },
      { n: 1, d: 4 },
      { n: 3, d: 4 },
      { n: 2, d: 5 },
      { n: 3, d: 5 },
    ];
    return { kind, base: 0, k: 0, target: targets[rnd(0, targets.length - 1)] };
  }
  return { kind, base: 0, k: 0 };
}

/** The next gate of a run, plus the advanced run state. Never returns an ambiguous gate. */
export function makeGate(state: RunState, rnd: Rnd): { gate: Gate; state: RunState } {
  if (state.kind === "count-easy" || state.kind === "count-hard") {
    const { base, k } = state;
    const next = base * (k + 1);
    // The tempting wrong answer: another multiple of the same table, or a near miss.
    let wrong = next;
    let guard = 0;
    while (wrong === next && guard++ < 50) {
      wrong =
        rnd(0, 1) === 0
          ? base * rnd(1, 12)
          : next + (rnd(0, 1) === 0 ? -1 : 1) * rnd(1, 3);
    }
    if (wrong === next) wrong = next + 1;
    const correct = rnd(0, 1) as 0 | 1;
    const sides: [string, string] = correct === 0 ? [String(next), String(wrong)] : [String(wrong), String(next)];
    const gate: Gate = {
      prompt: `The ${base}s — after ${base * k} comes…`,
      sides,
      correct,
      meta: { kind: state.kind, base, from: base * k, next, wrong },
    };
    // Wrap back to the table's start so a long run never runs out of river.
    const nextK = k + 1 >= 12 ? 1 : k + 1;
    return { gate, state: { ...state, k: nextK } };
  }

  if (state.kind === "frac-compare") {
    let a: Frac = { n: 1, d: 2 };
    let b: Frac = { n: 1, d: 3 };
    let guard = 0;
    do {
      const da = rnd(2, 10);
      const db = rnd(2, 10);
      a = { n: rnd(1, da - 1), d: da };
      b = { n: rnd(1, db - 1), d: db };
    } while (cmp(a, b) === 0 && guard++ < 60);
    if (cmp(a, b) === 0) b = { n: a.n + 1, d: a.d };
    const bigger = cmp(a, b) > 0 ? a : b;
    const smaller = bigger === a ? b : a;
    const correct = rnd(0, 1) as 0 | 1;
    const sides: [string, string] =
      correct === 0 ? [fracText(bigger), fracText(smaller)] : [fracText(smaller), fracText(bigger)];
    return {
      gate: {
        prompt: "Steer through the BIGGER fraction",
        sides,
        correct,
        meta: { kind: state.kind, a: fracText(a), b: fracText(b), bigger: fracText(bigger) },
      },
      state,
    };
  }

  // frac-match
  const t = state.target!;
  const m = rnd(2, 6);
  const match: Frac = { n: t.n * m, d: t.d * m };
  // A wrong opening that shares the denominator, so shape alone can't answer.
  let wrongN = match.n + (rnd(0, 1) === 0 ? -1 : 1) * rnd(1, 2);
  if (wrongN < 1) wrongN = match.n + 1;
  let wrong: Frac = { n: wrongN, d: match.d };
  if (equiv(wrong, t)) wrong = { n: wrongN + 1, d: match.d };
  const correct = rnd(0, 1) as 0 | 1;
  const sides: [string, string] =
    correct === 0 ? [fracText(match), fracText(wrong)] : [fracText(wrong), fracText(match)];
  return {
    gate: {
      prompt: `Match ${fracText(t)} — steer through its equal`,
      sides,
      correct,
      meta: { kind: state.kind, target: fracText(t), match: fracText(match), wrong: fracText(wrong) },
    },
    state,
  };
}

/** Exposed for tests: integer cross-multiplication comparison. */
export const compareFrac = cmp;
export const equivFrac = equiv;
