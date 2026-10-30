# 030 · Sound behind a speaker icon, bottom-right; Undo, Reset and Log as their own buttons

owner: ui
status: done
branch: `ticket/030-controls-layout`

## Josh's words
"Sound should sit behind a speaker icon in the bottom right corner of the screen. Undo, reset and log should have their own buttons."

"I want all of the things you mentioned"

## Where it is today (read from `main` at 6e57033)
- **One row of controls, top right.** `mountUI` in `src/ui/index.ts` builds `.hud.hud-right > .controls` with five items in a wrapping row:
  - the Undo, Reset and Download log buttons;
  - the sound toggle (`Sound on` / `Sound off`, `aria-pressed`);
  - the `Volume` slider label (0–100).
- **The sound control** comes from `mountSound(audio)`. Prefs are read once at startup by `restoreAudio`, and each change writes them with `writeAudioPrefs` under `rest.audio` (ticket 019). The control's CSS is `AUDIO_CSS` in `index.ts`.
- **Bottom left** is the inventory (021): `left: 14px; bottom: 14px`, about 76 × 120 px. It is not a `.hud`, so the top inset ignores it. `main.ts`'s `inventoryBottomInset()` reserves its height at the bottom of the map's fit.
- **The win splash** (020) is centred, `min(360px, 100% − 32px)` wide, and sits under the HUD. `placeSplash()` stops it 8 px above the inventory when the two share columns, which is always the case at ~400 px.
- **The hover prompt** follows the pointer. `promptPosition(..., avoid)` keeps it off one rect, the inventory.
- **At ≤ 600 px,** both HUD columns stretch to `left: 8px; right: 8px` at `top: 16px`, and `.controls` wraps left-aligned.
- **Icons:** 021's inline SVGs (`PART_ICON_SVG`, a 24 × 24 viewBox, `currentColor` outlines and an amber `#f2b84b` accent) are fixed strings set with one `innerHTML` per `<svg>`.
- **Tests:** `src/ui` has no jsdom. Its tests are pure, on `logic.ts`. DOM wiring is read by the reviewer and checked by Josh, as in 019–021 and 024 B.

## Goal
In the bottom-right corner there is a small speaker button, in the same style as the inventory panel.
- **Its icon shows the sound's state:** waves while sound is on, one wave when quiet, none at volume 0, and a cross when muted.
- **Clicking it,** or pressing Enter or Space on it, opens a small panel above it with the mute toggle and the volume slider.
- **The panel closes** on Esc, on a click anywhere else, when focus leaves it, or on a second click of the speaker.
- **The mute setting and the volume are remembered** across reloads, as now.

Undo, Reset and Download log stay in the top-right corner. They are now three clearly separate buttons, each with its own icon and label:
- Undo and Reset sit together.
- Download log is set a little apart, since it's a playtest tool and not a move.

Nothing collides with the inventory, the win splash, the hover prompt, the banner or the map, at full size or at about 400 px wide.

## Decided in this cut

### Where Undo, Reset and Log go: the top right, as now (recommended)
**Why the top right:**
- It is where they are today, so muscle memory carries over.
- The top inset already reserves that column. Removing the sound toggle and the volume slider from it makes the top HUD **shorter**, so the map gets more room.
- Moving them bottom-left, above the inventory, would raise the bottom inset (a smaller map on every screen). It would also add a third obstacle there for the splash and the prompt, and crowd 027's bottom-edge target stars.

The alternative is Open question 2.

**The row:** `[↶ Undo] [⟲ Reset]` · gap · `[⤓ Download log]`.
- Each item is its own `<button type="button">`, with an inline SVG icon (18 px, `aria-hidden`) and a visible text label.
- The buttons are 6 px apart. Log has an extra 12 px left margin, so it reads as a separate group.
- The buttons keep today's handlers (`play.undo()`, `play.reset()`, `downloadLog()`). Nothing about what they do changes.

