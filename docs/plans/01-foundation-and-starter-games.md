# Plan 01 — Foundation, tutor port, starter games

> **Status:** Phases 0–4 and 6 complete and deployed — foundation, `lib/math/`, all 21
> topics ported and verified, tutor UI, and both starter games (Threading, Munchers).
> **Only Phase 5 (cutover) is outstanding**, and it is gated on a human side-by-side of
> `/tutor` against `/tutor-original`. See [03-tutor-parity.md](03-tutor-parity.md).
> **Follow-up:** [02-future-games.md](02-future-games.md) — everything deliberately deferred.
> **Evidence base:** [../research/](../research/) — 01 pedagogy, 02 tech, 03 prior art, 04 audience, 05 vision.

---

## Context

The app today is a thin Next.js shell that serves a 3,650-line self-contained HTML
tutor from a route handler. The tutor's *design and functionality are good and stay* —
but the delivery mechanism is a dead end. Games and tutor could never share problem
generators, deep links would need script injection, and every future feature would be
another string hack on a 217KB blob.

This plan rebuilds it as a real App Router application in TypeScript, with the tutor's
behaviour preserved exactly, then adds the games section on that foundation. Two rules
drive everything:

**No tech debt from preserving the HTML.** `docs/math-table.html` becomes a *reference
oracle* used to prove the port is correct, then it is archived.

**No tech debt from access control.** Clerk answers *who are you*; our own database
answers *may you in*.

Product constraints from the research: the maths must be the game mechanic; every game
fades into the tutor's own notation; no countdown on any individual question; no grade
labels anywhere; failure instant and silent.

---

## Is Clerk the wrong tool? No — but we were using it for two jobs.

Clerk *is* designed for restricted access, and restricted mode is free even on
production. What actually bit us was three things: the allowlist toggle defaults off,
the allowlist governs **sign-up only** so removing someone doesn't revoke them, and the
allowlist becomes a paid feature on a production instance.

The fix is the standard separation, not a different vendor:

| Question | Owner |
|---|---|
| Who are you? | Clerk — sign-in, sessions, OAuth |
| May you in? | `people` table in Neon |
| What have you done? | `people.id` FK on game/tutor progress |

Costs almost nothing (we need a `people` table anyway for per-kid progress) and buys
three things: revocation that actually works (delete a row), no plan gating ever, and —
importantly — **a future move to a production Clerk instance becomes a non-event**,
because our data keys on our own person id and email rather than a Clerk user id that
wouldn't survive the migration.

Clerk's restricted mode stays on as free defence in depth.

---

## Architecture

```
app/
  layout.tsx                       ClerkProvider, tokens, fonts
  page.tsx                         landing — card grid by topic group
  sign-in/[[...sign-in]]/page.tsx
  sign-up/[[...sign-up]]/page.tsx
  no-access/page.tsx               signed in, not on the list
  (app)/                           route group — everything authorized
    layout.tsx                     nav chrome; calls requireAllowedPerson()
    tutor/[topicId]/page.tsx       ?level=&mode=  — real deep links, no injection
    play/[topicId]/page.tsx        games
  api/
    sessions/route.ts
    sessions/[id]/attempts/route.ts
lib/
  math/                            PURE TS — no React, no HTML, no DOM
    types.ts                       Problem, Model, Step, Cell, Slot, Picture
    rng.ts                         seeded PRNG: rnd, pick, coin
    number.ts                      gcd, lcm, simp, rd, factorsOf, isPrime, roundNice
    format.ts                      fmt, fracText, exprText, pn, decPlaces, trimNum
    engines/
      grid.ts                      buildColumn, buildMulModel, buildDivModel, revealFor
      steps.ts                     step/ask model
      facts.ts                     fams, card, factHook, deck
    topics/
      index.ts                     TOPICS, BY_ID, GROUPS
      facts-mul.ts … geometry.ts   21 modules
  db/  index.ts schema.ts migrations/
  auth/ person.ts                  getCurrentPerson, requireAllowedPerson
components/
  tutor/  TutorShell, modes/, render/
  ui/     Card, Button, Pill
styles/ tokens.css
scripts/ oracle.mjs                runs the old HTML in node:vm for differential tests
```

**The load-bearing decision: `lib/math/` returns data, never markup.** That single seam
is what makes the games cheap — Threading and Munchers import the same generators the
tutor uses, and the symbolic-fade panel is literally the tutor's own React component.

---

## Phase 0 — Back up before touching anything ✅

