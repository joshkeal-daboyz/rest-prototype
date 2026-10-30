ticket: 033-slowdown-after-idle
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Remove the costs that can make the game slow after it sits: the crackle replaying every missed tick after a time gap (sound), unguarded per-frame DOM writes and per-frame `JSON.stringify` in `ui.update` (ui), and the full log re-parse on every canvas click (interaction). Nothing visible or audible changes, and there is no new dependency. Reviewed only `git diff 72a40f4..HEAD` (519f98f A, 55f48ca C, e0682c4 B).

## Does the branch do it?

**A · sound (`src/audio/layers.ts`, tests in `layers.test.ts`, `engine.test.ts`)**
- *No catch-up:* `Crackle.collect` now restarts with `if (this.next === null || this.next < now) this.next = now + this.gap()`, and the `Math.max(this.next, now)` clamp that piled ticks onto `now` is gone. Test `crackle after a time gap` runs `it.each([1, 60, 600])`: collect at 0, then at the gap with the same horizon, gives ≤ 2 ticks, all in `[gap, gap + 0.1)`. That is the right assertion. In a scratch worktree I put the old `layers.ts` back under these tests. The 1/60/600 s tests, the cap test and both engine tests fail on the old code, so they are real.
- *Cap:* `CRACKLE_MAX_PER_COLLECT = 3`, enforced in the loop condition. The test uses horizon 1000 at now 0 and after a 500 s gap. Ticks past the cap stay in `this.next` for the next call and are not dropped or duplicated.
- *Steady state:* The new 313-frame × 16 ms test checks that every tick is unique, none falls before `now` or at or past `now + horizon`, and there are ≥ 20 ticks. It passes on the old code too, which is what "unchanged" means here. The existing crackle tests in `layers.test.ts` are untouched (the diff only adds to the file) and pass. In steady state `next ≥ prev_now + horizon > now`, so the restart branch never fires on normal frames. It only fires on a frame longer than the horizon.
- *Engine:* `no crackle catch-up after a time gap` adds 600 s to `fake.currentTime` between frames, both running and suspended (one `update` while suspended, then running again), and asserts ≤ 12 new nodes (2 × cap 3 × 2). That holds.
- *Other schedulers:* `BeatScheduler` is unchanged (it is not in the diff). The pinning test `BeatScheduler after a time gap` gives ≤ 1 beat across 600 s, none in the past. That matches the criterion's "if none is found" branch. I checked `mixer.ts`: `burst` is a single pending item released once, and `relightUntil` and the ducks are comparisons, not loops, so there is no catch-up site there. `shell.ts` and `engine.ts` have no time-stepping loops.
- *032's snapshot:* No `.snap` file is in the committed diff, so 032's snapshot test was not re-recorded. The working tree shows `src/audio/__snapshots__/notSoftened.test.ts.snap` as modified, but `git diff` of it is empty apart from an LF→CRLF warning. It is a line-ending artefact, not a content change, and it is not committed.
- *Muted layers (finding 4):* `shell.ts` is not touched, so it was not done. The ticket's default allows that. The commit message doesn't say why, so the main session should check that the builder's report says "not done, and why". Mute/volume tests are unchanged and pass.
- *Fence:* `layers.ts` imports are unchanged. The test imports `BEAT` from `../core`. `package.json` is not in the diff.

**B · ui (`src/ui/frame.ts` new, `src/ui/index.ts`, `frame.test.ts`)**
- *Guards:* `setAttr` (compares `getAttribute`), `setClass` (compares `classList.contains`), `setProp` (compares the property) and `setText` (moved from `index.ts`) each compare against the node's own current value, which is the right value. They are used for:
  - the speaker's aria-label, title and `muted` class, and the toggle's aria-label, aria-pressed and `muted` class
  - the slider value
  - the prompt `hidden`, `style.left` and `style.top`, and the banner and battery `hidden`
  - the inventory rows' aria-label and `empty`, and `inventoryEl` aria-label (the confirmed every-frame write)
  - `applyHighlight`.

  The speaker title used to be written only when the aria-label changed. Now it is guarded on its own, which is equivalent. Tests: 1,000 same-value calls make 1 write, and a changed value makes 1 more, for each helper (stub nodes, no DOM).
