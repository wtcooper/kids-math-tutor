# Plan 07 — Games that feel like games

> **Status:** ALL FIVE BUILT, 2026-08-03 — Rapids, Number Garden Defense, The Number
> Depths (phase 1: one endless floor-generator with the localStorage save; server save,
> shop and town are the remaining phases), Orbit, and the Beast Book, each with model
> property tests and a walkthrough video, verified by scripted playthroughs. The set is
> now sixteen games plus the Book. This document remains the design rationale.
> Originally: proposal, for review. This is the answer to a fair
> criticism of the current set: "a lot of these are split and cut and type numbers in —
> it doesn't feel like much of a game to a kid." Plans 05/06 sharpened and dressed the
> existing games; this plan proposes NEW games that are games first — things move, you
> steer, you fight, you collect — while the maths stays load-bearing. The existing
> twelve stay as they are.

---

## 1. Why the current set feels flat, honestly

Sorting the twelve by what the player's hands do:

| Real-time, things move | Turn-based puzzle / form |
|---|---|
| Crossing ×/÷, Munchers, Split | Tiles, Cut, Beam, Balance, Machine, Bakery, Enclosure, Build |

Nine of twelve are turn-based. Nothing chases, nothing scrolls, nothing is steered,
nothing accumulates between sessions. The three arcade games are also the three the kids
gravitate to. The gap is not polish — plan 06 handled that — it is **verbs**. The set's
verbs are *choose, type, place*. Kids' favourite games run on *run, dodge, aim, grow,
collect*.

The design constraints all still apply (maths is the mechanic; no per-question timers;
failure free and silent; urgency only from world state). The trick is picking game shapes
where those constraints and real action coexist. Each proposal below states its
"strip-the-maths" test — what's left if you remove the arithmetic — because that is the
test the market's math games fail.

---

## 2. The proposals

### A. Rapids — a river-runner you steer (quick win)

**The game.** Continuous top-down river, always flowing. She steers a raft (hold left /
right, works with touch) between rock **gates**. Every gate is a pair of openings, each
carrying a number; the safe opening is the one that *continues the count* — the 7s in
order, or later "the larger fraction", "equivalent to 3/4", "closest to 0.5". Wrong gate
= a bump, a spin, and the river carries on; nothing lost but headway. Distance is the
score; the river changes biome as you go (meadow → gorge → caves) purely as reward.

**Maths:** times tables in order; comparing fractions/decimals; equivalents. Fills the
decimals/comparison gap the set has.
**Strip test:** remove the numbers and there is no way to pick an opening — steering IS
the answer. Same skill as Crossing but continuous, faster, and with real steering feel.
**Why it's fun:** flow. The raft never stops; pace ramps gently with distance (world
state, not a per-question clock).
**Cost:** low — 2–3 days. Reuses Crossing's river art, palette and generators.

### B. Number Garden Defense — a tower defense (mid)