**At ≤ 600 px:**
- The three buttons go **icon-only**, at 40 × 40 px. The text stays in the DOM, visually hidden (a `.sr-only` span), so each button's accessible name is unchanged. Each button also gets `title` = its label.
- `.hud-right` stops stretching and becomes `left: auto; right: 8px`.
- `.hud-left` gets `right: 148px` (3 × 40 + 2 × 6 + 12 + 8), and the picker `select` gets `max-width: 100%`. So the picker and the readouts never sit under the buttons.

### The speaker (bottom right)
**The dock:**
- `div.sound-dock`, `position: absolute; right: 14px; bottom: 14px`, inside `#ui`, at every width.
- It has the **inventory's panel style**: background `#141b24`, `0.5px solid #2a3644`, `border-radius: 10px`.
- It is not a `.hud`, so the top inset ignores it.

**The button:**
- `button.speaker`, 40 × 40 px, holding one 24 × 24 inline SVG at 26 px. The style matches the inventory icons.
- `aria-expanded` is `true` or `false`, and `aria-controls="sound-popover"`.
- `aria-label` is `speakerLabel(muted, volume)`. `title` is the same.
- While muted it has class `muted`: the icon shows the cross, and its colour is `--ink-dim`. So the state is shown by shape as well as by colour.

**The popover:**
- `div#sound-popover.sound-popover`, `role="group"`, `aria-label="Sound"`, with the panel style.
- It is anchored above the dock and right-aligned (`right: 0; bottom: 48px` relative to the dock), and 200 px wide, so it fits at 400 px.
- It holds the existing **mute toggle** (`Sound on` / `Sound off`, `aria-pressed`, unchanged), above the existing **Volume** slider (0–100, `aria-label="Volume"`).
- It is `hidden` when closed.
- It comes after the button in the DOM, so Tab goes from the speaker into the popover.

**Behaviour:** a pure reducer, `soundPopover(open, event)`, decides it, and `index.ts` only applies its result.
- **Open:** a click, Enter or Space on the speaker opens the popover and moves focus to the mute toggle.
- **Close and return focus to the speaker:** Esc, or a second click of the speaker.
- **Close without moving focus:** a `pointerdown` outside the dock, or focus moving outside the dock (Tab past the slider, or the win splash focusing Next).
- **Not saved:** whether it is open. A map switch remounts the UI, so it starts closed.
- **Listeners:** the document `pointerdown` and `keydown` listeners are added once per mount. They are removed on remount, the same way as `removePointerListeners` and `removeSplashKey`.

**Esc order:** `escapeTarget(popoverOpen, splashOpen)`.
- With the popover open, Esc closes **only** the popover.
- The next Esc closes the splash, as 020 does.
- The splash's key handler asks `escapeTarget` first.

**Prefs:** the same mechanism as 019.
- `restoreAudio` is unchanged.
- The toggle and the slider call `writeAudioPrefs` on each change, as now.
- No new storage key.

### Collisions
- **The win splash:** `placeSplash()`'s ceiling becomes the pure `splashCeiling(rootHeight, splashBox, [inventoryBox, dockBox], 8)`. That is the top of the highest **horizontally overlapping** obstacle, minus 8, or `rootHeight` if none overlaps.
  - At 1920 px neither panel shares the splash's columns, so nothing changes.
  - At ~400 px both do, so the splash ends above the taller one (the inventory).
  - The popover is not an obstacle. It is transient, comes after the splash in the DOM so it draws on top, and the splash's focus on Next closes it anyway (the focus-out rule).
- **The hover prompt:** `promptPosition`'s `avoid` also accepts `readonly Rect[]`, and a single `Rect` still works.
  - The prompt avoids the inventory, the dock, and the popover while it is open.
  - Its fallback order is unchanged: below-right, then above, then beside the obstacle it hit, then the first spot that overlaps none.
- **The map's bottom inset:** `main.ts`'s `inventoryBottomInset()` becomes `bottomInset()`, the larger of the inventory's and the dock's reserves. That is the same formula: the distance from the canvas bottom to the panel's top, plus 8.
  - Today the inventory's reserve (about 139 px) is larger than the dock's (about 62 px), so the fit is unchanged in practice. The function just stays right if either changes.
  - The open popover does not change the inset.