Nothing in this rebuild deletes. Everything superseded gets archived, and the working
app is snapshotted before the first structural change.

**0.1 Two backups, belt and braces.**

```bash
git tag pre-rebuild-v1                              # precise, free
mkdir -p _archive/pre-rebuild
rsync -a --exclude node_modules --exclude .next --exclude .git \
         --exclude _archive --exclude .playwright-mcp ./ _archive/pre-rebuild/
```

The tag is precise; the folder copy is what you can actually open and read without git
gymnastics. The folder includes `.env.local`, which is exactly why it must never be
tracked or uploaded.

**0.2 Keep `_archive/` out of git *and* out of deploys — two separate mechanisms.**

- `.gitignore` → `/_archive/`
- `scripts/deploy.sh` → `--exclude '_archive'` in the rsync flags

**Both are required.** `.gitignore` does not affect `rsync`, so without the deploy
exclude the whole archive — including a copy of `.env.local` — gets bundled into the
Vercel upload. The script's `.env*` strip is `-maxdepth 1` and would never reach a
nested copy. Verified by staging dry-run: 25 files, no `.env*`, no `_archive`.

**0.3 The rule for the rest of this plan:** anything described as removed is *moved to
`_archive/`*, never deleted.

**0.4 Capture the plans in the repo** — this document and
[02-future-games.md](02-future-games.md), written before any building starts so no idea
from the design conversation is lost once we're deep in the port.

---

## Phase 1 — Foundation

**1.1 Neon.** `vercel integration add neon --name cooperkids-math-db --no-env-pull`.
The `--no-env-pull` is mandatory — a default pull rewrites `.env.local` wholesale and
would destroy the Clerk keys. Pull to an alternate filename, hand-append `DATABASE_URL`
and `DATABASE_URL_UNPOOLED`, delete the temp file.

**1.2 Packages.** `npm i drizzle-orm @neondatabase/serverless` /
`npm i -D drizzle-kit dotenv-cli tsx vitest`.

**1.3 Database.** `lib/db/index.ts` uses a plain lazy `getDb()` — **never**
`neon(process.env.DATABASE_URL!)` at module scope (throws during `next build`), and
**never** a Proxy wrapper (breaks introspection, hangs with no error).
`drizzle.config.ts` uses `DATABASE_URL_UNPOOLED` for DDL. All db scripts go through
`dotenv-cli` — drizzle-kit and tsx don't read `.env.local`.

```
people
  id uuid pk, email text unique (lowercased), display_name text,
  clerk_user_id text unique null, created_at, revoked_at null

game_sessions
  id uuid pk, person_id uuid → people(id), game_id, topic_id, level,
  client_session_id text, started_at, ended_at
  unique (person_id, client_session_id)        -- POST retries idempotent
  index (person_id, topic_id, started_at desc)

game_attempts
  id bigserial pk, session_id uuid → game_sessions(id) on delete cascade,
  seq int, prompt jsonb, response jsonb, elapsed_ms int, created_at
  unique (session_id, seq)                     -- idempotent bulk insert
```

**Store inputs, derive outputs — applied honestly. No `correct` column, no `mastery`
table.** Correctness is a pure function of `prompt` + `response`, computed on read with
the same `lib/math/` code the game uses, so a scoring fix retroactively fixes history.
It's also the safer product choice: there's no persisted score to accidentally surface,
which the no-comparison constraint demands.

**1.4 Auth.** `lib/auth/person.ts`:

```ts
export const getCurrentPerson = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;
  // resolve by clerk_user_id, else by verified email and backfill clerk_user_id
  // return null if absent or revoked_at is set
});
export async function requireAllowedPerson() { … redirect("/no-access") }
```

`React.cache` so the DB hit is once per request.

**Call `requireAllowedPerson()` at the top of every gated page and every API route — not
only in the layout.** A layout's children can begin rendering before the layout's
redirect lands, which puts content in the RSC payload. The `(app)/layout.tsx` also calls
it (cached, free) for nav chrome, but the page-level call is the enforcement.

`proxy.ts` keeps only the signed-in check, plus the fix it's currently missing:

```ts
if (request.nextUrl.pathname.startsWith("/api/")) {
  return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
}
```

Without this a `fetch` follows a 307 into sign-in HTML and dies on `res.json()` with an
error pointing nowhere near the cause. Proxy cannot reach the database, which is why
authorization lives in the server components rather than at the edge.

Seed the three emails via `lib/db/seed.ts`.

