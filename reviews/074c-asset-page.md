ticket: 074c-asset-page
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C is the dev-only asset gallery page at `/?assets=<pack>`. It has:
- a pure `src/ui/assetgallerylogic.ts` for the address round trip and the card text
- the DOM page `src/ui/assetgallery.ts`, which drives B's `AssetGallery`
- a branch in `src/main.ts` guarded by `import.meta.env.DEV`, taken before any puzzle and with both modules lazy-imported, checked by a static read
- styles in `index.html`

## Does the branch do it?
I reviewed commit bceacc4 (diffed from 52d97ad), as merged at 87a3e8c. I ran `src/ui/assetgallerylogic.test.ts` (27 tests) and `src/ui/assetgallery.test.ts` (4 tests) at `--maxWorkers=1`, and all passed. I did not run typecheck; the main session's gate on this commit covers it.

- **Address.** Met. `assetGalleryRequested` returns null without `assets`. It reads `q`, `use`, `flag`, `page` and `piece`, and falls back to `"" / any / any / 1 / null` for unknown values. `assetGalleryUrl` leaves the defaults out and round-trips. The tests are "is null unless ...", "falls back to the default ..." and "round-trips ...". A bare or unknown `assets` value opens the first pack once the packs are read (`boot()`: `if (!packs.some(...)) req.pack = first.pack`).
- **`main.ts` static check.** Met. `assetgallery.test.ts` checks four things:
  - the `import.meta.env.DEV && assetGalleryRequested(...)` guard appears once
  - the guard comes before the single `startPuzzle();`, in the `else`
  - both `import("./render3d")` and `import("./ui/assetgallery")` are inside the branch, with no top-level import of either
  - the branch names no map renderer, `mountUI`, grid, play or audio constructor
- **Card text from pure functions.** Met:
  - `sizeText`: `w × h × d m`, two decimals
  - `trianglesText`
  - `flagLabels`: `untextured`, `missing texture: <names>`, `scale-suspect`, `texture-guessed`, `no-uv` and `never used`, all as words
  - `useLabels`: `(typed, not placed)` or `unused`
  - `noteSummary`: the sureness word plus `cutText` at 120

  The full note is in the inspect panel through `noteLines`. Each has a test.
- **Josh, browser** (header, Copy, inspect, keyboard, phone width, no-manifest line, preview build). The main session reports checking them. The code supports them:
  - Tabs carry title, count and failures; the failures sit in a `<details>`.
  - The store link has `target="_blank" rel="noopener noreferrer"`.
  - Every control change runs `render()`, which calls `cancelThumbnails()` and then `history.replaceState`.
  - Copy calls `navigator.clipboard.writeText(key)` and falls back to `selectText`.
  - Enter works through the card's picture button. Esc and the arrows go through `inspectKey`, which ignores the arrows inside fields. `piece=` goes through `openNamed`.
  - With no manifest the page shows only `problem()`'s line.
  - In a build, `import.meta.env.DEV` is false, so the puzzle page runs.

  The CSS sets nothing under 14 px, and the cards are a wrapping grid.
- **Licence.** Met. The page imports no three and no `src/render3d/` code; the renderer arrives as `make(canvas)`. Thumbnails are B's object URLs, shown in `<img>` tags. Nothing is written, downloaded or sent. The gallery modules sit only behind the DEV branch, so a production build cannot reach the page.

## Rule conflicts and risks
- `main.ts` wraps the whole puzzle page body in `function startPuzzle()` (not re-indented), where the ticket allowed "the dev-only branch only". It is the smallest way to keep the gallery path from making a puzzle, and the body is unchanged. Other tests read `main.ts` statically (`src/audio/noLevelCue.test.ts`, `src/render3d/gallery.test.ts`); I did not run them as told, so the main session's full gate should confirm they still pass.
- `main.ts` now imports `./ui/assetgallerylogic` statically, so that pure module (labels and address code, no pack content) is in the production bundle. This is harmless and needed for the guard's second half, which is evaluated after `DEV` short-circuits anyway.
- No hard-rule break: no `src/grid/` or `src/night/` change, no new dependency, and only C's listed files were touched.

## Must fix
none

## Could improve
1. Order the guard so the production bundle drops the logic import as well. For example, move the request parse into the lazily imported page and test only `import.meta.env.DEV && new URLSearchParams(location.search).has("assets")` in `main.ts`. Not needed for the licence.
2. The use chips on a card show the raw id (`ruin`, `edge`). `USE_LABELS` already has the friendlier names for the filter menu, and the chips could use them too.
3. Typing in the search box re-renders and requeues 24 thumbnails on every keystroke. A short debounce would save draws on Palm City.
