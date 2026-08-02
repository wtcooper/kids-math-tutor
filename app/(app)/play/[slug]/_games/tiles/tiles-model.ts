/**
 * Tiles — the distributive property, where the arithmetic is the only way through.
 *
 * The first version was a packing puzzle: cover an a × b rectangle with hundreds, tens
 * and ones. You could finish it by eye, and the four partial products only appeared in
 * the summary *afterwards* — so the maths was a label on the result rather than the way
 * to get there. It played like Tetris.
 *
 * Now you choose where to cut, and then say how big each piece is. What you claim is what
 * fills, so a wrong area is visibly the wrong size. You cannot fill a piece without
 * working out its area, and cutting at the ten is what makes those multiplications ones
 * you can do in your head — which is the lesson, discovered rather than announced.
 */

export interface TilesProblem {
  a: number;
  b: number;
}

/** Where the two cuts sit. 0 means "not cut on that axis yet". */
export interface Cuts {
  x: number;
  y: number;
}

export interface Region {
  /** Reading order: top-left, top-right, bottom-left, bottom-right. */
  index: number;
  w: number;
  h: number;
  /** Grid position of the region's top-left cell. */
  c: number;
  r: number;
  area: number;
}

export function genTiles(level: number, rnd: (a: number, b: number) => number): TilesProblem {
  const spec =
    level <= 1
      ? { A: [1, 1], B: [1, 1], ones: [2, 6] }
      : level === 2
        ? { A: [1, 2], B: [1, 1], ones: [2, 8] }
        : level === 3
          ? { A: [1, 2], B: [1, 2], ones: [2, 9] }
          : { A: [2, 4], B: [1, 3], ones: [2, 9] };

  const a = rnd(spec.A[0], spec.A[1]) * 10 + rnd(spec.ones[0], spec.ones[1]);
  const b = rnd(spec.B[0], spec.B[1]) * 10 + rnd(spec.ones[0], spec.ones[1]);
  return { a, b };
}

/** The cut that makes every piece easy: at the ten. */
export function tensCut({ a, b }: TilesProblem): Cuts {
  return { x: Math.floor(a / 10) * 10, y: Math.floor(b / 10) * 10 };
}

/**
 * The pieces a pair of cuts makes. A cut of 0, or one flush with an edge, simply makes
 * fewer pieces — so a half-made cut is still a legal board rather than an error.
 */
export function regionsFor(prob: TilesProblem, cuts: Cuts): Region[] {
  const xs = cuts.x > 0 && cuts.x < prob.a ? [cuts.x] : [];
  const ys = cuts.y > 0 && cuts.y < prob.b ? [cuts.y] : [];
  const colEdges = [0, ...xs, prob.a];
  const rowEdges = [0, ...ys, prob.b];

  const out: Region[] = [];
  let i = 0;
  for (let r = 0; r < rowEdges.length - 1; r++) {
    for (let c = 0; c < colEdges.length - 1; c++) {
      const w = colEdges[c + 1] - colEdges[c];
      const h = rowEdges[r + 1] - rowEdges[r];
      out.push({ index: i++, w, h, c: colEdges[c], r: rowEdges[r], area: w * h });
    }
  }
  return out;
}

export function allSolved(regions: Region[], claims: (number | null)[]): boolean {
  return regions.length > 0 && regions.every((rg) => claims[rg.index] === rg.area);
}

/**
 * Is this a side she can multiply in her head? A whole ten or a single digit is a fact
 * she already has; 13 × 7 is not.
 */
export function isEasy(n: number): boolean {
  return n % 10 === 0 || n < 10;
}

export function allEasy(regions: Region[]): boolean {
  return regions.every((rg) => isEasy(rg.w) && isEasy(rg.h));
}

/** The areas, summed, as the tutor would write it: "200 + 80 + 30 + 12". */
export function sumText(regions: Region[]): string {
  return regions.map((r) => r.area).join(" + ");
}

/** Every region's area adds up to the whole rectangle, whatever the cut. */
export function areasSumToProduct(prob: TilesProblem, cuts: Cuts): boolean {
  return regionsFor(prob, cuts).reduce((n, r) => n + r.area, 0) === prob.a * prob.b;
}
