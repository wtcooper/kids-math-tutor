/**
 * Balance — solving for x by doing the same thing to both pans.
 *
 * The scale holds bags (each containing the same unknown number of stones) and loose
 * stones. Every legal move is applied to *both* pans at once, which is the whole rule of
 * equation solving made physical: the scale stays level because you did the same thing to
 * each side.
 *
 * The difference from DragonBox — the cautionary tale in docs/research/03-prior-art.md,
 * where kids get excellent at the game and it never reaches their homework — is that the
 * written equation sits beside the scale from the first move and updates with it. She is
 * never doing something that has no name.
 */

export interface Side {
  /** Number of bags on this pan. Each holds the same unknown. */
  bags: number;
  /** Loose stones. */
  stones: number;
}

export interface Scale {
  left: Side;
  right: Side;
}

export type Move =
  | { kind: "removeBag"; count: number }
  | { kind: "removeStones"; count: number }
  | { kind: "addStones"; count: number }
  | { kind: "divide"; by: number };

export interface BalanceProblem {
  start: Scale;
  /** What is actually in a bag. */
  x: number;
}

export function sideValue(s: Side, x: number): number {
  return s.bags * x + s.stones;
}

export function isBalanced(scale: Scale, x: number): boolean {
  return sideValue(scale.left, x) === sideValue(scale.right, x);
}

/** Solved when one pan is exactly one bag and the other is only stones. */
export function isSolved(scale: Scale): boolean {
  const { left, right } = scale;
  return (
    (left.bags === 1 && left.stones === 0 && right.bags === 0) ||
    (right.bags === 1 && right.stones === 0 && left.bags === 0)
  );
}

export function solvedValue(scale: Scale): number | null {
  if (!isSolved(scale)) return null;
  return scale.left.bags === 1 ? scale.right.stones : scale.left.stones;
}

/**
 * Whether a move can be applied to both pans without going negative or splitting a bag.
 * Refusing an illegal move is how the scale teaches: you cannot take three stones off a
 * pan that has two.
 */
export function canApply(scale: Scale, move: Move): boolean {
  const { left, right } = scale;
  switch (move.kind) {
    case "removeBag":
      return left.bags >= move.count && right.bags >= move.count;
    case "removeStones":
      return left.stones >= move.count && right.stones >= move.count;
    case "addStones":
      return move.count > 0;
    case "divide":
      return (
        move.by > 1 &&
        left.bags % move.by === 0 &&
        right.bags % move.by === 0 &&
        left.stones % move.by === 0 &&
        right.stones % move.by === 0
      );
  }
}

export function apply(scale: Scale, move: Move): Scale {
  const f = (s: Side): Side => {
    switch (move.kind) {
      case "removeBag":
        return { bags: s.bags - move.count, stones: s.stones };
      case "removeStones":
        return { bags: s.bags, stones: s.stones - move.count };
      case "addStones":
        return { bags: s.bags, stones: s.stones + move.count };
      case "divide":
        return { bags: s.bags / move.by, stones: s.stones / move.by };
    }
  };
  return { left: f(scale.left), right: f(scale.right) };
}

/** The equation as written maths, so the fade is always on screen. */
export function equationText(scale: Scale): string {
  const side = (s: Side) => {
    const parts: string[] = [];
    if (s.bags === 1) parts.push("x");
    else if (s.bags > 1) parts.push(`${s.bags}x`);
    if (s.stones > 0 || parts.length === 0) parts.push(String(s.stones));
    return parts.join(" + ");
  };
  return `${side(scale.left)} = ${side(scale.right)}`;
}

export function genBalance(
  level: number,
  rnd: (a: number, b: number) => number,
): BalanceProblem {
  const x = rnd(2, level <= 1 ? 6 : level <= 3 ? 9 : 12);

  if (level <= 1) {
    // x + a = b
    const a = rnd(1, 6);
    return { start: { left: { bags: 1, stones: a }, right: { bags: 0, stones: x + a } }, x };
  }
  if (level === 2) {
    // nx = b
    const n = rnd(2, 4);
    return { start: { left: { bags: n, stones: 0 }, right: { bags: 0, stones: n * x } }, x };
  }
  if (level === 3) {
    // nx + a = b
    const n = rnd(2, 4);
    const a = rnd(1, 8);
    return {
      start: { left: { bags: n, stones: a }, right: { bags: 0, stones: n * x + a } },
      x,
    };
  }
  // Bags on both sides: nx + a = mx + b
  const n = rnd(3, 5);
  const m = rnd(1, n - 1);
  const a = rnd(0, 5);
  const b = (n - m) * x + a;
  return { start: { left: { bags: n, stones: a }, right: { bags: m, stones: b } }, x };
}
