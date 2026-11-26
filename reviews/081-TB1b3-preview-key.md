ticket: 081-TB1b3-preview-key
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stop `loadPreview` running every frame on a timed (or battery) map. `refreshPreview` in `src/main.ts` should key on what the preview reads, which is a pure `previewKey(state, relighting)` in `src/ui/preview.ts`, instead of on the state object's identity, so the numbers are computed once per change and are still the right numbers.

## Does the branch do it?
**Criterion 1, `previewKey`: met.** `src/ui/preview.ts` builds a JSON string from `relighting`, `complete`, the breakers and the switches (sorted pairs), the fault ids, the readable fault ids, and `flipOrder(state.timers)`. `flipOrder` holds the ids sorted by `next`, groups ids within 1e-6 s of each other, and keeps no seconds. It does not read `clock`, the `next` values, `batteries` or `load`. The one new case in `src/ui/preview.test.ts` covers each required clause:
- a throw changes the key;
- 0.3 s with no flip keeps it;
- the flip at 2 s changes it;
- a repair changes it;
- a state with matching breakers but another timer order changes it;
- coincident timers give the same key whatever their insertion order.

The Reset clause uses a state built by hand (the timers map rewritten), not a real `reset()`. That is enough for the function under test, because the page clears the key on Reset anyway.

**Criterion 2, `refreshPreview` uses it: met.** The identity fast path stays first. The key is compared with `shownKey` next. The Reset listener sets `shownKey = null` beside `shownFor = null`, so `known` restarts as before. V4's cases are unedited. The V key and `numbersOn` don't touch the key. Relight and the win change the key through `relighting` and `complete`, so `previewFor` still returns null for them.

**Criterion 3, one run per change: can't verify from the branch, no test by design.** This is the builder's temporary count in `npm run dev`. The figure belongs in the builder's report, which I did not read. The main session should check that the report gives "1 on open plus 1 per flip".

**The two checks asked for:**
- **No missed input.** `loadPreview` (`src/grid/preview.ts` on main, after TB1b1) reads the puzzle, `state.faults` (id, at, kind; all fixed per id, e.g. `blown-${fuseId}`), `state.readableFaults`, `known`, `state.breakers`, `state.switches` and `state.timers`. It builds fresh grids from `puzzle.nodes` with `startingParts: []`. So it does not read parts on hand, battery charge or release, or load.
  - **Parts on hand:** a repair changes them, but the preview never reads them. The repair also removes a fault id and usually changes the readable set, so the key changes anyway (the test shows it).
  - **Batteries:** no preview entry reads a battery's state. A release that makes a fault readable changes `readableFaults`, which is in the key.
  - **Undo:** it restores breakers, switches and faults, which are all in the key. When it restores nothing the preview reads (for example, undoing a battery release), the key and the preview are both unchanged, which is correct.
  - **`known`:** it is not in the key. It only grows from `readableFaults`, which is in the key, so a skipped `previewFor` adds nothing it would have added.
  - **Another map:** `shownKey` is per open, in the same scope as `shownFor`.
- **No stale preview.** The timed entry depends on more than the order. It uses `m - r.next` for each earlier timer, inside `(... + m) % cycle`. Between flips every `next` falls by the same dt, so those differences don't change. Every flip toggles that timer's entry in `state.breakers` (`grid.ts` line 620), so the key changes at each flip and the preview is recomputed. The frame clamps dt to 0.1 s (`src/main.ts` line 400), and a timer's share is at least 2 s (TB0's validator). So no timer can flip twice, back to where it was, between two refreshes. Before the first move the `next` values are frozen. After a Reset the key is cleared. I found no way for a state with an unchanged key to need different numbers.

Tests: `npx vitest run --maxWorkers=2 src/ui/preview.test.ts` passed, 2 tests (1 new), 38 ms.

## Rule conflicts and risks
- No hard-rule break. The changed files are `src/ui/preview.ts`, `src/ui/preview.test.ts` and `src/main.ts`. In `main.ts` the only changes are the import, the guard and the matching Reset line that criterion 2 requires. `src/grid/` and `src/night/` are untouched. No new dependency, no type change, no GDD rule touched.
- Test policy: 1 case added, none rewritten. It runs on a 6-node fixture, with no whole city and no report-only test.
- `docs/ci-times.md` gains one row for the run after #110. I treated it as main-session housekeeping, as instructed.
- Risk: the key is correct because of three facts that live elsewhere: the dt clamp in `main.ts`, the 2 s minimum share, and each flip toggling `breakers`. If a later change lets one refresh span several flips (a big dt, a headless caller using `previewKey`), order and positions alone could match while the phase differences don't. This doesn't happen today.

## Must fix
none

## Could improve
1. `src/ui/preview.ts`: add one line to the `previewKey` doc comment saying the order is enough because every flip changes `breakers` and refreshes are at most 0.1 s apart. Then whoever next loosens the clamp sees the dependency.
2. `SAME_MOMENT` is now defined twice, once in `src/grid/preview.ts` and once in `src/ui/preview.ts`. Exporting it from the grid would keep the two tolerances from drifting apart. That would mean touching `src/grid/`, which this ticket's Must-not forbids, so it belongs in a later grid ticket, not this branch.
