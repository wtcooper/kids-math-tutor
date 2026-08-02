# Plan 04 — Is the maths actually front and centre?

> **Status:** for review. Nothing here is built yet. The point is to agree the concept for
> each game *before* rebuilding, after the Tiles play-test showed a game that looked like
> a shape puzzle and never asked anyone to multiply.
> **Test being applied:** from [02-future-games.md](02-future-games.md) — *if you could
> strip the maths out and the game would still be playable, the maths will be ignored.*

---

## The two problems that run through nearly all of them

**1. The game often displays the number she should be working out.**

This is the big one, and it is easy to miss because the number being on screen makes the
game *feel* mathematical. The Bakery prints `$0.92 per lb` next to each sack — so the unit
rate, the entire point of that step, is handed over. Build World's blueprint counts the
floor area as she builds, so she can lay blocks and watch the number instead of planning
`6 × 8`. Split picks the factor pair for her.

The fix is the same everywhere: **the game should ask for the number, not show it.**
Showing it afterwards, as confirmation, is right. Showing it before is doing the work for
her.

**2. There is no tutoring voice.**

The tutor narrates every step — *"the 4 and the 8 make 12, so write the 2 and carry the
1"*. The games say nothing. There is a one-line instruction and then silence, so when she
gets stuck there is nowhere to go but out. Every game should have a **workings panel**:
what to do now, the arithmetic for the current step in the tutor's own notation, and a
hint she can ask for.

---

## Game by game

Each entry: what she does · what the maths really is · how load-bearing it is · what would fix it.

### Crossing — multiplication & division facts
**Broken right now.** The rows are ordered top-to-bottom but the frog starts at the bottom,
and the code hops to `row + 1`, so the first hop crosses the entire river. Fixing the
direction is a two-line change.

- **She does:** hops between drifting stones; only stones satisfying the rule hold her.
- **The maths:** *is 56 a multiple of 7?* — one decision per stone.
- **Load-bearing?** Yes for navigation, but it is **recognition, not calculation**. Once she
  spots that multiples of 5 end in 0 or 5, she can cross without multiplying at all.
- **Fix:** make her cross **in sequence** — the far bank wants 7, then 14, then 21. Now the
  route is the times table in order and pattern-matching does not help. A side ladder
  fills in as she goes (`7 · 14 · 21 · __ · __`), which is the tutor's own skip-count row.

### Munchers — factors, multiples, primes, GCF
- **She does:** eats numbers fitting a rule before the Grumps do.
- **The maths:** classification against a rule. The GCF round is the best of the four.
- **Load-bearing?** Yes, but again recognition rather than calculation.
- **Fix:** a workings panel that builds the factor list as she eats — `48 = 1, 2, 3, 4, 6,
  8, …` with the ones she has eaten boxed, exactly as the tutor prints it. On each munch it
  narrates *"6 goes into 48 — 48 ÷ 6 = 8"*. Make the multiples round ask for **the next
  one** rather than any one.

### Split — prime factorization
- **She does:** shoots rocks; they break into two factors; primes cannot be broken.
- **The maths:** prime factorization.
- **Load-bearing? No — and this is the worst offender after Tiles.** The game chooses the
  factor pair (`splitPair` returns the smallest). She only aims. She could clear a board
  without naming a single factor.
- **Fix:** **she chooses the split.** Hitting 36 opens a small prompt — `36 = ? × ?` — and
  she supplies a factor. A wrong one bounces. The factor tree draws itself down the side of
  the screen as she goes, so the artefact she is building is the thing the tutor shows.

### Enclosure — area vs perimeter
- **She does:** walks a fence around exactly N squares, sometimes under a perimeter cap.
- **The maths:** area against perimeter, and they genuinely trade off.
- **Load-bearing?** Yes — one of the two strongest. But she can count squares by walking
  rather than reasoning `4 × 5 = 20`.
- **Fix:** before she walks, ask *"what shape will you make?"* with the factor pairs of the
  target offered — 20 could be 4×5, 2×10, 1×20 — and let her pick, then build it. That ties
  area straight back to factors and makes the perimeter cap a prediction rather than a
  surprise. Live workings: *"4 wide × 3 tall = 12 so far, you need 20."*

### Tiles — the distributive property
- **She does:** covers a rectangle with hundreds, ten-strips and unit squares.
- **The maths:** meant to be `23 × 14 = (20+3) × (10+4)`.
- **Load-bearing? No. You flagged this correctly.** Packing is a shape task; the four partial
  products only appear in the summary *after* the work is done.
