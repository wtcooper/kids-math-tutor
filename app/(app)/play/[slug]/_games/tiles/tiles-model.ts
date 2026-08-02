/**
 * Tiles — the maths behind the board.
 *
 * Pure, so the packing rules and the partial-product arithmetic can be tested without a
 * browser. The component only draws what is here.
 */

export type TileKind = "hundred" | "tenAcross" | "tenDown" | "one";

export const TILE_SIZE: Record<TileKind, { w: number; h: number }> = {
  hundred: { w: 10, h: 10 },
  tenAcross: { w: 10, h: 1 },
  tenDown: { w: 1, h: 10 },
  one: { w: 1, h: 1 },
};

export const TILE_VALUE: Record<TileKind, number> = {
  hundred: 100,
  tenAcross: 10,
  tenDown: 10,
  one: 1,
};

export interface Placed {
  id: number;
  kind: TileKind;
  /** Top-left cell. */
  c: number;
  r: number;
}

export interface TilesProblem {
  a: number;
  b: number;
}

/** Nobody is laying more than this many tiles by hand. */
export const MAX_TILES = 42;

/**
 * Deliberately not the tutor's `genMul`: that goes up to 999 × 9, which is 8,991 unit
 * squares and cannot be tiled by hand. Same representation as the tutor's area model,
 * sized for something she can actually cover.
 *
 * Built from the digits rather than from the whole numbers, because the tile count is
 * `(tensA + onesA) × (tensB + onesB)` — so a big ones digit is what makes a board
 * miserable, not a big number. 17 × 9 looks small and needs 63 unit squares.
 */
export function genTiles(level: number, rnd: (a: number, b: number) => number): TilesProblem {
  const spec =
    level <= 1
      ? { A: [1, 1], B: [1, 1], ones: [1, 3] }
      : level === 2
        ? { A: [1, 2], B: [1, 1], ones: [1, 4] }
        : level === 3
          ? { A: [1, 2], B: [1, 2], ones: [1, 4] }
          : { A: [2, 3], B: [1, 2], ones: [1, 4] };

  const a = rnd(spec.A[0], spec.A[1]) * 10 + rnd(spec.ones[0], spec.ones[1]);
  const b = rnd(spec.B[0], spec.B[1]) * 10 + rnd(spec.ones[0], spec.ones[1]);
  return { a, b };
}

/** The four partial products, as the tutor writes them. */
export interface Decomposition {
  tensA: number;
  onesA: number;
  tensB: number;
  onesB: number;
  hundreds: number;
  tenDowns: number;
  tenAcrosses: number;
  ones: number;
  /** Fewest tiles this rectangle can be covered with. */
  fewest: number;
  product: number;
}

export function decompose({ a, b }: TilesProblem): Decomposition {
  const A = Math.floor(a / 10);
  const ra = a % 10;
  const B = Math.floor(b / 10);
  const rb = b % 10;
  return {
    tensA: A * 10,
    onesA: ra,
    tensB: B * 10,
    onesB: rb,
    hundreds: A * B,
    tenDowns: ra * B,
    tenAcrosses: A * rb,
    ones: ra * rb,
    fewest: (A + ra) * (B + rb),
    product: a * b,
  };
}

/** Can this tile go here without leaving the rectangle or landing on another? */
export function canPlace(
  placed: Placed[],
  kind: TileKind,
  c: number,
  r: number,
  prob: TilesProblem,
): boolean {
  const { w, h } = TILE_SIZE[kind];
  if (c < 0 || r < 0 || c + w > prob.a || r + h > prob.b) return false;
  return !placed.some((p) => {
    const s = TILE_SIZE[p.kind];
    return c < p.c + s.w && c + w > p.c && r < p.r + s.h && r + h > p.r;
  });
}

export function coveredCells(placed: Placed[]): number {
  return placed.reduce((n, p) => n + TILE_SIZE[p.kind].w * TILE_SIZE[p.kind].h, 0);
}

/** Which placed tile, if any, sits on this cell. Topmost wins; they never overlap. */
export function tileAt(placed: Placed[], c: number, r: number): Placed | undefined {
  return placed.find((p) => {
    const s = TILE_SIZE[p.kind];
    return c >= p.c && c < p.c + s.w && r >= p.r && r < p.r + s.h;
  });
}

export function tally(placed: Placed[]): Record<TileKind, number> {
  const out: Record<TileKind, number> = { hundred: 0, tenAcross: 0, tenDown: 0, one: 0 };
  for (const p of placed) out[p.kind]++;
  return out;
}