**The game.** Waves of garden gnomes trundle down a path toward the vegetable patch,
each carrying a number. She plants **towers that only hit what their rule matches**: a
"multiples of 6" sprinkler, a "factors of 48" thornbush, a "primes" crystal. Placing and
*configuring* the towers is the play: read the incoming wave, decide which rules cover
it, and fix the gaps mid-wave when a 91 saunters through everything ("is 91 prime? no —
7 × 13, plant a 7s tower"). Coins from stopped gnomes buy and upgrade towers — the
economy is real arithmetic. Gnomes that get through eat a vegetable; vegetables regrow
next wave (loss is visible, never punishing).

**Maths:** classification at speed (factors, multiples, primes) — Munchers' skill, but
she *builds the classifier* instead of being it; plus budgeting.
**Strip test:** remove the numbers and towers have no targeting rule — nothing can be
stopped. Honest flag: between decisions the towers auto-fire, so the maths is in bursts,
not continuous. The wave-preview (shown before each wave) is where the thinking lives.
**Why it's fun:** tower defense is *the* genre this age group plays at school. Watching
your plan work is the reward loop the puzzle games lack.
**Cost:** medium — 4–5 days on Phaser.

### C. The Number Depths — the RPG (flagship)

**The game.** A persistent dungeon crawl — one continuing world, not rounds. Her
explorer descends a mine, floor by floor, with a lantern, a pack, and a level. Real-time
movement through rooms; things to find; monsters that lumber toward you (slow, readable,
world-state urgency).

The maths is the *equipment*:

- **Combat is factoring.** Monsters carry shield numbers (a 84-shell beetle). You strike
  by naming what divides it — type 7 and the shield breaks into 12, keep striking until
  it's down to a prime core, then it pops. Primes on YOUR side are ammo you collect.
  (Split's mechanic, reborn as combat — production math with a monster walking at you.)
- **Doors are equations.** A door demands "feed me 3 equal bags that make 24" or shows
  a balance that must level. The tutor topics map to door types.
- **Loot is arithmetic.** Chests of coins, a shop between floors (unit prices, change),
  potions that cost fractions of your flask.
- **Floors are topics.** Floor themes follow the tutor: the Factor Mines, the Fraction
  Grotto, the Hall of Scales (equations). Depth = the curriculum, never labeled a grade.
- **Everything persists.** XP, gear, the map, the town above the mine that grows as she
  banks treasure — the "building beats scoring" commitment (plan 02) finally delivered
  at full strength. Requires the database (already there: people/attempts tables) to
  store the save.

**Strip test:** every verb that progresses — breaking a shield, opening a door, buying
gear — is a produced number. Movement alone finds nothing but locked doors.
**Why it's fun:** it's an actual RPG: identity, progress, secrets, a world that's hers.
This is what "they usually don't read, they like to play" scales into.
**Cost:** the big one — 2 weeks phased. Phase 1 (a playable slice): 1 floor, combat +
doors + coins, save/load. Phase 2: shop, gear, more floors. Phase 3: town.

### D. Orbit — make Split a real action game (small, already designed)

Plan 05's prime-ammunition idea, finished: no more pause-modal. The cannon is loaded
with a prime you pick (2, 3, 5, 7, 11, 13 on the ammo rack); firing p at rock n splits
it only if p divides n, live, mid-flight. Divisibility rules become the skill ceiling.
Rocks drift faster, gravity wells bend shots, waves escalate. Split's current
stop-and-choose version could remain as the "thinking" variant.

**Cost:** 1–2 days on the existing scene.

### E. Beast Book — a collection meta-layer over everything (multiplier, not a game)

Every game feeds one collection: play well anywhere and you find **eggs**; eggs hatch
into creatures tied to the topic (a factor-beetle, a fraction-newt); creatures evolve
with continued practice of that topic and live in a Beast Book the kids can browse and
show off. No game mechanics change — this is a persistence layer that makes every
existing game feel like it's building something. Pokémon-shaped motivation, aimed
squarely at the 9-year-old.

**Strip test:** n/a — deliberately decorative, attached to real practice volume.
**Cost:** 2–3 days (registry, hatch rules, book page, art as drawn SVG creatures).

### F. Not proposed, and why

- **Racing where right answers give speed** — the answer is a toll booth; the fun part
  (driving) teaches nothing. This is the exact failure mode the research disqualifies.
- **Quiz-battle RPGs** (fight by answering flashcards) — same toll booth with hit
  points. The Depths avoids this by making the *attack itself* the arithmetic.

---

## 3. Recommendation

Build in this order:

1. **Rapids** — one quick win that doubles the arcade shelf, reusing the river. Proves
   the "continuous motion" formula cheaply.
2. **Number Garden Defense** — the genre kids already love, honest math in the tower
   rules, big replay value.
3. **The Number Depths, phase 1** — the flagship. Start with the playable slice (one
   floor: factor combat, equation doors, coins, save). If the kids love the slice,
   phases 2–3 make it the heart of the app.

**Orbit** slots in whenever Split next gets touched; **Beast Book** is best added right
after Depths phase 1, so the collection spans old and new games at once.

All five respect the standing constraints: no per-question clocks anywhere (monsters
walk, rivers flow, waves march — all world-state), wrongness is always free and silent,
and every one names its topic in the Practising line like the rest of the app.
