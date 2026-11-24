ticket: 081d2-gallery-components
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section D2: a dev-only components view in the asset gallery. `?assets=components` lists every `CIRCUIT_COMPONENTS` entry with its pick from D3's table, or "unpicked" in words. `?assets=components&component=<id>` shows that component's D1 shortlist as 074-style cards across packs, with one pack's GLB held at a time. The shortlist is a typed table pinned to D1's note.

## Does the branch do it?
1. **Address reading and round-trip (test: 2 cases).** Met. `assetgallerylogic.ts` adds `component` to `AssetGalleryRequest`. `componentOf` falls back to null for any id not in `CIRCUIT_COMPONENTS`. `assetGalleryUrl` takes an optional `component` and writes it only when it is not null. Tests in `assetgallerylogic.test.ts`: the new "reads the components view, and an unknown component id falls back to the list" (a known id, `nope`, and no id), and the rewritten "round-trips through assetGalleryRequested, the piece and the component" (adds `damagedLine`). Both would fail if the fallback or the round-trip broke.
2. **Shortlist typed and pinned (test: 1 case).** Met. `src/ui/componentshortlist.ts` has `COMPONENT_SHORTLIST: Record<CircuitComponent, readonly ShortlistCandidate[]>`. `componentshortlist.test.ts` parses `docs/design/081-D1-component-shortlist.md`: the `### N. <id>` headings, which match the component ids (checked: feed through roofMast), and each `| A-D | key | size | tris |` row. It compares letter, key, size and triangles row for row for every component. A row added, dropped or mistyped on either side fails it.
3. **Pick or "unpicked" in words (test: 2 cases).** Met. `pickWords` returns "Unpicked: draws as a placeholder" for undefined, null or a null key. For a pick it returns the key with Josh's words and the date. `renderList` (in `assetgallery.ts`) puts that text under each component's button, so no colour is involved. Both cases assert exact or prefixed text.
4. **Browser: cards across packs, one GLB at a time.** Left to Josh. In the code, `serial()` chains every `loadPack`, so only one load runs at a time. `ensurePack` repaints only the held pack's thumbnails and sets the others back to "Open to load its pack". `openAny` loads a card's pack before opening it. `main.ts` passes D3's `COMPONENT_MODELS` in as `picks`, so the list shows the real picks.

Tests: 5 test cases added or rewritten against main (3 new in `componentshortlist.test.ts`, 1 new and 1 rewritten in `assetgallerylogic.test.ts`). This is what the ticket budgets and under the 15 cap. The three files the branch touched pass: 33 tests, 0.9 s.

## Rule conflicts and risks
- **Files beyond D2's list.** The ticket lists `assetgallery.ts`, `assetgallerylogic.ts`, their tests and `componentshortlist.ts`. The branch also touches three other files, each the smallest change the goal needs:
  - `src/main.ts`: one line passes D3's `COMPONENT_MODELS` into `mountAssetGallery`. The goal says "with its pick (from D3's table)", and without this every row would read "unpicked".
  - `index.html`: three CSS rules. The gallery's styles already live there, and the `[hidden]` override is needed for `setView`.
  - `src/ui/view3d.test.ts`: one assertion narrowed to `.pack`, because the whole-object assertion broke when the request type grew (the CI fix, 9fb188c). This file is in ui's own folder.

  Neither root file is owned by a folder in the brief. I don't count these as a blocker, but the main session may want to note them against D2's file list.
- No `src/grid/` or `src/night/` change. No new dependency. No Decided rule touched. `componentshortlist.ts` has no DOM and no three. `src/ui/` does not import `src/render3d/`: the picks are injected from `main.ts`.

## Must fix
none

## Could improve
1. `componentshortlist.test.ts` pins letter, key, size and triangles, but not `says073` or `fits`, which the module's doc comment says are copied "verbatim". Either pin those columns too, or drop "verbatim" from the comment.
2. `shortlistLinkOf` is not called anywhere in the app, only in the test. Either show the gallery link on each candidate card (the card already opens the piece, so this is optional), or remove the function and its assertion from the second `pickWords` case.
3. `openAny` is also used on the ordinary pack cards. If that pack failed to load, `loadedPack` is null and a click does nothing, because the reopen is guarded by `req.pack === COMPONENTS_PACK`. This is minor in practice, because a failed pack shows no cards.
