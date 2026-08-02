# Plan 02 — The backlog

> **Status:** Not started, and deliberately so. Blocked on [01](01-foundation-and-starter-games.md)
> shipping and on watching her actually play it.
> **Evidence base:** [../research/](../research/) — the reasoning behind everything here
> lives in 01 pedagogy, 02 tech, 03 prior art, 04 audience, 05 vision. This document is the
> *what*, not the *why*; go there for the why.

This is the capture document. Everything we designed and chose not to build yet, written
down before the port starts so none of it is lost.

---

## The four commitments that govern every game here

These are not preferences. Each one is the difference between a game that teaches and a
game that doesn't, and each is evidenced in `../research/01-pedagogy.md`.

1. **The maths is the mechanic.** If you could strip the maths out and the game would
   still be playable, the maths will be ignored — players attend only to what the game
   task requires. This disqualifies roughly 90% of what's on the market.
2. **Every game fades into the tutor's notation.** DragonBox is the cautionary tale: kids
   get excellent at DragonBox and it doesn't reach their homework. Start concrete, replace
   the concrete representation with the symbolic one during play, end with a link into the
   tutor at that topic.
3. **No countdown on any individual question.** Urgency comes from world state — something
   walking toward you, a flow that keeps moving. Math anxiety peaks in 6th grade and runs
   higher in girls; timed drilling is the documented way to manufacture it.
4. **Building beats scoring.** Rewards that persist and are hers, not numbers that go up.

Standing constraints: no grade labels or age norms anywhere; failure instant, free and
silent; textless where possible; phone-landscape and laptop both, pointer-first.

---

## A. The Arcade Cabinet — Phaser

*Threading and Munchers ship in plan 01. These are the rest.*

### Split — prime factorization
Asteroids drift in carrying composite numbers. Shoot one and it breaks into two factors.
Keep splitting until only primes remain — **and primes can't be shot, so you have to dodge
what you made.** A factor tree you play. Maps to `factors`.

### Snake: Enclosure — area & perimeter
Your body length *is* the perimeter you're spending. Enclose a region of exactly area N.
Makes the difference between area and perimeter something she can feel, which is precisely
the thing kids conflate. Maps to `geometry`.

**Cost:** low, a few days each on the plan-01 foundation. **Caveat:** arcade forms suit
discrete facts and number properties far better than procedures. You cannot make long
division into Breakout — don't try.

---

## B. The Puzzle Box — React + SVG, no timer at all

Hand-authored spatial puzzles in the Slice Fractions / Refraction lineage. No failure
state. The most pedagogically potent group, and the one that reaches the topics she's
actually graded on.

### Split the Beam — adding & subtracting fractions
Divide a stream into fractional parts to power several machines at once. Common
denominators become a *spatial necessity* rather than a rule to remember. Refraction (UW
Center for Game Science, NSF/Gates-funded) already proved this design works. Maps to
`frac-addsub`.

### Balance — solving for x
**The tutor already has a balance-scale visual** (`eqPicture`, line 2701). Make it
playable: move things across the pivot, watch it tip. DragonBox's mechanic plus the
symbolic fade DragonBox never did. Maps to `equations`.

### Cut — equivalent fractions & simplifying
Slice bars to fit a gap; the slicing is the partitioning. Maps to `frac-equiv`.

### Tiles — multiplication, distributive property
Cover a rectangle with strips and unit squares; partial products become visible objects.
Maps to `mul`, and shares a representation with the tutor's existing area model.

**Cost:** medium. The engineering is small; **every level is hand-authored** and that's the
real bill. Procedural generation mostly produces mush here.

---

## C. The Build World — React Three Fiber

Minecraft-flavoured isometric block builder. The maths is the price of building what she
wants — never presented, only required. This is how Minecraft Education gets its results.

Commissions force the maths:
- *Build a barn with floor area exactly 48 and a perimeter under 30.*
- *Fill this silo and tell me how many blocks it took.*
- *Scale this cottage up by 3:2 without changing its proportions.*

A **blueprint toggle** shows the build's dimensions in the tutor's notation — the fade,
built in. Crafting recipes are ratios. Her builds persist and her brother can visit them.

**Tech:** React Three Fiber + `drei` + `react-three-rapier` for a fixed-camera block grid.
A *true* voxel sandbox would mean **noa-engine** (the engine behind Mojang's own browser
build of Minecraft Classic, via Babylon.js) and is a different, much larger project.
"Minecraft-flavoured" gets most of the feeling for a fraction of the cost.

**Cost:** highest here by a distance. **Caveat:** building games drift into decorating
games, and then no maths happens. The commissions are what keep it honest.

---

## D. The Machine Shop — React + SVG, no engine

She builds contraptions that compute. Zachtronics for 11-year-olds. Numbers enter on a
conveyor, flow through operator nodes, output must match a target.

- **Order of operations becomes physical** — the pipes' arrangement *is* the precedence,
  and a wrong arrangement visibly produces the wrong thing.