**1.5 Design tokens.** `styles/tokens.css` from `docs/math-table.html:8–24` verbatim,
plus the body gradient treatment at 27–34. Components use CSS Modules.
**Do not port `.rectshape`, `.dimlbl`, `.tri`, `.prism` (lines 305–312)** — dead rules
from a DOM shape renderer that `svgShape` replaced.

**1.6 Keep the old app alive.** The current route handler moves to `/tutor` and keeps
working throughout the port — both the live fallback and the differential oracle.
Archived, not deleted, in Phase 5. Update `outputFileTracingIncludes` to key on
`"/tutor"`; production-only failure mode, invisible in dev.

---

## Phase 2 — `lib/math/` core

**2.1 Seeded RNG.** `lib/math/rng.ts` exposes `rnd(a,b)`, `pick(arr)`, `coin(p)` bound to
an injectable PRNG. Randomness in the original is fully centralized — `rnd`/`pick` at
lines 439/440 plus exactly 10 inline `Math.random()<K` coin flips, **all inside `gen()`**,
none in `build()` or `picture()`. Every `gen` takes the RNG explicitly rather than
reaching for a module global, so tests are deterministic and games can replay a problem.

**2.2 Model types.** The single highest-leverage refactor: **replace the imperative `Row`
builder (line 480) with a `Cell[]` data model.** `Row` is a sparse-cell accumulator with
no natural React analogue; the three grid renderers become components consuming
`{cells, template, kind}`.

```ts
type Model =
  | { kind:"grid"; title; cells; phases; slots; answer; answerText }
  | { kind:"steps"; title; lead?; steps: Step[]; answerText; picture? }
  | { kind:"facts"; … }

type Step = { label: string; say: Rich; sub?: Rich; show: Node[]; ask?: Ask[] };
type Ask  = { label: string; expect: string; w?: number; mode?: "numeric"|"text" };
```

`Rich` is the narration type. The originals contain `<b>` markup — represent as a small
token array (`[{t:"text"},{t:"em"}]`), not raw HTML, so nothing ever renders with
`dangerouslySetInnerHTML`.

`Node[]` is the display vocabulary — the tagged union the ~23 visual constructs reduce to:
`workLine`, `fraction`, `fracBar`, `numberLine`, `unitGrid`, `areaModel`, `blocks`,
`ladder`, `percentBar`, `hundredSquare`, `ratioTable`, `balance`, `shape`, `note`,
`banner`, `dmsbStrip`, `divBracket`.

**2.3 Split model from answer state.** In the original, `slots` are *mutated in place* —
the model and the view state are the same objects. Split them: `slots` static
(`{idx, col, expect, hint}`), answers `Record<idx, {val, state}>` in React state. The
only genuinely non-idiomatic part of the original, and about a day.

**2.4 Engines.** `buildColumn`, `buildMulModel`, `buildDivModel`, `buildShare`,
`evalSteps` and `decompose` are **already pure data with zero HTML**, so roughly half the
grid engine ports directly. `revealFor` is a clean fold from phase index to a small reveal
descriptor; make it public and hand it to React.

Only two of 21 topics have stateful pictures (`mul`'s `ui.areaShown`, `div`'s
`ui.shareStep`) — everything else is a pure `problem → picture`.

---

## Phase 3 — Port the 21 topics, verified differentially

The bulk: ~2,150 lines of topic definitions, though **~55% is prose strings** (`say`,
`sub`, `note`, `hint`, `tagline`, `ABOUT`) that port verbatim as data.

**3.1 The oracle.** `scripts/oracle.mjs` slices the `<script>` block out of
`docs/math-table.html`, runs it in `node:vm` against a small DOM stub, overrides
`Math.random` with the same seeded PRNG as `lib/math/rng.ts`, and exposes `TOPICS`.

**3.2 The differential test** (vitest). For all 89 topic×level combos × ~200 seeds:

- `gen(level)` produces an identical problem object.
- `title(p)`, `answerText`, and every `ask.expect` match.
- `practice.answer(p)` and `practice.check(p, v)` agree.

Rendering is *expected* to differ — that's the point of the port. Only the mathematics is
asserted. A stronger guarantee than the original suites gave, because it proves
equivalence rather than plausibility.

**3.3 Port the invariant tests from BUILD-NOTES** — they encode ten real bugs and get
*easier* now that models are data rather than DOM:

- Every Watch step must change the work area (found 3 bugs).
- Level labels honest in both directions: nothing outside `levelKinds` is generated, and
  every declared kind is reachable (found 4).
