# What everyone else has built — and what to steal

This *is* an extremely common idea. The useful finding is that the market has
converged on the design the research says doesn't work, because it's the cheap
one to build. Knowing that is the main advantage available here.

---

## The dominant pattern: quiz-with-a-skin (avoid)

**Arcademics, Math Playground, MathGames.com arcade, Hooda Math, Sheppard
Software, most of Coolmath's "math" section.** Racing games where a correct
answer makes your car go; splat games where you hit the right fraction; zombie
shooters where the zombie has a sum on it.

These are *extrinsic integration*. The maths is a toll booth between the fun
parts. Per the Zombie Division result in `01-pedagogy.md`, this is the version
kids learned less from and abandoned faster. It is everywhere because it's a
template: build one arcade shell, swap the question bank, ship 200 "games."

**Do not build these.** They are also the ones she has already been exposed to at
school and is most likely to find condescending.

## Prodigy — the market leader, and a warning

90M students, 1,500 skills, adaptive engine, curriculum-aligned. Also the most
instructive failure in the space:

- The maths is entirely extrinsic — it's a JRPG where battles pause for a
  question. Time-on-task ratio of entertainment to academics is poor.
- **Prodigy's own research reportedly found a child must answer ~888 questions to
  move a standardised test score by one point.**
- Fairplay filed an FTC complaint over its monetisation; the paid membership
  gates cosmetics kids are shown constantly while playing.
- Reviewers consistently find it fine for drill review, weak at teaching anything
  new.

The lesson isn't "don't make it fun." It's that engagement volume is not
learning, and that a game whose reward loop is unrelated to maths will train
kids to rush the maths to get to the reward.

## Blooket / Gimkit / Kahoot — right idea, wrong shape for us

Quiz-shows with game-show economies. Genuinely beloved by middle schoolers, and
the social/competitive framing works. But they are classroom-scale, host-driven,
and still fundamentally question-answering. Not a fit for one kid at a kitchen
table, though the *pacing* — short rounds, visible round-end summary — is worth
copying.

---

## The ones actually worth studying

### Number Munchers (MECC, 1986)
Grid-based Pac-Man where you eat numbers matching a rule — Multiples, Factors,
Primes, Equalities, Inequalities — while dodging Troggles. **Genuinely
intrinsic**: the movement *is* the classification decision, and time pressure
comes from the monsters, not from a timer on a question. Forty years old and
still the cleanest template for anything "recognise which numbers have property
P." Directly applicable to the tutor's factors/GCF/LCM and primes work.

### Zombie Division (Habgood)
The research vehicle, not a product, but the design is the point: you attack a
skeleton with the weapon that divides its number. Division is the verb.

### DragonBox Algebra
The most elegant interaction design in the category — equation-solving as card
manipulation, learned wordlessly. **Study the interaction, distrust the outcome:**
research finds transfer to real algebra is weaker than the hype. Steal the
mechanic, then add the symbolic fade DragonBox lacks.

### Slice Fractions (Ululab)
Physics puzzler: you slice ice/lava blocks to clear a mammoth's path, and the
slicing is fractional partitioning. 140+ puzzles with a real difficulty ramp,
built with education researchers. Best example of "puzzle game where the maths is
the physics."

### Refraction (UW Center for Game Science)
Laser-splitting puzzle — you partition a beam into fractional parts to power
spaceships. Funded by NSF/Gates/DARPA and used as a research platform. The
cleanest existing demonstration that **fraction addition can be a spatial puzzle
rather than an arithmetic exercise**.

### Mathbreakers
3D first-person world where numbers are physical objects you combine, halve and
negate. Ambitious, never fully landed commercially, but the closest prior art to
"Minecraft, but the blocks are numbers."

### Minecraft Education
Not a math game — a sandbox with math lessons layered on. Official lessons cover
volume (fill a sandbox with blocks, derive the equation), coordinate planes
(plot and draw with functions), and scale/ratio (build a museum to scale).

Why it works is worth naming precisely: **building a thing requires the maths as
a side effect.** Area and perimeter when you lay a floor; ratio when you scale a
build; multiplication when you craft. The maths is instrumental, never presented.
That is intrinsic integration achieved through *purpose* rather than through
mechanics, and it's the second viable route.

---

## Cross-cutting lessons

1. **The intrinsic ones are old, few, and mostly research projects.** The
   commercial market optimises for content volume and session length, which
   selects for extrinsic designs. A hand-built collection of 6–10 genuinely
   intrinsic games has no real equivalent on the market.
2. **Every good one is a puzzle or an action game with a single mechanic**, not a
   platform with a question bank.
3. **The best ones have no words.** Slice Fractions, DragonBox and Refraction are
   all essentially textless. That matters for a kid who is self-conscious — no
   reading level, no "grade 4 skills" label, nothing that says *behind*.
4. **Nobody has done the fade well.** The identified gap in DragonBox — concrete
   play that never becomes symbolic notation — is the thing this project is
   uniquely positioned to fix, because the symbolic tutor *already exists* at `/`.

---

## Sources

- [Prodigy review — The Learning Standard](https://thelearningstandard.org/apps/prodigy)
- [7 reasons to say "no" to Prodigy — Fairplay for Kids](https://fairplayforkids.org/pf/prodigy/)
- [Advocacy group files complaint against math game — Forbes](https://www.forbes.com/sites/petergreene/2021/02/22/advocacy-group-files-complaint-against-math-game/)
- [Prodigy gamification case study](https://trophy.so/blog/prodigy-math-game-gamification-case-study)
- [Number Munchers — Wikipedia](https://en.wikipedia.org/wiki/Number_Munchers)
- [Refraction — UW Center for Game Science](https://mediaspecialistsguide.blogspot.com/2012/10/refraction-math-game-about-fractions.html)
- [Mathbreakers](https://www.kickstarter.com/projects/mathbreakers/mathbreakers-a-3-d-math-exploration-game)
- [Math Essentials with Minecraft Education](https://education.minecraft.net/en-us/resources/math)
- [Minecraft Education: Volume World lesson](https://education.minecraft.net/en-us/lessons/volume-world)
- [Ratio Riddles — Minecraft Education](https://education.minecraft.net/en-us/blog/ratio-riddles)
- [Arcademics](https://www.arcademics.com/games/) — representative of the pattern to avoid
