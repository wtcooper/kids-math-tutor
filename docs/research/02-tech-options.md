# Engine and tech options, August 2026

Constraint: this lives inside the existing Next.js 16 app on Vercel, behind the
Clerk gate. Whatever we pick has to mount in a React route without a second
deployment pipeline.

---

## 2D — the workhorse tier

### Phaser 4 — the default recommendation

- **v4.2.1 current.** Phaser 4 shipped April 2026: ground-up new GPU-driven
  renderer, ~1M animated sprites in a single draw call, unified filter system
  (bloom/glow/shadow). Public API stayed almost identical to v3, so the entire
  decade of Phaser 3 tutorials and StackOverflow answers still applies — this
  matters more than it sounds for a side project.
- Batteries included: scene manager, Arcade + Matter.js physics, tweens, input,
  audio, tilemaps, particles. For Breakout/Snake/platformer shapes, everything
  needed is already there.
- **There is an official `phaserjs/template-nextjs`** — TypeScript, hot reload,
  and a documented React↔Phaser event bridge. That bridge is the important part:
  it's how a game reports "she mastered 3/4 + 1/6" back to React so it can be
  persisted.
- Free, open source, MIT. Largest ecosystem of any web game framework.
- Cost: ~1.2MB bundle. Irrelevant here — it's one lazy-loaded route, not the
  landing page.
- New in July 2026: **PhaserJSX**, a JSX/hooks UI layer for Phaser 4, if the
  in-game HUD gets complicated.

### PixiJS v8 — only if we hit a wall

WebGPU-first, fastest pure 2D renderer, ~450KB (roughly a third of Phaser), best-
in-class TypeScript. But it is a *renderer*, not an engine — no physics, no scene
management, no input handling. We would build those ourselves.

**Verdict: not for this project.** We want to write ten small games, not one
engine. Pixi is the right answer when you need custom rendering or you're doing
interactive dataviz rather than games. Worth knowing Phaser 3 used Pixi
internally, so the ceiling is similar.

### Plain React + SVG/Canvas — genuinely viable for some games

Several of the best candidate games (a number-line game, a ratio-table puzzle, a
fraction-bar slicer) have no physics, no sprites, and 10 moving parts. Reaching
for Phaser there is overkill and slows iteration. The existing tutor already
draws to-scale SVG shapes with no library at all.

**Use the engine where there is motion and collision; use React where there is
manipulation and layout.** Mixing is fine — they're separate routes.

---

## 3D — the Minecraft tier

Both kids like Minecraft, so this is worth taking seriously, but it is a
different order of effort. Rough download share, Feb 2026: Three.js ~3.5M/week,
React Three Fiber ~900K, Babylon.js ~400K.

### React Three Fiber (Three.js) — best fit if we go 3D

Declarative Three.js in React; with `drei` (helpers) and `react-three-rapier`
(physics) it is the industry standard for 3D inside a React app, and nothing else
is close for that specific use case. Since we're already React, this is the path
of least resistance.

### Babylon.js — better "game engine" ergonomics

Ships more of what a game needs out of the box (physics, XR, visual editor),
Microsoft-backed. Better if the 3D piece becomes the main event rather than one
section.

### Voxel specifically

- **noa-engine** is the most credible JS voxel engine — it powers Mojang's own
  official browser build of *Minecraft Classic*, rendered through Babylon.js.
  If we want a real Minecraft-feeling sandbox, this is the shortest path.
- **voxeljs-next** modernises the old voxel.js on top of current Three.js with
  WebXR support, but it is a hobby-scale project — check commit activity before
  depending on it.
- Building voxel chunking/meshing from scratch on raw Three.js is a month of
  work before any maths happens. Don't.

**Honest assessment:** a full voxel sandbox is out of scope for a first pass. But
*Minecraft-flavoured* is not the same as *voxel sandbox* — a fixed-camera
isometric build grid with block-snapping gets most of the feel for a fraction of
the cost, and R3F does that comfortably.

---

## What this implies for the app

- New route section (`/play`), lazy-loaded, gate unchanged. The current `/` stays
  exactly as it is — it's the reference implementation and the symbolic anchor.
- Games need to report results out. The Phaser↔React bridge or a plain callback
  writes to the same Neon/Drizzle progress table the tutor would use.
- Every game must work on a phone in landscape and on a laptop. That argues for
  pointer/touch-first mechanics and against anything needing a keyboard — which
  quietly rules out several classic ports (Snake with arrow keys) unless they're
  redesigned for swipe.

---

## Sources

- [Phaser 4](https://phaser.io/phaser4)
- [Official Phaser + Next.js template](https://github.com/phaserjs/template-nextjs)
- [PhaserJSX announcement (July 2026)](https://phaser.io/news/2026/07/phaserjsx-jsx-ui-framework-phaser-4)
- [Phaser vs PixiJS (2026)](https://generalistprogrammer.com/comparisons/phaser-vs-pixijs)
- [Three.js vs React Three Fiber vs Babylon.js (2026)](https://www.pkgpulse.com/guides/threejs-vs-react-three-fiber-vs-babylonjs-3d-webgl-2026)
- [Best voxel game engines 2026 — notes noa-engine powering Minecraft Classic](https://lab.rosebud.ai/blog/best-voxel-game-engines-2026)
- [voxeljs-next](https://github.com/joshmarinacci/voxeljs-next)