- Every add/sub problem at every level actually regroups; L4 borrows across a zero
  (found 2, including two bad fixes).
- Scratch marks survive answering a box.

**3.4 Order:** `facts` (2 topics, simplest, unblocks Threading) → `grid` (5) → `steps`
(14). Each topic is done when its differential test is green.

---

## Phase 4 — Tutor UI

~23 components, unevenly weighted. Six are high-traffic — `WorkLine` (110 emissions),
`Fraction` (29), `StepList`, `NarrationBox`, `Note` (34), `ColumnGrid` — and three are
large and fiddly: `ColumnGrid`, `MulGrid`, `DivBracket`. The rest (`PercentBar`,
`HundredSquare`, `RatioTable`, `Balance`, `ShapeSvg`, `Ladder`, `Blocks`) are
single-topic one-offs and small.

Routes are real: `/tutor/frac-addsub?level=3&mode=try`. Deep linking, back button and
bookmarking all work with no injection and no bootstrap script.

`TutorShell` owns topic/level/mode selection and answer state; mode components
(`PictureIt`, `WatchIt`, `YouTry`, `Practice`, `LearnDrill`) render from the model.
`modesFor` becomes a pure function of the model rather than reading a global.

Two pictures need interactivity (`mul` area model click-to-reveal, `div` stepped sharing)
— plain React state, replacing the delegated-listener + `id` machinery in the original's
`head.btns`.

---

## Phase 5 — Cutover (archive, don't delete)

Only once the differential and invariant suites are green, and only after a second
snapshot (`_archive/pre-cutover/`):

```bash
mkdir -p _archive/single-page-tutor
mv 'app/(app)/tutor/route.ts'  _archive/single-page-tutor/route.ts.bak
mv docs/math-table.html _archive/single-page-tutor/
mv scripts/oracle.mjs   _archive/single-page-tutor/
```

Keep the differential tests in the repo but skipped (`describe.skip`) with a one-line
comment pointing at `_archive/single-page-tutor/math-table.html` — if the oracle ever needs to come
back, that's the whole restoration procedure. The invariant tests stay active; they are
the permanent safety net.

Remove `outputFileTracingIncludes` once nothing reads the HTML at runtime. `/tutor`
becomes the only tutor.

**Do not archive until `/tutor` has been verified on a production deploy**, not just
locally — the tracing-include failure mode is production-only.

---

## Phase 6 — Phaser games

Now cheap, because `lib/math/` already exists and is shared.

`npm i phaser` (4.2.1). `app/(app)/play/[topicId]/GameHost.tsx` is `"use client"`
(`next/dynamic({ssr:false})` is not allowed in a Server Component) and maps game id
through a **static record of `() => import(...)` thunks** — not a template string, or
Turbopack can't statically analyse the chunk.

`components/game/PhaserGame.tsx` owns the canvas lifecycle. Five things it must get right:

1. **A `cancelled` flag** — React 19 StrictMode double-invokes effects and the first
   cleanup runs before `await import("phaser")` resolves. Without it you get two games,
   two canvases, doubled input and doubled RAF loops. This is *the* Phaser-in-React bug.
2. **Pre-boot destroy guard** — `destroy()` defers to the end of the game step; calling it
   before boot leaves an orphaned RAF loop burning CPU against a detached canvas. Defer to
   `game.events.once("ready", …)`.
3. **Empty deps** — never recreate on prop change; push changes through the bus.
4. **A per-mount emitter via `game.registry`**, not the module-level `EventBus` the
   official `phaserjs/template-nextjs` uses. That singleton leaks listeners across mounts
   and route changes, which here means duplicate database writes.
5. **No React children in the host div** — Phaser appends the canvas; HUD goes in an
   absolutely-positioned sibling.

Sizing: 1024×576 design resolution, `Scale.FIT` + `CENTER_BOTH`, host div
`aspect-ratio:16/9; touch-action:none`. **`touch-action:none` is not optional** — without
it iOS Safari treats Threading's drag as a page scroll and the mechanic simply doesn't
work on the target device. Portrait hint is CSS-only; no JS orientation lock (needs
fullscreen, unavailable on iOS Safari).

