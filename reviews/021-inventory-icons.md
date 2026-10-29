ticket: 021-inventory-icons
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Move the parts inventory out of the top-right HUD into a small bottom-left panel. It is one CSS-grid column of Josh's approved inline-SVG icons (bulb, fuse, wire), each followed by a right-aligned tabular count, and a row at 0 is dimmed. The map, the hover prompt and the win splash all leave room for the panel. Pure helpers (`inventoryRows`, `promptPosition` with `avoid`, `PART_ICON_SVG`) are tested in Vitest.

## Does the branch do it?
- **Pure Vitest, `src/ui/logic.ts`: met.** The tests are in `src/ui/inventory.test.ts`.
  - `inventoryRows`: `[]` gives all three rows at 0, empty, with texts `Bulb 0`/`Fuse 0`/`Wire 0`. `["wire","fuse","wire"]` gives the exact rows. The counts agree with `partCounts`. There is also a 12-count case.
  - `promptPosition` with `avoid`:
    - Without `avoid` the result is unchanged, both with the argument omitted and with `undefined`.
    - The below-right spot over the bottom-left panel moves above the pointer, and an `intersects` check confirms it clears the panel.
    - With the top blocked, the box goes right of `avoid` and does not intersect it.
    - Every case stays inside the margin (5 pointers).
  - `logic.test.ts` and `win.test.ts` are untouched (no diff) and pass.
  - The implementation is `inventoryRows` (built on `partCounts`) and `overlapsRect` plus the three-step placement in `promptPosition`.
- **DOM Vitest: correctly not written.** The criterion is conditional: "if jsdom is already set up for `src/ui/`". It is not. There is no jsdom or happy-dom in `node_modules`, `package.json` has no test environment, and `win.test.ts` is pure logic, not DOM. Adding jsdom would be a new dependency, which needs Josh's ticket and is out of scope (`package.json` is listed out of scope). So leaving it out is right, not a gap.
  - Part of what that criterion wanted is covered without a DOM. Each icon's markup is compared verbatim against the ticket's strings, and there is exactly one `#f2b84b` accent per icon, and a `0 0 24 24` viewBox.
  - The rest I checked by reading `src/ui/index.ts`. The rows are built in order bulb, fuse, wire. Each has one `svg` with `aria-hidden="true"` and `focusable="false"`. Each row has `role="img"` and `aria-label` = `row.text`. The count is a separate `span.count` holding the bare number. `classList.toggle("empty", row.empty)` runs on every parts change. The panel has `role="group"` and the `partsSummary` aria-label. It is appended to `root`, not `hudRight`.
  - The `partsKey` change from `""` to `null` makes sure the first `update()` writes the rows even when the parts list is empty. This is a real fix, and it is commented.
- **`npm run gate`: met.** Typecheck is clean and all 622 tests pass, against 609 on main (+13).
- **Josh in the browser:** that is Josh's to check. Reading the code, the setup is right for it:
  - `INVENTORY_CSS` has `left:14px; bottom:14px`, `grid-template-columns: 26px 3ch`, `grid-auto-rows: 32px`, `row-gap: 2px`, rows on `subgrid` (so every row shares the columns), `.count` with `text-align:right` and tabular-nums, and `.empty` at 0.4. It is the specified panel colours, border and radius, with no 600 px override.
  - `inventoryBottomInset()` in `src/main.ts` is re-read at all three places `hudTopInset()` is.
  - `placeSplash()` ends the room 8 px above the panel when the two overlap horizontally, and otherwise falls back to the HUD-top placement.
- **Open question 1 (headroom):** the largest per-kind total in `puzzles/` (starting parts plus salvage) is 3 (`lamp-row`). `3ch` is ample.
- **Files:**
  - `index.html` only deletes the listed rules. Removing `.parts` from the shared `.readout, .targets, .parts` selector is part of that deletion.
  - `src/main.ts` only adds the bottom inset.
  - No changes in `src/core/`, `src/grid/`, `src/night/`, `src/play/`, `src/render/`, `puzzles/` or `package.json`.

## Rule conflicts and risks
- No hard-rule conflicts. Grid and night purity are untouched, there is no new dependency, no GDD rule changes, and no puzzle file changes. Presentation only.
- The `innerHTML` into the `<svg>` uses fixed constant strings, as the ticket allows.
- Risk: column alignment relies on `grid-template-columns: subgrid`. Current Chrome, Firefox and Safari support it. In an older engine the rows fall back to auto columns, and the counts could misalign. That is acceptable for a prototype, and Josh's alignment check in the browser will catch it.
- `column-gap: 4px` is not in the ticket's grid spec. It is harmless, but the panel is a little wider than the "about 76 px" (26 + 4 + 3ch + 20 padding + border). Josh will judge the look.

## Must fix
none

## Could improve
1. `src/ui/index.ts` `update()`: `rows.find(...)` per node could be replaced by zipping `inventoryRowEls` with `inventoryRows(...)`, since both use bulb/fuse/wire order. This is minor clarity only.
2. When the jsdom question comes up for a later ticket, the DOM cases listed here (order, `.empty` toggling after `update()`, not inside `.hud-right`) are worth adding then.
