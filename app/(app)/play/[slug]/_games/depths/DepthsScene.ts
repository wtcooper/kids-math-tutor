import type Phaser from "phaser";
import type { GameBus, GameCommand } from "@/components/game/PhaserGame";
import {
  bounty,
  type DepthsSave,
  FRESH_SAVE,
  genFloor,
  strike,
  type FloorSpec,
} from "./depths-model";

/**
 * The Number Depths — the mine itself.
 *
 * One long cavern, four chambers, sealed by rune doors. The explorer walks with the
 * arrow keys or a tap; the lantern goes with her. Shield-beetles patrol, and the maths
 * is the equipment: strikes are typed divisors, doors are typed shares and solves,
 * chests are typed products (all asked in HTML by the host — the scene only pauses and
 * points). Nothing here can hurt her: a wrong strike shoves, a caught beetle just
 * starts the fight, and fleeing is always allowed.
 *
 * The save (floor, coins, xp, shells shattered) persists in localStorage, so the mine
 * is a place she RETURNS to — the first game in the set where progress accumulates.
 */

const W = 1024;
const H = 576;

const CAVE = 0x241b14;
const CAVE_DEEP = 0x191009;
const WALL = 0x3a2c1e;
const WALL_LIT = 0x54402c;
const DOOR_STONE = 0x5c4a63;
const RUNE = 0xc9a2f0;
const CRYSTAL = 0x6fc3e8;
const LANTERN = 0xffd873;
const MINER_COAT = 0x6d8e68;
const MINER_SKIN = 0xe8c9a8;
const BEETLE = 0x7b4b6e;
const BEETLE_SHELL = 0x9a6b8c;
const PLAQUE_INK = "#FDF6E5";
const COIN = 0xe3c14a;

const BARRIERS = [268, 536, 804];
const LADDER_X = 972;
const TOP = 96;
const BOTTOM = 500;
const SPEED = 210;

const SAVE_KEY = "mathtable:depths:v1";

interface Monster {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  shell: number;
  chamber: number;
  dead: boolean;
  cooldownUntil: number;
  patrolDir: number;
}

interface Interactable {
  kind: "door" | "chest";
  index: number;
  x: number;
  y: number;
  done: boolean;
  obj: Phaser.GameObjects.Container;
  dismissedUntil: number;
}

function loadSave(): DepthsSave {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) return { ...FRESH_SAVE, ...(JSON.parse(raw) as DepthsSave) };
  } catch {
    /* fresh it is */
  }
  return { ...FRESH_SAVE };
}