- **027 (zoom, larger maps; not built yet), which this ticket must not break:**
  - **Edge stars** (027 A3) sit on the free area's edge. The free area ends at the bottom inset, which covers the dock, so stars sit above it.
  - **Clicks:** `hitTest` returns `null` outside the free area (027 A1), and the dock takes its own pointer events anyway.
  - **027 B's zoom and pan keys** (`+`, `-`, `F`, arrows) skip `input` targets, so a focused volume slider keeps its arrow keys.
  - **Esc is not a 027 key.**
- **The banner and notices** sit top centre, so they are not affected.

### Icons (drafts for Josh's approval, Open question 1)
These are the same family as 021: a 24 × 24 viewBox, 1.7 px `currentColor` strokes with round caps and joins, `fill="none"`. Amber `#f2b84b` is used **only** for the speaker's sound waves (sound on), the way 021 uses it for the "live" part of each icon. Every SVG is `aria-hidden="true"` and `focusable="false"`. The strings are fixed constants in `logic.ts`, set as `innerHTML`, never built from data.

- **Speaker body** (in all four states): `<path d="M3.5 9.2H7.2L12 5.2V18.8L7.2 14.8H3.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`
- **high** (volume above 0.5): body + `<path d="M15.2 9.3C16.5 10.8 16.5 13.2 15.2 14.7M17.9 6.8C20.6 9.6 20.6 14.4 17.9 17.2" fill="none" stroke="#f2b84b" stroke-width="1.7" stroke-linecap="round"/>`
- **low** (volume above 0, up to 0.5): body + the first wave only (`M15.2 9.3C16.5 10.8 16.5 13.2 15.2 14.7`), amber.
- **silent** (volume 0, not muted): body only.
- **muted:** body + `<path d="M15.8 9.4L21 14.6M21 9.4L15.8 14.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`
- **undo:** `<path d="M8.5 5.5L4 10L8.5 14.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10H14A5.5 5.5 0 0 1 14 21H9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`
- **reset:** `<path d="M19.5 12A7.5 7.5 0 1 1 16.8 6.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M17.5 2.8V6.8H13.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
- **log (download):** `<path d="M12 3.5V14M7.5 9.8L12 14.3L16.5 9.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 16.5V19.5H19.5V16.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`

The builder may nudge path coordinates so the icons sit optically centred. The family rules above are fixed. If Josh changes a design at G1, his version goes in verbatim, as in 021.

## Acceptance criteria
- [ ] **(Vitest, `src/ui/controls.test.ts`, pure)** **Icons:**
  - `SPEAKER_ICON_SVG` has exactly the keys `muted`, `silent`, `low` and `high`.
  - `ACTION_ICON_SVG` has exactly `undo`, `reset` and `log`.
  - In every string:
    - every `stroke` or `fill` colour is `currentColor`, `none` or `#f2b84b`;
    - `#f2b84b` appears only in `low` and `high`;
    - there is no `<script`, no `on…=` attribute, no `href` and no `url(`.
  - `CONTROL_ICON_VIEWBOX === "0 0 24 24"`.
- [ ] **(Vitest, pure)** `speakerIcon(muted, volume)`:
  - `muted` gives `"muted"` at any volume;
  - volume 0 gives `"silent"`;
  - 0.01 and 0.5 give `"low"`;
  - 0.51 and 1 give `"high"`;
  - `NaN` and values out of range are read through `clampVolume`.
- [ ] **(Vitest, pure)** `speakerLabel(muted, volume)`: `"Sound: muted"`, `"Sound: on, volume 50%"`, `"Sound: on, volume 0%"`. It rounds to whole percent.
- [ ] **(Vitest, pure)** `soundPopover(open, event)` returns `{ open, focus }` with `focus` one of `"toggle"`, `"speaker"` or `null`:
  - `toggle` from closed gives open, focus on the toggle.
  - `toggle` from open gives closed, focus on the speaker.
  - `escape` while open gives closed, focus on the speaker.
  - `escape` while closed gives closed, no focus change.
  - `pointerdown` outside gives closed, no focus change.
  - `pointerdown` inside leaves it unchanged.
  - `focusout` to outside gives closed, no focus change.
  - `focusout` to inside leaves it unchanged.
