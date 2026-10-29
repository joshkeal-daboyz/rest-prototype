# 021 · Parts inventory: icons, one column, bottom-left

owner: ui
status: done
branch: ticket/021-inventory-icons

## Josh's words
"the inventory is ugly, I think we should use a light bulb icon for the bulbs, a fuse icon for the fuses and a wire icon for the wires. They should be vertical. Right now there is no alignment. It just looks messy. Inventory should sit in the bottom left corner."

Added by Josh, relayed by the main session: the icon designs below are approved, and "the numbers must line up vertically in the final output".

## Where it is today
- The inventory is the `div.parts` in the **top-right HUD column** (`hudRight`, under Undo / Reset / Download log / the sound control), built in `src/ui/index.ts` `mountUI` and filled in `update()` (the `partsKey` block): three `span.part` chips in a wrapping row, each a CSS box "icon" (`.icon-bulb` a circle, `.icon-fuse` a tall rectangle, `.icon-wire` a bar) and the text `Bulb 0` / `Fuse 1` / `Wire 1`. The group's `aria-label` is `partsSummary()` (`On hand: 0 bulbs, 1 fuse, 1 wire`).
- Its styles are in **`index.html`**: `.parts`, `.part`, `.icon`, `.icon-bulb`, `.icon-fuse`, `.icon-wire`, and `.parts` in the `max-width: 600px` media query.
- The capacity readout (`Lv4 Powersource — using 3 of 4`) and the targets list (`Priests want lit`) are **not** part of the inventory. They stay in the top-left HUD column, unchanged.
- The "Lv hover text" is the pointer prompt (`div.prompt`, placed by `promptPosition()` in `src/ui/logic.ts`). The Lv captions drawn on the canvas are the renderer's and do not move.
- The map's fit already reserves the HUD's height at the top (`hudTopInset()` in `src/main.ts`, via `renderer.setInsets`). `Insets` already takes `bottom` and `left`, so no renderer change is needed.

Owner: **ui** (`src/ui/`), plus two small edits outside it, the same way 007 B, 019 B and 020 B did: `index.html` (remove the old parts styles) and `src/main.ts` (one inset).

## Goal
The parts on hand sit in a small panel fixed to the bottom-left corner of the screen: one column of three rows, Bulb, Fuse, Wire, top to bottom. Each row is a drawn icon (a light bulb, a cartridge fuse, a length of wire) and its count. The icons share one x, and the counts line up vertically, right-aligned in one column. A part the player has none of looks dimmed. The counts update the moment a repair spends a part, as they do now. Nothing else on screen is covered: not the HUD, not the sound control, not the win splash, not the pointer's hover prompt, and no lamp or line on the map. This holds at full width and at about 400 px wide.

## Decided in this cut
- **Icons: Josh's approved designs, used exactly as given.** They are inline SVG, built in `src/ui/index.ts` (`createElementNS`, or one `innerHTML` per `<svg>` from a constant string; these are fixed strings, not user data). Each `<svg>` has `viewBox="0 0 24 24"`, `width`/`height` 26, `aria-hidden="true"` and `focusable="false"`. Outlines use `stroke="currentColor"`. The accent is amber `#f2b84b`, used as given (it is the icon's own colour, not a theme variable). No image files, no icon font, no new dependency. The children, verbatim:
  - **bulb:**
    ```html
    <path d="M9 17.5h6M10 20.5h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.6 14.6A6 6 0 1 1 15.4 14.6C14.6 15.3 14.4 16 14.4 17.5H9.6C9.6 16 9.4 15.3 8.6 14.6Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10.5 17.5V12.2L12 10.8L13.5 12.2V17.5" fill="none" stroke="#f2b84b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    ```
  - **fuse:**
    ```html
    <path d="M12 1.8V4.5M12 19.5V22.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><rect x="8.2" y="4.5" width="7.6" height="15" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.2 7.6H15.8M8.2 16.4H15.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.6V9.4L10.3 10.9L13.7 13.1L12 14.6V16.4" fill="none" stroke="#f2b84b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    ```
  - **wire:**
    ```html
    <circle cx="12" cy="3.8" r="1.9" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="20.2" r="1.9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 5.7V7.6C7.2 8.6 7.2 11.4 12 12C16.8 12.6 16.8 15.4 12 16.4V18.3" fill="none" stroke="#f2b84b" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    ```
