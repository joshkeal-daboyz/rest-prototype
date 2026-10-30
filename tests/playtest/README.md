# The playtest harness (ticket 036)

`npm run playtest` plays every ladder map (`puzzles/NN-*.json`, 01 to 64) to the Relight, headlessly, through the real
`loadPuzzle -> createGrid -> createMapPlay` chain, and compares each map's **trace** with the one committed from `main`
in `__snapshots__/<id>.trace.txt`. It also draws every frame of the replay with the real `createMapRenderer` on a fake
canvas. It runs apart from `npm test` and `npm run gate` (own config and tsconfig, nothing here is collected by them) and
takes a few seconds. Only the playtester updates snapshots, deliberately.

Files: `solutions.ts` (one winning script per map), `replay.ts` (the replay and the trace), `fakes.ts` (a recording bus, a
no-op renderer, a fake canvas), `cues.ts` (the audio path), `ladder.ts` (the maps on disk and the README's Min clicks),
`playtest.test.ts` (the tests).

## What the tests check

- Every ladder map has a script and every script names a map (`lamp-row.grid.json` has no `NN-` prefix, so it is not on the ladder).
- Each script wins: every move is valid and clickable, and `grid.state().complete` is true on the last move or before. Soft
  checks, so the trace diff still prints when a script stops short.
- Each script's click count (moves that aren't `wait:`; a release counts) is at most the `Min clicks` column of `puzzles/README.md`,
  read at run time. Maps 49 and 54 take their min from their notes (the README says so); their trace header says `(note)`.
- The trace matches the committed one. Two runs in one process give the same trace.
- The Relight can't be interrupted: after the win, a click on every breaker, switch, battery and fault, and an undo, emit no
  event and change nothing. The trace's `locked:` line says how many clicks were ignored.
- Every frame (the start, one after every move, three in the Relight) draws without throwing, and passes no non-finite number to the canvas.
  `KNOWN_NONFINITE` in `playtest.test.ts` pins a count for a map that has one on the base; it is empty, and a count that grows fails.

## Adding a map's script

A new `puzzles/NN-*.json` with no entry in `solutions.ts` fails the run, naming the id (so does an entry that names no map).

1. `npm run analyze puzzles/NN-slug.json` and copy the `one shortest win:` line into `solutions.ts` as a list of strings
   (`"wait:0.5"` stays `"wait:0.5"`; a battery id is a click that releases it; `repair:<id>` mends the fault at `<id>`).
2. If the search runs out of time (49 and 54 did), follow the design note's intended read. Moves are the check-block syntax of
   `puzzles/SCHEMA.md`, without `undo`. Time is one second after every click (`CHECK_CLICK_SECONDS`) and `wait:N` is N seconds,
   so put in the waits that make the cells fill at a click a second.
3. Add the map's row to `puzzles/README.md` (the harness reads its Min clicks); the script must not take more clicks than that.
4. `npm run playtest -- -u -t "NN-slug"` writes the new trace. Read it before you commit it.

## Running one map, updating one snapshot

```
npm run playtest -- -t "09-shrine-circuit"        # one map: its replay and its draw
npm run playtest -- -u -t "09-shrine-circuit"     # rewrite only that map's trace
```

Check `git status` afterwards: only `__snapshots__/09-shrine-circuit.trace.txt` should change. Never run `-u` without `-t` on a
branch under test: it would bless every difference, including the regressions.

## Reading a trace

```
# 09-shrine-circuit | script 3 clicks | README min 3
start | lit: street_1, street_2, street_3 | feeds: feed 3/4 | blown: - | faults: f1 | parts: wire | prompt: - | cues: -
1 br_street | lit: - | feeds: feed 0/4 | ... | prompt: Throw breaker | cues: breaker:thrown@0.000
...
complete: true
actions: 3, elapsed: 2.000 s
relight lamps: flood@2.090, shrine@2.513
relight duration: 3.113
relight cues: relight:bed@0.000, relight:chime:0@2.090, relight:chime:1@2.513, relight:close@2.513
locked: ignored 5 clicks and undo; no events; lit, breakers, switches, parts and faults unchanged
```

A step line is the step number, the move, then the state after the click and its second of time:

| Field | Meaning |
| --- | --- |
| `lit` | lit lamps, sorted (street lights included) |
| `feeds` | per feed: id, load / capacity (`-` = no limit), `over` when that feed is over its limit (a brownout) |
| `blown` | fuseboxes with a blown-fuse fault |
| `faults` | readable fault ids (current reaches them), sorted |
| `parts` | parts left, sorted |
| `batteries` | battery maps only: id, charge / capacity (2 dp), `released`, `charging` or `idle` |
| `prompt` | what the hover prompt says with the pointer on the move's element (a wait keeps the last hover; `-` = none) |
| `cues` | the sound cues that step's events produced, `name@seconds-into-the-cue` (`-` = none) |

Then `complete`, the win's `actions` and play time, the Relight plan (each lit lamp with its ignition time, the duration), the
Relight cues (`relight:bed`, one `relight:chime:N` per chime, `relight:close`), and the `locked` line. A move that can't be played
ends the replay with a line `N move | STOPPED: why`, and `complete: false`.

## Intended difference or regression?

Read the diff for the ticket under test. A difference is **intended** only if an acceptance criterion of that ticket asks for it:
then update that map's snapshot (`-u -t`) and list it in the playtest report with the criterion. Otherwise it is a **regression**:
report the map, the step, and the before and after, and leave the snapshot alone. A difference you can't place is a regression
until the builder or the main session explains it.

## Known limits

- **One tick per click or wait.** Each click is followed by one `play.tick(1)` and a `wait:N` is one `play.tick(N)`: the convention
  of the analyzer and the README's min clicks. The browser steps time once per frame (at most 0.1 s); the harness doesn't model that.
- **Cue voices aren't recorded**, only names and times. Voices (pitch, envelope) are pinned by `src/audio`'s own tests.
- **Two things are copied from the game** because it doesn't export them (ticket 036, open question 2): `main.ts`'s three-line
  `relightCues` mapping from the Relight plan to ignition times, and the audio engine's `SUBSCRIBED` event list (both in `cues.ts`).
  A change to either in the game won't show in the trace until the copy is changed too. Only the event-driven cues are traced; the
  level-driven sounds (battery full tick, crackle, layers) come from the state each frame and aren't.
- **No hit-testing, undo or `src/ui/logic` checks yet.** Clicks go by id through `play.click`; `hitTest` is a fake in the trace
  replay (the draw smoke uses the real renderer but doesn't hit-test); scripts have no `undo`; the UI logic isn't run.
- **The scripts are clean wins.** No script blows a fuse or browns out on purpose, so those paths show in a trace only where a
  winning route passes through one, and the fuse-blow drawing isn't exercised by the draw smoke.
- **The draw smoke uses a Proxy canvas** in a Node environment: it proves nothing throws and no number is `NaN` or infinite, not
  that anything looks right. It has no `OffscreenCanvas`, so the renderer's cached layers take their draw-directly path.
