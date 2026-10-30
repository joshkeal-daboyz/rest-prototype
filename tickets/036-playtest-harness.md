# 036 · The playtest harness: every ladder map replayed headlessly, its trace snapshotted

owner: playtester
status: done (merged into try/all as 2648c33; Josh, in chat: "Merge it"; review: meets, must-fix 0)
branch: `ticket/036-playtest-harness`
depends on: the 027 and 029–034 stack on `try/all`. Branch from `try/all`, or from `main` once that stack merges, and merge after it. The harness needs that stack for three things: 029's map ids (they rename 52 maps, so snapshots keyed on `main`'s ids would all go stale), 027's analyzer line `one shortest win: …`, and 027's `parseCheckMove`/`CHECK_CLICK_SECONDS` in `src/core`. It doesn't depend on 035 (clicks under empty insets). Whichever of 035 and 036 merges second gets its playtest from this harness.

(Numbered 036 because `035-clicks-under-empty-insets.md` already exists, and tickets are never renumbered.)

## Josh's words
> "I would like to add a playtesting agent to the pipeline. When changes are made the playtesting agent needs to perform regression tests of the functionality that might be impacted by the change in the ticket."

## Goal
After a green gate, the `playtester` (`.claude/agents/playtester.md`) can run `npm run playtest` on a branch. It plays every ladder map, 01–64, to the Relight through the real `loadPuzzle → createGrid → createMapPlay` chain, plus the Relight plan, the audio cues and one drawn frame. Then it compares each map's trace with the one committed from `main`. A difference shows up as a readable diff that names the map and the action, so the playtester can match it to an acceptance criterion or call it a regression. `npm test` and `npm run gate` don't change.

