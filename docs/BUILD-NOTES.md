# The Math Table — build record

A single-file tutoring app for a rising 6th grader who has had lessons but they didn't stick.
Everything lives in `math-table.html`: one file, ~3,650 lines, no dependencies, no network,
no build step to run it. Open it in any browser, works offline, works on a phone.

Nothing is saved between sessions — refresh gives a clean slate.

---

## What it is

**21 topics** across 6 groups, **89 levels** total, chosen from a grouped dropdown.

| Group | Topics |
|---|---|
| Math facts | multiplication facts, division facts (flashcards) |
| Whole numbers | add, subtract, multiply, long division, place value & rounding, factors/GCF/LCM, order of operations, exponents |
| Fractions | equivalent & simplifying, mixed ↔ improper, add & subtract, multiply & divide |
| Decimals & percents | add & subtract decimals, multiply & divide decimals, percents |
| Ratios & algebra | ratios & unit rates, positive & negative numbers, solving for x |
| Geometry | area, perimeter & volume (7 levels, one shape each) |

Every non-flashcard topic has four modes:

- **Picture it** — the concept before the procedure. Area models, base-10 block sharing,
  fraction bars re-cut to a common denominator, number lines, a balance scale, hundred-squares,
  ratio tables, to-scale shape drawings.
- **Watch it** — the standard algorithm one micro-step at a time, with narration written to be
  read aloud. Long division shows a D-M-S-B strip tracking which of the four moves you're on.
- **You try** — she fills in the work herself. Boxes turn green the instant they're right;
  "Show me this step" fills one step in amber so it's visibly *given* rather than earned.
- **Practice** — a plain generator with a streak counter and a "walk me through it" escape hatch.

Flashcard topics instead have **Learn** (one table in order with the skip-counting sequence and
a memory hook per fact) and **Drill** (shuffled; missed cards requeue four later, and the deck
ends with a list of what to work on).

Also: printable worksheets with answer keys, a "use your own numbers" box for working from her
actual homework, and a per-topic "What is this topic about?" panel written at a 6th-grade level.

---

## How it's built

### Source layout
The single HTML file is assembled from parts in `build/` by `build.sh` (plain `cat`):

```
head.html    433   CSS + page shell
core.js      295   helpers, column-grid primitives, fraction markup, PEMDAS evaluator
topics1.js   689   flashcards, add, subtract, multiply, long division
topics2.js   315   place value, factors, order of operations, exponents
topics3.js   407   the four fraction topics
topics4.js   786   decimals, percents, ratios, integers, equations, geometry
app.js       721   state, rendering, wiring, worksheets, topic descriptions
tail.html      4   close
```

Editing `math-table.html` directly works fine, but the next `build.sh` run overwrites it.

### Three engines
Rather than 21 bespoke implementations, topics declare an `engine` and share machinery:

- **`grid`** (5 topics) — column-aligned digit work: add, subtract, multiply, long division,
  decimal add/subtract. A shared `buildColumn()` models carrying and borrowing (including
  borrows that chain across zeros); `renderColumnGrid()` draws it with an optional decimal-point
  column. Multiplication and long division have their own renderers for partial products and
  the division bracket.
- **`steps`** (14 topics) — a sequence of `{label, say, show, ask}` steps. Watch mode reveals
  them one at a time; You Try turns each `ask` into an input box. Almost every conceptual topic
  fits this shape, which is why the fraction/decimal/algebra work was tractable.
- **`facts`** (2 topics) — flashcards with their own Learn/Drill modes.

A topic supplies `gen(level)` → problem, `build(problem)` → model, `picture()`, and a `practice`
block. Modes are computed per topic, so a topic without a visual simply doesn't show that tab.

### Design
Warm cream/clay/sage palette, serif headings, tabular-figure monospace for all math, generous
rounding, responsive down to phone width. Deliberately not a "kids app" — no cartoons, no
sound, nothing that would feel babyish to a 6th grader who is already self-conscious about
being behind.

---

## Issues hit, and how they were fixed

The interesting part. Most of these were found by testing rather than by looking.

