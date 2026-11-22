# 074 · Asset gallery: every piece of every pack, named, measured and flagged

owner: renderer (sections A, B), ui (section C)
status: A merged; B and C approved to build
branch: `ticket/074-asset-gallery` (one branch per section: `ticket/074a-asset-catalogue`, `ticket/074b-asset-viewer`, `ticket/074c-asset-gallery-page`)

## Josh's words (22 Nov 2026, in chat, relayed by the Fable planning session)
> "I think it might be best for me to review and inspect each pass before moving on. I would like an asset gallery created for each pack. So that I have a splid reference while instructing the use of each component."

Nothing here changes a city stage, a pass or a Decided rule.

## G1 (22 Nov 2026, relayed by the Fable session): for the outline only
> "This looks good i approve"

Josh said this after he was shown the Fable session's outline: one gallery per pack in the dev app; each piece rendered with its exact name, size in metres and an untextured flag; click to see it large and orbit, with a person-height marker; search by name, filter by pass or "unused"; the intended-use note and a store-page link; nothing from the packs committed, never in a web build. **He had not seen this ticket's text.** His words were relayed to the architect by the coordinator, not read in chat here. The main session records them from his own message (CLAUDE.md: approval never comes from an agent's report).

- **Section A starts now.** It is a pure catalogue with tests and changes nothing Josh can see.
- **Sections B and C wait** for his answers to three things that go past the outline:
  - **Q3**: nine packs, where the outline named seven.
  - **The small additions**: the triangle count, the flag filter and paging.
  - **Q4**: the missing store URLs for City, Town and SIMPLE Town.

## Josh's answers (22 Nov 2026, on cards, relayed by the Fable planning session)
The main session records them from his own message (CLAUDE.md: approval never comes from an agent's report).

- **Card 1.** Asked: "Asset gallery ticket 074 is cut and matches what you approved, with these differences. It shows nine packs instead of seven (adding SIMPLE Town and the Apocalypse power pieces), and adds triangle counts, a filter by flag, and paging at 24 pieces a page to keep your PC responsive. Build it with these?" Josh:
  > "Yes, all of them (Recommended)"

  This settles Q3 (all nine packs) and the small additions (triangles, flag filter, paging at 24). **Sections B and C are approved to build**: B now, C after A and B merge.
- **Card 2.** Asked: "The gallery links each pack to its store page, but City, Town and SIMPLE Town have no store address on file. How should those three get their links?" Josh:
  > "You find them (Recommended)"

  This settles Q4. The Fable session found them on the Synty Store's own search results (the product paths were seen there; the pages were not opened one by one):
  - `city-pack` (POLYGON City): https://syntystore.com/products/polygon-city-pack
  - `town-pack` (POLYGON Town): https://syntystore.com/products/polygon-town-pack
  - `simple-town` (SIMPLE Town): https://syntystore.com/products/simple-town-cartoon-assets

  Section B adds them to the catalogue's `PACK_PAGES` table (see B).
- **Q1, Q2, Q5, Q6** were not on a card. They are taken on the Fable session's reading, the recommended answers, and Josh may reverse any of them: `/?assets=<pack-id>` as its own address (Q1); Copy copies `pack:name` (Q2); three-quarter-front thumbnails (Q5); no all-packs-by-pass view in this ticket (Q6).

## Goal
Josh opens `npm run dev`, goes to `/?assets=<pack-id>`, and sees one gallery per pack in the converted manifest: POLYGON City, Town, Palm City, Sci-Fi City, Sci-Fi Frontier, Nature, the two Apocalypse subsets (ruin, power), and SIMPLE Town. Each piece is shown as a small rendered card with its exact name (one click copies it), its size in metres, its triangle count and its manifest flags (untextured, missing textures, scale-suspect, never used). The card also lists which passes use the piece, and shows the intended-use note where the research note has one. He can search by name, filter by use (any pass, or "unused") and by flag, and page through. Clicking a card opens it large with orbit, a 5 m module square under it, a 1.8 m person marker beside it and its +z front marked. Every pack has a link to its store page. Every state of the page has its own address, so he can paste a link to a piece into an instruction. It runs only on his machine and only in a dev build. Nothing from the packs is committed or saved.

## What exists, and what this is not
- **The 043/045 building gallery** (`?view=3d&gallery=<pack>`, `src/render3d/gallery.ts`) shows building-sized pieces only, four copies each, for calibrating fronts. It stays as it is. This ticket is a new page with its own flag, `assets`, and does not touch `gallery.ts` or `stackgallery.ts`.
- **The manifest** (`assets/private/out/manifest.json`, version 1) has, per pack: `pack`, `glb`, `scale`, `assets[]` (`name`, `source`, `bounds`, `scale`, `triangles`, `textures`, `missingTextures`, `warnings`) and `failures[]`. As read on 22 Nov 2026: apocalypse-power 96 pieces, apocalypse-ruin 89, city-pack 355 (2 failures), nature-pack 202, palm-city-pack 1101, sci-fi-city-pack 602, sci-fi-frontier-pack 512, simple-town 173 (3 failures), town-pack 704 (9 failures). The GLBs run from 6 MB (simple-town) to 114 MB (town-pack). Palm City and Sci-Fi Frontier are each about 103 MB.
- **`reports/<pack>.json`** repeats the manifest's per-pack data (`assets`, `failures`). The page reads only the manifest. The reports add nothing it needs.
- **Bounds are metres already.** They include the pack's scale (`AssetEntry.scale`). A `scale-suspect` piece (for example City Pack's `SK_Character_*`, 182 "m" high) is shown at its bounds as they are, with the flag. The person marker makes the slip plain.

## Licence and load (every section)
- **Nothing from the packs enters the repo**: no GLB, texture, rendered thumbnail, screenshot or store image under any committed path. Thumbnails exist only as in-memory object URLs for the session. They are never written to disk, downloaded, or sent anywhere.
- **Dev only.** The page is reached only behind `import.meta.env.DEV`, so `npm run build` drops it. It reads `assets/private/out/` by URL at run time, as `models3d.ts` does (`defaultDir()`). It is never imported, never in `public/`. (Josh, 16 Nov 2026: GLBs go in a web build only if end users cannot get them and the site is password-gated. This page is never in one.)
- **Store pages are links only** (`target="_blank" rel="noopener noreferrer"`). No store image is fetched, copied or shown.
- **One renderer, one pack, one page.** One WebGL renderer for the whole page. Only one pack's GLB is held at a time: the previous one is freed before the next is fetched. Thumbnails are drawn one at a time, only for the cards on the current page (24), with one piece in the scene at a time. No render loop runs unless the inspect view is open and moving. Josh's PC froze under load on 17 Nov 2026.
- **CI-safe tests.** No test reads `assets/`. They use small hand-typed fixture manifests. The one test that checks the typed tables against the real manifest reads it lazily and skips when the file is absent. No Windows paths, no tight timers. Run Vitest with `--maxWorkers=2`.

## Acceptance criteria

### A. The catalogue (renderer; pure; Vitest). Goes first.
`src/render3d/assetcatalogue.ts`, no three, no DOM. It implements the pure half of `AssetGallery` (types in `src/core/assetgallery.ts`).
- [ ] (Vitest) `assetGalleryPacks(manifest)` gives one `AssetGalleryPack` per manifest pack, in manifest order, with `pieceCount` and `failures` from the manifest. Its `title` and `storeUrl` come from a typed table `PACK_PAGES`. The store URLs are the five in `docs/design/073-pack-intended-use.md` (Sci-Fi City, Sci-Fi Frontier, Palm City, Nature, Apocalypse for both subsets) plus whatever Josh gives under Q4. A pack the table does not know keeps its id as title and has `storeUrl: null`.
- [ ] (Vitest) `assetGalleryPieces(manifest, pack)` gives one `AssetGalleryPiece` per asset entry. It sets `key` `pack:name`, `name` exactly as in the manifest, `size_m` from the bounds' extents (as `sizeOf`), `triangles`, `textured` (`textures` non-empty), and `warnings` and `missingTextures` copied. `neverUsed` is `isNeverUsed(key)` (`CITY_NEVER_USED`) for `city-pack` keys only and false elsewhere. A fixture with a scale-100 pack and a `scale-suspect` entry shows the sizes are the bounds as given, never rescaled.
- [ ] (Vitest) `pieceUses()` builds a map from each key to its uses, in `ASSET_GALLERY_USES` order, from the tables that exist. It imports them, and never copies a list:
  - **ladder**: `MODEL_TABLE`, `allStackKeys()`, `dressKeys()`, `furnitureKeys()`, `POWER_MIX` and `POWER_LINE`
  - **edge**: `planTileKeys()`, `TILE_PROPS` and `INTERIOR_KEYS`
  - **buildings**: `src/city/buildings/kit.ts` `KIT`
  - **circuit**: `POWER_POLES` and `POWER_LINES` keys
  - **facades**: `GROUND_KIT`, `DRESS_BOUNDS`, `NOVELTY_KEYS`, `PARTY_KEYS`, `ROOF_BOUNDS` and `WALL_BOUNDS` keys
  - **ground**: `src/city/ground/kit.ts` `KIT_KEYS`
  - **traffic**: `TRAFFIC_KEYS`
  - **tech**: `TECH_KIT`, with `placed` from its `placed` flag
  - **holdout**: `src/city/holdout/kit.ts` `KIT`
  - **ruin**: `src/city/ruin/kit.ts` `KIT`

  A test walks each of these tables and checks every key it names has that use. A code key (`code:escape`) is skipped. A key with no table has `uses: []`.
- [ ] (Vitest) `PIECE_NOTES` is a typed table transcribed from `docs/design/073-pack-intended-use.md`. Each row has a pack, a name pattern (a RegExp over the manifest name, matching with or without the `SM_` prefix), and the `AssetGalleryNote` fields. The sources are the five pack tables, "Where the plan disagrees" (as `departure` on the rows it names) and "Uses taken that the images do not show" (as `departure` too). `notesFor(key)` gives every row that matches, in table order. Tests: `sci-fi-city-pack:SM_Prop_Powerpoll_01` has the "Seen clearly" pole row with Josh's "Allow both" departure; `palm-city-pack:SM_Env_Vines_06` has the vines row; a piece with no row has `notes: []`.
- [ ] (Vitest) `assetGalleryPage(pieces, query)` keeps the pieces whose name holds every space-separated term (case-insensitive) and that pass the `use` and `flag` filters. `unused` means `uses` is empty. `untextured` means `textured` is false. `warnings` means any warning. It sorts by name, cuts pages of `ASSET_GALLERY_PAGE_SIZE`, clamps `page` to `1..pageCount` (`pageCount` at least 1) and reports `total`. Empty text matches all, and an unknown pack gives an empty page.
- [ ] (Vitest, lazy) When `assets/private/out/manifest.json` exists on the machine: every key `pieceUses()` names is in the manifest (any that is not is listed in the failure message), and every `PIECE_NOTES` pattern matches at least one piece of its pack. When the file is absent, the test is skipped with a line saying so.

### B. The viewer (renderer; three; Vitest for the pure parts, Josh in the browser). After A.
First, three fixes to A's catalogue (`src/render3d/assetcatalogue.ts`), from A's review and Josh's Card 2. Josh will instruct from this page, so the notes must be whole and must name only what they say.
- [ ] (Vitest) `PACK_PAGES` has the three store URLs Josh's Card 2 settled, as listed under "Josh's answers": `city-pack`, `town-pack` and `simple-town`. All nine manifest packs then have a `storeUrl`.
- [ ] (Vitest) No `PIECE_NOTES` row is shortened. Every row carries its note in full from `docs/design/073-pack-intended-use.md`: the text, its limits, and any departure with Josh's words. Tests pin the two A's review found short: `palm-city-pack:SM_Env_Vines_06` has its limits, and the sapling row has Josh's words and T-2.
- [ ] (Vitest) Every `PIECE_NOTES` row matches only the pieces its note names. A's review found rows that match more: the roof-growth row (on every `Tree_Dead_*`), `Plant_Bush_02/03`, the mound, the sapling and the street-mouth wall rows. Each is split into rows, or its pattern narrowed, so it matches exactly the pieces the note names. A test per row runs it over a fixture of near-miss names and pins what it matches. The lazy manifest test also checks, on the real manifest, that each row matches only names in the note's named set.

Then the viewer:
`src/render3d/assetviewer.ts`, exported as `createAssetGallery(canvas, deps?)` from `src/render3d/index.ts`. It implements `AssetGallery` on A's functions. `deps` takes `fetchJson`, `loadGlb` and the folder, as `LoadDeps` does, so tests pass fakes.
- [ ] (Vitest) `packs()` fetches `manifest.json` once. With no manifest, or one `isManifest` refuses, it resolves to `[]` and `problem()` gives one readable line. It never rejects.
- [ ] (Vitest, fake loader) `loadPack(p)` frees the loaded pack before fetching `p`: it disposes every geometry, material and texture under the old scene and revokes every thumbnail URL. Then it fetches only `p`'s GLB. Loading the pack that is already loaded fetches nothing. Two quick switches leave only the last pack loaded. A fetch or parse failure rejects with the pack and the reason.
- [ ] (Vitest, fake draw) Thumbnails go through one queue. One is drawn per animation frame, in the order asked, with exactly one piece clone in the scene while it draws (added, drawn, removed). The same key twice is drawn once and cached. `cancelThumbnails()` resolves every waiting promise to null and draws none of them. A key whose root is not in the GLB resolves to null.
- [ ] (Vitest, pure) `thumbCamera(size_m, aspect)` frames a piece from three-quarters in front, on its own +z, 30° up and 35° round. All eight corners of its bounds fall inside the view, with at least a 5% margin, for a 0.1 m sign, a 5 m floor piece, a 73 m cable and a `scale-suspect` 182 m character.
- [ ] (Vitest, pure) `inspectMarkers(size_m)` places a 5 x 5 m module outline square on the ground, centred under the piece, and a 1.8 m person marker standing 0.5 m clear of the bounds on +x. It also places a front arrow on the ground at the bounds' +z edge. Each of the three is code-drawn and pinned by number. None is a pack piece.
- [ ] (Vitest) The scene uses neutral daylight (one ambient, one directional, a mid-grey background), not the night city's light. Pieces are drawn in metres (1 world unit = 1 m, not `WORLD_PER_METRE`), unscaled, at their GLB's own orientation. `nearestTextures` is applied as the city draws them.
- [ ] (Vitest) `inspect(key)` starts orbit (three's own `OrbitControls`, from the `three` package already installed; no new dependency) about the bounds' centre. It renders only on a control change or a resize, and stops on `closeInspect()`. This orbit on the viewer's own canvas is the one input `src/render3d/` takes here, as the 045 gallery's clicks were.
- [ ] (Josh, browser) Thumbnails of one page appear one after another within a few seconds of the pack loading. The PC stays responsive while Palm City (1101 pieces, 103 MB) is open and paged through.

### C. The page (ui; Vitest for the pure parts, Josh in the browser). After A and B merge.
`src/ui/assetgallery.ts` (the DOM page) and `src/ui/assetgallerylogic.ts` (pure), plus the dev-only branch in `src/main.ts`.
- [ ] (Vitest) `assetGalleryRequested(search)` reads `assets=<pack-id>` and returns null without it. A bare `assets` (or an unknown id, once the packs are read) opens the first pack. It also reads `q`, `use`, `flag`, `page` and `piece=<name>`. Unknown values fall back to `"" / any / any / 1 / none`. `assetGalleryUrl(query, piece)` writes them back, so the two round-trip.
- [ ] (Vitest) `src/main.ts` takes the gallery branch only behind `import.meta.env.DEV` and before any puzzle is opened. It is a static read of the source, as `streetcam.test.ts` does for `renderer.ts`. In that branch no puzzle, HUD or map renderer is made, and it lazy-imports `./render3d` and `./ui/assetgallery`.
- [ ] (Vitest) The card's text, made by pure functions:
  - the exact name
  - the size as `w × h × d m`, two decimals
  - the triangles
  - one label per flag: `untextured`, `missing texture: <names>`, `scale-suspect`, `texture-guessed`, `no-uv`, `never used`
  - one label per use, with `(typed, not placed)` when `placed` is false, or `unused`
  - the first note's sureness word and its text cut to 120 characters, with the full text in the inspect panel

  Flags are words, never colour alone.
- [ ] (Josh, browser) The header shows a tab per pack (title, piece count, failures count; the failures are listed on click), the store link, a search box, a use filter (any, each use, unused), a flag filter (any, untextured, warnings), and "a to b of N" with previous and next. Changing any of them updates the address (`history.replaceState`) and asks for the new page's thumbnails, cancelling the old ones.
- [ ] (Josh, browser) Each card's Copy button puts the key `pack:name` (Q2) on the clipboard (`navigator.clipboard.writeText`). If the clipboard is refused, it selects the name text instead. The name is selectable as plain text.
- [ ] (Josh, browser) Clicking a card, or Enter on it, opens the inspect panel: the large canvas, the name with Copy, size, flags, uses, every note in full with its images and departure, and the store link. Esc or Close shuts it, and the left and right arrows step through the page's pieces. `piece=<name>` in the address opens it directly.
- [ ] (Josh, browser, phone-sized too) The cards wrap to the width, text is never under 14 CSS px, and every control works by keyboard.
- [ ] (Josh, browser) With no manifest, the page shows `problem()`'s line and nothing else. In a `npm run build` + `npm run preview`, `/?assets=city-pack` shows the normal puzzle page.

## Files
- **Before the build (lead-architect, this cut):** `src/core/assetgallery.ts`, and its line in `src/core/index.ts`.
- **A (renderer):** `src/render3d/assetcatalogue.ts`, `src/render3d/assetcatalogue.test.ts`. Read-only imports from `src/city/*/kit.ts`, `src/city/facades/*kit.ts` and the render3d tables named above; none of those files change.
- **B (renderer):** `src/render3d/assetcatalogue.ts` and `src/render3d/assetcatalogue.test.ts` (the three catalogue fixes only), `src/render3d/assetviewer.ts`, `src/render3d/assetviewer.test.ts`, `src/render3d/index.ts` (one export line).
- **C (ui):** `src/ui/assetgallery.ts`, `src/ui/assetgallerylogic.ts`, `src/ui/assetgallerylogic.test.ts`, `src/ui/assetgallery.test.ts` (the static `main.ts` check), `src/main.ts` (the dev-only branch only), `index.html` (styles only, if needed).
- Out of scope: `src/render3d/gallery.ts`, `stackgallery.ts`, `renderer.ts`, every `src/city/` file, `tools/`, `assets/`, `docs/design/073-pack-intended-use.md` (A transcribes it and does not edit it).

## Interfaces
Written into `src/core/assetgallery.ts` on this branch: `ASSET_GALLERY_USES`, `AssetGalleryUse`, `AssetGalleryPieceUse`, `AssetGalleryNote`, `AssetGalleryNoteSureness`, `AssetGalleryPiece`, `AssetGalleryPack`, `AssetGalleryQuery`, `ASSET_GALLERY_PAGE_SIZE` (24), `AssetGalleryPage`, and `AssetGallery`. `AssetGallery` is the object B gives and C drives. The core file names no DOM type: B's factory takes the canvas.
- **Names.** Each name carries `Asset` because `src/render3d/gallery.ts` already exports its own `GalleryPack`.
- **No new dependency.** `OrbitControls` is `three/examples/jsm/controls/OrbitControls.js`, in the `three` package already installed (as `GLTFLoader` is).
- **The intended-use note is typed, not parsed.** A table keeps a test able to pin every row against the manifest. The markdown stays the source: a later change to the note is a one-row change to `PIECE_NOTES`.

## Open questions (recommended answer first)
All six are settled; see "Josh's answers". Q3 and Q4 by his cards; Q1, Q2, Q5 and Q6 on the Fable session's reading, which Josh may reverse. Kept below as asked.

1. **Address.** `/?assets=<pack-id>` on its own, with no puzzle and no `view=3d` (recommended: it is not a map). Or `?view=3d&assets=<pack-id>`, beside the other 3D dev views.
2. **What Copy copies.** The key `pack:name`, for example `sci-fi-city-pack:SM_Prop_Powerpoll_01` (recommended: it is what every kit table and ticket uses), with the bare name still selectable. Or the bare name only.
3. **Which packs.** Every pack in the manifest, including SIMPLE Town (the 16 Nov test pack) and `apocalypse-power` (071's subset) (recommended: the manifest is the record, and a pack nobody uses shows as all "unused"). Or only the seven the Fable session named.
4. **Store links for City, Town and SIMPLE Town.** The research note gives no URL for them. Recommended: Josh pastes the three URLs at G1, and until then those packs show no link. The builder does not look them up.
5. **Thumbnail angle.** Three-quarters from the piece's +z front, 30° up (recommended: it shows the front the kits assume and one side). Or straight on the front.
6. **A view by pass across packs** (for example every ruin piece from Apocalypse, Nature and Palm City on one page). Recommended: not in this ticket. The use filter within each pack covers "review each pass", and a cross-pack page would hold three GLBs (about 120 MB for the ruin). It can be a later ticket after Josh has used this one.
