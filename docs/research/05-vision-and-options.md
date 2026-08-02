# The Arcade — vision and five options

Companion to `01-pedagogy.md` … `04-audience.md`. Nothing here changes `/`; the
one-page tutor stays exactly as it is and becomes the *anchor* the games point
back to.

---

## The vision

**A small collection of hand-built games in which the mathematics is the verb.**

Not a game with maths in it. Not a quiz with a skin. In each one, the thing she
does with her hands to play *is* the mathematical operation — and when she gets
good at the game, she has necessarily got good at the maths, because there was no
other way to win.

Four commitments hold the whole thing together:

**1. The maths is the mechanic.** If you could strip the maths out and still play,
it's the wrong design. Players attend only to what the game task requires;
anything else is filtered out no matter how motivated they are. This is the one
principle with hard experimental backing (7× longer voluntary play, better
learning) and it disqualifies about 90% of what's on the market.

**2. Every game fades into notation.** The known failure of even the best games in
this genre — DragonBox — is that kids get excellent at the game and it doesn't
reach their homework. The fix is to start concrete and gradually replace the
concrete representation with the symbolic one during play, so they're understood
as the same object. **We have an unfair advantage here: the symbolic
representation already exists at `/`.** Every game ends by showing the same
problem in the tutor's own notation, and the tutor can hand a problem to a game.
Nobody in the market has this loop because nobody has both halves.

**3. No clock on a question, ever.** Math anxiety peaks in 6th grade and runs
higher in girls; timed drilling is the best-documented way to manufacture it.
Urgency comes from the world — something walking toward you — never from a
stopwatch on her thinking. Failure is instant, free, and silent.

**4. Building beats scoring.** She likes Minecraft. Rewards should be things that
persist and are hers, not numbers that go up. This is also the best maths
framing available: building *requires* area, ratio, volume and scale as a side
effect rather than presenting them.

Shape: a hub at `/play`, each game a lazy-loaded route, results written to the
same progress store. Textless wherever possible — no reading level, no grade
label, nothing that says *behind*.

---

## Option A — The Arcade Cabinet

**Classic arcade forms, re-cut so the maths is the control scheme.**

- **Munchers** *(factors, multiples, primes, GCF/LCM)* — grid, eat the numbers
  matching the rule, dodge the things chasing you. The movement *is* the
  classification. 40 years old and still the cleanest design in the genre.
- **Split** *(prime factorization)* — asteroids drift in carrying composite
  numbers. Shoot one and it breaks into two factors. Keep splitting until only
  primes remain — and primes can't be shot, so you have to dodge what you made.
  A factor tree you play.
- **Snake: Enclosure** *(area & perimeter)* — your body length is the perimeter
  you're spending. Enclose a region of exactly area N. Suddenly the difference
  between area and perimeter is something she can feel, which is precisely the
  thing kids conflate.
- **Threading** *(math facts)* — numbers flow past in a lane; drag to link pairs
  whose product is the target. Pressure from the flow, not a timer. This is the
  answer to "make flashcards interactive."

Tech: Phaser 4 + official Next.js template. Best games-per-week ratio in the
list. Each is a few days, not a few weeks.

**Strengths:** fast to ship, covers the facts/number-properties half of the
curriculum, immediately recognisable as *real games*.
**Weakness:** arcade forms suit discrete facts far better than procedures. You
cannot make long division into Breakout.

---

## Option B — The Puzzle Box

**Hand-authored spatial puzzles in the Slice Fractions / Refraction lineage. No
timer at all.**

- **Cut** *(equivalent fractions, simplifying)* — slice bars to fit a gap. The
  slicing is the partitioning.
- **Split the Beam** *(adding & subtracting fractions)* — divide a stream into
  fractional parts to power several machines at once. Common denominators become
  a spatial necessity rather than a rule to remember. Refraction proved this one
  works.
- **Balance** *(solving for x)* — the tutor *already has* a balance-scale visual.
  Make it playable: move things across the pivot, watch it tip. DragonBox's
  mechanic plus the symbolic fade DragonBox never did.
- **Tiles** *(multiplication, distributive property, area models)* — cover a
  rectangle with strips and squares. The partial products become visible objects.

Tech: mostly React + SVG; Matter.js only where things fall.

**Strengths:** the most pedagogically potent option, and the one that reaches
the topics she'll actually be graded on. Textless. Genuinely calm — no failure
state at all.
**Weakness:** every level is hand-authored. That's the real cost; 40 good levels
is a lot of design work, and procedural generation mostly produces mush.

