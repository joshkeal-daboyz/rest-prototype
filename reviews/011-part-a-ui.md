ticket: 011-readable-failures (part A)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
A short text notice near the top of the map for four events: fuse blown, entering brownout, battery flat (not stopped) and a refused relay throw. Each one fades after about 4 s and stacks with the others. The text logic must be pure and tested, and the notices must be text, not colour.

## Does the branch do it?
- **Fuse blew.** `noticeFor` in `src/ui/logic.ts` returns `Fuse blew: ${load} load through a ≤${rating} fuse` from the event's payload. Tested ("names the load and the fuse rating when a fuse blows"). It is wired in `main.ts` through `bus.on("fuse:blown")`. If several fuses blow in one settle, each gives its own notice and they stack.
- **Brownout.** Gives `Brownout: load 6 over capacity 4` when `brownout` is true and null when it is false. `grid.ts:240` only emits on a change of state, so the notice shows on entering and not on every load change. Tested both ways.
- **Battery flat.** Gives `Battery flat` when `stopped` is false and null when true. Tested both ways.
- **Refused relay throw.** Gives `No power at that relay` only for a refused `throw-switch` log entry whose target is a relay. Tested, including the cases that must stay quiet: a throw that worked, a refused plain switch, a refused repair, and a breaker. It is correct today: `grid.throwSwitch` refuses a relay only when the map is finished (play blocks clicks then, via `done()`) or when the relay has no power (`grid.ts:278-280`).
- **Fade and stacking.** `noticeOpacity` stays at 1 until 3 s, then fades in a straight line to 0 at 4 s. `liveNotices` drops expired notices and keeps at most the newest 4, in arrival order. Both are tested with names that state the rule.
- **Text, not colour.** The notices are DOM text in a `role="status" aria-live="polite"` strip with `pointer-events: none`. The alarm colour appears only on the border.
- **Map change.** `mountUI` already clears `root` (`root.textContent = ""`), so old notices go with the old map. The new `detach` removes the extra canvas click listener and the three bus subscriptions. The bus is created fresh for each session anyway, so unsubscribing is belt and braces, but it is correct.
- **Checks.** `npm test` passes 158/158 and `src/ui/logic.test.ts` has 26 tests. `npm run typecheck` fails only on the known `src/grid/grid.ts(157)` `fuse:blown` payload error (part D). There is no type error in `src/ui/` or `src/main.ts`.

## Rule conflicts and risks
- **No purity break.** `src/grid/` and `src/night/` are untouched. There is no new dependency. The branch only touches `src/ui/` and `src/main.ts`, and editing `main.ts` is the usual wiring the ticket implies.
- **Relay notice reads the log in `main.ts`.** On every canvas click, `onPanelClick` calls `play.exportLog()`, which pretty-prints the whole session log to JSON, then `JSON.parse`s it back, just to read the last entry.
  - **Cost:** O(log length) per click. That is negligible at prototype log sizes but wasteful by design.
  - **Correctness:** the `seenStep` guard holds. Clicks that log nothing, and battery-flat, undo and reset entries made between clicks, are seen and ignored. The guard does rely on the order in which listeners were added: `play.attach` runs before `addEventListener`. There is a comment saying so, but nothing enforces it.
  - **Fragility:** the notice infers "no power" from `ok: false` because the log has no refusal reason for switch throws. If the grid ever gains another reason to refuse a relay, the notice will give the wrong reason without any error.
- **A small game rule sits in the shell.** `main.ts` works out which switches are relays from the puzzle and holds the event-to-notice wiring. Its own header says "No game rules here". This is not a hard-rule break, but the knowledge belongs in `src/ui/`, or in `src/play/`, which is in the ticket's Files list.
- **CSS is added from `src/ui/index.ts`** with a `<style>` tag, while every other style is in `index.html`. It is understandable because `index.html` is outside the ticket's folders. It is done safely: added only once (checked by id), using the existing `--panel`, `--alarm` and `--ink` variables, all of which exist. Styles are now in two places.
- **Placement.** The strip sits below the lower edge of the taller HUD column. On a wide screen the left column (picker, capacity, battery, targets list) can be tall, so the notice can land well down the map even though the top centre is empty. The HUD columns are at most 360 px each, which leaves about 500 px free in the middle at 1280 px wide. On narrow screens, where the columns span the full width, clearing the HUD is right. While a notice shows, `noticesTick` writes opacity and then reads three bounding rects every frame, which forces a layout each frame. That is minor.
- **Small allocation every frame.** `liveNotices` runs `filter` every frame even when there are no notices.
- **Keyboard.** `play` has no keyboard path for canvas actions, so there is nothing to miss. The notices are announced through `aria-live`.

## Must fix
none

## Could improve
1. **Replace the JSON round trip in `src/main.ts`.** Have `MapPlay.click` (in `src/play/`, which the ticket's Files list includes) return the `LogEntry` it added, or expose `lastEntry()` from `play`, and have `throw-switch` refusals log a `reason` (for example `"no-power"`). `noticeFor` should then key on that reason instead of inferring it from `ok: false` and a relay set. This removes the stringify/parse on every click, the reliance on listener order and the hidden coupling to the grid's refusal rules.
2. **Move the notice wiring out of `main.ts` into `src/ui/`.** For example, pass `bus` (and the puzzle, or the relay set) in `UIDeps` and let `mountUI` subscribe and unsubscribe. `main.ts` then keeps no event knowledge, which matches its "No game rules here" header, and stops importing `./ui/logic` directly.
3. **Placement in `src/ui/index.ts`:** only push the strip below a HUD column that actually overlaps the strip's horizontal span (or check the narrow-layout media query). Otherwise use `top: 16px` like `.banner`, so notices stay "near the top" on desktop. Also, measure only when a notice is added or the window is resized, not every frame.
4. **Move the `.notices` / `.notice` rules into `index.html`** next to `.banner` in a small follow-up owned by whoever owns `index.html`, then drop `ensureNoticeStyle`.
5. **Return early in `noticesTick` when `notices.length === 0`,** before calling `liveNotices`, so idle frames allocate nothing.

## Main session's response
agree. Merged into `main`. Could-improve 1 and 2 go on ticket 006 as a cross-owner item (play returns the entry with a refusal reason; ui owns the subscriptions); 3–5 with them. Josh sees the notices first.
