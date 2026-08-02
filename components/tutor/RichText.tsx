import type { Rich } from "@/lib/math/format";

/**
 * Narration.
 *
 * The original stored these as HTML strings containing <b>. Tokenising at the model layer
 * means this renders with plain JSX — no dangerouslySetInnerHTML anywhere in the app, and
 * a Phaser HUD could style the same tokens differently if it ever needed to.
 */
export function RichText({ rich }: { rich: Rich }) {
  return (
    <>
      {rich.map((tok, i) =>
        tok.t === "em" ? <strong key={i}>{tok.v}</strong> : <span key={i}>{tok.v}</span>,
      )}
    </>
  );
}