### 1. Multiplication: stray empty row above the addition line
The `+` and the sum line were emitted as their own grid row, leaving a blank row between the
last partial product and the total. **Fix:** attach the `+` and the underline to the last
partial-product row instead of creating a new one.

### 2. Estimates that weren't close
The closing sanity check rounded 342 to 340 and predicted ~10,200 for 342 × 26 (actual 8,892),
which teaches the wrong instinct. **Fix:** `roundNice()` rounds to the leading digit (342 → 300),
so the estimate lands near the answer and the check is worth doing.

### 3. Grammar in the base-10 sharing visual
"Each group gets 1 hundreds." **Fix:** a `pn(count, place)` helper that agrees in number.

### 4. CSS class collision in the division ladder
The partial-quotients ladder used `class="note"`, which collided with the global card `.note`
style and rendered empty pill outlines around every row. **Fix:** renamed to `.lnote`.

### 5. Future step labels gave away the current answer  *(found by reading a screenshot)*
In You Try, step 2's label read "Rewrite both fractions over 20" — while step 1 was asking for
the common denominator. Several topics had this. **Fix:** steps past the current one are hidden
entirely; a single dim row says how many remain.

### 6. Addition revealed the leading carry one step early  *(reported: 57 + 75)*
`renderColumnGrid` showed the final carry digit as soon as every column was done, so step 2 of 4
already read `132` and step 3 added nothing. **Fix:** gate it on an explicit `revealed.lead` flag
set only by its own phase.

**This produced the most valuable test in the suite.** The bug's signature was *a step that
changes nothing*, which generalises: walk Watch it forward and assert every step alters the work
area (except the final transition into the summary, where only the narration changes). That test
immediately found three more:

- long division showed two consecutive "doesn't fit" steps — *correct*, and the test was wrong;
  it was stripping `class` attributes and so couldn't see the dimming change. Test fixed.
- place value generated "Round 1,087,000 to the nearest ten" — already round, so the answer was
  visible from step 1 and the first question asked what a `0` is worth. **Fix:** reject
  already-round numbers and zero target digits; scale the rounding place to the level.
- order of operations generated `6 × 5 − 6 × 5` — both steps narrate identical words, answer 0.
  **Fix:** reject duplicate reductions and non-positive answers.

### 7. "Use your own numbers" never worked  *(found by the test above, incidentally)*
The Set button lives in `#customBox`, outside `#stage`, but was looked up with a stage-scoped
`querySelector`. The handler bound to `null` on every render, silently. Typing 57 and 75 kept
whatever random problem was already there — which is how it was caught, when a verification run
reported 33 + 75. **Fix:** look those three elements up on the document; Enter also submits now.

### 8. Geometry drew shapes that contradicted their own labels  *(reported)*
`svgShape` clamped width and height to minimum pixel sizes **independently**, destroying the
aspect ratio — a triangle labelled "base 19, height 4" was drawn nearly equilateral. A picture
that disagrees with its labels is worse than no picture. **Fix:** one scale for both axes.
Also made the box's 3D depth reflect its actual depth number, moved height labels clear of the
shape edge, and stopped showing the area grid on perimeter problems.

### 9. Level names promised things the generator didn't deliver  *(reported, via geometry)*
Selecting "Triangles too" could hand you a rectangle, because the generator picked randomly
*within* the level. Useless for tutoring: if you sit down to do triangles, you want triangles.
**Fix:** geometry is now one shape per level (7 levels). Auditing every other topic found the
same drift in four more places:

| Topic | Promised | Actually |
|---|---|---|
| order of operations L2 | "Parentheses appear" | 2 of 3 templates had none |
| order of operations L4 | "Exponents in the mix" | one template had none |
| integers L2 | "Subtracting a negative" | negative only 60% of the time |
| solving for x L1 | `x + a = b` | subtraction half the time |
| decimals L4 | "Across zeros" | only when subtracting |

All corrected. Topics now declare `levelKinds[]`, and a test asserts both directions: nothing
outside the declared set is generated, **and** every declared kind is reachable — so a label
can't promise something impossible either.

### 10. "Subtraction with regrouping" mostly didn't regroup  *(reported)*
The generator picked two numbers with `b ≤ a` and never checked whether borrowing was needed.
Measured before fixing:

