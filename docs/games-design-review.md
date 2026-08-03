# The games — design record, for external review

**Purpose of this document.** A self-contained description of every game in the app: what
each is *for*, what a player actually does, and how it is built. Written to be handed to a
reviewer who has not seen the code, to get an outside opinion on whether these games teach
what they claim to teach.

**Please be critical.** The most useful thing a reviewer can do is find games where the
mathematics is decorative — where a player could succeed by pattern-matching, guessing, or
reading a number the game has already worked out. Three of these games have already failed
that test once and been rebuilt; there are very likely others.

Written 2026-08-02. Status of each game is stated honestly at the end of its section.

---

## 1. Context

### Who it is for

Two children, aged roughly 9 and 12. The 12-year-old is the primary user: she has had the
lessons at school and they did not stick. She is at the age where maths anxiety peaks, and
she is the demographic most likely to find "educational games" condescending.

### What the app is

Two halves, sharing one library of problem generators.

**The Tutor** — a single page covering 21 topics × 89 levels, ported from a working
3,650-line HTML app. Each topic offers four modes: *Picture it* (a visual model), *Watch
it* (a narrated step-by-step walkthrough), *You try* (the same problem with the digits
blanked for the player to fill), and *Practice* (generated problems with hints). It
narrates every step in words — "the 4 and the 8 make 12, so write the 2 and carry the 1".

**The Games** — twelve games, described below. They exist because the tutor is good at
*explaining* and bad at making anyone *want* to be there.

The key architectural decision: `lib/math/` returns **data, never markup**. Both halves
import the same generators, so a game and the tutor can show the same problem in the same
notation. This is deliberate — see the transfer problem below.

### The design constraints

These are drawn from a literature review done before building (in `docs/research/`), and
every game is supposed to satisfy all of them.

1. **The maths must be the mechanic.** The test: *if you could strip the maths out and the
   game would still be playable, the maths will be ignored.* Players attend to what the
   game task requires. This disqualifies roughly 90% of the educational-games market —
   racing games where a correct answer makes your car go, "splat the zombie with the right
   sum", and so on. In those, the maths is a toll booth between the fun parts.

2. **Every game must fade into the tutor's notation.** DragonBox is the cautionary tale:
   children become excellent at DragonBox and it does not reach their homework, because
   the game's representation never becomes algebra. So each game starts concrete, and the
   written form appears *alongside* the concrete one during play — not as a reward at the
   end.

3. **No countdown on any individual question.** Urgency may come from world state —
   something walking toward you, a current that keeps moving — but never from a clock on a
   question. Timed drilling is the documented way to manufacture maths anxiety, which runs
   higher in girls and peaks at this age.

4. **Failure is instant, free and silent.** No penalty sounds, no life counters, no score
   deductions. Being wrong should cost a few seconds and nothing else.

5. **No grade labels or age norms anywhere.** Levels are named for what they contain
   ("Sevens, eights and nines — the hard ones"), never "Grade 5".

### Two shared components

Because they matter to the reviews below:

**Concept line.** Every game states the mathematics it practises, in the notation the
player will meet it in, on the card, in the header while playing, and in the how-to panel.
This exists because a blurb describing only the mechanic ("cover a rectangle with tiles")
reads as a shape puzzle and gives a player no idea what they are practising.

**Workings panel.** A sidebar next to every board with three parts: *what to do right
now* (one line, updating with state), *the arithmetic of the current step* in the tutor's
notation, and *a hint* that must be asked for and costs nothing. This is the tutor's voice,
which the games originally lacked entirely — a player who got stuck had nowhere to go.

---

## 2. The games

Twelve games across six mathematical domains. Two are built on Phaser (2D canvas), one on
React Three Fiber (3D), the rest are plain React and SVG with no game engine.

Each is tagged **Get faster** (fluency) or **See why** (understanding). That distinction is
an open question in the project — see §4.

---

### Crossing — multiplication facts
*Phaser · topic: multiplication facts · tagged "Get faster"*

