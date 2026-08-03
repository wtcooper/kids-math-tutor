# Plan 05 — Adapt or replace: a game-by-game verdict

> **Status:** for review. Nothing here is built. This is the response to the external-review
> brief in [../games-design-review.md](../games-design-review.md), applied game by game, with
> a build order at the end.
> **The question asked of each game:** should it be adapted into something more impactful and
> fun, or replaced with a more creative idea for the same topic?

---

## The honest overall verdict first

The criticism "not deeply thought out from a maths perspective" is half right, and it matters
which half.

The *correctness* layer is genuinely strong — stronger than almost anything on the market.
Decoys drawn from the same multiple family, generation guarantees against unwinnable boards,
property tests on every rules module, the integer-cents discipline: that work is real and
none of it should be thrown away. No game here fails on wrong mathematics.

The shortfall is different, and it runs through nearly every game:

**1. The games verify; they rarely produce.** In eight of the twelve, the player's move is
*picking* — a stone, a square, a button, a factor pair from a menu. Recognising the right
number in a set is a weaker act than producing it from nothing, and it is the produced
number that transfers to homework. The pattern fix is the same everywhere: **the keyboard,
not the menu, should be the default input**, with menus as the early-session scaffold that
fades.

**2. There is one decision, repeated.** Crossing is the same hop forty times. Tiles is four
boxes, then four boxes again. Almost no game has a *second* thing to think about — no
planning layer, no resource that carries between moves, no choice that changes what the next
choice looks like. That, not the visuals, is why the play feels uncreative. Good game feel
comes from decisions that compound.

**3. Nothing persists.** Research commitment #4 — *building beats scoring* — is implemented
in zero games. Every round evaporates. Nothing she makes is hers afterwards. This is the
cheapest large win in the whole plan.

