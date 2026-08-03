import type Phaser from "phaser";
import { fams, type FactKind } from "@/lib/math/facts";
import { factorsOf } from "@/lib/math/number";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";

/**
 * Crossing — math facts as terrain.
 *
 * Stepping stones drift across a river. Only the ones that satisfy the rule hold your
 * weight; the rest sink. So *reading the board for multiples is the navigation* — strip
 * the maths out and there is no route to find, which is the intrinsic-integration test
 * from docs/research/01-pedagogy.md.
 *
 * This replaces Threading, whose drag-a-thread mechanic was unplayable: Phaser's
 * `pointerover` never fires on touch (there is no hover), and the tiles moved out from
 * under the pointer mid-drag. Tapping a stone is one unambiguous gesture that works
 * identically with a finger, a mouse and the arrow keys.
 *
 * Load-bearing design rules:
 * - **No countdown.** Urgency is the drift of the stones and nothing else. Waiting on the
 *   bank for a good stone costs nothing at all.
 * - **Sinking is free.** You go back to the near bank. No sound, no penalty, no counter.
 * - **The symbolic fade** runs on crossings completed this session, never on level, so it
 *   can never read as a difficulty label.
 */

const W = 1024;
const H = 576;

/**
 * River rows **in travel order** — index 0 is the row nearest the starting bank.
 *
 * This list used to run top-to-bottom while the frog travels bottom-to-top, so
 * `frogRow + 1` from the near bank aimed at the row beside the *far* bank and the first
 * hop crossed the entire river. Ordering the list by travel is what makes "+1" mean
 * "one row further on".
 */
export const ROW_Y = [396, 314, 232, 150];
const BANK_TOP_Y = 74;
const BANK_BOTTOM_Y = 492;

const STONE_W = 96;
const STONE_H = 58;
/** Track length: one screen plus a stone, so wrapping is invisible. */
const TRACK = W + 180;
/** How far sideways she can reach when hopping. Generous — this is not a precision test. */
const REACH = 230;
/** The frog rides slightly high on a stone so it never covers the number it landed on. */
const FROG_LIFT = 15;

/** Stage palette — the river at dusk (plan 06). Paper tokens stay outside the canvas. */
const WATER_DEEP = 0x173b47;
const RIPPLE = 0xdfeef2;
const BANK_MOSS = 0x3e5a3c;
const BANK_EDGE = 0x2f4630;
const REED = 0x55764e;
const STONE_FILL = 0xe8dcc4;
const STONE_SHADE = 0xc9b998;
const STONE_INK = "#3D352C";
const BANNER_INK = "#F2EADC";
const STRIP_INK = "#C8B99C";
const NEXT_GLOW = 0xffd873;
const FROG_BODY = 0x8fbf6a;
const FROG_DARK = 0x5d8c42;
const FIREFLY = 0xffd873;
const SIGN_WOOD = 0x8a6642;

/** Crossings completed before each fade stage. Progress-based, not level-based. */
const FADE_LIST = 2;
const FADE_HINT = 4;
/** Crossings in a round. Small enough to always be finishable. */
export const CROSSINGS_PER_ROUND = 4;

interface Stone {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Graphics;
  /** Moonlit ring shown while this stone's row is the one to hop to next. */
  ring: Phaser.GameObjects.Graphics;
  /** Phase offset so the stones bob out of step, like real water. */
  bob: number;
  value: number;
  ok: boolean;
  x: number;
  row: number;
  sinking: boolean;
}

interface Drift {
  obj: Phaser.GameObjects.Graphics | Phaser.GameObjects.Arc;
  speed: number;
  /** Fireflies wander on a sine; ripples just drift. */
  wobble: number;
  phase: number;
  baseY: number;
}

export interface Rule {
  /** "Step 7, 14, 21, 28 in order" — what the crossing actually asks for. */
  label: string;
  /** The short form the banner fades down to. */
  short: string;
  /** The scaffold list — the tutor's own skip-count row, or the factor list. */
  members: number[];
  /**
   * The value each row wants, in travel order. One per river row.
   *
   * Requiring the *next* one rather than any one is what stops the game being solvable by
   * pattern-matching: multiples of 5 all end in 0 or 5, so "is it a multiple" can be
   * answered without ever multiplying. "What comes after 35 in the fives" cannot.
   */
  sequence: number[];
  base: number;
  target?: number;
}

