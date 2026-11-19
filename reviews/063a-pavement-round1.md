ticket: 063a-pavement
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
Sections A, D and H of ticket 063. A: every plain pavement and build-out cell is the one opaque `Sidewalk_Straight_02`, and the grate is the only exception. D: the apron, strip, paths, park edges and passage floors are the plain `Sidewalk_01` at the measured walk level. H: a street court's drive and an alley's ring-1 mouth cells are paved with that slab, and frontage lots and the stall rows are left alone. Each comes with GLB measurements that guarantee "one colour" and "no plates", and with fixtures that fail on today's rule.

I reviewed `git diff ab9d01f 9f394df` in `D:\rest-prototype-gate` (gate green). The GLB is not in the gate worktree, so I ran the `it.skipIf` tests in `D:\rest-prototype-063a`, which is the same commit and has `assets/private/out/city-pack.glb`. Both pass there. I also read the GLB myself with a scratch script to check the claims.

## Does the branch do it?
**A1, slots and variants: met.**
- `TILE_SLOTS.pavement` is `[Straight_02, Grate_01]` and `.buildout` is `[Straight_02]` (`tileslots.ts`).
- `tilecity.ts` gives a pavement cell `h % GRATE_ONE_IN === 0 ? PAVEMENT_GRATE : 0`, with `PAVEMENT_GRATE = 1`. A build-out keeps `variant = 0` (its hash line is deleted). `PAVEMENT_STRAIGHT_2` is gone.
- `variantIndex` in `tilecity3d.ts` sends a build-out to index 0. For a pavement cell it is `variant & 3` clamped to the two keys, so 0 is the straight and 1 is the grate.
- `Straight_01` is in no role, not in `tileKeys()`, not in `INTERIOR_KEYS` and not on the sheet. Test: `tileslots.test.ts` "draws every plain pavement and build-out cell from the one straight...".
- No non-test source still names `Sidewalk_Straight_01`.

**A2, one piece: met, except the fixture the criterion asks for.**
- `tilecity3d.test.ts` "resolves every plain pavement cell and every build-out cell to Straight_02..." covers seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4, with every key active. It also pins the variants to {0, PAVEMENT_GRATE}.
- "draws the whole pavement and every build-out as one InstancedMesh of one key" checks what is drawn: `perKey(Straight_02)` equals the plain cell count, there is exactly one `tile:SM_Env_Sidewalk_Straight_02` mesh, and no `Straight_01` mesh.
- Missing: "A fixture of today's variant rule fails it." No test feeds the old `(h >>> 8) & 1` rule through this check (Must fix 2).

**A3, opaque: partly met.**
- The BLEND test reads the GLB lazily inside `it.skipIf(!haveGlb)`. It covers `tileKeys()` and every `INTERIOR_KEYS` entry, and it asserts each key has at least one primitive, so the check is not empty.
- I confirmed in the GLB: the only BLEND materials are `blinn268.001` and `blinn268.002` (`Straight_01`). Trees, bench, bins and patch are opaque, so the narrower key set happens to be enough today.
- No assertion shows the check bites on `Straight_01`, although the criterion says "Today's slots fail this on Straight_01". The tileslots test "fails a fixture of the slots as they were" only checks that a hand-written helper returns 2 for a hand-written list. It does not exercise the BLEND check (Must fix 2).
- The second bullet is not implemented at all. Nothing reads the embedded atlas at the UVs to show that `Straight_02`, `Grate_01`, `Dip_01` and `Dip_Corner_01` sample the same slab texel (Must fix 1).

**A4, nothing else moves: met in code, not pinned by a test.**
- The `tilecity.ts` diff touches only the two variant expressions, so by inspection the cells are unchanged except `variant`.
- Tile draw calls: A takes away the `Straight_01` mesh and H adds a `Sidewalk_01` mesh (for the drives) in `tileGroup`, so the total is flat, not grown.
- No test compares against the pre-branch city. Both "changes no city data" tests compare the branch's city with itself (Must fix 2).

**D18: met.**
- `INTERIOR_KEYS.strip`, `.apron`, `.path` and `.parkEdge` are `[SM_Env_Sidewalk_01]`, and `PASSAGE_FLOOR_KEYS = INTERIOR_KEYS.strip`.
- `passageFloorCells` is correct. Whole cells run from the low corner. One part strip runs along +x over the full depth, and one along +z under the whole cells only. They cover the rectangle exactly, with no overlap. When no whole cell fits, the whole rectangle is a single part. It is tested for area equality and for whole cells lying inside the floor (`tileslots.test.ts`), and for draw placement and level (`tileinterior.test.ts` "lays one slab for each whole 5 m...").
- G3 (`frontage.ts`) still fills each floor's full rectangle from `city.passages`. The drawing covers exactly that rectangle (slabs plus code quads), so G3 credits only floor that is drawn. `frontage.ts` is untouched.