**Threading** (`/play/facts-mul`, `/play/facts-div`) — target pinned at top, number tiles
drift across 2–3 lanes, drag a thread between two tiles. Correct pair locks and flies into
the target; wrong pair dissolves silently. Pressure comes only from the flow — tuning is
lane speed and density, never a clock. Levels are `fams(level)` verbatim, and the level
picker shows the tutor's own level names. Symbolic fade staged on progress *within a
session* so it never reads as a difficulty label: dot array → numeral with `7 × 8 = 56`
animating in → bare `7 × ? = 56`.

**Munchers** (`/play/factors`) — 6×5 grid, rule per round (multiples / factors / primes /
common factors), tap-adjacent to move, tap-own-cell to munch. Wrong munch shakes once, no
penalty. Roamers on a slow ~900ms beat; caught = instant respawn, board unchanged. Level 4
is the good one: banner reads `GCF(48, 36) = ?`, shared factors are what you eat, **and the
last one you eat is the GCF**.

Round-end panels are **the tutor's own React components**, not Phaser text — same
`Fraction`, same `WorkLine`, same `factHook` narration. That shared object across contexts
is the near-transfer lever the research identifies, and it's free now.

Build Threading end-to-end — mount, fade, DB write, deployed — before starting Munchers.
It proves the whole vertical slice at the lowest cost.

---

## Verification

**Port correctness (the main event)**
- `npm test` — differential suite green across all 89 topic×level combos.
- Invariant suite green: step integrity, level-label honesty both directions, regrouping
  guarantees, scratch persistence.
- Manual side-by-side: `/tutor` and `/tutor/<topic>` on the same seed.

**Auth**
- Signed out → `/tutor/add` redirects to `/sign-in`.
- `curl -i -X POST localhost:3000/api/sessions` → **401 `application/json`, not 307**.
- Signed in but not in `people` → `/no-access`, and **`curl` the page to confirm no content
  in the RSC payload**, not just that the browser redirects.
- Delete a `people` row → next request is locked out immediately.

**Phaser**
- Navigate `/` → `/play/facts-mul` → `/` five times; `querySelectorAll('canvas').length` is
  1 per visit, 0 after leaving. CPU returns to idle.
- `npm run build`: `phaser` appears only in the `/play/[topicId]` chunk, never in the shared
  chunk. Also settles whether Turbopack resolves `phaser`'s `exports` field — its `main`
  points at unbundled source.

**Devices** — Playwright at 844×390 and 932×430 (iPhone landscape): canvas fits, drag does
not scroll the page, rotate hint appears in portrait only. Then 1440×900 and a retina
display for DPR sharpness.

**Deploy** — `scripts/deploy.sh` preview first; `vercel inspect` must report READY, not
UNKNOWN (UNKNOWN means `readyState: BLOCKED` over commit metadata). Play a round on preview
and confirm rows in Neon before `--prod`.

---

## Hazards

1. **`app/page.tsx` and `app/route.ts` cannot coexist** at a segment — the `/tutor` move
   must be atomic.
2. **`outputFileTracingIncludes` must follow the tutor route** — dev reads from disk
   regardless, so getting it wrong passes every local check and 500s only in production.
3. **Slots are mutated in place in the original.** Porting that pattern into React produces
   stale-render bugs that are miserable to trace. Split static from answer state on day one.
4. **Narration contains `<b>`.** Tokenize it; never `dangerouslySetInnerHTML`.
5. **Authorization in a layout alone leaks into the RSC payload.** Page-level call is the
   enforcement.
6. **Don't import `phaser` from `lib/` or any Server Component** — that's how it lands in
   the shared chunk.
7. **`vercel env pull` destroys `.env.local`.** Always `--no-env-pull` / alternate file.
8. **`_archive/` needs two exclusions, not one.** `.gitignore` keeps it out of git;
   `--exclude '_archive'` in `scripts/deploy.sh` keeps it out of the Vercel upload. `rsync`
   does not read `.gitignore`, and the script's `.env*` strip is `-maxdepth 1` so it would
   not catch the archived copy of `.env.local`.
9. **Nothing is deleted in this plan.** Superseded files move to `_archive/`, snapshotted
   before the first structural change and again before cutover.

---

## Out of scope — deferred, not dropped

Everything in [02-future-games.md](02-future-games.md): the remaining arcade games, the
Puzzle Box set, the Build World, the Machine Shop, the Story Sim, the progression layer,
and the level editor. Also custom art and audio, and worksheet printing (port in Phase 4
only if it comes free).

The sequencing is deliberate: **ship the ported tutor and the two starter games, watch her
actually play them, then pick from the backlog with real evidence** — including the
fluency-vs-understanding question, much better answered by observation than by argument.
