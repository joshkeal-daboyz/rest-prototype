ticket: 036-playtest-harness
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A separate `npm run playtest` that replays one winning script per ladder map (01–64) through `loadPuzzle → createGrid → createMapPlay`, writes a plain-text trace per map (state, prompt and cues per step, then the Relight plan, its cues and a `locked` line) that is compared with a committed file snapshot, and runs a draw smoke on a Proxy canvas. All of it lives in `tests/playtest/**` plus one `package.json` line, so `npm test` and `npm run gate` don't change.

## Does the branch do it?
I judged `git diff try/all...ticket/036-playtest-harness`. The `.claude/`, `CLAUDE.md`, `docs/`, `tickets/` changes in that diff come from the merge of `main`'s commit 366b952 (cutting the ticket and adding the agent). The builder's own commits (0246e12, 7dab069, d699919) touch only `tests/playtest/**` and the one `package.json` line.

**Scripts**
- *Every map, no orphans.* `ladder.ts` `ladderIds()` reads `puzzles/` with `/^\d\d-.*\.json$/`, which leaves out `lamp-row.grid.json`, the only non-ladder JSON there. `playtest.test.ts` "every ladder map has a script…" soft-asserts `missing` and `orphans` with the ids in the message, and each per-map test also fails with "`<id>`: no script". Met.
- *Each script wins.* `replay.ts` checks every move: `parseCheckMove` must not return null, `undo` is refused, the id must be in nodes/lines, the click must add a play entry, and the entry must be `ok`. Otherwise it writes a `STOPPED` line and sets `failure {step, move, message}`. The test soft-asserts `failure` to be null and `complete` to be true, naming the map, step and move, before `toMatchFileSnapshot`, so the diff still prints. Moves left after `complete` are reported, not failed ("on its last move or before"). Met.
- *Within the README's min.* `readmeMins()` parses the `puzzles/README.md` table at run time. The rename tables are skipped because their first cell isn't `NN`. It takes the note-sourced maps from the "Min clicks for … are from their notes" sentence. `clickCount` counts moves that aren't `wait:`, a release included. The header marks `(note)`, as the 49 trace shows. Met.

**Trace**
- *One trace per map, committed.* 64 `__snapshots__/<id>.trace.txt` files. The sampled 09 and 49 contain the header, the `start` line, then per step: lit (sorted), feeds `id load/cap [over]`, blown, readable faults (sorted), parts, batteries on battery maps only (2 dp, released/charging/idle), prompt and cues `name@at` (3 dp). `tests/playtest/.gitattributes` pins `*.trace.txt` to LF, so a second run on Windows stays byte-identical. A matching `toMatchFileSnapshot` doesn't write. Met.
- *Relight plan and cues.* `cues.ts` `relightTiming` uses `planRelight`'s output unmodified, and its mapping is word-for-word `main.ts`'s `relightCues` (lines 26–31). The cue list comes from `relightCues(igniteAt, duration)`. Steps with no sound show `cues: -` (49 step 5). Met.
- *The Relight can't be interrupted.* After the win, `replay.ts` clicks every breaker, switch and battery, plus each fault site (a stronger check than asked), then `play.undo()`. It checks that the bus recorded no new event and compares a state signature: lit, breakers, switches, parts, faults, readable faults, complete. The `locked:` line gives the count, e.g. "ignored 5 clicks" on 09. Soft-asserted. Met.
- *Deterministic.* Each `replay()` call makes a fresh `RecordingBus`, grid, play, `StepCues`/`CueTracker` and `now` closure. The test replays twice and compares the traces. Met.

**Draw smoke**
- *Every map draws.* Uses the real `createMapRenderer` on `fakeCanvas()` at 1280×720, with a Proxy context: no-op methods, gradient factories returning `addColorStop`, `measureText` at 7×length, and a count of non-finite arguments and assigned values. It forwards `fuse:blown` to `renderer.notify`. It draws a frame at the start, one per move at game time, and three in the Relight (0, d/2, d+0.5). The test asserts the frame count, that some drawing calls were made, and that `nonFinite ≤ KNOWN_NONFINITE[id] ?? 0`. The table is empty, and the README says so. One deviation: the insets go in through the constructor's `insets` option, not `setInsets(...)`. That is the same path `main.ts` uses at creation (line 103). Met.

**Runs apart from the gate**
- `package.json` adds exactly the ticket's `playtest` line and no dependency. `tests/playtest/vitest.config.ts` includes only `tests/playtest/**/*.test.ts`. `tests/playtest/tsconfig.json` extends the root config. The root `vite.config.ts` still includes only `src/**` and `tools/**`. The root `tsconfig.json` is unchanged. The tests carry explicit timeouts (20 s and 60 s). The main session reports gate 1149 tests, the same as the base, and playtest 130 passed. Met.

**A break reads as a regression.** This is a builder-local run, and I didn't reproduce it. The code supports it: with a click removed from 09, `complete` goes false. The soft assertion then names `09-shrine-circuit` ("the script did not complete the job"), or a `STOPPED` step if the next move is refused, and the file-snapshot diff follows. `-u -t "09-shrine-circuit"` filters out every other map's `toMatchFileSnapshot`, so only that file can be rewritten. The main session should check that the builder's report pasted both outputs.

**README.** `tests/playtest/README.md` covers adding a script (analyzer line, or the note when the search times out; a missing script fails), running and updating one map with the ticket's exact commands, a field table for trace lines, the intended-versus-regression rule (intended only when an acceptance criterion of the ticket under test asks for it), and every known limit the ticket lists. Met.

## Rule conflicts and risks
- Nothing in `src/`, `puzzles/` or `tools/` is touched, `src/grid/` and `src/night/` are untouched, there is no new dependency, and no Decided rule changes.
- As the ticket accepted (open question 2), `SUBSCRIBED` and the ignition mapping are copies. Today they match `src/audio/engine.ts` and `src/main.ts` exactly, but they can drift silently until the follow-up ticket.
- `playtest.test.ts` asserts `IDS.length === 64`. The README's own "Adding a map's script" steps would fail on a 65th map with "the ladder is 64 maps", even with its script in place.

## Must fix
none

## Could improve
1. `tests/playtest/playtest.test.ts`: drop the hard `expect(IDS.length).toBe(64)` (or make it `≥ 64`), so adding a map by the README's steps doesn't fail the run. The missing/orphan check already covers what matters.
2. `tests/playtest/playtest.test.ts`: the `fromNote` assertion hard-codes `["49","54"]`, a copy of the README the ticket asked the harness to read. It makes a README-only edit fail the playtest. Consider removing it, since the `(note)` marks in the trace headers already pin it.
3. `tests/playtest/replay.ts`: if you want the smoke to match the ticket's wording exactly, also call `renderer.setInsets({ top: 220, bottom: 140 })` after creating it, so the `setInsets` path (the one `main.ts` uses on resize) is exercised too.
