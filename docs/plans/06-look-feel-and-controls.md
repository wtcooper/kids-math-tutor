# Plan 06 — Look, feel and controls: the games get worlds

> **Status:** first pass built, 2026-08-02 — all twelve games have their worlds, the
> chrome is compacted, and Split's controls are rebuilt. Verified game-by-game in a real
> browser session. Remaining from this document: sound (§4.5), Tiles' three-board
> contract (plan 05), and the per-game items marked "plan 05" in §3.
> This is the visual/feel companion to
> [05-adapt-or-replace.md](05-adapt-or-replace.md) — that plan changes what the player is
> *asked to do*; this one changes what it *feels like* to be there. Written after
> screenshotting every game in a real browser session and reading the scene code.

---

## 1. What the screenshots actually show

Every game was captured at 1280×800 in a signed-in session. The findings repeat across all
twelve, so they are stated once:

**One palette, everywhere.** The tutor's warm-cream paper system — `#faf6ef` cream, beige
lines, terracotta accents — is applied wholesale to the games. It is right for the tutor:
a notebook should look like paper. But it means the *river* is a pale blue rectangle, the
*asteroid field* is a beige void with two faint circles, the *balance scale* is two flat
boxes with an `=` between them, and the *beam of light* is a light-yellow `<div>`. No game
has a world; every game has a form.

**The metaphor each game is named for is never drawn.** Balance has no beam, no pans, no
tilt. Split the Beam has no light. Crossing has no water, no banks, no lily pads — and the
frog is a 24-pixel circle with two dots on it. Machine Shop's "machine" is three small
input chips floating in an empty panel. The games *tell* you their fiction in the header
text and then show you form controls.

**Nothing is ever moving.** Static screenshot after static screenshot could be a settings
page. There is no ambient life — no water ripple, no drifting stars, no idle animation on
any character — and action feedback is minimal (a 90ms scale-yoyo when a prime bounces is
the most juice in the codebase).

**The page frame crowds the game out.** Title, instructions line, "The maths" card, five
level pills, a status row — roughly 300 vertical pixels of editorial matter before the
stage starts, and the stage itself is a letterboxed card at ~55% of viewport height. The
proportions say "worksheet with an illustration", not "game with a caption".

**Controls have real defects, worst in Split.** In `SplitScene.ts`, a tap simultaneously
retargets the ship *and* fires — so the shot leaves from wherever the ship happens to be
(usually nowhere near the tap), and the ship then glides over at a flat 300px/s after the
shot is gone. Keyboard arrows don't move the ship; they nudge an invisible target point
70px per press. This is why play feels wonky and aimless. Rocks drift at 26px/s with no
rotation, which reads as broken rather than calm.

**The goal lives outside the world.** What to do now is written in the side panel, in
prose, to the right of the stage. Inside the stage there is no arrow, no highlight, no
target — a player who doesn't read the panel (a 12-year-old won't) is looking at circles.

---

## 2. The direction: paper frame, lit worlds

The app's identity — Number Lab, paper, serif, the tutor's notation — is good and stays.
The change is a single thesis applied twelve times:

> **The notebook opens onto a world.** The page around a game remains quiet paper. The
> stage becomes a full-bleed, self-lit scene with its own palette, its own light, and
> something alive in it — like a lit diorama set into the page. The contrast between calm
> paper and vivid world is the app's signature, and it is also the pedagogy: the notation
> (paper) and the concrete model (world) are visibly two views of one thing, side by side.

Seven working principles, applied to every game:

1. **Draw the metaphor.** If the game is named for a scale, a beam of light, a river, a
   machine — that thing is drawn, lit, and it *moves*. The fiction carries the concept;
   it is never again delegated to a sentence in the header.
2. **Every action answers back within 100ms.** Tap, type, cut, place — something moves,
   springs, flashes or lands every single time, including (silently, gently) when wrong.
   Squash-and-stretch over linear tweens. Particles on the big beats. One subtle
   screen-kick on the biggest beats only.
3. **Ambient life at all times.** Water ripples, stars drift, fireflies wander, the
   machine idles with a slow hum of motion. A paused screenshot of any game should still
   look like a place, not a form.
4. **Character carries charm.** The frog, the muncher, the Grumps, the ship: each gets a
   real drawn body, an idle animation, and a reaction to success and failure. One
   character per game maximum — charm, not clutter.
5. **The goal lives in the world.** The current target is marked *inside the stage* —
   the banner says "Step the 3s: 3, 6, 9…" over the river; the commission is a sign on
   the meadow's edge; the order slip is pinned to the machine. The workings panel stays
   as the tutor's voice, but nobody should need it to know what to do.
