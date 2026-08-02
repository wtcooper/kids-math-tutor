# Plan 03 — Tutor parity checklist

> **Why this exists:** the first pass of the port dropped a lot of functionality. This is
> the complete control-by-control inventory of the original, taken from its `wire()`
> function (docs/math-table.html:3475-3600) plus the render functions, so nothing is
> missed a second time.
>
> **Rule:** every row must be ported. New improvements are fine on top; nothing original
> may be lost.

## Why there are currently two tutors

`/tutor-original` serves `docs/math-table.html` byte-for-byte — the untouched original.
It exists for exactly two reasons:

1. It is the working fallback while the port is finished.
2. It is the oracle the differential tests execute in `node:vm`, which is what proves the
   ported generators produce identical problems.

It is **archived to `_archive/` at cutover**, once this checklist is complete and the two
have been compared side by side. We are not keeping both.

---

## Top-level chrome

| Control | Original behaviour | Status |
|---|---|---|
| Topic `<select>` | Grouped by the 6 domains | ✅ |
| Level `<select>` | `1 · Name`, remembers per topic (`levelMemo`) | ✅ |
| Mode tabs | Per engine; Picture it only when the problem has one | ✅ |
| About panel | `<details><summary>What is this topic about?` | ✅ |
| **Print a worksheet** | 10 generated problems + answer key, `window.print()`; facts print the whole table | ✅ |
| **New problem / Reshuffle deck** | Header button; label changes with engine | ✅ |
| **Use your own numbers** | `a [op] b [Set]`, validated; Enter in either box submits | ✅ |

## Watch it

| Control | Original | Status |
|---|---|---|
| Next step / Back | Step through phases | ✅ |
| **Show all** | Jump to the final phase | ✅ |
| Restart | Back to phase 0 | ✅ |

## Picture it

| Control | Original | Status |
|---|---|---|
| Static pictures | 15 topics | ✅ |
| **Area model click-to-reveal** (`mul`) | Click a cell to show its partial product; running tally | ✅ |
| **Show all / Reset** (`mul`) | Reveal or clear every cell | ✅ |
| **Base-10 sharing stepper** (`div`) | Back / Next / Show all through the sharing stages | ✅ |

## You try

| Control | Original | Status |
|---|---|---|
| Digit inputs, auto-advance | Green the instant a box is right | ✅ |
| Scratch marks | Free-form, survive re-render | ✅ |
| Step inputs + Enter | Enter submits the step | ✅ |
| Show me this step | Fills the step **amber**, not green | ✅ |
| **Clear** | Wipe answers and start the same problem again | ✅ |
| **Another one** | New problem, same level | ✅ |
| **Focus the next empty box** | After each correct entry | ✅ |
| Select-on-focus | Typing replaces rather than appends | ✅ |

## Practice

| Control | Original | Status |
|---|---|---|
| Check + Enter | | ✅ |
| **Skip** | Next problem without answering | ✅ |
| **Walk me through it** | Hands the *current* problem to Watch it | ✅ |
| Next problem | Appears after a correct answer | ✅ |
| **Accuracy pill** | `Correct n/m`, `Accuracy x%`, `Streak` + best | ✅ |
| **Varied praise** | Five different confirmations, chosen at random | ✅ |
| **Hint on a wrong answer** | Per-topic; all 21 have one | ✅ |
| Word-problem layout | `.probtext` for long prompts, `.bigprob` for short | ✅ |

## Facts — Learn

| Control | Original | Status |
|---|---|---|
| Rung ladder of the whole table | 12 rows, current one amber | ✅ |
| Family chips | 2s / 5s / 10s within the level | ✅ |
| Skip-counting row | Revealed portion bold | ✅ |
| Reveal next / Back / Show all | | ✅ |
| Cover answers | Toggle, hides all but the current | ✅ |
| Trick for this one | The card's memory hook | ✅ |
| How to use this page | Closing note | ✅ |

## Facts — Drill

| Control | Original | Status |
|---|---|---|
| Deck progress bar | One pip per card: done / miss / now | ✅ |
| Answer + Enter | | ✅ |
| Auto-advance on correct | 520ms pause | ✅ |
| Requeue on miss | Same card four later | ✅ |
| Show me | Reveals, counts as a miss | ✅ |
| Reshuffle | | ✅ |
| Deck-finished screen | Score, percentage, list of missed | ✅ |
| **Drill just these N** | Re-drill only the missed cards | ✅ |
| Score bar | Correct / Streak + best | ✅ |

---

## Improvements kept from the rebuild

These are additions, not replacements — the original behaviour above is intact.

- Deep links: `/tutor?topic=&level=&mode=`, so the games can hand a topic back.
- Per-topic **Play** button when a game exists for it.
- Narration is tokenised rather than raw HTML, so nothing renders through
  `dangerouslySetInnerHTML`.
- 125 automated tests, including a differential suite against the original.
