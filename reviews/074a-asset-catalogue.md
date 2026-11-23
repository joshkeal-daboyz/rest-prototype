ticket: 074a-asset-catalogue
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A of ticket 074 asks for a pure catalogue in `src/render3d/assetcatalogue.ts`, with Vitest tests. It turns the converted manifest into gallery packs and pieces, works out each piece's uses from the kit tables themselves, carries the intended-use note as a typed `PIECE_NOTES` table, and answers a page query (search, use and flag filters, paging). Nothing Josh can see changes.

## Does the branch do it?
The build commit (05b2168) touches only `src/render3d/assetcatalogue.ts` and `src/render3d/assetcatalogue.test.ts`, the two files the ticket lists for A. The core types and the ticket text come from the cut commits before it. I ran `npx vitest run src/render3d/assetcatalogue.test.ts --maxWorkers=1`: 30 passed. The 30 include the three real-manifest checks, because `assets/private/out` in this worktree is a symlink to the main checkout's manifest. `npm run typecheck` is clean.

- **`assetGalleryPacks`**: one entry per pack, in manifest order, with `pieceCount` and `failures` taken from the manifest. Tests: "gives one entry per manifest pack…" and "takes title and store page from PACK_PAGES…". An unknown pack keeps its id and gets `storeUrl: null`. The `hasOwnProperty` guard stops a pack id like `constructor` from picking up an entry from the prototype chain, and there is a test for it. I checked the five store URLs by hand against `docs/design/073-pack-intended-use.md` (Sci-Fi City, Sci-Fi Frontier, Palm City, Nature, Apocalypse for both subsets), and they match. City, Town and SIMPLE Town are null until Q4 is answered, and a test pins that. Met.
- **`assetGalleryPieces`**: sets `key` as `pack:name`, the exact name, `size_m` via `sizeOf`, `triangles`, `textured` from `textures.length > 0`, and copied `warnings` and `missingTextures` (a test checks they are copies, not the manifest's own arrays). `neverUsed` is `p.pack === "city-pack" && isNeverUsed(key)`. Tests: "sets neverUsed for City Pack keys…", which includes the same names in Palm City giving false, and "takes the size from the bounds' extents, never rescaled…". That second test uses a scale-100 `city-pack` fixture whose `scale-suspect` `SK_Character_01` keeps its 100 x 182 x 100. Met.
- **`pieceUses()`**: every table the ticket names is imported and fed in. None is copied: ladder (`MODEL_TABLE`, `allStackKeys`, `dressKeys`, `furnitureKeys`, `POWER_MIX`, `POWER_LINE`), edge, buildings, circuit, facades (all six), ground, traffic, tech (with `placed` taken from `TECH_KIT`), holdout and ruin. Keys starting `code:` are skipped. The output is built in `ASSET_GALLERY_USES` order with each use once. Tests:
  - "has every key of each table with that table's use" walks every table.
  - "carries the tech kit's placed flag per key".
  - "lists each key's uses once each, in ASSET_GALLERY_USES order, and never a code key".
  - A key that no table names gets `uses: []` on the piece (checked in the pieces test with `SM_Zzz_Unknown_01`).

  Met.
- **`PIECE_NOTES` / `notesFor`**: a typed table, each row with a pack, an anchored `^(?:SM_)?(?:…)$` pattern and the note fields, in the note's order. "Where the plan disagrees" items 2 to 9 are attached as `departure` on the rows they name. Every item under "Uses taken that the images do not show" is attached too (Overhang, ChargingStation, Bld_Advanced, Powerpoll, Farm/Irrigator, Container, Fuel_Tank, Bld_Wall, Mound, saplings, Bush/Dead on roofs, Vines_06). The tests for the three named cases pass:
  - The pole has `sure: "seen"` and "Allow both".
  - `palm-city-pack:SM_Env_Vines_06` has the vines row.
  - An unknown piece has `[]`.

  There are also tests for whole-name matching with and without `SM_`, table order, and staying inside the key's own pack. Met.
- **`assetGalleryPage`**: every space-separated term must appear in the name, case-insensitive. The use and flag filters work as specified (`unused` = no uses, `untextured` = not textured, `warnings` = any warning). Pieces sort in code-unit order, pages are `ASSET_GALLERY_PAGE_SIZE` long, `page` is clamped (including 0, negative and NaN), `pageCount` is at least 1, and `total` is reported. Empty or blank text matches everything, and an unknown pack gives an empty page. All of this is covered by the eight tests in the `assetGalleryPage` block. Met.
- **Lazy real-manifest checks**: the test reads the manifest with `existsSync`/`readFileSync` only when it is present, and uses `describe.skipIf` with a `console.info` line when it is absent. The path is built with `join(process.cwd(), …)`, so there is no Windows path. On failure, the missing keys and the unmatched patterns are listed in the message. Both checks pass against the real manifest on this machine: every `pieceUses()` key is in the manifest, and every `PIECE_NOTES` pattern matches a piece of its pack. Met.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. No new dependency. No file outside the ticket's A list is changed. All `src/city/*` imports are read-only, as the ticket allows.
- The ticket says "no three". The file imports no three itself, but `models3d`, `plan3d` and `powerkit` (all named by the ticket as sources) pull it in. That is the ticket's own design and does no harm, since B uses three anyway. The file's header says so honestly.
- `pieceUses()` caches its result at module level. That is fine because the tables are constant, but a test that changed a table would get a stale result.
- Some departures are attached to wider patterns than the piece the note names. For example:
  - the roof-growth departure is on every `Tree_Dead_*` and on `Plant_Bush_02/03`;
  - the mound departure is on `Terrain_Rubble_Pebbles_*` and `Terrain_DustPile_*`;
  - the sapling departure is on every Nature tree;
  - the street-mouth departure is on `Bld_Wall_01`, `Large_01` and `Tower_01`.

  Each departure's text names the piece it means, so a reader can tell, but a card can show a departure that does not apply to it.

## Must fix
none

## Could improve
1. `src/render3d/assetcatalogue.ts`, the `Env_Vines_06` row: its departure leaves out the note's limits ("If it reads as a flat sheet like `_01/04/05`, it is dropped. Never on a circuit pole, street light or lamp post, and never on a wall face (beside a drop, only `_08`)"). The sapling departure leaves out Josh's quoted words ("Through any dead line", "Poles too") and T-2. Since Josh will instruct from this page, carry the limits in full.
2. `src/render3d/assetcatalogue.ts`: split the rows where a departure names only part of the pattern, so the departure sits only on the pieces it names:
   - `Tree_Dead_01/02` from the other dead trees;
   - `Plant_Bush_01` from `_02/03`;
   - `Tree_Birch_*`/`Tree_Round_*` from the other trees;
   - `Terrain_Ground_Mound_Small_02` from the pebbles and dust;
   - `Bld_Wall_02` from the other walls.
3. `src/render3d/assetcatalogue.test.ts`: the store-URL test checks which packs have a link, but checks the URL text only for Sci-Fi City. Pinning all five URLs would catch a typo.
