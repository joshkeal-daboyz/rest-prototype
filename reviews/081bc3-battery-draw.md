ticket: 081bc3-battery-draw
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section BC3 (renderer): draw what BC1's `"battery"` preview entry says. `cueWires` cues a battery entry's `lines.on`/`lines.off` the way it cues a breaker's. `overlayLabels` draws the battery's whole seconds of charge, read live from `GridState.batteries`, when it has an entry, plus a signed red-when-over `delta` only when the entry is not a plain zero. It draws nothing with no entry, under `V` or in the Relight. At most 2 test cases, render3d files only.

## Does the branch do it?
- **Criterion 1, the cue.** Met. `src/render3d/controlcue.ts:26` adds `"battery"` to the kinds `cueWires` accepts. Everything else is the existing path: the same `add(lines.on, "on")` / `add(lines.off, "off")`, the same readable-cut handling and the same NC2 cue layer. No new layer, draw call or program. `cueIds` (`src/render3d/timerring.ts:45`) already returns the hovered id whatever its kind, so it needed no change. That is why `timerring.ts` is untouched, which the ticket allows. Off under `V`, in the Relight and after the win comes from the existing `null` preview, as for breakers. Test: the existing case in `src/render3d/controlcue.test.ts` now has a `bat` entry in its fixture. It asserts `cued("bat")` gives `{ L1a: "on", L1b: "on" }` and `cued("bat", null)` gives `{}`. Without the `controlcue.ts` change the first assertion fails, so the test checks the rule.
- **Criterion 2, the number.** Met. `src/render3d/overlay.ts:266-273`: a battery icon with an entry (the preview present and not relighting) and a state battery pushes `` `${Math.ceil(b.charge)} s` ``, then `signedDelta(e.delta)`, red when `over`, at `BATTERY_DELTA_DX` to the right, only when `delta !== 0 || over`. The charge is read from `state`, not from the entry, so the number counts down with the bar, as BC0's contract says. Test: the new case in `src/render3d/overlay.test.ts` (named for the rule, 081 BC3) covers five things:
  - charge 7.2 reads "8 s";
  - a delta-0 entry draws no change;
  - `delta` 2 with `over` adds a red "+2";
  - no entry, or a `null` preview, draws nothing;
  - the Relight draws nothing.

  "One with no charge has none" is covered as "no entry", which is what BC1 gives a battery that is uncharged and not released. That is a fair reading.
- **Criterion 3, the pane.** Josh's and the main session's job, in the browser. Not judged here.
- **Count and files.** The pull request has 1 new `it(` case (overlay) and 1 rewritten case (controlcue): 2, at BC3's cap of 2. It touches only `controlcue.ts`, `overlay.ts` and their tests, all on the ticket's list. I ran both changed files with 2 workers: 21 passed. The new overlay case is fast. The 2.8 s in that file is the existing E2 pipeline case, not this branch's.

## Rule conflicts and risks
- None found. `src/grid/` and `src/night/` are untouched, so their purity is unaffected. There is no new dependency and no GDD rule change.
- Faults hide faults holds by construction: the cue draws BC1's lines, and BC1 already counts unread breaks as sound.
- The Relight can't be interrupted: the preview is `null` in the Relight, and `overlayLabels` checks `relighting` as well.

## Must fix
none

## Could improve
1. `src/render3d/controlcue.ts:26` is missing a space before `!entry.lines` (`...!== "battery") ||!entry.lines`). Formatting only.
2. The rewritten case in `src/render3d/controlcue.test.ts` still has its NC2 name. Adding "and a battery's (081 BC3)" to it would name the rule the new assertions guard.
3. `BATTERY_DELTA_DX = 34` is a fixed offset. A battery with a capacity of 100 s or more ("100 s") may crowd its "+n". May occur, not checked: no puzzle I looked at has a capacity that large. Measuring the seconds' width, as `paintOverlay` measures text elsewhere, would remove the risk if it ever matters.
