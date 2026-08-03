/**
 * The Machine Shop — order of operations as plumbing, and a variable as a hopper.
 *
 * Numbers enter on the left and flow through operator nodes to an outlet. The *shape* of
 * the machine is the precedence: whatever is wired deeper happens first, and there is no
 * way to express "add before you multiply" except by wiring it that way. So a wrong
 * arrangement visibly produces the wrong number rather than being marked wrong.
 *
 * The later levels are the real prize. A hopper's contents change between runs, so the
 * machine has to work for *every* input, not the one you happened to test. That is the
 * leap into algebra, and it is nearly impossible to teach from worked examples.
 */

export type Op = "+" | "-" | "×" | "÷";

/** A machine is a binary tree: leaves are numbers or the hopper, nodes are operators. */
export type Node =
  | { kind: "num"; value: number }
  | { kind: "hopper" }
  | { kind: "op"; op: Op; left: Node; right: Node };

export interface Slot {
  /** Which operator sits here. null until she places one. */
  op: Op | null;
}

export function evaluate(node: Node, hopper: number): number {
  if (node.kind === "num") return node.value;
  if (node.kind === "hopper") return hopper;
  const a = evaluate(node.left, hopper);
  const b = evaluate(node.right, hopper);
  switch (node.op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

/** The machine written out as an expression, fully bracketed by its own shape. */
export function expressionText(node: Node): string {
  if (node.kind === "num") return String(node.value);
  if (node.kind === "hopper") return "n";
  const l = node.left.kind === "op" ? `(${expressionText(node.left)})` : expressionText(node.left);
  const r =
    node.right.kind === "op" ? `(${expressionText(node.right)})` : expressionText(node.right);
  return `${l} ${node.op} ${r}`;
}

/** The same machine written the way it would appear on paper, brackets only where needed. */
export function tidyText(node: Node): string {
  const prec = (op: Op) => (op === "+" || op === "-" ? 1 : 2);
  const walk = (n: Node, parentPrec: number, isRight: boolean): string => {
    if (n.kind === "num") return String(n.value);
    if (n.kind === "hopper") return "n";
    const p = prec(n.op);
    const inner = `${walk(n.left, p, false)} ${n.op} ${walk(n.right, p, true)}`;
    // Brackets only where dropping them would change the meaning.
    const needs = p < parentPrec || (p === parentPrec && isRight);
    return needs ? `(${inner})` : inner;
  };
  return walk(node, 0, false);
}

export interface Puzzle {
  /** The wiring, with operators missing — she fills the slots. */
  shape: Node;
  /** Ordered list of the slots in the shape, depth-first left to right. */
  slotCount: number;
  /** Inputs the machine is tested against. One value means a fixed machine. */
  runs: number[];
  /** What the outlet must read for each run. */
  targets: number[];
  usesHopper: boolean;
}

/**
 * Path → slot index, in the exact in-order traversal withOps fills from.
 *
 * The UI used to number sockets with a mutable counter incremented *during render*,
 * which double-counted under React's dev double-render — the one socket on level 1
 * wrote its operator to ops[1] and the test bench never evaluated. Deriving the index
 * from the tree keeps the UI and the model in agreement no matter how many times
 * React chooses to render.
 */
export function slotPaths(shape: Node): Record<string, number> {
  const map: Record<string, number> = {};
  let i = 0;
  const walk = (n: Node, path: string): void => {
    if (n.kind !== "op") return;
    walk(n.left, `${path}L`);
    map[path] = i++;
    walk(n.right, `${path}R`);
  };
  walk(shape, "");
  return map;
}

/** Replace the operators in a shape, in depth-first order. */
export function withOps(shape: Node, ops: (Op | null)[]): Node {
  let i = 0;
  const walk = (n: Node): Node => {
    if (n.kind !== "op") return n;
    const left = walk(n.left);
    const op = ops[i++] ?? n.op;
    const right = walk(n.right);
    return { kind: "op", op, left, right };
  };
  return walk(shape);
}

export function countSlots(n: Node): number {
  if (n.kind !== "op") return 0;
  return 1 + countSlots(n.left) + countSlots(n.right);
}

const num = (value: number): Node => ({ kind: "num", value });
const hop = (): Node => ({ kind: "hopper" });
const op = (o: Op, left: Node, right: Node): Node => ({ kind: "op", op: o, left, right });

export function genMachine(
  level: number,
  rnd: (a: number, b: number) => number,
): Puzzle {
  if (level <= 1) {
    // Two numbers, one operator. Reading the machine is the whole task.
    const a = rnd(3, 12);
    const b = rnd(2, 9);
    const chosen: Op = (["+", "-", "×"] as Op[])[rnd(0, 2)];
    const shape = op(chosen, num(a), num(b));
    return {
      shape,
      slotCount: 1,
      runs: [0],
      targets: [evaluate(shape, 0)],
      usesHopper: false,
    };
  }

  if (level === 2) {
    // Three numbers, two operators — the arrangement now matters.
    const a = rnd(2, 9);
    const b = rnd(2, 9);
    const c = rnd(2, 9);
    const shape = op("+", op("×", num(a), num(b)), num(c));
    return {
      shape,
      slotCount: 2,
      runs: [0],
      targets: [evaluate(shape, 0)],
      usesHopper: false,
    };
  }

  if (level === 3) {
    // A hopper, tested on one input. The machine still only has to work once.
    const a = rnd(2, 6);
    const b = rnd(1, 9);
    const shape = op("+", op("×", hop(), num(a)), num(b));
    const runs = [rnd(2, 8)];
    return {
      shape,
      slotCount: 2,
      runs,
      targets: runs.map((r) => evaluate(shape, r)),
      usesHopper: true,
    };
  }

  // The real one: the same machine has to work for three different inputs, so testing
  // against a single number cannot tell you whether you are right.
  const a = rnd(2, 5);
  const b = rnd(1, 9);
  const shape = op("-", op("×", hop(), num(a)), num(b));
  const runs = [rnd(2, 4), rnd(5, 7), rnd(8, 11)];
  return {
    shape,
    slotCount: 2,
    runs,
    targets: runs.map((r) => evaluate(shape, r)),
    usesHopper: true,
  };
}

/** Does this arrangement of operators hit every target? */
export function machineWorks(puzzle: Puzzle, ops: (Op | null)[]): boolean {
  if (ops.some((o) => o === null)) return false;
  const built = withOps(puzzle.shape, ops);
  return puzzle.runs.every((r, i) => {
    const got = evaluate(built, r);
    return Number.isFinite(got) && got === puzzle.targets[i];
  });
}

/** Results for each test run, for the readout. */
export function runResults(puzzle: Puzzle, ops: (Op | null)[]): (number | null)[] {
  if (ops.some((o) => o === null)) return puzzle.runs.map(() => null);
  const built = withOps(puzzle.shape, ops);
  return puzzle.runs.map((r) => {
    const got = evaluate(built, r);
    return Number.isFinite(got) ? got : null;
  });
}

export const ALL_OPS: Op[] = ["+", "-", "×", "÷"];