6. **Direct-manipulation controls, standardized.** Pointer: the thing under your finger
   is the thing that moves, immediately — no glide-to-target lag. Keyboard: hold arrows
   for continuous movement, space/enter for the primary action, in every game that moves.
   Where tap-to-move and tap-to-fire conflict (Split), they are separated for good.
7. **The quality floor is invisible.** `prefers-reduced-motion` disables shake and
   particles (never the state feedback itself). Focus rings visible. Phone-landscape
   proportions respected. No new timers, no penalty flashes, no red — failure stays
   instant, free and silent per the standing constraints.

### The page frame, tightened

The chrome compresses so the world gets the screen: back link, title and instructions
collapse into one compact row; "The maths" concept line moves into a collapsible chip
next to the title (still one tap away, still in the how-to panel); level pills shrink to a
single quiet row. Target: chrome ≤ 120px tall, stage ≥ 70% of viewport height on a laptop,
edge-to-edge of its column.

### Per-game palettes

Each world gets its own 3–4 value palette, chosen from its subject. The paper tokens stay
for chrome; these are stage-only. (Values are the working starting point, tuned in build.)

| Game | World | Stage palette |
|---|---|---|
| Crossing ×/÷ | river at dusk | deep teal water `#173B47`, moss banks `#3E5A3C`, warm stone `#E8DCC4`, firefly gold `#FFD873` |
| Split | deep space | indigo void `#101426`, star white `#E8ECFF`, rock slate `#8A93B0`, engine flame `#FF9E4A`, prime crystal `#E06C8C` |
| Munchers | night orchard | dark loam `#232019`, leaf tile `#F2E9D2`, muncher lime `#9BC356`, grump plum `#7B4B6E` |
| Enclosure | spring meadow | grass `#5E8C4A`, turned earth `#8A6642`, fence timber `#C9A36B`, marker red `#C4452F` |
| Tiles | stonemason's bench | walnut bench `#4A3A2C`, cut stone `#D9CFBE`, chalk line `#5B84B1`, gold check `#CE9430` |
| Cut | brick wall | mortar grey `#B9AFA2`, brick `#B0563B`, brick light `#C97856`, chalk `#F5EFE4` |
| Beam | dark machine room | room black `#14161C`, beam gold `#FFD873`, machine brass `#8C6F46`, ready green `#7FC383` |
| Balance | brass scale | wall plum `#2E2434`, brass `#C9A227`, stone grey `#AEB4BE`, bag canvas `#C97F4E` |
| Machine | workshop | housing steel `#37404D`, brass pipe `#B98A44`, token cream `#F5EFE4`, power amber `#F2A03D` |
| Bakery | shop at dawn | awning cream `#F7EFE2`, crust `#C98544`, chalkboard `#2F3A33`, till green `#6D8E68` |
| Build | high desert sky | sky `#BFD9E4`, block clay `#D98E5F`, block top `#F0C9A8`, shadow mauve `#8A7A96` |

---

## 3. Game by game: what's wrong on screen, and the rework

### Crossing (× and ÷)
**On screen now:** pale blue band, white pill "stones" that look like buttons, green
banks as flat strips, frog is a small circle. No water, no drift visible, no next-row cue.
**Rework.** Dusk river the full width of the stage: layered water bands moving at
different speeds, soft ripple highlights, reed clumps on the banks, fireflies over the
far bank. Stones become lily pads / worn river stones with an edge highlight and a bob
animation; the row she must jump to next gets a soft moonlit glow. The frog gets a body:
haunches, eyes, a hop with squash-and-stretch and a shadow that detaches and lands;
a sink is a *plop* — ripple rings, the frog resurfacing at the bank shaking itself off.
The sequence banner floats over the river top edge in the stage itself. Controls: tap a
stone (as now) **plus** number keys type-ahead per plan 05's blank-stone fade. Success:
on the far bank, the frog turns and bows; the crossed sequence lights up stone by stone.

### Split
**On screen now:** beige void, two faint outline circles, a 16px orange triangle. Nothing
suggests space, shooting, or what a rock is.
**Rework — controls first, then the world.**
*Controls:* the ship tracks the pointer's x directly while the pointer moves (fast lerp,
no fixed-speed glide), and **firing is decoupled from moving**: tap/click fires from where
the ship is *now*; dragging moves without firing. Keyboard: hold ←/→ for continuous
velocity with a touch of ease-in, space to fire. Rocks get real drift (70–90px/s), slow
rotation, and gentle mutual repulsion so clusters breathe.
*World:* indigo starfield with two parallax layers; rocks drawn as irregular polygon
asteroids with craters, number carved bright; primes are faceted pink crystals (visibly
"cannot be broken"); the ship gets a hull, cockpit glint and a flickering thruster flame,
with an engine trail while moving. Firing: muzzle flash, tracer shot. A split: the rock
cracks along a seam with a particle burst and the two factor-rocks tumble out with spin.
A prime bounce: the shot ricochets off with a spark and the crystal chimes a wobble.
Round end: the surviving primes arrange themselves into the factor-tree line
`36 = 2 × 2 × 3 × 3` across the stage. First-run cue drawn in-world: a faint dotted line
from ship to the lowest composite rock, "line up and tap to shoot".