- [ ] **(Vitest, pure)** `escapeTarget(popoverOpen, splashOpen)`:
  - `(true, true)` gives `"popover"`;
  - `(false, true)` gives `"splash"`;
  - `(true, false)` gives `"popover"`;
  - `(false, false)` gives `null`.
- [ ] **(Vitest, pure)** `promptPosition` with `avoid` as an array:
  - With the inventory at bottom-left and the dock at bottom-right of a 400 × 700 bounds, a 220 × 40 prompt at pointers sampled on a grid never overlaps either rect when a non-overlapping spot exists.
  - With a single `Rect`, every existing `promptPosition` test passes **unchanged**.
- [ ] **(Vitest, pure)** `splashCeiling`:
  - On a 1920-wide root, with the inventory and dock in their corners, it gives `rootHeight`.
  - On a 400-wide root it gives `min(inventory.top, dock.top) − 8`.
  - With no obstacles it gives `rootHeight`.
- [ ] **(Vitest, pure)** `CONTROL_ACTIONS` is `[{ id: "undo", label: "Undo" }, { id: "reset", label: "Reset" }, { id: "log", label: "Download log" }]`, in that order. The buttons are built from it.
- [ ] **(Vitest)** Every existing `src/ui/` test passes **unchanged**, including the 019 prefs tests and `soundToggleLabel`. `npm run gate` is green, and the test count grows.
- [ ] **(reviewer reads `index.ts`, `index.html`, `main.ts`; no jsdom)**
  - `.controls` no longer holds the sound toggle or the slider. The dock is appended to `#ui` after the inventory, and the popover after the button.
  - The ARIA attributes are as cut above, and focus moves as `soundPopover` says.
  - The document listeners are removed on remount.
  - `bottomInset()` in `main.ts` measures both panels and is used everywhere `inventoryBottomInset()` was: setup, resize and first frame.
  - `placeSplash` uses `splashCeiling`. `placePrompt` passes the dock, and the open popover.
  - No game rule is in `main.ts`, and no grid or play call changes.
- [ ] **(Josh, browser, full size: `npm run dev`, any map, then `09-shrine-circuit` (`08` before ticket 029) to win)**
  - **Speaker:** it sits in the bottom-right corner and looks like the inventory panel's twin.
    - Click it and the panel opens above it, with the mute toggle and the volume slider.
    - Click outside, or press Esc: it closes.
    - Mute: the icon shows the cross, both while the panel is open and after it closes.
    - Drag the volume to 0: the icon has no waves. At low volume it has one wave, at high volume two.
  - **Keyboard only:** Tab to the speaker and press Enter: the panel opens with focus on the mute toggle.
    - Space mutes, Tab moves to the slider, and the arrows change the volume. They do not pan the map, once 027 has landed.
    - Esc closes the panel, with focus back on the speaker. Tab past the slider also closes it.
  - **Remembered:** mute, set the volume to 20, and reload. The icon shows muted, and the slider is at 20.
  - **Buttons:** Undo, Reset and Download log are three separate buttons with icons, top right, with Log a little apart. Each still does what it did.
  - **No collisions:**
    - Win a map: the splash doesn't cover the speaker, the inventory or the buttons.
    - With the popover open when you win, the splash's Next takes focus and the popover closes.
    - Hover lamps near the bottom-right: the prompt never sits under the speaker or the open panel.
    - The map's lamps and captions never sit under the speaker.
- [ ] **(Josh, browser, ~400 px wide: devtools device toolbar, 400 × 800)**
  - The buttons are icon-only (hover shows the name). The picker and readouts don't run under them.
  - The speaker is in the bottom-right and the inventory in the bottom-left, and the two don't touch.
  - The popover opens fully on screen.
  - Win a map: the splash ends above the inventory and the speaker.
  - Hover prompts avoid both panels.