export interface CrossingConfig {
  kind: FactKind;
  level: number;
}

export function makeRule(
  kind: FactKind,
  level: number,
  rnd: (a: number, b: number) => number,
): Rule {
  const pool = fams(level);
  const f = pool[rnd(0, pool.length - 1)];

  const rows = ROW_Y.length;

  if (kind === "mul") {
    const members: number[] = [];
    for (let k = 1; k <= 12; k++) members.push(f * k);
    // Start anywhere in the table that leaves room for the whole crossing.
    const start = rnd(1, 12 - rows);
    const sequence = Array.from({ length: rows }, (_, i) => f * (start + i));
    return {
      label: `Step the ${f}s in order: ${sequence.join(", ")}`,
      short: `× ${f}, in order`,
      members,
      sequence,
      base: f,
    };
  }

  // Division facts asked the way they are actually used: does this number go into it?
  // Crossing means listing the factors in order, smallest first — a real skill, and one
  // you cannot fake by recognising a shape of number.
  // Room for the crossing *and* some spare factors to act as decoys. 81 has exactly four
  // factors above 1, so a four-row crossing would use every one and leave nothing on the
  // river to tempt her — the rule would be back to pure recognition.
  const need = rows + 2;
  let target = f * rnd(4, 12);
  let members = factorsOf(target).filter((n) => n >= 2 && n <= 99);
  let guard = 0;
  while (members.length < need && guard++ < 60) {
    target = f * rnd(4, 12);
    members = factorsOf(target).filter((n) => n >= 2 && n <= 99);
  }
  if (members.length < need) {
    target = f * 12;
    members = factorsOf(target).filter((n) => n >= 2 && n <= 99);
  }
  const from = rnd(0, members.length - rows);
  const sequence = members.slice(from, from + rows);
  return {
    label: `Step the numbers that divide ${target}, in order: ${sequence.join(", ")}`,
    short: `→ ${target}, in order`,
    members,
    sequence,
    base: f,
    target,
  };
}