---

## Option C — The Build World

**Minecraft-flavoured. Maths as the price of building what she wants.**

Isometric or low-poly 3D block builder with commissions: *build a barn with floor
area exactly 48 and a perimeter under 30*; *fill this silo and tell me how many
blocks it took*; *scale this cottage up by 3:2 without changing its proportions*.
A blueprint toggle shows the build's dimensions in the tutor's notation — the
fade, built in. Crafting recipes are ratios. Her builds persist and her brother
can visit them.

This is how Minecraft Education gets its results: the maths is never presented,
only *required*. It's also the single best fit for what she already likes.

Tech: React Three Fiber + drei + Rapier for a fixed-camera block grid. A true
voxel sandbox would mean noa-engine and is a different (much larger) project —
"Minecraft-flavoured" gets most of the feeling for a fraction of the cost.

**Strengths:** highest engagement ceiling by a distance; covers geometry, ratio,
scale, volume — the visual, spatial half of 6th grade.
**Weakness:** by far the most work, and the hardest to keep honest. Building
games drift into decorating games, and then no maths happens.

---

## Option D — The Machine Shop

**She builds contraptions that compute. Zachtronics for 11-year-olds.**

Numbers enter on a conveyor and flow through operator nodes; the output has to
match a target. Then:

- **Order of operations becomes physical** — the pipes' arrangement *is* the
  precedence, and a wrong arrangement visibly produces the wrong thing.
- **Parentheses are a sub-assembly** you drop in as a unit.
- **A variable is an input hopper** whose contents change between runs, so the
  machine has to work for *any* input. That is the actual conceptual leap into
  algebra, and it's almost impossible to teach with worked examples.
- **Solving for x is running the machine backwards.**

Later levels replace the pipes with the written expression, one piece at a time.

Tech: React + SVG. No game engine required. Cheapest thing here relative to what
it teaches.

**Strengths:** the strongest algebra teacher in the list, aimed squarely at where
6th grade goes; scratches the same build-and-tinker itch as Minecraft at a tenth
of the cost; levels are cheap to author and easy to procedurally seed.
**Weakness:** more cerebral than kinetic. Needs to look gorgeous or it reads as
homework with pipes.

---

## Option E — The Story Sim

**A small business with a reason to do arithmetic.** Run a bakery: price things,
scale recipes, apply a 20%-off weekend, work out cost per unit, decide whether
the bulk flour is actually cheaper. Percents, decimals, unit rates and ratios
stop being arbitrary the moment there's a goal attached.

Tech: React; no engine.

**Strengths:** answers "when will I ever use this," which is a real question at
this age; naturally covers the decimals/percents/ratios cluster; content is
writing rather than engineering.
**Weakness:** the weakest at building fluency, and it's the option most at risk
of becoming a word problem wearing a costume. Also the most writing.

---

## Recommendation

Not one option — a spine, in three phases.

**Phase 1 (weeks, not months): A + D.**
Two arcade games — *Threading* for facts and *Munchers* for factors — plus
*Machine Shop*. Rationale: the build notes say facts are the bottleneck and
everything above inherits the delay, so facts get attacked first with the format
that suits them. Machine Shop covers order of operations and solving for x, is
cheap, and is the tinkering she'll recognise from Minecraft. Three games is
enough to know whether she'll actually play.

**Phase 2: B, targeted.** *Split the Beam* and *Balance* — fractions and
equations, the two places where 6th grade breaks people.

**Phase 3: C, if the first two land.** The Build World is the flagship, and it's
worth building only once there's evidence she returns to this section on her own.

Cross-cutting, and worth doing in phase 1 while it's cheap: **the bridge back to
`/`.** Every game ends on the same problem written the way her homework writes
it. That single feature is what separates this from every other math game
collection, and it gets much harder to retrofit later.

**One more, free:** let her design levels. Authoring puzzles for her brother is
among the strongest learning activities in the literature, it flips her from
behind to expert, and for Machine Shop and Munchers the level editor is nearly
the game itself.

---

## The thing to decide first

Whether the target is *fluency* (she gets faster and more accurate at what she
already half-knows) or *understanding* (fractions finally make sense). They pull
toward different options — A for the former, B and D for the latter — and trying
to do both at once in one game is how these projects become mush.

Given "she's had the lessons and they didn't stick," I'd bet on understanding,
with facts handled by a single well-made arcade game on the side.