**D19: met.**
- `TILE_BASE_M[Sidewalk_01] = -0.01` is pinned and re-measured within 0.01 m in an `it.skipIf`.
- My own histogram of the up-facing area agrees: most of it sits at 0.004 to 0.012 m, and the mesh's maximum is 0.034 m. Every paved surface (strip, apron, path, park edge, inlet item, passage slab, drive `lotSurface`) is placed through `tileLevelY_m` at ground level with that base, so it stands at -0.01 m. Its top lands within about 1 cm of the walk at 0, and of `Straight_02`'s walk (0.23 to 0.24 m on a -0.23 m origin). Nothing floats or sinks visibly.
- The GLB nodes carry no transforms, so the test's local-space reading is valid.

**D20: partly met.** The "nothing more than 0.02 m below its top over 0.1 m²" half is there, and it bites: `Panel_02` is asserted to be over 0.1 m². The "samples only the slab and joint colours" half is missing (Must fix 1).

**D21: met in substance.**
- `TileCity` JSON is unchanged after drawing.
- The interior calls can only fall: one key replaces `Panel_02`, and the code-pavement mesh now holds only the part-cell floors.
- No test pins "at or under today's" (Could improve 3).

**H42, H42a, H43: met.**
- `inletCells` returns every street court's `drive` pair (alley courts excluded) and, for each alley block, the first and last lane cell (`b.j0` and `b.j1 - 1`, or `b.i0` and `b.i1 - 1`). Those are the ring-1 mouth cells, because the lane is emitted edge to edge of the block (`tilecity.ts` 1561).
- Frontage lots have no `TileCourt`, so they never appear.
- Stall rows and the aisle are never included. Test: "leave a court's stalls and aisle, and an alley block's own court...".
- On the default city I count 12 drive cells and 10 mouth cells. No mouth cell coincides with a street-layer cell.
- Each cell is drawn once:
  - A drive cell is a `lotSurface` cell. `tileGroup` draws it with the slab when the slab is active (`tileKeyOf(..., paved)`), and falls back to `Road_Bare_01` when it is not. `interiorItems` still skips it because it is in the `street` set.
  - A mouth cell's kind changes from `bare` to `inlet`. It is not drawn as both.
- Kerb cuts are unchanged (test "keeps the kerb cut").
- `courtLotPieces` and G4 are untouched.

**The alley court's own drive left bare: I agree with the builder.**
- That drive sits beside the lane, opens onto the lane (bare road), and passes through no terrace row. The alley side of a part is a rear, not a row.
- The ticket scopes H to `TileCourt.drive, ring 1` and to the alley's ring-1 mouth. Q-H's recommendation is "only the inlet through the row".
- Josh's words are about "an inlet to areas between buildings". The inlet into that area is the alley mouth, and the mouth is paved.
- Paving the alley court's drive would make an island of slab between the bare lane and the bare stalls. If Josh disagrees on the screenshot (criterion 44), it is a one-line change in `inletCells`.

**Guide (criterion 45): met.**
- Josh's three sentences are Decided lines in chapter 10, verbatim and drift-tested.
- 19.8's "always code-drawn" line is replaced.
- The "two plain straights" line is closed.
- Numbers rows exist for `PAVEMENT_GRATE` and `GRATE_ONE_IN`.

**Hard rules and CI.**
- Only `src/render3d/` and `docs/city-style-guide.md` are touched.
- `townpin` and `packpin` are untouched.
- No threshold or check is loosened.
- GLB reads are lazy, inside `it.skipIf`. Paths use `join("assets", ...)`, with no Windows path. The only timeouts are 120 s on the GLB tests. Building the cities at describe level is computation, not an asset read.

**The edited existing tests.** Each of the roughly 11 edits follows a behaviour the ticket asked for, and none hides a defect:
- the slot lists (`Straight_01` removed, `Panel_02` changed to `Sidewalk_01`);
- the 0.07 to 0.01 base;
- `buildout = pavement.slice(0, 1)`;
- the sheet label and the label count of 2 to 1;
- the build-out variant set {0, 1} to {0};
- the pavement variant range;
- the fallback test retargeted from "second straight absent" to "grate absent" (it still tests in-role fallback);
- the bare-road count minus the drives, with the slab count asserted alongside;
- the strip now drawn from the pack (`codeDrawn` from `strips` to 0);
- the passage-floor quad count (`strips + 2` to 2, since the 3.7 m floors are part cells);
- the code-pavement counts gaining `inlet`.

Several of these are tighter than before, for example the variant set and the extra slab-count assertion in `tileintegrate`.