```
sub L1 (Two digits):   37% actually regroup   ← the beginner level
sub L2 (Three digits): 65%
sub L3 (Four digits):  79%
add L1 (Two digits):   76%
```

On level 1 — where a struggling kid starts, and where she'd be meeting the idea for the first
time — nearly two in three problems demonstrated nothing. **Fix:** the generator simulates the
columns and rejects any problem that doesn't regroup. Level 4 additionally requires a borrow
that *travels across* a zero.

The decimal version took two attempts, both caught by the new test before shipping: first the
generator swapped operands when the second was larger (putting the decimal on top), then even
after fixing that, a hundredths digit of zero meant the borrow started at the tenths column and
never crossed anything.

### 11. Exponents rendered flat  *(reported: `5 2` instead of `5³`)*
The work-line container is `display:flex`, and **flex items ignore `vertical-align`** — the
browser silently dropped the superscript positioning. **Fix:** one class using `align-self` for
the flex case and `vertical-align` for the inline case (each harmlessly ignored in the other),
plus a negative margin to cancel the flex `gap` so the exponent hugs its base.

### 12. Scratch marks wiped on every keystroke  *(reported)*
Answering a box re-renders the whole grid so the green/red states update, and the scratch boxes
above the numbers were redrawn empty — so her regrouping work (`6` and `12` above `72`)
vanished the moment she answered the first column. **Fix:** scratch values are kept in the
try-state and re-emitted on render. Applied to addition carries, multiplication carries and
decimal columns too. They're clay-coloured now so they read as *her* working.

---

## Testing

Four Playwright suites. They exist because this is a teaching tool — a wrong answer or a
misleading picture is worse than a missing feature.

```
node test2.js   correctness    every topic × level, answers re-derived independently
node test3.js   step integrity every Watch step must change something
node test4.js   promises       level labels, regrouping guarantees, scratch persistence, exponents
node test.js    (original mul/div suite, kept for regression)
```

Current state, all green:

```
✓ MATH: all 79 topic×level combos verified against independent re-derivation (30 samples each)
✓ YOU TRY: auto-solved all 79 topic×level combos
✓ PRACTICE: correct answer accepted in all 79 combos
✓ WATCH/PICTURE: every step of every level rendered clean
✓ FACTS: every card in every deck has the right answer
✓ STEP INTEGRITY: 948 problems walked step-by-step
✓ REGROUPING: every add/sub problem at every level actually regroups (10 checks × 300 samples)
✓ SCRATCH MARKS: regrouping notes survive answering a box
✓ LEVEL LABELS: every level generates only what its name promises (47 levels × 120 samples)
✓ EXPONENTS: superscript renders raised
page errors: 0
```

**The key idea in `test2.js`** is that the expected answers are computed by a *second,
deliberately different* implementation — fractions are added by cross-multiplying rather than by
LCM, order-of-operations expressions are evaluated by JavaScript itself, each displayed equation
is parsed back and re-solved. If both implementations agreed because they shared a bug, the test
would be worthless.

`test3.js` and `test4.js` encode the *shape* of reported bugs rather than the instances, which
is why each one kept finding more: the dead-step rule found three additional problems, the
label-honesty rule found four, and the regrouping rule caught two bad fixes of my own.

The app exposes a `window.__mt` handle for the tests to drive state directly. Harmless in normal
use; leave it in place or the suites stop working.

---

## Things worth knowing when using it

- **You Try is the mode that teaches.** Practice assumes pencil and paper; You Try walks her
  through the structure and catches errors at the exact step they happen.
- **"Show me this step"** marks the answer amber rather than green, so a run where she was
  helped is visibly different from a clean one. The header tracks both.
- **Long division** deliberately handles the case where the divisor doesn't fit the first digit
  (372 ÷ 5) and explains why nothing is written above the 3 — a classic sticking point.
- **Math facts first, if the facts are slow.** Everything above it inherits the delay.
- The levels are not purely difficulty — for flashcards they select a times table, and for
  geometry they select a shape. Read them as "which exactly", not just "how hard".
