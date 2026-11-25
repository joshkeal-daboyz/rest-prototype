# The playtest harness (ticket 036, retargeted by 081 R1)

`npm run playtest` plays every city puzzle (`puzzles/city/*.city.json`) to the Relight, headlessly, through the real
`loadCityPuzzle -> convertCityPuzzle (on its own city, 6 x 6 seed 1) -> createGrid -> createMapPlay` chain, with a no-op renderer
(nothing is drawn), and compares each puzzle's **trace** with the one committed at the last release in
`__snapshots__/<id>.trace.txt`. It runs apart from `npm test` and `npm run gate` (own config and tsconfig) and only on a release Josh
calls. Only the playtester updates snapshots, deliberately.

**The old snapshots are gone.** The 64 schematic traces were deleted in 081 R1 (Josh, 24 Nov 2026: "I don't want 2D puzzles anymore.
I want this game to be full 3D."; X-Q1 "City puzzles only"). `__snapshots__/` is empty until the first release (X-Q2 "Next release"): the
first run there writes the city traces, and the playtester reads them before committing.

Files: `ladder.ts` (the city puzzles, their conversion and the note's check block), `replay.ts` (the replay and the trace), `fakes.ts`
(a recording bus and a no-op renderer), `cues.ts` (the audio path), `playtest.test.ts` (the tests).

## The script is the note's check block

There is no script file. Each city note's `check` block gives the replay: its `solution`, then each `trap`'s moves followed by its
`recover`, as separate traces in one snapshot (`<id> solution`, `<id> trap: <name>`). Moves are the check-block syntax of
`puzzles/SCHEMA.md` (`undo` included). A new `puzzles/city/<id>.city.json` with a note and a block is picked up on its own.

## What the tests check

- Every city puzzle's note has a check block that parses and holds on the converted puzzle.
- The solution wins, and each trap's moves then recovery win (soft checks, so the trace diff still prints when one stops short).
- The Relight can't be interrupted: after the win, a click on every file breaker, switch, battery and fault, and an undo, emit no event and
  change nothing.
- The trace matches the committed one, and two runs in one process give the same trace.

## Hidden ids

The conversion adds scenery lamps and split junctions (`hidden`, 081 S1). They carry load (the feeds' numbers include them) but are left
out of `lit`, `blown`, `faults`, the Relight lamps and the Relight cues, so scenery does not churn a trace.

## Running one puzzle, updating one snapshot

```
npm run playtest -- -t "09-shrine-circuit"
npm run playtest -- -u -t "09-shrine-circuit"     # rewrite only that puzzle's trace
```

Never run `-u` without `-t` on a branch under test: it would bless every difference, including the regressions.

## Reading a trace

A step line is the step number, the move, then the state after the click and its second of time: `lit` (file lamps, sorted), `feeds`
(id, load / capacity, `over` when browned out), `blown` (fuseboxes), `faults` (readable ids), `parts`, `batteries` (battery puzzles
only), `prompt` (the hover prompt) and `cues` (the sound cues that step's events produced). Then `complete`, the win's `actions` and
play time, the Relight plan (each lit file lamp with its ignition time, the duration), the Relight cues and the `locked` line. A move that
can't be played ends the replay with `N move | STOPPED: why`.

## Intended difference or regression?

A difference is **intended** only if an acceptance criterion of a ticket merged since the last release asks for it: update that
puzzle's snapshot (`-u -t`) and list it in the report with the criterion. Otherwise it is a **regression**: report the puzzle, the step,
and the before and after, and leave the snapshot alone.

## Known limits

- **One tick per click or wait** (`CHECK_CLICK_SECONDS`), as the analyzer and the check block do; the browser steps time per frame.
- **Cue voices aren't recorded**, only names and times. Two things are copied from the game because it doesn't export them: `main.ts`'s
  `relightCues` mapping and the audio engine's `SUBSCRIBED` event list (both in `cues.ts`).
- **No drawing and no hit-testing.** Clicks go by id through `play.click`; the city view can't be drawn headless.
