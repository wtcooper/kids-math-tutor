/**
 * The display vocabulary.
 *
 * The original tutor's `build()` returned HTML strings. That is the single thing this
 * port exists to kill: it meant the tutor and a game could never render the same object,
 * and the ~23 visual constructs were locked to one stylesheet.
 *
 * Here `build()` returns data and the view layer decides how to draw it — React in the
 * tutor, and (for the round-end panels) the very same React components inside the games,
 * which is what makes the game→notation→tutor loop free rather than a reimplementation.
 */

import type { Rich } from "./format";

/** Inline pieces of a work line. Class names mirror the original's CSS vocabulary. */
export type Inline =
  | { t: "text"; v: string }
  /** Muted — context that is not the point of this step. */
  | { t: "mut"; v: string }
  /** Highlighted — the value currently under discussion. */
  | { t: "hi"; v: string }
  /** Boxed — a selected/marked value, e.g. a shared factor. */
  | { t: "box"; v: string }
  /** The answer, once earned. */
  | { t: "grn"; v: string }
  /** Operators and separators. */
  | { t: "op"; v: string }
  | { t: "frac"; whole?: number; num: number; den: number }
  /**
   * Exponent. Flex items ignore vertical-align, which is why the original rendered
   * `5 2` instead of `5³` until it used align-self — see BUILD-NOTES issue 11.
   */
  | { t: "pow"; base: string; exp: string };

export interface Column {
  title: string;
  items: Inline[];
}

/** A block-level visual. One React component per variant. */
export type DisplayNode =
  | { t: "workLine"; big?: boolean; items: Inline[] }
  | { t: "note"; body: Rich }
  | { t: "banner"; body: Rich }
  | { t: "columns"; cols: Column[] }
  | { t: "fracBar"; parts: number; shaded: number; tone?: 1 | 2 | 3; labelEach?: boolean }
  | { t: "twoBars"; top: FracBarSpec; bottom: FracBarSpec }
  | { t: "numberLine"; min: number; max: number; marks: number[]; point?: number; pointLabel?: string; jump?: [number, number] }
  | { t: "unitGrid"; rows: number; cols: number; a?: number; b?: number }
  | { t: "percentBar"; percent: number; value?: string }
  | { t: "hundredSquare"; on: number; part?: number }
  | { t: "ratioTable"; head: string[]; rows: string[][]; highlight?: [number, number] }
  | { t: "balance"; left: Inline[]; right: Inline[] }
  | { t: "shape"; kind: ShapeKind; w: number; h: number; unit: string; extra?: number }
  | { t: "blocks"; count: number; place: number };

export interface FracBarSpec {
  parts: number;
  shaded: number;
  label?: string;
  tone?: 1 | 2 | 3;
}

export type ShapeKind = "rect" | "tri" | "para" | "prism" | "ell";

/** A fill-in slot within a step. */
export interface Ask {
  label: string;
  expect: string;
  w?: number;
  mode?: "numeric" | "text";
}

export interface Step {
  label: string;
  say: Rich;
  sub?: Rich;
  show: DisplayNode[];
  ask?: Ask[];
}

export interface Picture {
  title: string;
  sub: Rich;
  body: DisplayNode[];
}

/** What a `steps`-engine topic's build() produces. */
export interface StepsModel {
  kind: "steps";
  title: string;
  lead?: DisplayNode;
  steps: Step[];
  answerText: string;
  picture?: Picture;
}

/** Convenience builders — these are used constantly by the topic modules. */
export const t = (v: string): Inline => ({ t: "text", v });
export const mut = (v: string): Inline => ({ t: "mut", v });
export const hi = (v: string): Inline => ({ t: "hi", v });
export const box = (v: string): Inline => ({ t: "box", v });
export const grn = (v: string): Inline => ({ t: "grn", v });
export const op = (v: string): Inline => ({ t: "op", v });

export const line = (...items: Inline[]): DisplayNode => ({ t: "workLine", items });
export const bigLine = (...items: Inline[]): DisplayNode => ({
  t: "workLine",
  big: true,
  items,
});

/** Join inline items with a separator, the way the original joined with `<span class="op">`. */
export function joinInline(items: Inline[], sep: string): Inline[] {
  const out: Inline[] = [];
  items.forEach((item, i) => {
    if (i > 0) out.push(op(sep));
    out.push(item);
  });
  return out;
}