### Munchers
**On screen now:** a grid of white cards on cream; the muncher is a dot with a face, the
Grump is a smaller dot. Reads as a quiz table.
**Rework.** Night-orchard board: dark loam background, numbers on leaf-tiles with soft
top light, edible ones indistinguishable by sight (the maths stays the only tell). The
muncher becomes a round lime creature with feet, an idle bounce, a real chomp animation
(mouth opens, tile crumbles into crumb particles, gulp). Grumps get plum bodies, heavy
brows, a lumbering two-frame waddle, and a big telegraphed chomp of their own — losing a
number to a Grump should be *visible across the room*. Movement keys: arrows/WASD move,
space eats (as now), but movement animates as a hop between cells rather than a teleport.
Score row becomes two small creature portraits with tallies. Wrong eat: the muncher
pulls a face and spits it out — silent, free, funny.

### Enclosure
**On screen now:** bare beige grid, a single 6px green dot for the current post. No field,
no fence, no farm.
**Rework.** A meadow: grass-textured stage, the commission on a wooden sign at the top
edge ("Fence exactly 12 squares — 18 fence or less"). Posts are drawn timber posts that
*thunk* in with a little dust puff; rails draw between them with a stretch; the loop
closing snaps shut with a satisfying clink and the enclosed field fills with wheat sweep
row by row — the area literally grows in. The fence-spent counter is a coil of fence wire
by the gate that visibly shortens as she spends it (the resource made physical, per plan
05's economy). Walking with arrow keys stays; the next lattice point gets a hover ring.

### Tiles
**On screen now:** an empty outlined square with one `?` box, two bare sliders. The most
worksheet-looking screen in the set.
**Rework.** Stonemason's bench: the rectangle is a slab of stone on a walnut bench; the
sliders become chalk-line handles that drag a *snapping chalk line* across the slab
(the line twangs when it lands on a whole ten). Cutting animates a scored crack. Each
piece is a separately-lit stone with its dimensions chiselled on the edge; typing its
area fills it with a polished tint from the bottom — under-filled leaves visible raw
stone, overflow spills a darker stain past the edge (the existing too-small/too-big
semantics, drawn as material). The running sum is carved along the bench front. When all
four land: the pieces slide together, the seams flash gold once, and the full identity
writes itself beneath — the tens-cut discovery stays discovered, but now it *looks* like
craftsmanship instead of data entry.

### Cut
**On screen now:** a dashed rectangle labelled "the gap", a beige strip labelled "your
brick", three text buttons for the knife.
**Rework.** An actual wall fills the stage: coursed bricks with mortar joints and subtle
per-brick tint variation, scaffold plank at the base, the gap as genuinely missing bricks
with the dashed target line as a mason's chalk mark. The knife is drawn — a blade that
mirrors your cut choice: choosing "halve" shows the blade descend and the piece split
with a clean knock; pieces are brick-textured and *drop* into place with gravity and a
settle-bounce when laid. Overhang past the chalk line juts into space and casts a wrong
shadow — visibly not flush. The prediction mechanic from plan 05 (type the count, the
hod delivers exactly that many) slots straight into this scene as a hod of bricks
arriving on a pulley.

### Split the Beam
**On screen now:** a plain yellow rectangle for "one beam", two form cards with − 0 +
steppers. The single largest gap between fiction and screen in the app.
**Rework.** Dark machine room, and the beam is *light*: a gold beam enters from the left,
hits the splitter (a drawn prism on a stand), and fans into N glowing strands that
actually route across the room into each machine's intake. Choosing a splitter setting
re-fans the strands with a spring. Machines are little brass contraptions with dark
intake windows; feeding strands lights them strand by strand, and a fully-paid machine
*starts working* — wheel spins, lamp glows, mill turns. A setting that can't pay everyone
in whole strands: the strand visibly stops short at the intake with a soft fizzle — the
refusal drawn, not just written. The typed strand-count from plan 05 replaces the
steppers. Round end: the used strands merge into one bright bar labelled `11/12`, and
what is left of the beam runs dim to the floor drain — the sum and the remainder, lit.

### Balance
**On screen now:** two flat rounded boxes with circles in them, an `=` character between
them. There is no scale.
**Rework.** A real brass balance drawn large: post, pivoting beam, chains, hanging pans —
and **the beam tilts**. Any transient imbalance (mid-move) dips the pans with weight and
settles with a spring; equality is a level beam, visibly. Bags are canvas sacks stamped
`x` that bulge; stones are river pebbles that clink together. Taking a stone off each
side: both hands (drawn, minimal) lift simultaneously — same-move-both-sides is the whole
lesson and it becomes one synchronized animation. The written equation stays beside the
scale and updates as now. When one bag stands alone, the pans hold a slow expectant bob
until she answers "what is x"; a right answer opens the bag — the stones pour out and
count themselves into the pan. Move buttons stay (per plan 05 they gain unhelpful
options) but are restyled as brass plates on the scale's base.

### The Machine Shop
**On screen now:** three small chips in an empty panel; parts bin is four ghost buttons;
the test bench is a text table.
**Rework.** The machine gets a housing: steel casing with rivets filling the stage,
nested sub-boxes drawn as inner chambers with sight-glass windows, pipes connecting them,
the hopper a real funnel on top with `n` stencilled on it. Operators are brass punch-plates
that seat into sockets with a *chunk*. The test run is the centerpiece: number tokens
drop from the hopper and physically travel the pipes — pausing at each chamber, combining
with a visible flash into their intermediate value (the evaluation trace from plan 05,
animated) — and the outlet stamps the result token against the order slip: a green punch
for a match, a quiet grey slide-away for a miss *at the chamber where it diverged*. The
call-your-shot prediction gates the lever: the lever is locked until she types her
predicted outlet reading, then the run confirms or diverges. Idle state: a slow conveyor
hum and an occasional steam wisp so the shop never sits dead.

### The Bakery
**On screen now:** a numbered form. Sections 1–4, two card-buttons, steppers. Nothing of
a bakery beyond the word.
**Rework (interim — plan 05 replaces this game with Market Day; this pass is the visual
floor until then, reusing everything Market Day will need).** The stage becomes a shop
counter scene: awning stripe across the top, chalkboard for the day's target, flour sacks
drawn as sacks with stencilled weights and prices, trays of rolls that actually fill as
she chooses how many to bake, the till as a drawn brass register. The four decisions
become stations along the counter, walked left to right; the "open the shop" moment plays
the day as a short animated till-tape with coins landing per sale. The unit-rate box
stays typed (never printed). All of this — sacks, counter, till, coins — is the Market
Day art kit built early.

### Build World
**On screen now:** a grey featureless diamond on beige; blueprint numbers to the side.
**Rework.** High-desert light: warm sky gradient, sun-side/shade-side face tints on
blocks (clay walls, cream tops), soft blob shadows, a subtle grid shimmer where the next
block would land, dust-puff and a drop-bounce on placement, a pop on removal. The
commission moves onto a site-office signboard in the corner of the stage. Distinct block
top tint every 10th block placed is *not* added — no counting aids; the blueprint panel
(post-plan-05, after ordering) remains the only ledger. Camera drag gets inertia. When a
commission is handed over and accepted, the structure flags a little pennant — and stays
standing in the world per plan 05's persistent town.

---

## 4. Shared build items

1. **Chrome compaction** (`GameChrome`): one-row header, collapsible concept chip,
   stage ≥ 70vh. One change, all twelve games benefit.
2. **Stage theming**: per-game `--stage-*` palette variables + full-bleed stage surface;
   `PhaserGame` accepts a background color instead of hardcoding cream.
3. **Juice kit**: small shared helpers — Phaser: particle burst, screen-kick, spring
   tween, floating text; CSS: pop/settle/shake/glow keyframes, all inside
   `prefers-reduced-motion` guards. No library additions.
4. **Keyboard standard**: hold-arrows continuous movement wherever a thing moves; space =
   primary action; every interactive element reachable and focus-visible.
5. **Sound** (later, flagged): a tiny WebAudio synth (no assets) for plop/chomp/chime/
   thunk, defaulted on with a visible mute. Not in this pass — motion first, then audio.

## 5. Build order for this pass

1. Shared foundation (chrome compaction, stage theming, juice kit) — everything else
   lands on it.
2. **Split** — the named pain point: controls fix + space world.
3. **Crossing** — river world + frog character (both variants share it).
4. **Beam** — largest fiction-to-screen gap, modest file size.
5. **Balance** — draw the scale, make it tilt.
6. **Munchers** — characters + chomp.
7. **Enclosure** — meadow, posts, wheat fill.
8. **Tiles** and **Cut** — material worlds on the same techniques.
9. **Machine** — housing + travelling tokens.
10. **Build World** — light, color, placement feel.
11. **Bakery** — counter scene (Market Day art kit).

Each lands with a browser screenshot check against this document before moving on.
