/**
 * Text formatting. Ported from the original tutor, minus everything that emitted HTML.
 *
 * The original's `fr()`, `mx()` and `niceFrac()` returned markup strings. Their job here
 * is done by the Fraction data type plus a React component, so only the plain-text
 * versions survive — they are still needed for answer strings and game labels.
 */

export function fmt(n: number): string {
  return Number(n).toLocaleString("en-US");
}

/** A fraction as data. Rendering is the view layer's problem. */
export interface Fraction {
  whole?: number;
  num: number;
  den: number;
}

/** Improper n/d as a mixed number, in data form. */
export function toMixed(n: number, d: number): Fraction {
  if (d === 1) return { num: n, den: 1 };
  if (n < d) return { num: n, den: d };
  const whole = Math.floor(n / d);
  const rem = n - whole * d;
  return rem === 0 ? { num: whole, den: 1 } : { whole, num: rem, den: d };
}

/** Plain-text fraction, matching the original's fracText exactly. */
export function fracText(n: number, d: number): string {
  if (d === 1) return String(n);
  if (n < d) return `${n}/${d}`;
  const w = Math.floor(n / d);
  const r = n - w * d;
  return r === 0 ? String(w) : `${w} ${r}/${d}`;
}

/**
 * Narration with light emphasis.
 *
 * The original stored narration as HTML strings containing <b>. Tokenising means the
 * React tutor never needs dangerouslySetInnerHTML, and a Phaser game can render the same
 * sentence with its own styling.
 */
export type RichToken = { t: "text"; v: string } | { t: "em"; v: string };
export type Rich = RichToken[];

const B_TAG = /<b>(.*?)<\/b>/gs;

/** Parse the original's `<b>`-marked narration into tokens. */
export function parseRich(html: string): Rich {
  const out: Rich = [];
  let last = 0;
  for (const m of html.matchAll(B_TAG)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ t: "text", v: html.slice(last, at) });
    out.push({ t: "em", v: m[1] });
    last = at + m[0].length;
  }
  if (last < html.length) out.push({ t: "text", v: html.slice(last) });
  return out.filter((tok) => tok.v !== "");
}

export function richToText(rich: Rich): string {
  return rich.map((t) => t.v).join("");
}

export function text(v: string): Rich {
  return [{ t: "text", v }];
}