- **Parentheses are a sub-assembly** you drop in as a unit.
- **A variable is an input hopper** whose contents change between runs, so the machine has
  to work for *any* input. That is the actual conceptual leap into algebra, and it is
  nearly impossible to teach from worked examples.
- **Solving for x is running the machine backwards.**

Later levels replace the pipes with the written expression, one piece at a time.

Maps to `pemdas`, `equations`, `exponents`.

**Cost:** medium-low — no game engine, and levels are cheap to author and easy to
procedurally seed. **Best teaching-value-per-hour in this document.** **Caveat:** more
cerebral than kinetic; it needs to look gorgeous or it reads as homework with pipes.

---

## E. The Story Sim — React

A small business with a reason to do arithmetic. Run a bakery: price things, scale
recipes, apply a 20%-off weekend, work out cost per unit, decide whether the bulk flour is
actually cheaper.

Maps to `percent`, `dec-muldiv`, `ratio`.

**Cost:** medium — mostly writing, not engineering. **Strength:** answers "when will I ever
use this," a real question at this age. **Weakness:** weakest at building fluency, and the
option most at risk of becoming a word problem wearing a costume.

---

## The progression layer

The non-game half, from the first design round. Sits *around* the games rather than being
one.

### Mastery map
The 89 levels stop being a dropdown and become territory she can see — locked → touched →
solid → mastered, based on clean solves. **Mastery decays** if a topic goes untouched, so
the map quietly tells her what to review instead of you doing it. Addresses the real gap:
evidence that she's getting better.

### The daily set
A fixed, small, finishable thing each day — ~10 problems auto-chosen from what's weakest
and what's decaying. Five minutes, with a calendar of completed days. **NYT-games shaped,
not Duolingo shaped**: no nagging, no owl.

**Build in streak freezes, or count weeks rather than days.** Streaks are the best-known
habit mechanic and also a guilt machine when broken — which actively harms an
already-anxious kid.

### Earn and customize
Clean solves earn a currency; she spends it on the app's own appearance — palettes, fonts,
a header illustration, a name for her workspace. Nothing that changes the maths.

For a 12-year-old, "make it mine" tends to outperform trophies by a distance, and it dodges
the babyish problem entirely because *she* picks the aesthetic.

### Sibling and parent modes
Two kids on the allowlist. **A straight leaderboard against a sibling who's ahead would be
actively harmful** — it re-creates the exact comparison the whole design removes. Safer
shapes: asynchronous personal-best racing, a shared weekly co-op target, or same-problem-set
challenges compared only after both have finished.

---

## The level editor

Called out separately because it may be the highest-value item in this document.

Designing mathematical games/puzzles is among the strongest learning activities in the
literature (the CriaMat result), and **it flips her from behind to expert** — she authors
Munchers boards and Machine Shop puzzles for her brother to solve.

For those two games the editor is nearly the game itself: Munchers boards are a rule plus a
number set; Machine Shop puzzles are a target plus available nodes.

---

## The open question — answer it with data from plan 01

**Is the target fluency or understanding?**

They pull toward different options — A for fluency, B and D for understanding — and trying
to do both at once in one game is how these projects turn to mush.

**Current bet:** understanding, from "she's had the lessons and they didn't stick," with
facts handled by one well-made arcade game on the side. Threading and Munchers in plan 01
deliberately straddle this so we can watch which one she returns to.

Revisit once there's real evidence. Watching her play for a week beats any amount of
argument here.

---

## Tech notes, not needed yet

- **PixiJS v8** — WebGPU-first, ~1/3 of Phaser's bundle, fastest pure 2D renderer. It's a
  *renderer*, not an engine (no physics, scenes, or input), so it's only right if we ever
  need custom rendering. We want to write games, not an engine.
- **Babylon.js** — better out-of-the-box game ergonomics than Three.js, Microsoft-backed,
  visual editor. Worth it if 3D ever becomes the main event rather than one section.
- **noa-engine** — the credible JS voxel engine, powers Mojang's official browser build of
  Minecraft Classic. The path if the Build World ever needs to be a true sandbox.
- **PhaserJSX** (July 2026) — JSX/hooks UI layer for Phaser 4, if an in-game HUD gets
  complicated enough to deserve it.

---

## What we deliberately are NOT building, and why

**Quiz-with-a-skin.** Racing games where a correct answer makes your car go; splat games;
zombie shooters with sums on the zombies. Arcademics, most of Math Playground, most of
Coolmath's maths section. This is *extrinsic integration* — the maths is a toll booth
between the fun parts. It's everywhere because it's a template: build one arcade shell,
swap the question bank, ship 200 "games." It is also the design kids learned *less* from
and abandoned faster.

She has already met these at school and is the demographic most likely to find them
condescending.

**Prodigy-style reward economies.** 90M students, and by its own reported research a child
must answer ~888 questions to move a standardised test score one point. Engagement volume
is not learning, and a reward loop unrelated to maths trains kids to rush the maths to get
to the reward.