So: the maths engineering is worth keeping everywhere; the *ask* (produce, don't pick) and
the *play loop* (a second decision, something that persists) are what change. Two games have
a shape that can't be fixed by deepening the ask, and those two get replaced.

---

## Scorecard

Maths = does succeeding require producing/doing the arithmetic, or recognising it?
Play = is there flow, tension, or a compounding decision — or one move repeated?

| Game | Maths | Play | Verdict |
|---|---|---|---|
| Crossing (×) | recognition | thin but real (drift, decoys) | **Adapt** — blank the stones, deepen the sequences |
| Crossing (÷) | recognition of the wrong skill | same engine | **Replace** — "Divvy": typed quotients with remainders |
| Munchers | recognition | good (Grump race) | **Adapt** — every round must end in a produced number |
| Split | production, but in a modal | ornamental shooting | **Adapt, new core** — prime ammo: firing *is* trial division |
| Enclosure | half — can count instead of reason | decent (walking is tactile) | **Adapt** — commit to dimensions first, then a fence economy |
| Tiles | production, genuinely | none — it's a worksheet | **Adapt** — estimation gate + cut planning across a contract |
| Cut | trial and error | thin | **Adapt** — prediction is the move; add a simplify mode |
| Split the Beam | production at the splitter, clicking after | good concept, flat finish | **Adapt (small)** — type the strand counts and the sum |
| Balance | cancelling by button | good (best fade in the set) | **Adapt** — full move menu, par scoring, predict-x scales |
| Machine Shop | brute-forceable | good idea, too small | **Adapt** — call your shot before every test run |
| The Bakery | production (post-fix) | four dropdowns | **Replace the game, keep the model** — "Market Day" |
| Build World | none — the blueprint does it | good (building is fun) | **Adapt** — order materials before you may build |

Two replacements, ten adaptations. Details below, in the order they appear in the design
record.

---

## Game by game

### Crossing (×) — ADAPT

**Diagnosis.** The decoy discipline made it honest, but the move is still *find the number I
would recognise*, and every crossing is exactly four facts, so a session is forty identical
picks. The frog theme is fine; the ask is shallow.

**The adaptation — call the stone.**

- **Blank stones as the in-session fade.** Early crossings work as now (numbered stones —
  the scaffold). From the third crossing on, the stones in the row ahead are face-down.
  She types the next multiple; stones flip; the one matching what she typed holds her
  weight. Same board, same engine — but now the number comes out of her head. Typing a
  non-multiple flips nothing and costs nothing.
- **Break the four-fact predictability with sequence variety:** start mid-table (*"from 21,
  step the 7s"*), descend (*"come back down: 36, 32, 28…"*), and *broken-bridge* rows where
  a gap in the sequence must be supplied before any stone appears at all.
- **Stretch rows** for later crossings: `7 × 12` and beyond, past the memorised zone, where
  she must actually add 7 rather than recall.

**Why adapt, not replace:** the engine, the decoy principle and the world-state urgency are
all correct. Only the input is wrong, and the input is replaceable.

---

### Crossing (÷) — REPLACE

**Diagnosis.** The design record already names it: ascending factor-listing is not division.
"What divides 48, smallest first" never asks the question a division fact *is* — `56 ÷ 7 = ?`.
No adaptation of a sequencing engine gets there, because division facts are not a sequence.
Factor-listing itself is not wasted — it is Munchers' job, and Munchers does it better.

**The replacement — Divvy** (share-out with remainders).

The crew splits the take. A haul arrives — 54 coins, a crew of 6 around the table. She
types each crew member's share; the coins deal themselves out in that many piles, visibly
right or visibly short/over. When it doesn't divide — 58 coins, crew of 6 — the remainder
is real and must be declared too: `58 ÷ 6 = 9 remainder 4`, and the 4 goes in the tip jar.
Shortchange the crew and they grumble (silently, freely); the pile just re-forms.

- **Urgency from world state, never a clock:** the next haul is already coming up the dock.
  Unsplit hauls pile up; nothing is ever lost.
- **Typed quotient, always.** No candidate answers on screen — this is the production-based
  division fluency the set currently lacks.
- **Remainders are new curriculum coverage** — nothing in the current twelve touches them,
  and they are exactly where "division facts" becomes "division".
- **Workings panel** narrates the inverse: *"6 × 9 = 54, and 4 left over — so 58 ÷ 6 is 9 r 4."*
  Division-as-inverse-multiplication is the tutor's framing, so the fade is free.
- **Reuses** the integer arithmetic library and the generation-guarantee habits (every haul
  has a quotient in the target table's range; remainder rounds only after clean rounds are
  established).

---

### Munchers — ADAPT

**Diagnosis.** The Grump race is legitimate play — the best urgency design in the set — and
classification is a real skill for primes and factor recognition. But no number is ever
produced, and the doc's own best moment (GCF: *the last number eaten is the answer*) is a
design principle the other modes ignore.

**The adaptation — every round ends in a produced number.**

- **GCF mode** already does it. Generalise: at board-clear, one typed question whose answer
  the board just built, asked in the tutor's notation. Factors of 36 cleared → *"36 = 4 × ?"*.
  Primes cleared → *"which prime comes next after the board's largest?"*. Multiples mode →
  see next point.
- **Multiples mode gains an ordering rule at higher levels:** the multiples must be eaten
  ascending — turning classification into the same next-in-sequence production Crossing
  practises, but under Grump pressure. (This is the design record's own planned improvement;
  it is right, build it.)
- **Grumps sharpen with progress:** early Grumps wander; later Grumps prioritise the numbers
  she needs most (the largest factors, the next multiple in order) — so speed of *deciding*,
  not of tapping, is what the race rewards.

---

### Split — ADAPT, with a new core

**Diagnosis.** The rebuild fixed the mathematics but inverted the toll booth: now the arcade
pauses so a quiz modal can happen. The design record asks whether the shooting earns its
place. As built — no. But it can, with one change, and it is the most elegant fix available
in the whole set.

**The adaptation — prime ammunition.**

The cannon is loaded with a prime *you choose*: 2, 3, 5, 7, 11, 13 sit in the ammo rack.
Firing prime *p* at a rock carrying *n* splits it **iff p divides n** — into `p` and `n/p`,
labels visible. If p doesn't divide n, the shot ricochets off, free and silent.

- **Choosing the ammo is trial division.** Facing 51, the whole game is *"does 3 go into
  51?"* — thought before the trigger is pulled, not in a modal after the hit. Aiming and
  arithmetic become the same act. No pause, no prompt, no menu of factor pairs.
- The board still ends as the prime factorisation; the property test (splitting terminates
  in primes whose product is the original) carries over unchanged.
- **Divisibility rules become the skill ceiling:** the workings panel teaches digit-sum for
  3, endings for 2 and 5 — and knowing them makes you *fast*, which is what an arcade layer
  is for. Rocks like 91 and 87 are the boss content.
- Wasted ricochets can be counted (never penalised): *"cleared in 9 shots — 7 possible"*, an
  invitation to know rather than spray.

**Why this beats replacing:** the asteroids frame, the "dodge the primes you made" idea and
the tested model are all good. Only the trigger's meaning changes.

---

### Enclosure — ADAPT

**Diagnosis.** The core insight (fence = perimeter as a spent resource) is right and the
walking is pleasantly physical. But she can count squares as she walks and never touch
`4 × 5 = 20`. The planned commit-first fix is correct; it can also go further.

**The adaptation, in two steps.**

1. **Commit before walking** (the planned fix — build it): the commission asks for area 20,
   and she must state the plan first — *"I'll make it 4 by 5"* — typed, from the factor
   pairs. Then she walks it, and the walk is execution and confirmation rather than
   discovery. Non-rectangular free-building stays available *after* the commission is met,
   as play.
2. **A fence economy.** Fence is bought by the length before she starts, priced per unit.
   Leftover fence refunds at half; running short means the loop can't close and the
   commission re-opens, free. Now perimeter is money and choosing 4×5 over 2×10 over 1×20
   is a decision with a visible cost — the game's entire lesson, made into its economy.
3. **Later commissions: two fields that may share a wall.** Shared boundary is fence paid
   once. This is a genuinely deep extension (why compact shapes and shared walls win) and
   gives the game the second decision layer it lacks.

---

### Tiles — ADAPT

**Diagnosis.** The rebuilt version is mathematically the most honest game in the set — and
the design record is right that it is now a worksheet. The answer is not to re-add Tetris.
It is to give the multiplying a *purpose beyond filling boxes* and a planning layer.

**The adaptation.**

- **Estimation gate.** Before any cut: *"Roughly how big is 23 × 14?"* — pick a range
  (about 200 / about 300 / about 400). Free, one tap, and it gives the final `322` a
  meaning to land against. Estimation is also the single most homework-transferable skill
  this topic has.
- **The contract.** A commission is three boards. She gets a look at all three, then plans
  where to cut each. Awkward cuts are still legal and still total correctly (the property
  the game is *about*) — but the end-of-contract readout shows which pieces were friendly
  (`20 × 10`) and which were not (`17 × 6`), so the tens-cut lesson is discovered by
  comparison across her own choices, not announced.
- **Retire the "Cut at the tens" button.** It short-circuits the one discovery the game
  owns. Its content moves into the workings panel as an asked-for hint.
- **Accept what it is.** This is a puzzle, not an arcade — that is fine. Slice Fractions is
  a puzzle. What it needs is stakes-by-contrast and a reason to care about the total, both
  above.

---

### Cut — ADAPT

**Diagnosis.** Lay-and-check means the wall does the thinking. The planned prediction fix is
right, and it should not be a bolt-on — it should *be* the game.

**The adaptation.**

- **Prediction is the move.** The gap says 3/4. She cuts the brick into twelfths, and before
  a single piece can be laid she must answer: *"how many twelfths fill 3/4?"* The dispenser
  gives exactly what she typed. Nine appear; the fit — flush, short, or overhanging — is the
  verdict. The equivalence `3/4 = 9/12` was computed in her head and *then* seen.
- **Add the reverse mode — simplifying,** which the intent line already claims but the game
  never asks: the gap is shown as 8/12 of a brick; find the *largest* piece size that fills
  it, and say how many (*"thirds — two of them"*). Fewest pieces = simplest form, made
  physical.
- The wall/knife frame is fine and stays.

---

### Split the Beam — ADAPT (small)

**Diagnosis.** The strongest conceptual design in the set — the LCD as a physical necessity
is exactly what "the maths is the mechanic" means. Only the finish is flat: after the one
real decision, the feeding is clicking.

**The adaptation** (the planned fix, plus one move further):

- **Type the strand counts:** the splitter is set to 12; the lamp wants 2/3; she types 8.
  This is the fraction-of-a-quantity computation the clicking currently launders away.
- **Close with the sum and the difference, typed:** *"How much of the beam did the machines
  take?"* → 11/12. *"What's left for the spare lamp?"* → 1/12. That is addition **and**
  subtraction of unlike fractions completed in one apparatus, which no other game covers.
- Later rooms: the leftover strand feeds through a wall into the next room's demands —
  chaining, and a reason the remainder mattered.

Smallest work in the plan; disproportionate payoff.

---

### Balance — ADAPT

**Diagnosis.** The symbolic fade is the best in the set. The weakness is that the interface
is a benevolent tutor: only legal, only useful moves are ever offered, so she can descend to
`x = 8` by clicking without ever deciding anything.

**The adaptation.**

- **Offer the full legal move set,** including legal-but-unhelpful ones — *add* a stone to
  both sides, *add* a bag to both sides, split when splitting doesn't help. All keep the
  scale balanced (the invariant the game teaches); they just don't make progress. Undo is
  free. Now "which move?" is a real question.
- **Par, golf-style.** Every generated scale has a minimum move count — show *"solved in 7 —
  it can be done in 4"* after the solve. Never a penalty, purely an invitation back. This is
  the cheapest way to add depth for a player who has stopped finding the descent hard.
- **Predict-x scales:** some scales ask for x *first*, typed; then she solves to confirm her
  own claim. Prediction-then-verification is the strongest learning loop available and the
  scale is a perfect verifier.
- **Flag for the backlog:** helium balloons (negative stones) extend this exact apparatus to
  integers — see *Gaps* below.

---

### The Machine Shop — ADAPT

**Diagnosis.** The idea (precedence as physical structure) is excellent and the multi-input
level is the best single level in the app. But 16 combinations invites spraying, and the
planned "more sockets" fix only raises the spray count.

**The adaptation — call your shot.**

- **A test run only counts if predicted.** Before pulling the test lever, she types what the
  outlet will read for this input. The bench then runs and shows agree/disagree — with the
  step-by-step evaluation trace (the planned fix) showing *where* it diverged. Prediction is
  what kills brute force: guessing wirings is free, but *knowing what your guess computes*
  is now the game.
- **Reverse levels:** given the machine, predict outputs (evaluation practice); given the
  printed expression `3 + 4 × n`, wire it (translation practice). The current levels are
  only the third variant (given the target, find the wiring). All three directions are the
  topic.
- More sockets and the trace, as planned — but after prediction, which matters more.

---

### The Bakery — REPLACE the game, keep the model

**Diagnosis.** The mathematical model is the best-engineered in the set — hidden unit rate,
integer cents, achievability tests, the <70% test that keeps the maths load-bearing. But
the game *is* a form with four dropdowns, and its own design record names the fatal flaw:
the demand curve — the reason prices matter — is invisible. A form can't show it. A scene
can.

**The replacement — Market Day.** Same generators, same model module, new game around them.

- **A street stall, with customers who walk past.** The day runs as a scene: customers
  drift by, pause, look at the price, and either buy or balk — visibly. Price at $6 and
  *watch* three of five walk away; price at $4 and watch the queue form and the stock run
  out at 2pm. **The demand curve stops being invisible — it walks past the stall.** This is
  urgency-from-world-state, and it is the same maths the dropdowns held, felt instead of
  submitted.
- **The decisions stay, and stay unmarked:** which sack (unit rate, still typed, still never
  printed), how much to bake, the price, the end-of-day discount decision — but made *during*
  the day, standing at the stall, with the option to reprice at lunchtime when she can see
  the morning's queue. A mid-day repricing decision is percent-change with a reason to care.
- **The week, not the day, is the unit.** Cash carries across five days; Friday's report is
  the score she keeps. Persistent consequence is what the single-day version lacked.
- The unit toggle, the integer-cents rule and every existing property test transfer intact —
  this is deliberately a new *view* over a kept *model*, the architecture the app was built
  for.

---

### Build World — ADAPT

**Diagnosis.** The design record calls it the weakest on the core test, and it is — the live
blueprint does the maths while she decorates. But building is the most intrinsically
motivating verb in the set, and the fix makes the maths the *price of admission* rather than
a caption.

**The adaptation — order materials first.**

- **Blocks must be purchased before building.** The commission says: a floor of 6 by 8, a
  wall 3 high around it. She computes what to order — `6 × 8 = 48` for the floor, the wall
  count for the rest — and types the order. Only then does the truck deliver, and she builds
  with exactly what she bought.
- **Surplus and shortfall are consequences, not marks:** leftover blocks are money wasted
  (shown, not punished); running short mid-build means a second delivery at a visible markup.
  Both teach; neither fails her.
- **The live blueprint appears only after ordering** — as the checking instrument it should
  be, no longer the oracle.
- **Scale commissions become the prize:** *"the client wants it twice as big"* — order for
  the scaled version before a single block of it exists. Scaling area/volume by computing,
  not by dragging until numbers match.
- **Persistence, finally:** completed commissions stay standing in one shared world. Sessions
  accumulate into a town that is *hers* — commitment #4, delivered where it is cheapest and
  most natural.

---

## Gaps the set doesn't cover

Named in the design record's §4 Q6; game shapes so they're captured, all backlog:

- **Integers / negatives — "Ballast".** Balance's scale gains helium balloons: a balloon
  cancels a stone (a zero pair, made physical). Same apparatus, same fade, extends into
  `x − 3 = −7`. Cheapest gap to close because Balance already exists.
- **Decimals — "Precision".** A machining bench: cut a rod to 3.45 using tools that move
  1, 0.1 and 0.01 at a time. Place value as tool selection; the micrometer readout is the
  notation fade.
- **Ratios — "The Mixing Room".** Scale a paint recipe (2 red : 3 blue) up to a bucket;
  wrong ratios produce a visibly wrong colour against the client's swatch. Colour gives
  exact, silent, marking-free feedback.

---

## Build order

Sequenced by payoff per effort, and so that every phase ships something playable.

**Phase 1 — the small fixes with outsized payoff** (each is days, not weeks; most are the
design record's own planned improvements, confirmed here):
1. Split the Beam: typed strand counts + typed sum/difference.
2. Cut: prediction-as-the-move + simplify mode.
3. Balance: full move menu, par, predict-x scales.
4. Machine Shop: call-your-shot prediction + evaluation trace.
5. Tiles: estimation gate; retire the tens-cut button.

**Phase 2 — the two arcade rebuilds:**
6. Split: prime ammunition core.
7. Crossing (×): blank-stone fade + sequence variety.
8. Munchers: produced-number round endings + ascending-order multiples.

**Phase 3 — planning layers and persistence:**
9. Build World: order-materials-first + the persistent town.
10. Enclosure: commit-to-dimensions + fence economy.
11. Tiles: the three-board contract.

**Phase 4 — the replacements:**
12. Divvy replaces Crossing (÷). Retire the division-facts crossing when it ships.
13. Market Day replaces The Bakery, keeping `lib` model and tests. Retire the form UI.

**Phase 5 — new coverage (backlog):** Ballast, Precision, The Mixing Room.

**What is deliberately not in the plan:** re-theming for its own sake, any scoring that
penalises, any per-question timer, and any change to `lib/math/` beyond additions — every
verdict above keeps the tested model layer and changes what the player is *asked to do*
with it.