## What it is
- **Scripts.** `tests/playtest/solutions.ts` gives each ladder map one winning script. A script is a list of moves in the check-block syntax from `puzzles/SCHEMA.md` ("Design checks"): `<id>`, `release:<battery>`, `repair:<id>` and `wait:<seconds>`, parsed with `parseCheckMove` from `src/core`. Scripts have no `undo`. The ladder is every `puzzles/NN-*.json`. `lamp-row.grid.json` is not on it. To write a script, run `npm run analyze puzzles/<id>.json` and use its `one shortest win:` line, or follow the note's intended read where the search runs out of time.
- **Replay.** Each map gets a fresh `EventBus` subclass that records every `emit` (name and payload, in order). Then `createGrid`, then `createMapPlay` with a fake `MapRenderer` (all methods are no-ops and `hitTest` returns `null`) and an injected `now`. Each move goes through `play.click(id)`, the same path the player's click takes, never `grid.*` directly. A `repair:<id>` move is a click on `<id>`. Time follows the convention used by the analyzer and `tools/checkrun.ts`: after every click, one `play.tick(CHECK_CLICK_SECONDS)`, and a `wait:N` is one `play.tick(N)`. After each move, `play.hoverAt(<the move's id>)` (a wait keeps the last hover), and the prompt is read from `play.view().prompt`.
- **The trace** is plain text, one line per step, so a Vitest diff points at the exact line. It goes to its own file, `tests/playtest/__snapshots__/<id>.trace.txt`, through `toMatchFileSnapshot`. A header line gives the map id, the script's click count and the README's min (marked `(note)` where the README takes it from the note). Then:
  - a `start` line, and one line per move, starting with the step number and the move. Each line has:
    - the lit lamps (sorted);
    - per feed: id, load / capacity, and `over` when browned out;
    - the blown fuseboxes;
    - the readable fault ids (sorted);
    - the parts left;
    - on battery maps only, each battery's charge (2 dp), capacity and released/charging;
    - the prompt;
    - the audio cues that step's events produced (`name@at`, `at` to 3 dp).
  - At the end:
    - `complete`;
    - the Relight plan: `planRelight`'s `lampOrder` with each lamp's ignition time, and `duration` (3 dp);
    - the Relight cues from `relightCues(igniteAt, duration)` (`name@at`);
    - one `locked` line (see the Relight criterion below).
- **Cues** come from a fresh `CueTracker` (`src/audio/cues.ts`). Every recorded event goes through it in order. For `igniteAt`, the harness copies `main.ts`'s three-line mapping (each `lampOrder` lamp's `nodeArrive`), with a comment that points at `main.ts` (see open question 2). Voices aren't recorded, only names and times (open question 3).
- **The draw smoke** runs the same replay with the real `createMapRenderer`, on a fake canvas at 1280×720. The canvas has `clientWidth`/`clientHeight`/`width`/`height` and a `getContext("2d")` that returns a Proxy. On the Proxy, every method is a no-op, gradient and pattern factories return an object with `addColorStop`, and `measureText` returns `{ width: 7 × text length }`. The smoke uses `setInsets({ top: 220, bottom: 140 })` and forwards `fuse:blown` to `renderer.notify` as `main.ts` does. It draws one frame at the start, one after every move (at game time), and three during the Relight (`relightT` = 0, duration / 2, duration + 0.5). The Proxy counts every numeric argument that isn't finite.
- **Its own config.** `tests/playtest/vitest.config.ts` includes only `tests/playtest/**/*.test.ts`. `tests/playtest/tsconfig.json` extends the root `tsconfig.json` and includes `tests/playtest`. The one `package.json` line is `"playtest": "tsc --noEmit -p tests/playtest/tsconfig.json && vitest run --config tests/playtest/vitest.config.ts"`. The root `vite.config.ts` include stays `src/**` and `tools/**`, so `npm test` never collects the harness. Only the playtester updates its snapshots, deliberately.

## Acceptance criteria
All are Vitest in `npm run playtest` unless marked otherwise.

**Scripts**
- [ ] **Every map, no orphans.** Every `puzzles/NN-*.json` has a script in `solutions.ts`, and every script names an existing map. A missing script or an orphan script fails, naming the id. `lamp-row` is skipped by name.
- [ ] **Each script wins.** Replayed as described in "What it is", every script reaches `grid.state().complete === true` on its last move or before, with every move valid (`parseCheckMove` not null, and the id exists in the map). The check is `expect.soft` and names the map, the step and the move, so the trace diff still prints when it fails.
- [ ] **Within the README's min.** For each map, the script's click count (moves that aren't `wait:`; a release counts) is ≤ the `Min clicks` column of `puzzles/README.md`. The harness reads that column from the README at run time, rather than copying it. The README's note-sourced maps (49 `two-cells` and 54 `whole-circuit`, named in its "from their notes" sentence) are marked `(note)` in the trace header. The rest are from the search.

**Trace**
- [ ] **One trace per map, committed.** `tests/playtest/__snapshots__/<id>.trace.txt` exists for all 64 maps and contains the lines listed in "What it is". It is written once on the branch, from its base. With no change to `src/` or `puzzles/`, a second run is green and leaves every file byte-identical.
- [ ] **Relight plan and cues in every trace.** Each trace ends with `complete: true`, the `lampOrder` with ignition times, `duration`, and the Relight cue list (`relight:bed`, one `relight:chime:N` per chime, `relight:close`). Each step line shows its cues, and a step whose events have no sound shows `cues: -`. On `09-shrine-circuit` the lamp order is the one `planRelight` gives today, and `planRelight`'s output is used unmodified.
- [ ] **The Relight can't be interrupted** (a Decided rule). After the win, the harness clicks every breaker, switch and battery id on the map and calls `play.undo()`. The bus records no event, and lit, breakers, switches, parts and faults are unchanged. The trace's `locked` line says so, giving the number of clicks it ignored.
- [ ] **Deterministic.** Two runs in one process give identical traces. Each map gets a fresh bus, grid, play, tracker and `now`.

**Draw smoke**
- [ ] **Every map draws.** For each map, every frame described in "What it is" calls `draw` without throwing. The non-finite-argument count is 0. If the base already has a non-zero count on some map, the builder doesn't touch `src/`. Instead it pins that count in a `KNOWN_NONFINITE` table in the harness, names it in the README and in its report, and the test fails if the count grows.

**Runs apart from the gate**
- [ ] `npm run playtest` is green, including its typecheck of `tests/playtest`. It finishes in under 60 s on Josh's machine, and slow tests carry an explicit timeout, as 033 set.
- [ ] `npm test` and `npm run gate` have the same test count as on the base, and none of their test files is under `tests/`. (The main session checks the gate and compares the counts.)

**A break reads as a regression** (the builder runs this locally, doesn't commit it, and pastes the output into its report)
- [ ] With one click removed from `09-shrine-circuit`'s script, `npm run playtest` fails. The output names `09-shrine-circuit`, says the script didn't complete, and shows the trace diff from the first changed step line, with before and after visible.
- [ ] The README's one-map update command, run after restoring the script, rewrites only `09-shrine-circuit.trace.txt`, and `git status` shows no other change.

**README**
- [ ] `tests/playtest/README.md` explains:
  - how to add a map's script (from the analyzer line, or from the note when the search times out), and that a new map without a script fails the run;
  - how to run one map (`npm run playtest -- -t "<id>"`) and update only its snapshot (`npm run playtest -- -u -t "<id>"`);
  - how to read a trace line;
  - how to tell an intended difference from a regression: a difference is intended only if an acceptance criterion of the ticket under test asks for it, else it is a regression, as in the agent file;
  - the known limits: one tick per click or wait (no per-frame stepping), cue voices not recorded, the `main.ts` mapping and the cue path copied (see open question 2), and no hit-testing, undo or `src/ui/logic` checks yet.

## Files
- `tests/playtest/**`: the harness, `solutions.ts`, `vitest.config.ts`, `tsconfig.json`, the tests, `__snapshots__/`, `README.md`.
- `package.json`: the one `playtest` script line. Nothing else in it, and no dependency.
- Out of scope: everything in `src/`, `puzzles/`, `tools/`, `.claude/`, `CLAUDE.md`, the root `tsconfig.json` and `vite.config.ts`. If the harness needs an export that doesn't exist, the builder stops and reports it. It doesn't add one.

## Interfaces
None new, so no `src/core/` change. The harness only imports what already exists on the base:
- `src/core`: `loadPuzzle`, `EventBus`, `parseCheckMove`, `CHECK_CLICK_SECONDS`.
- `src/grid`: `createGrid`.
- `src/play`: `createMapPlay`.
- `src/render`: `createMapRenderer`, `planRelight`.
- `src/audio/cues.ts`: `CueTracker`, `relightCues`.

There are no new dependencies: the fake canvas is a hand-written Proxy, with no jsdom or canvas package. `toMatchFileSnapshot` is in Vitest 3 already.

## GDD check
No rule, number, payload or puzzle changes. The harness adds a second test for two Decided rules: the win (every target lit, no brownout, through `complete` on every map) and "the Relight can't be interrupted". `rules-coverage.md` gets those two rows when this ticket merges.

## Open questions for Josh (defaults apply if you just approve)
1. **Build on the stack, or on `main` now?** **Default: on `try/all`, merged after 027 and 029–034.** That way the first snapshots are of the ladder you're playing, with 029's ids. Building on `main` now would mean re-keying all 64 scripts and snapshots when 029 merges, and nobody would be playtesting that merge.
2. **Two things the harness copies because they aren't exported.** The first is `main.ts`'s `relightCues` (the lamp-to-ignition-time mapping the sound uses). The second is the engine's `SUBSCRIBED` event list: the harness runs every event through `CueTracker`, which gives no cue for an event with no sound. **Default: copy them now, with a comment, and cut a small follow-up later.** In that follow-up, the renderer exports the ignition mapping and the sound agent exports the list, so `main.ts` and the harness share one copy. Until then, a change to either one in `main.ts` or `engine.ts` wouldn't show in the trace.
3. **How much of each cue goes in the trace?** **Default: name and time only.** Voices (pitch, envelope) are already pinned by `src/audio`'s own tests. Recording them would make every sound-tuning ticket rewrite all 64 traces.
4. **Time steps.** **Default: one tick per click (1 s) and one per wait**, the convention the analyzer and the README's min clicks use, so the analyzer's scripts replay as found. The browser steps time once per frame. The harness doesn't model that, and the README says so.