**Intent.** Skip counting through a times table in order. Knowing that a number is a
multiple is not enough; you need the one that comes *next*.

**How it is played.** A frog sits on a river bank. Four rows of stepping stones drift
sideways between the near bank and the far one, each stone carrying a number. Tap a stone
in the row ahead to hop onto it. Only the stone matching the next number in the sequence
holds your weight — everything else sinks you, silently, back to the near bank at no cost.
Four crossings makes a round.

**The design.** The banner says "Step the 3s in order: 3, 6, 9, 12". Each row contains
several copies of the number that row requires, plus decoys. **The decoys are deliberately
drawn from the other multiples of the same number** — so a stone reading 9 is genuinely a
multiple of 3 and still wrong when 6 comes next. This is the load-bearing choice: an
earlier version accepted any multiple, which made the game solvable by pattern recognition
(multiples of 5 end in 0 or 5) without ever multiplying.

Generation guarantees the sequence ascends and that spare members exist to serve as decoys.
The workings panel writes the table as multiplications — `3 × 1 = 3`, `3 × 2 = 6` — with
the current step marked, and a ladder on the board shows how far along the sequence you are.
Both fade out as crossings accumulate, staged on progress within a session rather than on
level, so the scaffold's disappearance can never read as a difficulty label.

**Known weaknesses.** The decision is still recognition-adjacent — you are picking a number
from a set rather than computing one. A stronger version might blank the target and require
the player to supply the next value. The four-row structure also means every crossing is
exactly four facts, which may become predictable.

**Status.** Working. Recently fixed a serious bug where the rows were indexed in the wrong
direction and the first hop crossed the entire river.

---

### Crossing — division facts
*Phaser · topic: division facts · tagged "Get faster"*

**Intent.** Listing what divides a number, smallest first — the question behind every
division fact: *does this go in exactly?*

**How it is played.** Identical to the above. The banner reads "Step the numbers that
divide 48, in order: 2, 3, 4, 6", and the stones carry candidate divisors.

**The design.** Same engine and same decoy principle: other genuine factors of the target
appear on the river, so recognising "that divides 48" does not tell you whether it is the
*next* one. Generation requires the target to have at least two more factors than the
crossing needs, so decoys always exist. (An earlier version could deal 81, whose only
factors above 1 are 3, 9, 27 and 81 — exactly four — leaving nothing to tempt with.)

**Known weaknesses.** Ordering factors ascending is a slightly artificial framing of
division facts; it is closer to factor-listing than to "56 ÷ 7". Worth a reviewer's opinion
on whether this is the right shape for division practice.

**Status.** Working.

---

### Munchers — factors, multiples, primes, GCF
*Phaser · topic: factors, GCF & LCM · tagged "Get faster"*

**Intent.** Classifying numbers against a rule: multiples of n, factors of n, primes, or
common factors of two numbers.

**How it is played.** A 6×5 grid of numbers. You move a marker one square at a time and
eat the square you are standing on. Eating a number that fits the rule scores; eating one
that does not simply wobbles and costs nothing. Meanwhile "Grumps" roam the board and eat
the correct numbers too, on a slow beat — so it is a race, and a number left alone is one
they may take. The round ends when every correct number is gone, with a score: *You 7,
Grumps 3*.

**The design.** Movement *is* classification — there is no separate quiz step. Urgency
comes from the Grumps rather than a clock. A 2.6-second grace period at the start of each
round means nothing can be taken while the player is still reading the rule.

The best round is the GCF one: the banner reads `GCF(48, 36) = ?`, the edible numbers are
the common factors, and **the last one eaten is the answer**.

