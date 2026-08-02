/**
 * Build World — the maths is the price of building what the commission asks for.
 *
 * Blocks sit on a square grid; each column has a height. Everything the commission can
 * ask about is a measurement of that shape:
 *
 * - **floor area** — how many columns have anything in them
 * - **perimeter** — the exposed edges around that footprint
 * - **volume** — the total number of blocks
 * - **scale** — the same footprint with every side multiplied by k
 *
 * Never presented, only required. This is how Minecraft Education gets its results, and
 * the commissions are what keep a building game from drifting into a decorating game.
 */

export const GRID = 12;

/** Column heights, keyed "col,row". Absent means empty. */
export type Blocks = Record<string, number>;

export const key = (c: number, r: number) => `${c},${r}`;
export const parseKey = (k: string): [number, number] =>
  k.split(",").map(Number) as [number, number];

export function heightAt(blocks: Blocks, c: number, r: number): number {
  return blocks[key(c, r)] ?? 0;
}

export function footprint(blocks: Blocks): [number, number][] {
  return Object.entries(blocks)
    .filter(([, h]) => h > 0)
    .map(([k]) => parseKey(k));
}

export function floorArea(blocks: Blocks): number {
  return footprint(blocks).length;
}

export function volume(blocks: Blocks): number {
  return Object.values(blocks).reduce((a, b) => a + Math.max(0, b), 0);
}

/**
 * Edges of the footprint that face empty space. Counting exposed edges rather than
 * walking a path means it is still right for a shape with a hole or a diagonal pinch,
 * which a kid will absolutely build.
 */
export function perimeter(blocks: Blocks): number {
  let edges = 0;
  for (const [c, r] of footprint(blocks)) {
    if (heightAt(blocks, c - 1, r) === 0) edges++;
    if (heightAt(blocks, c + 1, r) === 0) edges++;
    if (heightAt(blocks, c, r - 1) === 0) edges++;
    if (heightAt(blocks, c, r + 1) === 0) edges++;
  }
  return edges;
}

export interface Bounds {
  minC: number;
  maxC: number;
  minR: number;
  maxR: number;
  width: number;
  depth: number;
  height: number;
}

export function bounds(blocks: Blocks): Bounds | null {
  const fp = footprint(blocks);
  if (fp.length === 0) return null;
  const cs = fp.map(([c]) => c);
  const rs = fp.map(([, r]) => r);
  const minC = Math.min(...cs);
  const maxC = Math.max(...cs);
  const minR = Math.min(...rs);
  const maxR = Math.max(...rs);
  return {
    minC,
    maxC,
    minR,
    maxR,
    width: maxC - minC + 1,
    depth: maxR - minR + 1,
    height: Math.max(...Object.values(blocks).map((h) => Math.max(0, h)), 0),
  };
}

/** Is the footprint a solid rectangle, with every column the same height? */
export function isSolidBox(blocks: Blocks): boolean {
  const b = bounds(blocks);
  if (!b) return false;
  if (floorArea(blocks) !== b.width * b.depth) return false;
  const heights = new Set<number>();
  for (let c = b.minC; c <= b.maxC; c++) {
    for (let r = b.minR; r <= b.maxR; r++) {
      const h = heightAt(blocks, c, r);
      if (h === 0) return false;
      heights.add(h);
    }
  }
  return heights.size === 1;
}

export type CommissionKind = "floor" | "volume" | "scale";

export interface Commission {
  kind: CommissionKind;
  title: string;
  detail: string;
  /** floor: exact area. volume: exact block count. scale: unused. */
  target?: number;
  /** floor: optional cap. */
  maxPerimeter?: number;
  /** scale: the original footprint and the ratio. */
  fromW?: number;
  fromD?: number;
  scaleBy?: number;
}

export interface Check {
  met: boolean;
  lines: { label: string; got: string; want: string; ok: boolean }[];
}