- **One row per kind, always in the order Bulb, Fuse, Wire.** All three always show, including at 0, as today.
- **Each row is the icon and the count, with no visible name** (Josh's approved look).
- **Alignment: the counts line up vertically** (Josh's added requirement). The panel is a 2-column CSS grid, `grid-template-columns: 26px 3ch`. Column 1 is the icon, left edge at the same x in every row. Column 2 is the count: a fixed width, `text-align: right`, `font-variant-numeric: tabular-nums`. So `0`, `1` and `12` all end at the same x. Rows are 32 px high, `align-items: center`, with a 2 px row gap. The grid lives on the panel (or on rows that use `display: contents` / subgrid) so the columns are shared by every row. Do not use a separate flex row per part: then the count column could differ by content.
- **Panel:** background `#141b24`, a `0.5px solid #2a3644` border, `border-radius: 10px`, padding `8px 10px`, about 76 px wide (it sizes to its grid). It sits `position: absolute; left: 14px; bottom: 14px` inside `#ui`, at every width (the approved look, so no 600 px override). It is not in `hudRight` any more. It is not a `.hud` element: the top inset measures `.hud` columns, and the inventory must not push it. The class is `inventory`.
- **Text kept for screen readers.** Each row has an `aria-label` of `Bulb 0` / `Fuse 1` / `Wire 1` (`PART_LABEL` + count), and `role="img"` or a visually-hidden name span, so the name is announced with the count. The panel keeps `role="group"` and its `aria-label` from `partsSummary()`, unchanged.
- **Dimmed at 0:** the row gets class `empty` and `opacity: 0.4`. Dimming is not the only cue: the count still reads `0`.
- **The map leaves room for it.** `src/main.ts` passes `bottom` as well as `top` in `setInsets` / `createMapRenderer`: the inventory's height plus 14 px from the bottom edge, plus 8 px of margin. It is measured the way `hudTopInset()` measures the HUD (a sibling `inventoryBottomInset()` that finds `.inventory` in `uiRoot`, 0 if there is none), and it is re-read at the same places `hudTopInset()` is. No lamp, line or Lv caption is drawn under the panel. A bottom inset rather than a left one, because the panel is short and wide maps need their width.
- **The hover prompt steps round it.** `promptPosition()` gains an optional `avoid` rectangle (`{ left, top, width, height }`, same space as `pointer`). If the box would overlap `avoid`, it is placed **above** the pointer (`pointer.y - offset - box.height`), still clamped inside `margin`. If it would still overlap, it goes to the right of `avoid` (`avoid.left + avoid.width + margin`). `placePrompt()` passes the inventory's box. Without `avoid` the result is exactly as today, so existing calls and tests do not change.
- **The win splash leaves room for it.** In `placeSplash()`, the room below the HUD ends at the inventory's top minus 8 px, not at the bottom of the screen. It does this only when the two would overlap horizontally, which is always the case at ~400 px. If there is no room, the splash keeps its top under the HUD, as now, and draws over the map. On a window too short for both, the splash may cover the inventory. It never sits under it: the splash stays appended last.
- **Styles move into `src/ui/index.ts`** as an `INVENTORY_CSS` block added once (`ensureInventoryStyle()`), as `NOTICE_CSS`, `SPLASH_CSS` and `AUDIO_CSS` are. The old `.parts`, `.part`, `.icon*` rules, and `.parts` in the media query, are deleted from `index.html`. Nothing else in `index.html` changes.

## Acceptance criteria
- [ ] **Vitest, `src/ui/logic.ts` (pure):**
  - `inventoryRows(parts)` returns three rows in the order bulb, fuse, wire, each `{ kind, label, count, text, empty }`.
    - `[]` → all counts 0, all `empty: true`, texts `Bulb 0`, `Fuse 0`, `Wire 0`.
    - `["wire", "fuse", "wire"]` → bulb 0 / empty, fuse 1 / not empty / `Fuse 1`, wire 2 / `Wire 2`.
    - The counts agree with `partCounts` for the same input.
  - `promptPosition` with `avoid`:
    - Without `avoid`, the existing `promptPosition` tests pass unchanged.
    - A pointer whose below-right box would overlap an `avoid` rect at the bottom-left gets a box above the pointer that does not intersect `avoid`.
    - Where above is also blocked (a pointer near the top of a short bounds, with `avoid` covering it), the box is placed right of `avoid` and does not intersect it.
    - The result stays inside `margin` of the bounds in every case.
  - `partsSummary` and every existing `src/ui/` test pass without edits.
- [ ] **Vitest, `src/ui/` DOM (jsdom, as `win.test.ts` does), if jsdom is already set up for `src/ui/`:**
  - After `mountUI(...).update()`, `.inventory` holds three rows in order bulb, fuse, wire. Each has one `svg[aria-hidden="true"]`, and an `aria-label` of `Bulb N` / `Fuse N` / `Wire N`.
  - The panel has `role="group"` and the `partsSummary` `aria-label`.
  - A kind at 0 has class `empty`. After the grid's parts change and `update()` runs again, the count and class follow.
  - The panel is not inside `.hud-right`.
  - Each icon's `<svg>` has `viewBox="0 0 24 24"`, and its child markup matches Josh's approved strings above (compare against constants exported from `src/ui/`). Each icon has exactly one element stroked `#f2b84b`, the accent.
  - Each row's count sits in its own element (e.g. `.count`), separate from the icon, so CSS can align it. Its text is the bare number (`0`, `1`, `12`).
- [ ] `npm run gate` green, and the test count grows.
- [ ] **Josh in the browser** (`npm run dev`):
  - **Look:** on a map with parts (e.g. `04`, or any map that starts with a bulb, a fuse and a wire), the inventory matches the approved mock:
    - a dark panel 14 px from the bottom-left corner, about 76 px wide
    - one column, bulb / fuse / wire top to bottom, each a 26 px icon with an amber accent, then the count
    - rows 32 px high, with a 2 px gap
  - **Numbers line up (Josh's added requirement):** at full width and at ~400 px, the counts' right edges share one x in all three rows. This holds with a mix of `0`, single-digit and two-digit counts (devtools: edit a count to `12` in the DOM, or use a map with 10+ of a part if one exists). The icons' left edges share one x.
  - **Live counts:** repair a fault. The matching count drops at once. At 0 that row dims to 0.4. Undo brings the count back and the row undims. The numbers stay aligned throughout.
  - **No overlap at full width and at ~400 px wide (devtools):** the panel covers no part of the picker, the capacity readout, the targets list, the Undo/Reset/Download log buttons, or the sound control (mute + volume). No lamp, line or Lv caption on the map sits under it.
  - **Hover prompt:** move the pointer over a lamp or line near the bottom-left. The prompt (`Lv2 Lamp …`) moves above the pointer, or to its right, and never covers or hides under the panel.
  - **Win splash:** win a map at full width and at ~400 px. The splash covers no part of the panel, and Next/Replay still work.
  - **Screen reader / keyboard (spot check):** the panel still announces `On hand: …`, and each row reads `Bulb 0` / `Fuse 1` / `Wire 1`, not a bare number. The SVGs themselves are not announced. Tab order is unchanged (the panel has nothing focusable).

## Files
- `src/ui/` (`index.ts`, `logic.ts`, new or existing tests).
- `index.html`: **only** delete the `.parts`, `.part`, `.icon`, `.icon-bulb`, `.icon-fuse`, `.icon-wire` rules and `.parts` from the 600 px media query.
- `src/main.ts`: **only** the bottom inset (`inventoryBottomInset()` next to `hudTopInset()`, and passing `bottom` where `top` is passed today).

Out of scope: `src/core/`, `src/grid/`, `src/play/`, `src/render/`, `src/audio/`, `puzzles/`, `package.json`.

## Order
None needed. One part, one agent. It can start from `main` now (020 is merged).

## Interfaces
Nothing new in `src/core/`. This is presentation only, so the types live in `src/ui/logic.ts`, written by the builder:

```ts
export interface InventoryRow {
  kind: Part;            // "bulb" | "fuse" | "wire"
  label: string;         // "Bulb"
  count: number;
  text: string;          // "Bulb 0", the row's aria-label
  empty: boolean;        // count === 0
}
export function inventoryRows(parts: readonly Part[]): InventoryRow[];

export function promptPosition(
  pointer: { x: number; y: number },
  bounds: { width: number; height: number },
  box: { width: number; height: number },
  offset?: number,
  margin?: number,
  avoid?: { left: number; top: number; width: number; height: number },
): { left: number; top: number };

/** Josh's approved icon markup (children of a 24×24 <svg>), verbatim from "Decided in this cut". */
export const PART_ICON_SVG: Record<Part, string>;
```

No event or payload changes. **No new dependencies:** the icons are inline SVG, Josh's approved markup.

## GDD check
Presentation only. No rule, number, payload or puzzle file changes. "Scarce parts: repair consumes the part; refused without it" is still decided by the grid. The panel only shows `state.parts`. No rules-coverage change.

## Open questions
Settled by Josh's approved mock: icon and count only, no visible name, and no "Parts" heading. The names stay in each row's `aria-label`.

1. **Two-digit headroom:** the count column is a fixed `3ch`, enough for up to 99 of a part. Is that enough? (The builder should check the largest starting part count in `puzzles/`.)
2. **Bottom inset vs. map size:** reserving the panel's height across the bottom shrinks tall maps by about 140 px (a 116 px panel, 14 px from the edge, plus 8 px of margin). The alternative is no inset: maps would keep their size, and a lamp could then sit under the panel on some maps. The cut takes the inset.