Generation guarantees at least four edible numbers (an early version dealt "eat the factors
of 61" — a prime, so the board was unwinnable).

**Known weaknesses.** Like Crossing, this is recognition rather than calculation. The
workings panel explains how to test a candidate but the game never requires the player to
produce a number. The "next multiple in order" treatment used in Crossing has not been
applied here, and probably should be.

**Status.** Working. The mechanic improvement is not yet built.

---

### Split — prime factorization
*Phaser · topic: factors, GCF & LCM · tagged "See why"*

**Intent.** Prime factorization as a factor tree you build one split at a time.

**How it is played.** Rocks carrying composite numbers drift in space. A ship slides left
and right along the bottom and fires straight up. Hitting a rock pauses the board and asks
**what two numbers multiply to make it** — the player picks a factor pair or types one
factor and the other follows. Answering is what splits the rock into two new ones. Primes
cannot be split; a shot bounces off, so the board fills with the primes you have made and
you must fly around them. The round ends when nothing composite is left, and the remaining
rocks *are* the prime factorisation of the starting numbers.

**The design.** The original version chose the factor pair itself — the rock just broke —
which meant a whole board could be cleared without naming a single factor. The player was
only aiming. Now the factorisation is the move rather than a consequence of the move.

The workings panel walks trial division beside it: `36 ÷ 2 = 18`, `36 ÷ 3 = 12`,
`36 ÷ 4 = 9`, which is how you actually find a factor pair.

Starting numbers are distinct and have at least three prime factors, so there is a tree
rather than a single snip. A property test verifies that repeated splitting always
terminates in primes whose product is the original number.

**Known weaknesses.** The shooting is arguably ornamental now that the prompt does the
mathematical work — a reviewer might reasonably ask whether the arcade layer earns its
place, or whether it is a toll booth in reverse. The factor-pair choice is presented as
buttons, which narrows it to selection rather than recall when the typed route is not used.

**Status.** Working, recently rebuilt.

---

### Enclosure — area against perimeter
*Phaser · topic: area, perimeter & volume · tagged "See why"*

**Intent.** The distinction children conflate most: the squares *inside* a shape versus the
distance *around* it, and why the same area can cost very different amounts of fence.

**How it is played.** A grid. You walk a fence one corner at a time — tap the next lattice
point, or use arrow keys — and close the loop back on the red starting post. The commission
asks for a field of exactly N squares, and from level 2 also caps the fence: *"Fence exactly
12 squares — using 18 fence or less."* The panel then reports both numbers against the
target.

**The design.** The fence you spend *is* the perimeter, so the two quantities are two
resources competing in the same action. A 1×12 field and a 3×4 field both have area 12, and
walking both makes the cost difference physical: 26 fence versus 14.

The fence cap is computed from the tightest rectangle for that area plus a small allowance,
and a test asserts two things for every generated commission: that it is achievable, and
that the lazy 1×N strip does *not* fit within the cap — otherwise the cap teaches nothing.

Area is computed by even-odd ray crossing rather than by walking the path, so it stays
correct for a shape with a hole or a diagonal pinch, which a child will absolutely build.

**Known weaknesses.** A player can count squares by walking rather than reasoning about
`4 × 5 = 20`. The planned improvement — choose the shape from the target's factor pairs
*before* walking — is not yet built. The workings panel currently lists those factor pairs
but does not require a choice.

**Status.** Working. The mechanic improvement is not yet built.

---

### Tiles — the distributive property
*React + SVG · topic: multi-digit multiplication · tagged "See why"*

**Intent.** `23 × 14 = (20 + 3) × (10 + 4) = 200 + 80 + 30 + 12`, worked out rather than
recited.

**How it is played.** A rectangle a × b. Two sliders cut it — one across, one down —
producing up to four pieces, each labelled with its dimensions (`20 × 10`, `4 × 10`,
`20 × 5`, `4 × 5`). The player types each piece's **area** into a box on that piece. What
they type is what fills: too small leaves a visible gap, too large overflows in a different
colour. A running sum underneath reads `200 + 40 + ? + ? = 240`. When all four are right,
the panel writes the whole thing out.

**The design.** This game was rebuilt after a play-test. The first version was a packing
puzzle — cover the rectangle with hundred-squares, ten-strips and unit squares — and the
tester's verdict was that it "looks like a bit of Tetris dragging shapes, without maths
happening in their head". That was correct: the rectangle could be covered by eye, and the
four partial products only appeared in a summary *afterwards*, making the maths a label on
the result rather than the route to it.

The current design has no way to progress without multiplying. Crucially, **any cut is
legal and every cut gives the right total** — a property test verifies this across every
cut of every board, because that *is* the distributive property. But cutting at the ten
leaves each piece with a whole ten or a single digit on its sides, so the four
multiplications become ones the player already knows. That is the lesson, and it is
discovered by trying an awkward cut rather than announced.

**Known weaknesses.** It is now closer to a structured worksheet than a game — there is no
opponent, no flow, no jeopardy. Whether that matters is a real question. The "Cut at the
tens" shortcut button may short-circuit the discovery it is meant to reward.

**Status.** Working, recently rebuilt.

---

### Cut — equivalent fractions
*React + SVG · topic: equivalent fractions & simplifying · tagged "See why"*

**Intent.** `3/4 = 6/8 = 9/12` — the same width of wall, different names. And simplifying
as the same discovery run backwards: the fewest pieces that fill the gap.

**How it is played.** A wall with a gap in it, the gap being some fraction of one brick.
You have a brick and a knife: each cut halves or thirds every piece. Then you lay pieces
into the gap until it is filled exactly. Overshooting is visible — the pieces stick out past
the marked line.

**The design.** All comparisons are integer cross-multiplication. Three thirds is exactly
one brick here; in floating point it is not, and a float comparison would refuse a correct
answer.

The reachable denominators go well beyond the gap's own denominator, because a gap like
5/16 with only one workable slicing offers no equivalence to discover — which was a real
bug caught by a test.

**Known weaknesses.** A player can lay pieces one at a time and stop when it fits: trial
and error, no prediction. The planned fix is to require a predicted piece count *before*
any are laid, with the dispenser giving exactly that many. Not yet built.

**Status.** Working. The mechanic improvement is not yet built.

---

### Split the Beam — adding unlike fractions
*React + SVG · topic: add & subtract fractions · tagged "See why"*

**Intent.** A common denominator as a physical necessity rather than a rule to remember.

**How it is played.** One beam of light enters a splitter, which cuts it into N equal
strands — and N is the only setting, chosen once. Several machines each demand a fraction
of the beam: the mill wants 1/4, the lamp wants 2/3. You choose the splitter setting, then
feed each machine whole strands until it has its share. A setting that cannot pay everyone
in whole strands is refused with an explanation.

**The design.** The apparatus enforces the mathematics. A machine wanting 1/4 and one
wanting 2/3 cannot both be paid in quarters or in thirds; the splitter must cut into
twelfths, and then they want 3 strands and 8. The end panel reports 11/12 drawn — which
*is* the sum.

The tempting wrong answers are always on the menu: each machine's own denominator is
offered as a setting. Tests verify that the LCD always works, that nothing below it does,
that the demands never exceed one whole beam, and that every level offers at least one near
miss.

**Known weaknesses.** The splitter choice is genuinely mathematical; the feeding is
plus/minus clicking and can be brute-forced. The planned fix — type the strand count, which
is `2/3 of 12 = 8` — is not yet built.

**Status.** Working. The mechanic improvement is not yet built.

---

### Balance — solving equations
*React + SVG · topic: solving for x · tagged "See why"*

**Intent.** Solving a linear equation by doing the same thing to both sides, with the
written equation visible throughout.

**How it is played.** A scale holds bags (each containing the same unknown number of
stones) and loose stones. Every available move applies to **both pans at once**: take one
stone off each, take one bag off each, or share both sides into equal groups. Moves that a
pan cannot afford are disabled rather than merely refused. When one bag stands alone, the
game asks the player to **say what x is** before revealing it, and will not deal a new scale
until they have.

**The design.** This is DragonBox's mechanic plus the symbolic fade DragonBox never did.
The written equation sits beside the scale from the first move and updates with it:
`4x + 5 = 3x + 13` → `3x + 5 = 2x + 13` → … → `x = 8`. The player is never doing something
that has no name.

Tests verify that every generated scale starts balanced, stays balanced under any legal
move, is solvable using only the moves offered, and yields the x it was built with.

**Known weaknesses.** The moves are buttons, so the player cancels rather than computes
until the final "what is x" question. Whether the button set is too helpful — it only ever
offers legal, useful moves — is worth an opinion.

**Status.** Working. Two bugs were found during testing where the answer was being given
away by the workings panel and the on-board step list; both now blank the final line until
the player has answered.

---

### The Machine Shop — order of operations, then variables
*React + SVG · topic: order of operations · tagged "See why"*

**Intent.** Precedence made physical, and then the conceptual leap into algebra: an
expression that must be right for *every* input, not the one you happened to test.

**How it is played.** A machine is drawn as nested boxes — whatever is wired deeper is
drawn inside — with empty sockets where operators go. Numbers and a hopper marked `n` are
the inputs. Tap a socket, tap an operator from the parts bin, and a test bench shows what
the outlet reads against the order slip. On the last level the hopper holds a different
number on each of three test runs, and all three rows must match.

**The design.** The shape of the machine *is* the precedence; there is no way to express
"add before you multiply" except by wiring it that way, and a wrong arrangement produces a
visibly wrong number rather than a cross. The finished machine is printed as an expression
with brackets only where they change the meaning.

The multi-input level is the real prize. A test verifies that wirings which satisfy the
first run but not the others genuinely exist and are rejected — otherwise the level would
teach nothing.

**Known weaknesses.** Two sockets and four operators is sixteen combinations, brute-forceable
in under a minute. The planned fix — more sockets, plus a step-by-step evaluation trace so a
wrong answer shows *where* it went wrong — is not yet built.

**Status.** Working. The mechanic improvement is not yet built.

---

### The Bakery — unit rates and percent
*React · topic: percents · tagged "See why"*

**Intent.** Arithmetic that decides an outcome rather than arithmetic that gets marked.
Answers "when will I ever use this".

**How it is played.** A day at a bakery, in four decisions: buy a sack of flour, choose how
many trays to bake, set a markup, and optionally clear leftovers at a discount. Then open
the shop. The till reports what happened against a profit target. **Nothing is marked right
or wrong** — choosing the worse-value sack is not an error, it just leaves less money.

**The design.** The unit rate is deliberately *not* printed. An earlier version showed
"$0.92 per lb" next to each sack, which handed over the one calculation the level exists
for; the whole decision was made before the player did anything. Now sack size and total
price are shown and the player divides, into a box that checks itself for free.

Everything is integer cents and whole cups. Money in floating point is how a till ends up
reading $4.6000000000001.

Units are US customary — dollars, flour by the pound, recipes in cups — with a toggle that
restates the whole board in grams and kilos. A test asserts the cheapest sack per pound is
also the cheapest per kilo, because a toggle that could flip which sack looks better would
teach the opposite of what it is for.

Each day's profit target is computed from what is actually achievable, so it is never
impossible; a test also asserts that fewer than 70% of all possible choice combinations
reach it, or the mathematics would not be load-bearing.

**Known weaknesses.** It is a simulation with four dropdowns, which may read as dry. The
demand curve is invisible — the player cannot see *why* a higher price sells fewer, only
that it does.

**Status.** Working, recently fixed.

---

### Build World — area, volume and scale
*React Three Fiber (3D) · topic: area, perimeter & volume · tagged "See why"*

**Intent.** The mathematics as the price of building what you want. Never presented, only
required — the approach Minecraft Education gets its results from.

**How it is played.** An isometric 3D grid. Tap the ground to drop a block; tap a block to
stack another on top; switch to "Take away" to remove. Drag to spin the view. A commission
asks for one of three things: a floor of exactly N squares (sometimes with a perimeter cap),
a solid box of exactly N blocks, or a plan scaled up by a ratio. A blueprint panel measures
what you have built as you build it — floor area, perimeter, block count, and the bounding
size — and writes them in the tutor's notation (`6 × 8 = 48`).

**The design.** The commissions are what keep a building game from drifting into a
decorating game, which is the documented failure mode. Perimeter counts exposed edges
rather than walking a path, so it stays correct for a shape with a hole — which a child will
build.

**Known weaknesses.** The blueprint counts live, so a player can build-and-watch rather than
plan: lay blocks until the number reads 48. The planned fix — declare the dimensions first,
then build, with the commission checking both — is not yet built. This is currently the
weakest game in the set on the "maths is the mechanic" test.

**Status.** Working. The mechanic improvement is not yet built.

---

## 3. Summary table

| Game | Domain | Mechanic status | Biggest doubt |
|---|---|---|---|
| Crossing (×) | times tables | rebuilt, working | recognition, not recall |
| Crossing (÷) | division facts | rebuilt, working | factor-ordering is an odd framing of division |
| Munchers | factors, GCF | working | classification only; no number is ever produced |
| Split | prime factorization | rebuilt, working | is the arcade layer earning its place? |
| Enclosure | area vs perimeter | working | can count squares instead of reasoning |
| Tiles | distributive property | rebuilt, working | now more worksheet than game |
| Cut | equivalent fractions | working | trial and error, no prediction required |
| Split the Beam | unlike denominators | working | feeding step is brute-forceable |
| Balance | linear equations | working | buttons only ever offer useful moves |
| Machine Shop | precedence, variables | working | 16 combinations is guessable |
| The Bakery | unit rates, percent | rebuilt, working | four dropdowns; demand curve invisible |
| Build World | area, volume, scale | working | blueprint counts live, so no planning needed |

**Five mechanic improvements are designed but not yet built:** Munchers (require the next
multiple in order), Enclosure (choose the shape from factor pairs before walking), Cut
(predict the piece count), Split the Beam (type the strand counts), Machine Shop (more
sockets plus an evaluation trace), Build World (declare dimensions before building).

---

## 4. Open questions for a reviewer

1. **Is the maths load-bearing in each game?** Specifically: for each one, can you describe
   a strategy that succeeds without doing the arithmetic? That is the single most valuable
   thing to find. Three games have already failed this test in play-testing and been
   rebuilt; the ones flagged above as weak are the current suspects.

2. **Fluency or understanding?** The project has not resolved which it is optimising for.
   The arcade games (Crossing, Munchers) target recall speed; the puzzle games target
   conceptual understanding. The current bet, from "she has had the lessons and they did not
   stick", is understanding — with facts handled by one well-made arcade game on the side.
   Is that the right call, and is the split visible enough to the player?

3. **Does the symbolic fade actually work?** Every game shows the written notation
   alongside the concrete representation. Is that sufficient for transfer to homework, or is
   it the same DragonBox trap with a caption?

4. **Is the Workings panel a crutch?** It says what to do at every step. There is a real
   risk it makes the games followable without being thinkable. Should it be less specific,
   or opt-in?

5. **Is anything here condescending?** The target user is 12 and allergic to being talked
   down to. Tone, naming, and visual style are all in scope.

6. **What is missing?** Nothing here covers decimals directly, integers/negative numbers,
   ratios, or mixed numbers, all of which are topics in the tutor. Are there obvious game
   shapes for those that the set is failing to use?

---

## 5. Technical notes

Relevant only if the reviewer wants to comment on feasibility.

- Next.js App Router, TypeScript throughout. Games are dynamically imported per route so
  the 2D and 3D engines never enter the shared bundle.
- `lib/math/` is pure data — no React, no DOM, no markup — and is shared by the tutor and
  the games. This is what makes "the same problem, in the same notation, in both places"
  cheap.
- Each game's rules live in a pure model module tested with property tests
  (~195 tests). These have repeatedly caught unplayable states before a human saw
  them: an unwinnable Munchers board, a Cut gap with only one solution, a Tiles board
  needing 63 individual pieces.
- One methodological note worth flagging, because it caused a real miss: an early browser
  test of Crossing computed the expected result using the *same expression the
  implementation used*, so it agreed with a bug that made the frog cross the whole river in
  one hop. Tests are now written against stated intent rather than re-derived from the code.