- *Change keys:* `CapacityRow` is `{text, alarm}`, and `update` draws `row.text` plus the `brownout` class from `row.alarm`. `capacityRowsKey` keys exactly those fields. `TargetRow` is `{id, lit, text}`, and `update` draws `data-lamp`/handlers from `id`, the `lit`/`dark` class and On/Off mark from `lit`, `row.text`, and the `many` class from `rows.length` (the row count is implied by the self-delimiting `fieldKey`). `targetRowsKey` keys all three fields. No drawn field is missed. `fieldKey` length-prefixes each field, so there are no collisions; it is tested with `"ab","c"` vs `"a","bc"` and similar. Each field has its own differs-test. One subtle regression is avoided: an empty row list now keys to `""`, so `capacityKey` and `targetsKey` now start at `null` and the first frame still builds.
- *No JSON.stringify:* There is a spy test over `capacityRows`, `targetRows`, both keys, `inventoryRows` and `partsSummary`, plus a source tripwire that `index.ts` and `frame.ts` contain no `JSON.stringify`. `ui.update` itself can't run without a DOM, so it is tested through its pure seams, as the criterion allows. No jsdom was added.
- *Nothing visible:* The rebuild bodies (two-column `many`, focus restore, highlight) are unchanged. `placeSplash`, `noticesTick` and the popover code were already guarded and are not touched. The win splash placement is unchanged.

**C · interaction (`src/play/log.ts`, `play.ts`, `lastentry.test.ts`, one line in `src/main.ts`)**
- `SessionLog.lastEntry` is `list[list.length - 1]`, which is O(1). `MapPlay.lastEntry` delegates to it. `lastentry.test.ts` checks the following against `JSON.parse(exportLog()).entries`' last element: undefined on empty, then deep-equality after repair-refused, throw-switch, repair, throw-breaker, undo, reset, battery-release, battery-stop and battery-flat. `log.ts` never mutates an entry after `add`, so the live reference equals the exported copy.
- *Cost:* With 10,000 entries, spies show no `JSON.stringify` and no `toJSON` call.
- *Unchanged:* `toJSON` is untouched, the existing export tests pass, and a new format test is added. `main.ts` changes exactly the declared line, plus the import of `LogEntry`, which is now unused there (no other `LogEntry` use in `main.ts`, and typecheck is green). Removing an unused import is the direct consequence of the declared line, not extra scope. The relay-refused notice logic (`seenStep`, `noticeFor`) is unchanged, and `noticeFor`'s relay-refused tests in `ui/logic.test.ts` pass.

**All**
- `npm run gate` ran three times. Run 1 was green (64 files, 1162 tests). Run 2 had one failure, `src/core/load.test.ts > draft 5 … > puzzleFeeds: one-feed maps give the old capacity, unchanged`, which hit 5266 ms against the 5 s default timeout under load. It passes alone (90/90) and on run 3. That test is outside 033's files: it is a **flaky timeout**, not a 033 regression. The test count grew by about 35 (6 crackle/beat, 2 engine, 5 lastEntry, about 22 frame).

## Rule conflicts and risks
- None for the hard rules. `src/grid/`, `src/night/`, `src/core/`, `src/render/`, `puzzles/` and `package.json` are untouched. Each part stays in its folder, plus the one declared `main.ts` line. No GDD rule, number or sound design changes.
- The flaky `src/core/load.test.ts` timeout (pre-existing, slow under full-suite load) can turn a gate red at random. It is not caused by 033.
- After a frame longer than the crackle horizon, the crackle now skips ahead instead of firing a clamped tick at `now`. That is the intended behaviour and is inaudible in practice.

## Must fix
none

## Could improve
1. `src/ui/index.ts` `placePrompt`: `setProp(promptEl.style, "left", `${spot.left}px`)` compares against the browser's serialised `style.left`. If `spot.left` is fractional (pointer-derived), Chrome may serialise it rounded, so the guard never matches and it writes every frame, as before. Rounding the spot, or caching the last written string as `noticesTop`/`splashTop` do, would make the guard hold. This is only a lost saving, not a behaviour change.
2. Add a `testTimeout` to `src/core/load.test.ts`'s whole-folder loops, or speed them up, in a separate ticket, so the gate stops flaking.
3. Revert the working-tree line-ending change on `src/audio/__snapshots__/notSoftened.test.ts.snap` before merge, so nobody commits it by accident.

## For Josh's eyes and ears only
- **Backgrounded tab:** on a map with a live sparking cable, switch tabs for 5+ minutes and come back. Listen for no burst of crackle and watch for no stutter. Check that the crackle still sounds as dense and random as before (cap 3 per collect, the restart after a gap).
- **Win splash left up for a few minutes:** it stays smooth and sits in the same place.
- **Everything looks the same:**
  - the speaker icon and popover, and the mute toggle state and label
  - the slider position
  - the prompt following the pointer
  - the capacity readout's brownout colour
  - the priests' list lit/dark, its two columns on long lists, and the highlight outline
  - the parts counts and the empty state
- **Relay-refused notice** still appears once per refused click.
- **Mute/unmute** feel unchanged (finding 4 was not done).
- **Slowness after a long idle** on a map with no sparking cable and no background tab: the audit had no real browser for this. If it still happens, a Chrome Performance profile is the next lead.