export function check(commission: Commission, blocks: Blocks): Check {
  const area = floorArea(blocks);
  const vol = volume(blocks);
  const per = perimeter(blocks);
  const b = bounds(blocks);

  if (commission.kind === "floor") {
    const lines = [
      {
        label: "Floor area",
        got: String(area),
        want: String(commission.target),
        ok: area === commission.target,
      },
    ];
    if (commission.maxPerimeter !== undefined) {
      lines.push({
        label: "Perimeter",
        got: String(per),
        want: `≤ ${commission.maxPerimeter}`,
        ok: per <= commission.maxPerimeter,
      });
    }
    // One storey only, or "floor area" stops meaning anything she can see.
    lines.push({
      label: "Height",
      got: b ? String(b.height) : "0",
      want: "1",
      ok: b?.height === 1,
    });
    return { met: lines.every((l) => l.ok), lines };
  }

  if (commission.kind === "volume") {
    const lines = [
      {
        label: "Blocks used",
        got: String(vol),
        want: String(commission.target),
        ok: vol === commission.target,
      },
      {
        label: "Shape",
        got: isSolidBox(blocks) ? "a solid box" : "not a box yet",
        want: "a solid box",
        ok: isSolidBox(blocks),
      },
    ];
    return { met: lines.every((l) => l.ok), lines };
  }

  // scale
  const wantW = (commission.fromW ?? 0) * (commission.scaleBy ?? 1);
  const wantD = (commission.fromD ?? 0) * (commission.scaleBy ?? 1);
  const lines = [
    { label: "Width", got: b ? String(b.width) : "0", want: String(wantW), ok: b?.width === wantW },
    { label: "Depth", got: b ? String(b.depth) : "0", want: String(wantD), ok: b?.depth === wantD },
    {
      label: "Filled in",
      got: b && area === b.width * b.depth ? "solid" : "gaps",
      want: "solid",
      ok: Boolean(b && area === b.width * b.depth),
    },
    { label: "Height", got: b ? String(b.height) : "0", want: "1", ok: b?.height === 1 },
  ];
  return { met: lines.every((l) => l.ok), lines };
}

/** Smallest perimeter for a rectangle of this area — what a tight build can reach. */
export function bestPerimeterFor(area: number): number {
  let best = Infinity;
  for (let w = 1; w <= area; w++) {
    if (area % w) continue;
    best = Math.min(best, 2 * (w + area / w));
  }
  return best;
}

const FLOOR_AREAS = [12, 16, 18, 20, 24, 28, 30, 36];
const VOLUMES = [12, 16, 18, 24, 27, 32, 36, 48];

export function genCommission(
  level: number,
  rnd: (a: number, b: number) => number,
): Commission {
  const pick = level <= 1 ? 0 : level === 2 ? 1 : rnd(0, 2);

  if (pick === 0) {
    const area = FLOOR_AREAS[rnd(0, level <= 1 ? 3 : FLOOR_AREAS.length - 1)];
    const cap = bestPerimeterFor(area) + (level >= 3 ? 2 : 6);
    return {
      kind: "floor",
      title: "A barn floor",
      detail:
        level <= 1
          ? `Lay a floor of exactly ${area} blocks.`
          : `Lay a floor of exactly ${area} blocks, with a perimeter of ${cap} or less.`,
      target: area,
      maxPerimeter: level <= 1 ? undefined : cap,
    };
  }

  if (pick === 1) {
    const v = VOLUMES[rnd(0, VOLUMES.length - 1)];
    return {
      kind: "volume",
      title: "A grain silo",
      detail: `Build a solid box using exactly ${v} blocks.`,
      target: v,
    };
  }

  const fromW = rnd(2, 4);
  const fromD = rnd(2, 4);
  const by = rnd(2, 3);
  return {
    kind: "scale",
    title: "A scaled cottage",
    detail: `The plan is ${fromW} by ${fromD}. Build it ${by} times as big on every side.`,
    fromW,
    fromD,
    scaleBy: by,
  };
}