export function createDepthsScene(P: typeof Phaser, _config: { level: number }) {
  return class DepthsScene extends P.Scene {
    private bus!: GameBus;
    private offCommand?: () => void;

    private save: DepthsSave = { ...FRESH_SAVE };
    private floor!: FloorSpec;
    private monsters: Monster[] = [];
    private things: Interactable[] = [];
    private openDoors = new Set<number>();
    private miner!: Phaser.GameObjects.Container;
    private lantern!: Phaser.GameObjects.Arc;
    private minerX = 60;
    private minerY = 300;
    private target: { x: number; y: number } | null = null;
    private keys?: Record<string, Phaser.Input.Keyboard.Key>;
    /** What the host should be asking about right now. */
    private engaged: { kind: "monster" | "door" | "chest"; index: number } | null = null;
    private strikes: string[] = [];
    private askedAt = 0;
    private floorCoins = 0;
    private floorXp = 0;
    private calmMotion = false;

    constructor() {
      super("depths");
    }

    private rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

    create() {
      this.bus = this.registry.get("bus") as GameBus;
      this.calmMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.save = typeof window !== "undefined" ? loadSave() : { ...FRESH_SAVE };

      this.offCommand = this.bus.onCommand((cmd: GameCommand) => {
        if (cmd.type === "pause") this.scene.pause();
        else if (cmd.type === "resume") this.scene.resume();
        else if (cmd.type === "next") {
          // Descend: the save's floor advanced when the ladder was reached.
          this.buildFloor();
        } else if (cmd.type === "reset") {
          this.save = { ...FRESH_SAVE };
          this.persist();
          this.buildFloor();
        }
      });

      this.buildFloor();

      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        this.target = { x: p.worldX, y: Math.max(TOP, Math.min(BOTTOM, p.worldY)) };
      });
      this.keys = this.input.keyboard?.addKeys("LEFT,RIGHT,UP,DOWN,W,A,S,D") as Record<
        string,
        Phaser.Input.Keyboard.Key
      >;
    }

    shutdown() {
      this.offCommand?.();
    }

    private persist() {
      try {
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
      } catch {
        /* the run still plays; it just won't be remembered */
      }
    }

    private buildFloor() {
      this.children.removeAll();
      this.monsters = [];
      this.things = [];
      this.openDoors = new Set();
      this.engaged = null;
      this.strikes = [];
      this.floorCoins = 0;
      this.floorXp = 0;
      this.floor = genFloor(this.save.floor, this.rnd);
      this.minerX = 60;
      this.minerY = 300;
      this.target = null;

      this.drawCave();
      this.miner = this.makeMiner();

      // Monsters: one per sealed chamber.
      this.floor.shells.forEach((shell, i) => {
        this.monsters.push(this.makeMonster(shell, i));
      });
      // Doors on the barriers.
      this.floor.doors.forEach((_, i) => {
        this.things.push(this.makeDoor(i));
      });
      // Chests tucked into chambers 1 and 2.
      this.floor.chests.forEach((_, i) => {
        this.things.push(this.makeChest(i));
      });

      this.askedAt = this.time.now;
      this.pushState();
    }

    private drawCave() {
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(CAVE, 1);
      g.fillRect(0, 0, W, H);
      g.fillStyle(CAVE_DEEP, 1);
      g.fillRect(0, 0, W, TOP - 26);
      g.fillRect(0, BOTTOM + 26, W, H - BOTTOM - 26);
      // Rocky wall lips.
      for (let x = 0; x < W; x += 26) {
        g.fillStyle(WALL, 1);
        g.fillCircle(x + 13, TOP - 26, 18 + ((x * 5) % 9));
        g.fillCircle(x + 13, BOTTOM + 26, 18 + ((x * 7) % 9));
      }
      // Scattered floor rubble and glow-crystals.
      for (let i = 0; i < 26; i++) {
        g.fillStyle(WALL_LIT, 0.5);
        g.fillEllipse(this.rnd(20, W - 20), this.rnd(TOP + 10, BOTTOM - 10), this.rnd(6, 16), 5);
      }
      for (let i = 0; i < 7; i++) {
        const cx = this.rnd(30, W - 30);
        const cy = this.rnd(TOP, BOTTOM);
        const c = this.add.graphics().setDepth(1);
        c.fillStyle(CRYSTAL, 0.85);
        c.fillTriangle(cx, cy - 9, cx - 6, cy + 4, cx + 6, cy + 4);
        if (!this.calmMotion) {
          this.tweens.add({
            targets: c,
            alpha: 0.35,
            duration: 900 + Math.random() * 1200,
            yoyo: true,
            repeat: -1,
          });
        }
      }
      // The exit ladder, glowing faintly at the far end.
      const lg = this.add.graphics().setDepth(1);
      lg.lineStyle(4, 0xc9a36b, 1);
      lg.lineBetween(LADDER_X - 10, 180, LADDER_X - 10, 340);
      lg.lineBetween(LADDER_X + 10, 180, LADDER_X + 10, 340);
      for (let y = 195; y < 340; y += 24) lg.lineBetween(LADDER_X - 10, y, LADDER_X + 10, y);
      this.add
        .text(LADDER_X, 158, "down", {
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "12px",
          color: "#C9B48A",
        })
        .setOrigin(0.5)
        .setDepth(1);

      // The lantern glow rides above the scenery, below the actors.
      this.lantern = this.add.circle(this.minerX, this.minerY, 130, LANTERN, 0.09).setDepth(2);
    }

    private makeMiner() {
      const c = this.add.container(this.minerX, this.minerY).setDepth(6);
      const g = this.add.graphics();
      g.fillStyle(0x0e0a06, 0.5);
      g.fillEllipse(0, 15, 26, 8);
      g.fillStyle(MINER_COAT, 1);
      g.fillEllipse(0, 4, 18, 20);
      g.fillStyle(MINER_SKIN, 1);
      g.fillCircle(0, -9, 7);
      g.fillStyle(0xce9430, 1);
      g.fillEllipse(0, -14, 15, 7);
      g.fillStyle(LANTERN, 1);
      g.fillCircle(0, -15, 2.6);
      c.add(g);
      if (!this.calmMotion) {
        this.tweens.add({
          targets: c,
          scaleY: 0.97,
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      return c;
    }

    private chamberBounds(i: number): [number, number] {
      const left = i === 0 ? 24 : BARRIERS[i - 1] + 24;
      const right = i >= BARRIERS.length ? W - 24 : BARRIERS[i] - 24;
      return [left, right];
    }

    private makeMonster(shell: number, chamber: number): Monster {
      const [lo, hi] = this.chamberBounds(chamber);
      const x = this.rnd(lo + 40, hi - 40);
      const y = this.rnd(TOP + 60, BOTTOM - 60);
      const c = this.add.container(x, y).setDepth(5);
      const g = this.add.graphics();
      g.fillStyle(0x0e0a06, 0.5);
      g.fillEllipse(0, 16, 40, 10);
      // Legs, then the dome shell, then eyes.
      g.fillStyle(BEETLE, 1);
      for (let i = -2; i <= 2; i++) g.fillEllipse(i * 9, 14, 5, 8);
      g.fillStyle(BEETLE_SHELL, 1);
      g.fillEllipse(0, 0, 52, 40);
      g.fillStyle(BEETLE, 1);
      g.fillEllipse(0, -4, 40, 26);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(-8, 10, 3);
      g.fillCircle(8, 10, 3);
      g.fillStyle(0x2a1b26, 1);
      g.fillCircle(-8, 11, 1.5);
      g.fillCircle(8, 11, 1.5);
      c.add(g);
      const label = this.add
        .text(0, -4, String(shell), {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "19px",
          fontStyle: "bold",
          color: PLAQUE_INK,
        })
        .setOrigin(0.5);
      label.setShadow(0, 1, "#2A1B26", 4, true, true);
      c.add(label);
      return {
        container: c,
        label,
        shell,
        chamber,
        dead: false,
        cooldownUntil: 0,
        patrolDir: this.rnd(0, 1) === 0 ? -1 : 1,
      };
    }

    private makeDoor(index: number): Interactable {
      const x = BARRIERS[index];
      const c = this.add.container(x, (TOP + BOTTOM) / 2).setDepth(4);
      const g = this.add.graphics();
      g.fillStyle(DOOR_STONE, 1);
      g.fillRoundedRect(-16, -(BOTTOM - TOP) / 2, 32, BOTTOM - TOP, 10);
      g.lineStyle(2, RUNE, 0.8);
      g.strokeRoundedRect(-16, -(BOTTOM - TOP) / 2, 32, BOTTOM - TOP, 10);
      c.add(g);
      const rune = this.add
        .text(0, 0, "?", {
          fontFamily: "Georgia, serif",
          fontSize: "26px",
          color: "#C9A2F0",
        })
        .setOrigin(0.5);
      c.add(rune);
      if (!this.calmMotion) {
        this.tweens.add({ targets: rune, alpha: 0.4, duration: 1000, yoyo: true, repeat: -1 });
      }
      return {
        kind: "door",
        index,
        x,
        y: (TOP + BOTTOM) / 2,
        done: false,
        obj: c,
        dismissedUntil: 0,
      };
    }

    private makeChest(index: number): Interactable {
      const chamber = index; // chests live in chambers 0 and 1
      const [lo, hi] = this.chamberBounds(chamber);
      const x = this.rnd(lo + 50, hi - 50);
      const y = this.rnd(0, 1) === 0 ? TOP + 40 : BOTTOM - 40;
      const c = this.add.container(x, y).setDepth(4);
      const g = this.add.graphics();
      g.fillStyle(0x0e0a06, 0.5);
      g.fillEllipse(0, 12, 34, 8);
      g.fillStyle(0x8a6642, 1);
      g.fillRoundedRect(-16, -10, 32, 22, 5);
      g.fillStyle(0xa8794e, 1);
      g.fillRoundedRect(-16, -12, 32, 10, 5);
      g.fillStyle(COIN, 1);
      g.fillCircle(0, 0, 4);
      c.add(g);
      if (!this.calmMotion) {
        this.tweens.add({ targets: c, y: y - 3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
      return { kind: "chest", index, x, y, done: false, obj: c, dismissedUntil: 0 };
    }

    private pushState() {
      const monster = this.engaged?.kind === "monster" ? this.monsters[this.engaged.index] : null;
      this.bus.emit({
        type: "state",
        payload: {
          floor: this.save.floor,
          coins: this.save.coins,
          xp: this.save.xp,
          beaten: this.save.beaten,
          engaged: this.engaged
            ? {
                kind: this.engaged.kind,
                shell: monster?.shell ?? null,
                strikes: [...this.strikes],
                door:
                  this.engaged.kind === "door" ? this.floor.doors[this.engaged.index] : null,
                chest:
                  this.engaged.kind === "chest" ? this.floor.chests[this.engaged.index] : null,
              }
            : null,
          monstersLeft: this.monsters.filter((m) => !m.dead).length,
          doorsOpen: this.openDoors.size,
        },
      });
    }

    /* ------------------------------------------------ engagement, from the host */

    private engage(kind: "monster" | "door" | "chest", index: number) {
      this.engaged = { kind, index };
      this.strikes = [];
      this.target = null;
      this.scene.pause();
      this.askedAt = this.time.now;
      this.pushState();
    }

    /** She backed away from the prompt. Free, with a beat of quiet from that thing. */
    disengage() {
      if (!this.engaged) return;
      const e = this.engaged;
      this.engaged = null;
      if (e.kind === "monster") {
        const m = this.monsters[e.index];
        if (m && !m.dead) {
          m.cooldownUntil = this.time.now + 1600;
          const [lo, hi] = this.chamberBounds(m.chamber);
          m.container.x = Math.max(lo, Math.min(hi, m.container.x + (m.container.x > this.minerX ? 60 : -60)));
        }
      } else {
        const t = this.things.find((th) => th.kind === e.kind && th.index === e.index);
        if (t) t.dismissedUntil = this.time.now + 1600;
      }
      this.scene.resume();
      this.pushState();
    }

    /** A typed divisor swings at the engaged monster's shell. */
    strikeMonster(d: number) {
      if (this.engaged?.kind !== "monster") return;
      const m = this.monsters[this.engaged.index];
      if (!m || m.dead) return;
      const out = strike(m.shell, d);

      this.bus.emit({
        type: "attempt",
        prompt: { kind: "strike", shell: m.shell, floor: this.save.floor },
        response: { d, result: out.result },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;

      if (out.result === "bounce") {
        this.strikes.push(`${d} — bounced off ${m.shell}`);
        this.pushState();
        return;
      }

      this.save.xp += 1;
      if (out.result === "split") {
        this.strikes.push(`${m.shell} ÷ ${d} = ${out.shell}`);
        m.shell = out.shell;
        m.label.setText(String(out.shell));
        m.container.setScale(Math.max(0.7, m.container.scaleX - 0.09));
        this.persist();
        this.pushState();
        return;
      }

      // Shatter: the core was prime.
      this.strikes.push(`${m.shell} ÷ ${d} = ${out.shell} — prime! it shatters`);
      const pay = bounty(out.shell);
      this.save.coins += pay;
      this.save.beaten += 1;
      this.floorCoins += pay;
      m.dead = true;
      this.persist();
      const { x, y } = m.container;
      m.container.destroy();
      this.engaged = null;
      this.scene.resume();
      if (!this.calmMotion) {
        for (let i = 0; i < 10; i++) {
          const p = this.add.circle(x, y, 2.5, BEETLE_SHELL, 0.9).setDepth(6);
          const a = Math.random() * Math.PI * 2;
          this.tweens.add({
            targets: p,
            x: x + Math.cos(a) * 44,
            y: y + Math.sin(a) * 44,
            alpha: 0,
            duration: 420,
            onComplete: () => p.destroy(),
          });
        }
        const coin = this.add.circle(x, y, 6, COIN, 1).setDepth(7);
        this.tweens.add({ targets: coin, y: y - 36, alpha: 0, duration: 600, onComplete: () => coin.destroy() });
      }
      this.pushState();
    }

    /** A typed answer for the engaged door. */
    answerDoor(v: number) {
      if (this.engaged?.kind !== "door") return;
      const i = this.engaged.index;
      const spec = this.floor.doors[i];
      const ok = v === spec.answer;
      this.bus.emit({
        type: "attempt",
        prompt: { kind: "door", text: spec.text, floor: this.save.floor },
        response: { v, ok },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;
      if (!ok) {
        this.strikes.push(`${v} — the door doesn't budge`);
        this.pushState();
        return;
      }
      this.save.xp += 1;
      this.persist();
      const door = this.things.find((t) => t.kind === "door" && t.index === i)!;
      door.done = true;
      this.openDoors.add(i);
      this.engaged = null;
      this.scene.resume();
      this.tweens.add({
        targets: door.obj,
        y: door.obj.y - (BOTTOM - TOP) - 40,
        alpha: 0,
        duration: this.calmMotion ? 0 : 650,
        ease: "Quad.easeIn",
      });
      this.pushState();
    }

    /** A typed answer for the engaged chest. */
    answerChest(v: number) {
      if (this.engaged?.kind !== "chest") return;
      const i = this.engaged.index;
      const spec = this.floor.chests[i];
      const ok = v === spec.answer;
      this.bus.emit({
        type: "attempt",
        prompt: { kind: "chest", text: spec.text, floor: this.save.floor },
        response: { v, ok },
        elapsedMs: Math.max(0, Math.round(this.time.now - this.askedAt)),
      });
      this.askedAt = this.time.now;
      if (!ok) {
        this.strikes.push(`${v} — the lid stays shut`);
        this.pushState();
        return;
      }
      this.save.xp += 1;
      this.save.coins += spec.answer;
      this.floorCoins += spec.answer;
      this.persist();
      const chest = this.things.find((t) => t.kind === "chest" && t.index === i)!;
      chest.done = true;
      this.engaged = null;
      this.scene.resume();
      if (!this.calmMotion) {
        const { x, y } = chest.obj;
        for (let k = 0; k < 6; k++) {
          const c = this.add.circle(x, y - 6, 4, COIN, 1).setDepth(7);
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
          this.tweens.add({
            targets: c,
            x: x + Math.cos(a) * 40,
            y: y + Math.sin(a) * 40,
            alpha: 0,
            duration: 550,
            onComplete: () => c.destroy(),
          });
        }
      }
      this.pushState();
    }

    private reachLadder() {
      this.save.floor += 1;
      this.persist();
      this.bus.emit({
        type: "round:complete",
        payload: {
          clearedFloor: this.save.floor - 1,
          nextFloor: this.save.floor,
          coins: this.save.coins,
          floorCoins: this.floorCoins,
          xp: this.save.xp,
          beaten: this.save.beaten,
        },
      });
      this.scene.pause();
    }

    update(t: number, delta: number) {
      if (this.engaged) return;
      const dt = delta / 1000;

      // --- Walk -----------------------------------------------------------
      let vx = 0;
      let vy = 0;
      const k = this.keys;
      if (k) {
        if (k.LEFT?.isDown || k.A?.isDown) vx -= 1;
        if (k.RIGHT?.isDown || k.D?.isDown) vx += 1;
        if (k.UP?.isDown || k.W?.isDown) vy -= 1;
        if (k.DOWN?.isDown || k.S?.isDown) vy += 1;
      }
      if (vx || vy) {
        this.target = null;
        const len = Math.hypot(vx, vy);
        this.minerX += (vx / len) * SPEED * dt;
        this.minerY += (vy / len) * SPEED * dt;
      } else if (this.target) {
        const dx = this.target.x - this.minerX;
        const dy = this.target.y - this.minerY;
        const d = Math.hypot(dx, dy);
        if (d < 6) this.target = null;
        else {
          this.minerX += (dx / d) * SPEED * dt;
          this.minerY += (dy / d) * SPEED * dt;
        }
      }
      this.minerY = Math.max(TOP, Math.min(BOTTOM, this.minerY));
      this.minerX = Math.max(24, Math.min(W - 24, this.minerX));
      // Closed doors are walls.
      for (let i = 0; i < BARRIERS.length; i++) {
        if (this.openDoors.has(i)) continue;
        const bx = BARRIERS[i];
        if (Math.abs(this.minerX - bx) < 26) {
          this.minerX = this.minerX < bx ? bx - 26 : bx + 26;
        }
      }
      this.miner.setPosition(this.minerX, this.minerY);
      this.lantern.setPosition(this.minerX, this.minerY);

      // --- Monsters -------------------------------------------------------
      const minerChamber = BARRIERS.filter((b) => this.minerX > b).length;
      for (const m of this.monsters) {
        if (m.dead) continue;
        const [lo, hi] = this.chamberBounds(m.chamber);
        if (m.chamber === minerChamber && t > m.cooldownUntil) {
          const dx = this.minerX - m.container.x;
          const dy = this.minerY - m.container.y;
          const d = Math.hypot(dx, dy);
          if (d < 300) {
            const sp = 30 + this.save.floor * 3;
            m.container.x += (dx / d) * sp * dt;
            m.container.y += (dy / d) * sp * dt;
            if (d < 32) {
              this.engage("monster", this.monsters.indexOf(m));
              return;
            }
          }
        } else {
          m.container.x += m.patrolDir * 22 * dt;
          if (m.container.x < lo + 30 || m.container.x > hi - 30) m.patrolDir *= -1;
        }
        if (!this.calmMotion) m.container.setAngle(Math.sin(t / 160 + m.shell) * 2.5);
      }

      // --- Doors and chests: walk close and the question opens -------------
      for (const th of this.things) {
        if (th.done || t < th.dismissedUntil) continue;
        const d = Math.hypot(this.minerX - th.x, this.minerY - (th.kind === "door" ? this.minerY : th.y));
        const dx = Math.abs(this.minerX - th.x);
        if (th.kind === "door" ? dx < 42 : d < 46) {
          this.engage(th.kind, th.index);
          return;
        }
      }

      // --- The ladder down --------------------------------------------------
      if (minerChamber === BARRIERS.length && this.minerX > LADDER_X - 20 && Math.abs(this.minerY - 260) < 90) {
        this.reachLadder();
      }
    }
  };
}

export const DEPTHS_SIZE = { W, H };