**The slow test ("on the grid (criterion 1)").**
- Its first case pays for building 80 memoised cities (4 sizes x 20 seeds, up to 6 x 6).
- Run alone with one worker on an idle machine: 3.01 s on the branch, 2.91 s on `ab9d01f` (`D:\rest-prototype-goal`). That is noise.
- The branch makes city generation slightly cheaper, with one hash fewer per build-out. It did not make the test slower.
- The flake risk existed before this branch: about 60% of Vitest's 5 s default, so a loaded or 2-vCPU CI runner can cross it (Could improve 6).

## Rule conflicts and risks
- No hard-rule break found. Nothing under `src/grid/`, `src/night/`, `src/core/`, `puzzles/`, `tools/` or `assets/` is touched, and there is no new dependency.
- `tileintegrate.test.ts` was edited for H (the bare-road count). H's file list does not name it, and A's allows only `Straight_01` / `PAVEMENT_STRAIGHT_2` assertions there. The edit was forced by the behaviour change and is correct, so I note it rather than block on it.
- The guide's 063 H Decided line ends: "Josh also decided the open questions by the architect's recommendations: the 1-in-6 grates stay, and only the inlet through the row is paved". The line gives no words of his for Q-A and Q-H, and the ticket still lists them as open. If he said it, quote him. If not, those two clauses are Defaults (Could improve 1).
- Passage floors: `PASSAGE_W_M` is 1.0 to 5.3 m, so nearly every real passage floor is narrower than one cell. It is then drawn entirely as the code quad in `PAVEMENT` colour, the near-white the ticket set out to remove. The builder did what criterion 18 says ("a part cell keeps the code quad"), so this is the ticket's gap, not the builder's. Expect the main session's screenshot to still show pale passage floors (Could improve 2).

## Must fix
1. **The texel-colour guarantees (criteria 3, second bullet, and 20, first half) are not implemented.**
   - Add to the `it.skipIf(!haveGlb)` block in `src/render3d/tileslots.test.ts` a check that decodes the embedded `PolygonCity_Texture` atlas with `node:zlib`, with no new dependency.
   - For criterion 3: sample the largest walking-level faces of `Straight_02`, `Grate_01`, `Dip_01` and `Dip_Corner_01` at their UVs, and assert they are the same slab texel (today `#8c8987`).
   - For criterion 20: assert that every up-facing face of every interior paving key samples only the slab and joint colours (`#8c8987` and `#7b7b79`), and show that `Panel_02` fails (its plates sample `#4a5d4e` and `#5f686e`).
   - Effect: "one colour" and "interior paving matches the street" are proven against the pack, not only asserted through the choice of key.
2. **The fixtures that the criteria say must fail are missing or empty.**
   - Criterion 2 (`tilecity3d.test.ts`): run the same resolution check on a copy of a city whose pavement and build-out variants follow the old rule, `(hashOf(seed, "pave", i, j) >>> 8) & 1` with grates at 2, using the old three-key slots. Expect a non-empty `bad`.
   - Criterion 3 (`tileslots.test.ts` GLB test): assert that the same BLEND scan reports `SM_Env_Sidewalk_Straight_01`.
   - Criterion 4: pin a digest of the default city and seeds 1 to 3 (cells with `variant` stripped, plus `interior`, `courts` and bays), taken at `ab9d01f`, and assert the branch matches it.
   - The present "fails a fixture of the slots as they were" test only asserts its own helper's output and can be replaced by the criterion 2 fixture.
   - Effect: each check is shown to bite on the bug it guards.

## Could improve
1. `docs/city-style-guide.md` 063 H line: quote Josh's words for Q-A and Q-H, or move "the grates stay" and "only the inlet through the row" into a Default line.
2. Passage floors narrower than 5 m (most of them) stay pale `PAVEMENT` quads. Put this to the main session and Josh with the criterion 22 screenshot. Two options, for a re-cut rather than this branch:
   - colour the code quad as the slab (`#8c8987` under the same light);
   - lay one whole slab centred on the floor, letting it run under the walls either side, as 19.1 allows.
3. Criterion 21: add a test that the interior draw calls on the default city with the full pack are at or under the count at `ab9d01f` (pin the number).
4. `inletCells` pushes only `al.at` for a mouth, which is correct only while `ALLEY_CELLS === 1`. Loop over `ALLEY_CELLS`, or assert the assumption in a test.
5. The BLEND test could also cover `TILE_TREES` and `TILE_PROPS`, so its title ("every key the tiles and the interiors load") is literally true. They are opaque today.
6. A separate small ticket for `tilecity.test.ts` "on the grid (criterion 1)": warm the 80-city memo in a `beforeAll` with an explicit timeout (or give that case one), so CI does not flake. This branch did not cause it and should not touch it.
7. Outside this ticket: `furniture.ts`'s `PLAZA_PANEL` is still `Sidewalk_Panel_02`, so plazas dressed by the furniture layout may still show the plates Josh asked about. If he sees them, cut it as a follow-up.