export function createCrossingScene(P: typeof Phaser, config: CrossingConfig) {
  return class CrossingScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private level = config.level;
    private rule!: Rule;
    private rows: Stone[][] = [];
    /** -1 is the bottom bank; ROW_Y.length is the goal bank. */
    private frogRow = -1;
    private frogStone: Stone | null = null;
    private frogX = W / 2;
    private frog!: Phaser.GameObjects.Container;

    private banner!: Phaser.GameObjects.Text;
    private strip!: Phaser.GameObjects.Text;
    private ripples: Drift[] = [];
    private fireflies: Drift[] = [];
    private frogShadow!: Phaser.GameObjects.Ellipse;
    private calmMotion = false;
    private crossings = 0;
    private hopping = false;
    private askedAt = 0;
    /**
     * True between reaching the far bank and the next crossing being dealt. Without it a
     * second tap on the bank in that window counts as another crossing, and the round
     * ends after two real ones.
     */
    private landed = false;

    constructor() {
      super("crossing");
    }

    private rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

    create() {
      this.bus = this.registry.get("bus") as GameBus;
      this.calmMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.offCommand = this.bus.onCommand((cmd: GameCommand) => {
        if (cmd.type === "level:set") {
          this.level = cmd.level;
          this.crossings = 0;
          this.newCrossing(true);
        } else if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
      });

      this.drawScenery();

      this.banner = this.add
        .text(W / 2, 26, "", {
          fontFamily: "Georgia, serif",
          fontSize: "27px",
          color: BANNER_INK,
        })
        .setOrigin(0.5)
        .setDepth(4);
      this.banner.setShadow(0, 1, "#22371F", 4, true, true);
      this.strip = this.add
        .text(W / 2, 54, "", {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "16px",
          color: STRIP_INK,
        })
        .setOrigin(0.5)
        .setDepth(4);

      this.frog = this.makeFrog();

      // One gesture: tap the stone you want. Works with finger, mouse and trackpad
      // identically, and never needs a hover event.
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY));

      this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
        if (e.key === "ArrowUp" || e.key === "w") this.hopNearestUp();
        else if (e.key === "ArrowLeft" || e.key === "a") this.slide(-1);
        else if (e.key === "ArrowRight" || e.key === "d") this.slide(1);
      });

      this.newCrossing(true);
    }

    shutdown() {
      this.offCommand?.();
    }

    private drawScenery() {
      const g = this.add.graphics();

      // The river, deep and dark, with a faint band of moonlight down the middle.
      g.fillStyle(WATER_DEEP, 1);
      g.fillRect(0, BANK_TOP_Y + 4, W, BANK_BOTTOM_Y - BANK_TOP_Y - 8);
      g.fillStyle(0x1e4757, 0.55);
      g.fillEllipse(W / 2, (BANK_TOP_Y + BANK_BOTTOM_Y) / 2, W * 0.85, 240);

      // Banks: mossy turf with a darker waterline lip.
      g.fillStyle(BANK_MOSS, 1);
      g.fillRect(0, 0, W, BANK_TOP_Y + 26);
      g.fillRect(0, BANK_BOTTOM_Y - 26, W, H - BANK_BOTTOM_Y + 26);
      g.fillStyle(BANK_EDGE, 1);
      g.fillRect(0, BANK_TOP_Y + 20, W, 6);
      g.fillRect(0, BANK_BOTTOM_Y - 26, W, 6);

      // Grass tufts along both waterlines.
      g.fillStyle(REED, 1);
      for (let x = 14; x < W; x += this.rnd(34, 66)) {
        const y = Math.random() < 0.5 ? BANK_TOP_Y + 22 : BANK_BOTTOM_Y - 24;
        g.fillEllipse(x, y, this.rnd(10, 20), 7);
      }

      // Reed clumps: three stems and a seed head, a few per bank.
      for (let i = 0; i < 5; i++) {
        const rx = this.rnd(30, W - 30);
        const ry = Math.random() < 0.5 ? BANK_TOP_Y + 14 : BANK_BOTTOM_Y - 12;
        for (let s = -1; s <= 1; s++) {
          g.lineStyle(2, REED, 1);
          g.lineBetween(rx + s * 5, ry, rx + s * 7, ry - this.rnd(16, 26));
        }
        g.fillStyle(SIGN_WOOD, 1);
        g.fillEllipse(rx + 7, ry - 24, 4, 9);
      }

      // Drifting ripple glints — the water is never still.
      this.ripples = [];
      if (!this.calmMotion) {
        for (let i = 0; i < 26; i++) {
          const rg = this.add.graphics();
          rg.fillStyle(RIPPLE, 0.1 + Math.random() * 0.08);
          rg.fillRoundedRect(-14, -1.5, 28, 3, 1.5);
          rg.setPosition(
            Math.random() * W,
            BANK_TOP_Y + 40 + Math.random() * (BANK_BOTTOM_Y - BANK_TOP_Y - 80),
          );
          this.ripples.push({
            obj: rg,
            speed: 12 + Math.random() * 22,
            wobble: 0,
            phase: 0,
            baseY: 0,
          });
        }
      }

      // A painted wooden sign on the far bank, in the world instead of a floating word.
      const sign = this.add.container(W - 86, BANK_TOP_Y - 26);
      const sg = this.add.graphics();
      sg.fillStyle(0x6f5136, 1);
      sg.fillRect(-3, 10, 6, 26);
      sg.fillStyle(SIGN_WOOD, 1);
      sg.fillRoundedRect(-42, -12, 84, 26, 6);
      sign.add(sg);
      sign.add(
        this.add
          .text(0, 1, "FAR BANK", {
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: "13px",
            color: "#F2EADC",
          })
          .setOrigin(0.5),
      );
      sign.setDepth(2);

      // Fireflies over the far bank — ambient life, nothing more.
      this.fireflies = [];
      if (!this.calmMotion) {
        for (let i = 0; i < 6; i++) {
          const baseY = this.rnd(16, BANK_TOP_Y + 6);
          const fly = this.add.circle(this.rnd(20, W - 20), baseY, 2, FIREFLY, 0.85);
          fly.setDepth(3);
          this.tweens.add({
            targets: fly,
            alpha: 0.15,
            duration: 700 + Math.random() * 900,
            yoyo: true,
            repeat: -1,
            delay: Math.random() * 1200,
          });
          this.fireflies.push({
            obj: fly,
            speed: 6 + Math.random() * 10,
            wobble: 6 + Math.random() * 8,
            phase: Math.random() * Math.PI * 2,
            baseY,
          });
        }
      }
    }

    private makeFrog() {
      // Shadow first, a sibling rather than a child, so a hop can leave it behind.
      this.frogShadow = this.add.ellipse(this.frogX, BANK_BOTTOM_Y + 12, 34, 10, 0x000000, 0.25);
      this.frogShadow.setDepth(9);

      const c = this.add.container(this.frogX, BANK_BOTTOM_Y);
      const g = this.add.graphics();
      // Haunches out to the sides, then the body over them, seen from above.
      g.fillStyle(FROG_DARK, 1);
      g.fillEllipse(-13, 6, 14, 18);
      g.fillEllipse(13, 6, 14, 18);
      g.fillStyle(FROG_BODY, 1);
      g.fillEllipse(0, 0, 30, 38);
      // Back markings and a belly sheen.
      g.fillStyle(FROG_DARK, 0.55);
      g.fillEllipse(0, 6, 14, 16);
      g.fillStyle(0xffffff, 0.14);
      g.fillEllipse(-5, -8, 10, 12);
      // Eyes on top, looking up-river.
      g.fillStyle(FROG_DARK, 1);
      g.fillCircle(-8, -15, 6.5);
      g.fillCircle(8, -15, 6.5);
      g.fillStyle(0xfffcf7, 1);
      g.fillCircle(-8, -16, 4.4);
      g.fillCircle(8, -16, 4.4);
      g.fillStyle(0x22301c, 1);
      g.fillCircle(-8, -17, 2.2);
      g.fillCircle(8, -17, 2.2);
      c.add(g);
      c.setDepth(10);

      // An idle breath so the frog is alive even while she thinks.
      if (!this.calmMotion) {
        this.tweens.add({
          targets: c,
          scaleX: 1.04,
          scaleY: 0.97,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      return c;
    }

    /* ------------------------------------------------------------- board */

    private newCrossing(resetRule: boolean) {
      if (resetRule) this.rule = makeRule(config.kind, this.level, this.rnd);
      this.renderBanner();

      this.rows.flat().forEach((s) => s.container.destroy());
      this.rows = [];

      for (let r = 0; r < ROW_Y.length; r++) {
        this.rows.push(this.makeRow(r));
      }

      this.frogRow = -1;
      this.frogStone = null;
      this.frogX = W / 2;
      this.landed = false;
      this.frog.setPosition(this.frogX, BANK_BOTTOM_Y);
      this.askedAt = this.time.now;
      this.renderBanner();
      this.pushState();
    }

    /**
     * A row is a wrap-around conveyor with a fixed stone count, not a spawner. Wrapping
     * guarantees the row always has stones on screen, so there is never a wait with no
     * move available — the failure mode that makes drifting-tile games feel broken.
     */
    private makeRow(row: number): Stone[] {
      const count = 6;
      const gap = TRACK / count;
      const stones: Stone[] = [];
      // At least two safe stones per row, so a crossing always exists.
      const safeSlots = new Set<number>();
      while (safeSlots.size < 2) safeSlots.add(this.rnd(0, count - 1));

      for (let i = 0; i < count; i++) {
        const wantOk = safeSlots.has(i) || Math.random() < 0.25;
        stones.push(this.makeStone(row, i * gap - 90, wantOk));
      }
      return stones;
    }

    private pickValue(ok: boolean, row: number): number {
      if (ok) return this.rule.sequence[row];
      // The best distractors are the *other* members: 21 really is a multiple of 7, it is
      // just not the one that comes next. Recognising the rule is no longer enough.
      if (Math.random() < 0.55) {
        const others = this.rule.members.filter((n) => n !== this.rule.sequence[row]);
        if (others.length) return others[this.rnd(0, others.length - 1)];
      }
      // A near miss is the useful distractor — one away from a real multiple, so she has
      // to actually check rather than pattern-match on the shape of the number.
      for (let guard = 0; guard < 40; guard++) {
        const m = this.rule.members[this.rnd(0, this.rule.members.length - 1)];
        const n = m + (Math.random() < 0.5 ? -1 : 1) * this.rnd(1, 3);
        if (n >= 2 && n <= 99 && n !== this.rule.sequence[row]) return n;
      }
      return 97;
    }

    private makeStone(row: number, x: number, ok: boolean): Stone {
      const value = this.pickValue(ok, row);
      const realOk = value === this.rule.sequence[row];
      const container = this.add.container(x, ROW_Y[row]);

      // The moonlit ring, lit only while this row is the one to hop to next.
      const ring = this.add.graphics();
      ring.lineStyle(2.5, NEXT_GLOW, 0.55);
      ring.strokeEllipse(0, 2, STONE_W + 14, STONE_H + 12);
      ring.setVisible(false);

      const bg = this.add.graphics();
      // A worn river stone: dark waterline, shaded underside, lit top.
      bg.fillStyle(0x0e2831, 0.6);
      bg.fillEllipse(0, 6, STONE_W + 8, STONE_H + 2);
      bg.fillStyle(STONE_SHADE, 1);
      bg.fillEllipse(0, 3, STONE_W, STONE_H);
      bg.fillStyle(STONE_FILL, 1);
      bg.fillEllipse(0, -2, STONE_W - 4, STONE_H - 8);
      bg.fillStyle(0xffffff, 0.35);
      bg.fillEllipse(-STONE_W / 5, -STONE_H / 4, STONE_W / 2.4, STONE_H / 3.6);

      const label = this.add
        .text(0, -2, String(value), {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "28px",
          fontStyle: "bold",
          color: STONE_INK,
        })
        .setOrigin(0.5);
      container.add([ring, bg, label]);
      return {
        container,
        label,
        bg,
        ring,
        bob: Math.random() * Math.PI * 2,
        value,
        ok: realOk,
        x,
        row,
        sinking: false,
      };
    }

    private renderBanner() {
      this.banner.setText(this.crossings < FADE_HINT ? this.rule.label : this.rule.short);
      // The ladder shows what she has stepped and what is still ahead, so the sequence is
      // visible rather than remembered. It fades as the crossings add up.
      const done = Math.max(0, this.frogRow + 1);
      const ladder = this.rule.sequence
        .map((v, i) => (i < done ? String(v) : i === done ? `[${v}]` : "?"))
        .join("   ");
      if (this.crossings < FADE_LIST) {
        this.strip.setText(ladder);
        this.strip.setAlpha(1);
      } else if (this.crossings < FADE_HINT) {
        this.strip.setText(ladder);
        this.strip.setAlpha(0.6);
      } else {
        this.strip.setText("");
      }
    }

    /** What the panel beside the board needs to narrate the crossing. */
    private pushState() {
      const step = Math.max(0, this.frogRow + 1);
      this.bus.emit({
        type: "state",
        payload: {
          kind: config.kind,
          base: this.rule.base,
          target: this.rule.target ?? null,
          sequence: this.rule.sequence,
          step: Math.min(step, this.rule.sequence.length - 1),
          onBank: this.frogRow < 0,
          crossings: this.crossings,
          done: this.frogRow >= ROW_Y.length,
        },
      });
    }

    /* ----------------------------------------------------------- movement */

    private rowOf(y: number): number {
      let best = -1;
      let bestD = Infinity;
      ROW_Y.forEach((ry, i) => {
        const d = Math.abs(ry - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return bestD < 52 ? best : -2;
    }

    private frogY(): number {
      if (this.frogRow < 0) return BANK_BOTTOM_Y;
      if (this.frogRow >= ROW_Y.length) return BANK_TOP_Y;
      return ROW_Y[this.frogRow];
    }

    /** The row she may hop into: one nearer the top bank. */
    private nextRow(): number {
      return this.frogRow + 1;
    }

    private onTap(x: number, y: number) {
      if (this.hopping) return;
      const target = this.nextRow();

      // Tapping the goal bank from the last river row finishes the crossing.
      if (target >= ROW_Y.length) {
        if (y < BANK_TOP_Y + 40) this.reachBank();
        return;
      }

      const row = this.rowOf(y);
      if (row !== target) return;

      const stone = this.rows[target]
        .filter((s) => !s.sinking && Math.abs(s.container.x - x) < STONE_W)
        .sort(
          (a, b) =>
            Math.abs(a.container.x - x) - Math.abs(b.container.x - x),
        )[0];
      if (!stone) return;
      if (Math.abs(stone.container.x - this.frogX) > REACH) {
        // Out of reach: nudge rather than sink. Punishing a tap she could not have made
        // would teach her to stop tapping.
        this.tweens.add({ targets: this.frog, x: this.frogX + 8, duration: 60, yoyo: true });
        return;
      }
      this.hopTo(stone);
    }

    private hopNearestUp() {
      if (this.hopping) return;
      const target = this.nextRow();
      if (target >= ROW_Y.length) {
        this.reachBank();
        return;
      }
      const stone = this.rows[target]
        .filter((s) => !s.sinking && Math.abs(s.container.x - this.frogX) <= REACH)
        .sort(
          (a, b) =>
            Math.abs(a.container.x - this.frogX) - Math.abs(b.container.x - this.frogX),
        )[0];
      if (stone) this.hopTo(stone);
    }

    /** Shuffle along the stone you are on — or along the bank. */
    private slide(dir: number) {
      if (this.hopping || this.frogStone) return;
      this.frogX = Math.max(40, Math.min(W - 40, this.frogX + dir * 70));
      this.frog.setPosition(this.frogX, this.frogY());
    }

    private hopTo(stone: Stone) {
      this.hopping = true;
      const fromRow = this.frogRow;
      const dur = 200;

      // Squash to load the jump, stretch through the air, land() squashes again.
      if (!this.calmMotion) {
        this.tweens.add({
          targets: this.frog,
          scaleX: 1.25,
          scaleY: 0.75,
          duration: 55,
          yoyo: true,
          onComplete: () => {
            this.tweens.add({ targets: this.frog, scaleX: 0.85, scaleY: 1.2, duration: 70 });
          },
        });
        // The shadow stays on the water and shrinks while the frog is airborne.
        this.frogShadow.setPosition(this.frog.x, this.frogY() + 14);
        this.tweens.add({
          targets: this.frogShadow,
          x: stone.container.x,
          y: ROW_Y[stone.row] + 12,
          scaleX: 0.6,
          scaleY: 0.6,
          alpha: 0.12,
          duration: dur,
          ease: "Quad.easeOut",
        });
      }

      this.tweens.add({
        targets: this.frog,
        x: stone.container.x,
        y: ROW_Y[stone.row] - FROG_LIFT,
        duration: dur,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.hopping = false;
          if (!this.calmMotion) {
            this.frogShadow.setScale(1).setAlpha(0.25);
            this.frogShadow.setPosition(stone.container.x, ROW_Y[stone.row] + 12);
          }
          this.land(stone, fromRow);
        },
      });
    }

    private land(stone: Stone, _fromRow: number) {
      this.bus.emit({
        type: "attempt",
        prompt: {
          kind: config.kind,
          rule: this.rule.short,
          base: this.rule.base,
          target: this.rule.target,
          wanted: this.rule.sequence[stone.row],
        },
        response: { value: stone.value, ok: stone.ok },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;

      if (!stone.ok) {
        this.sink(stone);
        return;
      }

      this.frogRow = stone.row;
      this.frogStone = stone;
      this.frogX = stone.container.x;
      this.renderBanner();
      this.pushState();
      stone.bg.setAlpha(1);
      // The landing has weight: the frog squashes, the stone dips and rings the water.
      if (!this.calmMotion) {
        this.tweens.add({ targets: this.frog, scaleX: 1.15, scaleY: 0.85, duration: 70, yoyo: true });
        this.splash(stone.container.x, ROW_Y[stone.row] + 8, 0.5);
      }
      this.tweens.add({
        targets: stone.container,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 110,
        yoyo: true,
      });
    }

    /** Expanding ripple rings on the water. Scale tracks how big the event was. */
    private splash(x: number, y: number, size: number) {
      for (let i = 0; i < 2; i++) {
        const ring = this.add.graphics();
        ring.lineStyle(2, RIPPLE, 0.4 - i * 0.15);
        ring.strokeEllipse(0, 0, 30, 12);
        ring.setPosition(x, y);
        ring.setDepth(8);
        this.tweens.add({
          targets: ring,
          scaleX: (2.2 + i) * size * 2,
          scaleY: (2.2 + i) * size * 2,
          alpha: 0,
          duration: 520 + i * 160,
          ease: "Cubic.easeOut",
          onComplete: () => ring.destroy(),
        });
      }
    }

    /** Free and silent. The plop is drawn — rings, a dip below the surface — and the
     *  frog pops back up on the near bank with a shake-off wiggle. No penalty anywhere. */
    private sink(stone: Stone) {
      stone.sinking = true;
      this.frogStone = null;
      if (!this.calmMotion) {
        this.splash(stone.container.x, stone.container.y + 4, 1);
        this.frogShadow.setAlpha(0);
      }
      this.tweens.add({
        targets: [stone.container, this.frog],
        alpha: 0.15,
        y: `+=${this.calmMotion ? 0 : 10}`,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 230,
        ease: "Quad.easeIn",
        onComplete: () => {
          stone.sinking = false;
          stone.container.setAlpha(1);
          stone.container.setScale(1);
          stone.container.y = ROW_Y[stone.row];
          this.frog.setScale(1);
          this.frogRow = -1;
          this.frogX = W / 2;
          this.frog.setPosition(this.frogX, BANK_BOTTOM_Y);
          this.frog.setAlpha(1);
          if (!this.calmMotion) {
            this.frogShadow.setAlpha(0.25);
            this.frogShadow.setPosition(this.frogX, BANK_BOTTOM_Y + 12);
            // Shake the water off.
            this.tweens.add({
              targets: this.frog,
              angle: { from: -8, to: 8 },
              duration: 70,
              yoyo: true,
              repeat: 2,
              onComplete: () => this.frog.setAngle(0),
            });
          }
          this.renderBanner();
          this.pushState();
        },
      });
    }

    private reachBank() {
      if (this.landed) return;
      // Only from the last river row — you cannot tap the far bank from the near one.
      if (this.frogRow !== ROW_Y.length - 1) return;
      this.landed = true;
      this.crossings++;
      this.frogRow = ROW_Y.length;
      this.frogStone = null;
      this.frog.setPosition(this.frogX, BANK_TOP_Y);
      // Made it: a happy double bounce on the far bank.
      if (!this.calmMotion) {
        this.tweens.add({
          targets: this.frog,
          y: BANK_TOP_Y - 12,
          duration: 130,
          yoyo: true,
          repeat: 1,
          ease: "Quad.easeOut",
        });
      }

      this.bus.emit({
        type: "round:complete",
        payload: {
          crossings: this.crossings,
          rule: this.rule.label,
          done: this.crossings >= CROSSINGS_PER_ROUND,
        },
      });

      if (this.crossings < CROSSINGS_PER_ROUND) {
        this.time.delayedCall(420, () => this.newCrossing(true));
      }
    }

    update(t: number, delta: number) {
      const dt = delta / 1000;
      // Speed is the only difficulty knob, and it never accelerates within a crossing.
      const base = 34 + this.level * 5;
      const next = this.nextRow();

      this.rows.forEach((stones, row) => {
        const dir = row % 2 === 0 ? 1 : -1;
        const speed = base * (1 + row * 0.08) * dir;
        for (const s of stones) {
          s.container.x += speed * dt;
          if (s.container.x > TRACK - 90) s.container.x -= TRACK;
          else if (s.container.x < -90) s.container.x += TRACK;
          // Bob on the water, each stone out of phase; skip while a sink is animating.
          if (!s.sinking && !this.calmMotion) {
            s.container.y = ROW_Y[s.row] + Math.sin(t / 480 + s.bob) * 2.4;
          }
          // Moonlight on the row she can actually hop to.
          s.ring.setVisible(s.row === next && !s.sinking);
        }
      });

      // Ambient water and fireflies.
      for (const r of this.ripples) {
        r.obj.x += r.speed * dt;
        if (r.obj.x > W + 20) r.obj.x = -20;
      }
      for (const f of this.fireflies) {
        f.obj.x += f.speed * dt;
        f.obj.y = f.baseY + Math.sin(t / 700 + f.phase) * f.wobble;
        if (f.obj.x > W + 10) f.obj.x = -10;
      }

      // Ride the stone you are standing on — including its bob.
      if (this.frogStone && !this.hopping) {
        this.frogX = this.frogStone.container.x;
        this.frog.setPosition(this.frogX, this.frogStone.container.y - FROG_LIFT);
        this.frogShadow.setPosition(this.frogX, this.frogStone.container.y + 12);
        // Carried off the edge — same free reset as a sink.
        if (this.frogX < -20 || this.frogX > W + 20) {
          const s = this.frogStone;
          this.frogStone = null;
          this.sink(s);
        }
      } else if (!this.hopping) {
        this.frogShadow.setPosition(this.frog.x, this.frogY() + 12);
      }
    }
  };
}

export const CROSSING_SIZE = { W, H };
