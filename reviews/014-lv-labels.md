ticket: 014-lv-labels
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Change the words only: fuse ratings, lamp loads and feed capacity show as levels on a named thing (`Lv3 Fuse`, `Lv2 Lamp`, `Lv4 Powersource`), and live totals show as `using N of M` / `carrying N of M`. This covers the map captions (A), the hover prompts (B) and the HUD and notices (C, already on main). No number, rule, payload or puzzle file changes.

## Does the branch do it?
I reviewed `git diff main...ticket/014-lv-labels`: 6 files, all in `src/render/` and `src/play/`. `npm run typecheck` is clean. `npm test` passes 317 tests in 17 files, with 3 new ones (2 in `src/render/labels.test.ts`, 1 in `src/play/play.test.ts`).

- **A (renderer).** The new `src/render/labels.ts` is a pure helper with `lampCaption`, `fuseCaption`, `feedName`, `feedUsing` and `feedAlarm`. `labels.test.ts` checks every row of the table: `Lv2 Lamp`, `Lv3 Fuse`, unrated → `""` (no caption, as before), `Lv4 Powersource`, null → `Powersource`, `using 3 of 4`, `using 3`, and `! using 5 of 4 !`. In `map-renderer.ts`:
  - `loadLabel` and `ratingLabel` are still built once per map.
  - The feed strings are still rebuilt only inside the `feedLoad/feedCap` change guard, so there is no per-frame allocation.
  - The feed now draws two lines: the name at `fy+32` and the live total at `fy+46`. The table's "`Lv4 Powersource` and `using 3 of 4`" reads as two pieces, so this fits.
  - The fuse caption is still drawn at `y+23`/`y+25` and the bar top is still `y+30`. The `FUSE_BAR_TOP` comment in `fusebar.ts` now says `LvN Fuse`. "Lv3 Fuse" is about as wide as "load ≤3", so spacing should hold. The visual check on `which-fuse` and `ladder-36-whole-ward` is Josh's to do.
  - Met.
- **B (interaction).** In `src/play/prompt.ts`:
  - `infoPrompt` returns `Lv{load} Lamp`, `Lv{r} Fuse — carrying N of r`, `Lv{r} Fuse — at the limit`, and leaves `Fuse — carrying N` unchanged for unrated boxes.
  - `TEXT.wouldBlowAgain` returns ` · would blow again: N on a Lv{r} Fuse`.

  The tests in `play.test.ts` were updated in place, with none deleted. They cover:
  - lamp (`Lv1 Lamp`, `Lv3 Lamp`)
  - fuse carrying (`Lv5 Fuse — carrying 3 of 5`, and `carrying 0 of 5`)
  - at the limit (`Lv3 Fuse — at the limit`, including shrine `fb_A`)
  - unrated (existing test, string unchanged)
  - would blow again, both with a fuse in hand (`Repair (fuse) · … 4 on a Lv1 Fuse`) and without (`Needs: fuse · …`)
  - a new direct `TEXT.wouldBlowAgain(2, 1)` test that also asserts the word "load" is gone

  Met.
- **C (ui), on main.** `src/ui/logic.ts`:
  - `capacityReadout` gives `Lv4 Powersource — using 3 of 4`, adds `· Brownout` as text when browned out, and gives `Powersource — using 3 (no limit)` when capacity is null.
  - `noticeFor` gives `Lv1 Fuse blew: carrying 2` and `Brownout: Lv4 Powersource using 5 of 4`, and returns null when the brownout clears.
  - `logic.test.ts` covers each case, including null capacity and the non-integer case 2.5.
  - Met.
- **All parts agree.** HUD, hover, notices and map all use the same strings: `Lv<N>` with no space, `Powersource` as one word, `using … of …` for the feed and `carrying … of …` for fuses. I grepped the non-test files in `src/play`, `src/render` and `src/ui`: no player-facing `load`, `Load` or `≤` strings are left, only identifiers and comments. Nothing in `puzzles/`, `src/core/`, `src/grid/` or `src/night/` changed. Event payloads and numbers are untouched. Gate is green and the test count grew. Met.

## Rule conflicts and risks
- No hard-rule breaks: each part stayed in its folder, `src/grid`/`src/night` are untouched, there is no new dependency and no GDD rule changed.
- Risk: the feed readout is now 14 px taller (a second line at `fy+46`). On a map where the feed sits near the bottom edge or just above another node, that line could clip or overlap. Josh's browser check should include the feed, not only the fuse captions.
- The test run used a working tree with uncommitted `puzzles/ladder-*` changes; I ignored them as instructed. They don't touch this branch's diff.

## Must fix
none

## Could improve
1. `src/render/map-renderer.ts`: two comments still use the old wording. Line ~632 ("Load caption: the unit word, same as the feed's readout") and line ~1270 ("Feed readout: load / capacity") should say "level caption" and "name + using N of M". Comments only.
2. `src/render/labels.test.ts`: add `feedAlarm(5, null)` → `! using 5 !` so the null branch of the alarm is pinned. Brownout with no limit shouldn't happen, but the helper accepts null.
3. `src/render/labels.ts`: `lampCaption` and `fuseCaption` duplicate the `Lv${n} Lamp`/`Lv${n} Fuse` strings built in `src/play/prompt.ts` and `src/ui/logic.ts`. The folder rules keep this from being one shared helper without a `src/core/` ticket. A follow-up could put the vocabulary in `src/core/` so the three parts can't drift.