- **Fix:** **she cuts the rectangle, then claims each piece by typing its area.** What she
  types is what fills, so a wrong area is visibly the wrong size. Any cut is legal, but
  cutting at the ten is what makes the four multiplications ones she can do in her head —
  which is the actual lesson, discovered rather than told.

### Cut — equivalent fractions
- **She does:** slices a brick, lays pieces into a gap until it fills exactly.
- **The maths:** `3/4 = 6/8 = 9/12`.
- **Load-bearing?** Partly. She can lay pieces one at a time and stop when it fits — trial
  and error, no prediction.
- **Fix:** make her **predict the count**: choose a slicing, then say how many pieces it
  will take *before* any are laid. The dispenser gives exactly that many. Right → they fill
  it exactly; wrong → visibly short or over.

### Split the Beam — adding unlike fractions
- **She does:** picks a splitter setting, then feeds each machine strands.
- **The maths:** the LCD, forced by the apparatus. **The strongest concept in the set.**
- **Load-bearing?** The splitter choice, yes. The feeding is `+`/`−` clicking, so that half
  is brute-forceable.
- **Fix:** she **types** the strand count per machine — that is `2/3 of 12 = 8`, which is the
  conversion step of adding fractions. Workings panel writes it as she goes:
  `1/4 → 3/12`, `2/3 → 8/12`, `3 + 8 = 11`, so `11/12`.

### Balance — solving equations
- **She does:** applies the same move to both pans until one bag is alone.
- **The maths:** equation solving, with the written equation updating beside the scale.
- **Load-bearing?** Yes — the other strongest. The symbolic fade is already right.
- **Fix (small):** before the final reveal, ask her to **say what x is**. Right now the last
  move announces it for her. Also name each move in words as she makes it: *"take 5 off
  both sides."*

### The Machine Shop — order of operations, then variables
- **She does:** fits operators into sockets until the outlet matches the order slip.
- **The maths:** precedence, then generalising over an input.
- **Load-bearing?** The multi-input level genuinely is. But two sockets and four operators
  is sixteen combinations — brute-forceable in under a minute.
- **Fix:** three or four sockets so guessing stops paying, and a **trace panel** that
  evaluates the current machine step by step (`9 × 6 = 54`, then `54 + 7 = 61`) so a wrong
  answer shows *where* it went wrong rather than just being wrong.

### The Bakery — unit rates and percent
- **She does:** buys flour, bakes, sets a markup.
- **The maths:** price per pound, percent markup, percent off.
- **Load-bearing? No, as built.** It prints `$0.92 per lb` on every sack. The one
  calculation the level exists for is done for her. Same for cost per roll and the marked-up
  price.
- **Fix:** show sack size and total price only. She works out which is cheaper — optionally
  by typing the per-pound figure into a "work it out" box that checks itself for free. Same
  for the markup: show `+40%`, make her produce the price.

### Build World — area, volume, scale
- **She does:** builds to a commission.
- **The maths:** floor area, volume, scaling by a ratio.
- **Load-bearing?** Weakly. The blueprint counts live, so she can build-and-watch instead of
  working out `6 × 8 = 48`.
- **Fix:** **declare first.** *"I'm going to build 6 by 8"* → then build it, and the
  commission checks both the declaration and the build. The blueprint stays, but as
  confirmation after she has committed to a number.

---

## Summary table

| Game | Maths load-bearing? | Main fix |
|---|---|---|
| Crossing | recognition only | cross in sequence; **and fix the row-order bug** |
| Munchers | recognition only | factor-list workings panel; "next multiple" |
| Split | **no** — game picks the factors | she names the factor pair |
| Enclosure | yes | choose the shape from factor pairs first |
| Tiles | **no** — packing only | cut, then claim each area |
| Cut | partly | predict the piece count before laying |
| Split the Beam | yes | type the strand counts |
| Balance | yes | state x before the reveal |
| Machine Shop | yes | more sockets; step-by-step trace |
| The Bakery | **no** — rates are printed | hide the unit rate |
| Build World | weakly | declare the dimensions first |

## The one thing to add to all eleven

A **workings panel** beside each board, in the tutor's voice:

1. **What to do now** — one line, updating with the state.
2. **The arithmetic of the current step**, in the tutor's notation.
3. **A hint on request** — never volunteered, never penalised.

That is the piece the tutor does well and the games do not do at all.