## Files
- **ui:** `src/ui/index.ts`, `src/ui/logic.ts` (or a new `src/ui/controls.ts` for the icons and the pure helpers, re-exported as the builder prefers), and the tests in `src/ui/`.
- **`index.html`:** the `.controls`, `.hud-left` and `.hud-right` CSS and the 600 px media query only. This is a declared cross-folder edit, as in 019 B and 021.
- **`src/main.ts`:** `inventoryBottomInset()` becomes `bottomInset()`, at its four call sites, and nothing else. This is a declared cross-folder edit, as in 021.

Out of scope: `src/audio/` (the engine and `AudioControl` are unchanged), `src/core/`, `src/render/`, `src/play/`, `src/grid/`, `puzzles/`, `package.json`. There are no new shortcuts (Open question 4).

## Order
- **After 026 B merges.** 026 B edits `src/ui/logic.ts`, `logic.test.ts` and `main.ts` (`placeHighlight`), so 030 branches from main after it, to avoid a three-way merge in the same files.
- **Independent of 029** (no map ids in `src/ui` code; `win.test.ts` is touched by 029 D only).
- **Before or after 027 C** (ui: the targets list's `many` CSS, and `onShow` in `main.ts`). Different functions in the same files; whichever merges second rebases. The 027 conflicts are small.
- About a day of ui work.

## Interfaces
New exports in `src/ui/` (pure, tested). No `src/core/` change: `AudioControl` and `AUDIO_PREFS_KEY` are used as they are.
```ts
export const CONTROL_ICON_VIEWBOX = "0 0 24 24";
export type SpeakerIcon = "muted" | "silent" | "low" | "high";
export const SPEAKER_ICON_SVG: Record<SpeakerIcon, string>;
export const ACTION_ICON_SVG: Record<"undo" | "reset" | "log", string>;
export const CONTROL_ACTIONS: readonly { id: "undo" | "reset" | "log"; label: string }[];
export function speakerIcon(muted: boolean, volume: number): SpeakerIcon;
export function speakerLabel(muted: boolean, volume: number): string;
export type PopoverEvent =
  | { type: "toggle" }
  | { type: "escape" }
  | { type: "pointerdown"; inside: boolean }
  | { type: "focusout"; inside: boolean };
export function soundPopover(open: boolean, event: PopoverEvent): { open: boolean; focus: "toggle" | "speaker" | null };
export function escapeTarget(popoverOpen: boolean, splashOpen: boolean): "popover" | "splash" | null;
export function splashCeiling(rootHeight: number, splash: Rect, obstacles: readonly Rect[], gap?: number): number;
// promptPosition's last parameter widens: avoid?: Rect | readonly Rect[]
```
No new dependencies. No assets: the icons are inline SVG strings.

## GDD check
Presentation only. Undo and Reset call the same play functions, and the Relight still ignores input as before. The audio engine, its cues and the prefs format are unchanged. No Decided rule is touched, so `tickets/rules-coverage.md` doesn't change.

## Open questions
1. **Icons:** the speaker (four states), undo, reset and download drafts above follow 021's style, with amber only on the sound waves. Approve them as drawn, or send your own SVG, as you did for 021?
2. **Where Undo, Reset and Log go:** cut to stay **top right**, as three separate icon-and-label buttons, with Log set apart. The alternative is a column **bottom-left, above the inventory**: closer to the parts, but it makes the map a little smaller and crowds the corner where the splash and prompt already dodge the inventory. Top right, as cut?
3. **Narrow screens:** below 600 px the three buttons are cut to show **icons only**, with the name on hover and for screen readers. Keep the labels at every width instead? They then wrap onto two rows on a phone.
4. **Shortcuts:** none are cut. Want any? For example **M** to mute, **Ctrl+Z** or **U** to undo, **R** to reset (R with a confirm?). That would add a play or ui part, since keys go through the same guards as 027's.
5. **Label:** keep "Download log", or shorten it to "Log"?
