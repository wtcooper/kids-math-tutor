# What makes a math game actually teach

Research notes, August 2026. Sources at the bottom.

The literature is unusually clear on this, and unusually clear that most
educational games get it wrong. Three findings matter more than everything else
put together.

---

## 1. Intrinsic integration — the math must BE the mechanic

Habgood & Ainsworth's work on *Zombie Division* is the foundational result. They
built two versions of the same game teaching division:

- **Intrinsic**: you defeat skeletons by attacking with the weapon matching a
  divisor of the number on the skeleton's chest. The division *is* the combat.
- **Extrinsic**: identical game, but the maths appears in quiz interludes
  between the fun parts.

Results: children learned more from the intrinsic version under a fixed time
limit, and in free-choice conditions **played it seven times longer**.

The follow-up work (Cutting & Iacovides, 2022) nailed down *why*, and the
mechanism is the useful part: it is not motivation and not cognitive load. It is
**attention**. Players attend only to the features needed for the game task and
ignore everything else. If the maths is not needed to play, it is task-irrelevant
information and gets filtered out — no matter how motivated the player is.

**The design test:** if you could strip the maths out and the game would still be
playable, the maths will be ignored. This is the "chocolate-covered broccoli"
failure — a fun game gated behind quiz questions teaches nothing, because the
player treats the questions as a toll rather than as play.

Applied to the mini-game collection: a Breakout clone where you clear bricks and
then answer a question is worthless. A Breakout clone where the *paddle width* is
the denominator, or where bricks only break when hit by a ball carrying a factor
of the brick's number, is the real thing.

## 2. The symbol barrier — and why DragonBox is a cautionary tale

DragonBox Algebra is the most celebrated math game ever made. Kids "solve
equations" within an hour. It teaches equation-solving wordlessly, through
dragging creature-cards.

**It does not reliably transfer to actual algebra.** The 2023 ICLS analysis and
the 2026 Springer design study both report the same thing: learners enjoy it and
play skilfully, but their play "may not surface or develop algebraic knowledge to
the extent desired." They learn *DragonBox*, not algebra.

The diagnosis is Keith Devlin's **symbol barrier**: games let kids reason
mathematically using intuitive, concrete representations, but school maths is
conducted in formal symbols. A game that never shows the symbols builds a skill
stranded on the wrong side of the barrier.

**The fix is fading.** BrainQuake's "digital manipulative" approach starts fully
concrete and *gradually replaces the concrete representation with the symbolic
one* over the course of play, so the two are seen as the same object. The player
ends up manipulating notation while believing they are still playing.

This is the single most important thing to get right in this project, because the
whole point is helping with schoolwork. **Every mini-game needs an explicit plan
for how it ends up at the notation on her homework.**

An extremely cheap version of fading, available for free here: the existing
one-page app already *is* the symbolic representation. A game that ends by
handing her the same problem in the tutor's notation — and a tutor that can hand
a problem to the game — closes the loop without building anything new.

## 3. Near transfer beats far transfer — share an object between contexts

The transfer literature's practical advice: *"integrate a new object present both
in the game and in the classroom."* A shared representation across both contexts
converts a far-transfer problem into a near-transfer one.

Concretely: whatever visual language the games use for a fraction (a bar? a
pie? a number line?) should be the *same* visual language the tutor's "Picture
it" mode already uses. The build notes say the tutor uses fraction bars re-cut to
a common denominator. The games should re-cut the same bars.

---

## Secondary findings

- **Design principles should be stated before building** so learning
  effectiveness can actually be evaluated afterward (IJSG). Worth writing down
  the claim each game makes before writing the game.
- **Let her make games too.** The CriaMat study (Educ. Sci., 2026) found
  designing mathematical games produced strong engagement and perceived
  learning. Building a level, a puzzle, or a problem set for someone else is a
  known-strong learning activity — and it's a plausible later phase for a kid who
  likes Minecraft (i.e. likes building).
- **Manipulatives matter**: effective games help build and *connect varied
  representations* of the same concept. Multiple representations of one idea, not
  one representation drilled harder.

---

## Sources

- [Evaluating Intrinsic Integration in Educational Games — Habgood & Ainsworth](https://shura.shu.ac.uk/3556/1/Habgood_Ainsworth_final.pdf)
- [Motivating Children to Learn Effectively: Intrinsic Integration (JLS 2011)](https://eric.ed.gov/?id=EJ922627)
- [Learning by Doing: Intrinsic Integration Directs Attention to Increase Learning in Games (ACM 2022)](https://dl.acm.org/doi/pdf/10.1145/3549503)
- [An Analysis of the Design and Pedagogy of DragonBox (ICLS 2023)](https://repository.isls.org/bitstream/1/10064/1/ICLS2023_1873-1874.pdf)
- [A Design-Based Approach to Playful Algebra Learning with DragonBox Algebra (Springer 2026)](https://link.springer.com/article/10.1007/s40751-026-00195-2)
- [Math Learning Games that Break the Symbol Barrier — WestEd](https://www.wested.org/blog/insights-impact/mathematics-learning-games-that-break-the-symbol-barrier-2/)
- [Design Principles for Serious Video Games in Mathematics Education (IJSG)](https://journal.seriousgamessociety.org/index.php/IJSG/article/view/12)
- [Game Design as a Pedagogical Tool: Evaluating CriaMat (Educ. Sci. 2026)](https://doi.org/10.3390/educsci16010071)
