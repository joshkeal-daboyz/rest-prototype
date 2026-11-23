ticket: 063a-pavement
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Sections A, D and H of ticket 063. A: every plain pavement and build-out cell is the one opaque `Sidewalk_Straight_02`. D: the interior paving is the plain `Sidewalk_01`. H: court drives and alley mouths are paved with it. Each comes with GLB checks that guarantee "one colour" and "no plates", and with fixtures that fail on the old rule. In this second round I checked round 1's two must-fixes and the new `PAVING_SLAB_COLOUR` change in `git diff 9f394df d9296eb`, and re-judged against `ab9d01f` only where the fix touches.

I ran the GLB tests in `D:\rest-prototype-063a` (same commit `d9296eb`, GLB present): `tileslots.test.ts` 36 passed, `tilecity3d.test.ts` 67 passed. The verbose run shows the three 063 `it.skipIf` cases really ran there, not skipped. I also checked the claims myself with my own scratch decoder and digest runner (in the scratchpad, not the repo).

## Does the branch do it?
**Round 1 must-fix 1, the texel-colour checks (criteria 3 and 20): fixed, and the checks are real.**
- `tileslots.test.ts` now decodes the embedded atlas PNG with `node:zlib` (`decodePng`, all five filter types, 8-bit and non-interlaced only, otherwise it throws). It reads `TEXCOORD_0`, follows material → `baseColorTexture` → texture → image → bufferView, and samples each up-facing triangle's colour at its centroid UV.
  - The UV orientation is glTF's (v down from the top row, no flip), which is correct.
  - I confirmed it bites on orientation: with my own decoder, flipping v gives `#919191` on every piece instead of `#8c8987`, so a wrong mapping would fail the test.
- **Criterion 3, second bullet.** `walkColour` takes the colour with the most up-facing area in the 0.20 to 0.26 m walk band, for `Straight_02`, `Grate_01`, `Dip_01` and `Dip_Corner_01`. Each is asserted `#8c8987`.
  - My measurements in the walk band: `Straight_02` 18.6 m², `Grate_01` 14.9, `Dip_01` 16.9, `Dip_Corner_01` 10.9 m² of `#8c8987`. In each piece the next colour has far less area.
  - It would fail on a slab of another colour. `Sidewalk_01`'s top is checked the same way, with a 0 to 0.04 m band, and the test also ties `PAVING_SLAB_COLOUR` to the sampled hex.
- **Criterion 20, first half.** `otherColourArea(ps, [slab, joint]) <= 0.1` runs on every apron, path, park-edge and strip key, and `Panel_02` is asserted over 0.1.
  - Measured: `Sidewalk_01` is 23.3 m² of `#8c8987` and 1.55 m² of `#7b7b79`, with **zero** area of any other colour. So the 0.1 m² allowance hides nothing today.
  - `Panel_02` has 3.84 m² of `#4a5d4e`, 0.80 of `#5f686e` and 0.27 of `#425345`, so the bite is strong.
  - A material with no texture returns "" and counts as "other", so it would fail rather than pass.

**Round 1 must-fix 2, fixtures that should fail: fixed.**
- **Criterion 2** (`tilecity3d.test.ts` "is one piece for the plain cells on the real rule, and a fixture of today's variant rule fails the same check").
  - The real rule passes `plainKeysDrawn`, through `tileKeyOf` with every key active, as `[Straight_02]`.
  - The same function, given the old three-key slots and the old variant shape (bit 8 picks the straight, grate on one cell in six at variant 2), returns two keys, including `Straight_01`.
  - The fixture's hash is a stand-in (`(i*73856093) ^ (j*19349663)`), not ab9d01f's `hashOf(seed, "pave", i, j)`. The outcome only needs both bit values to appear, so the fixture is sound but not literally today's hash (Could improve 2).
- **Criterion 3, the BLEND scan.** It now covers `tileKeys()`, `INTERIOR_KEYS`, `TILE_TREES` and `TILE_PROPS` (round 1's could-improve 5 too). It asserts the scan returns `[]`, and that the same `blendKeys` on `[Straight_01, Straight_02, Grate_01]` returns exactly `[Straight_01]`. That is the bite asked for.
- **Criterion 4, the digests** (`tilecity.test.ts` "nothing else moves ...: the layout is the layout at ab9d01f"). I ran the test's digest function myself on `D:\rest-prototype-goal` (HEAD `ab9d01f`, clean) with grate = 2, and on the branch with grate = 1. All four digests match the pinned values exactly (3x3 seeds 1, 2, 3 and 6x4 seed 1). The pins are real, not self-generated on the branch.
  - The digest normalises only the pavement and build-out variant, to "grate" or "plain". So a grate moving to another cell, a role change or a court change all fail, and the "bites" test shows three such mutations plus the wrong grate number.
  - Could the digest function and the layout be edited together to stay green? Only by re-pinning, which any pin allows. The function lives in the test, and its pinned values verifiably come from `ab9d01f`, so a silent change now shows in the diff.
  - Coverage: it digests cells, streets, bays, lotStalls, buildoutTrees, poleSlots, interior, courts, frontLots, parts, alleyBins and blocks. Of `TileCity`'s fields it leaves out `passages`, `greenProps` and `town`. 063 A, D and H should change none of them, and they derive from the digested data, but including them would make "nothing else moves" literal (Could improve 3).
- The old self-referential "fails a fixture of the slots as they were" test is gone. The two "changes no city data" tests are renamed honestly to "does not mutate the city", and point at the pinned digests.

**The new change: `PAVING_SLAB_COLOUR = 0x8c8987` for the code-drawn interior pavement, out of the light rig's `pavement` key.**
- `interiorGroup` now colours `interior:code-pavement` `PAVING_SLAB_COLOUR` and no longer calls `addSurface(surfaces, "pavement", ...)`. `syncTileSurfaces` still merges the tiles' `pavement` materials, so the key stays when the tiles have a code pavement, and is deleted cleanly when neither draw has one.
- The test checks the hex, checks it is not the day grey, and checks it is the same after night and then day modes.
- **Consistency with the textured slab (the question asked).** This is only partly true.
  - The rig does not recolour pack materials, and the quad no longer gets recoloured either. So both keep their base colour in both modes, and the old near-white day quad (`0xa7abb1`) is gone. That is a real improvement for the passage floors (round 1's could-improve 2).
  - But the pack's paving materials are not metalness 0. The GLB gives `Sidewalk_01` (`blinn283.115`), `Straight_02` (`blinn283.125`) and the other sidewalk pieces `metallicFactor 0.5` and `roughnessFactor 0.817`, and `models3d.ts` leaves them as loaded. The scene has no environment map (no `scene.environment`, no PMREM).
  - So the textured slab's diffuse term is base × 0.5, while the code quad (`roughness: 1`, metalness 0) takes the full diffuse of the same base colour.
  - In the same light, expect the code-drawn passage floors to read noticeably lighter than the `Sidewalk_01` slabs beside them. The gap is smaller than before, but they are not the same shade.
  - The comments in the code and in guide 19.8 say "reads the same as one laid from the slab", and that is not yet true (Could improve 1). Criterion 18 asks only that a part cell keeps the code quad, so this is not an unmet criterion. It should be looked for in the criterion 22 screenshot.
- **Without the pack** (CI, fresh checkout), the street band's code pavement is still rig-coloured, `0xa7abb1` by day, and the interior's code pavement is now `0x8c8987`. So in fallback mode the two code pavements differ by day. That is fallback-only and cosmetic (Could improve 4).
- The deleted assertion in `tileinterior.test.ts` ("The pavement key is the tiles' and the interiors' materials together", `>= 1`) would still pass from the tiles' code pavement under `useTiles(new Map(), new Map())`. Removing it follows the change in meaning, but the half that still holds could have stayed (Could improve 5). It is not a threshold, so I do not count it as a loosened check.

**Guide (criterion 45).**
- The 063 H Decided line now quotes only Josh's sentence.
- The grates and inlet-only choices moved to a new **Default** line, which says Josh did not answer them in words and quotes his waiver. That is honest, and it resolves round 1's could-improve 1.
- Each Decided line for A, D and H opens with Josh's quote. One leftover from round 1 that I did not raise then: the D line carries the architect's finding after the quote ("service covers the pack drew, not tree plots"). It is not a ruling, but it is not presented as Josh's words either.
- `PAVING_SLAB_COLOUR` has a Numbers row, and the gate's drift check passes.

**Other fix-round edits.**
- `inletCells` now loops over `ALLEY_CELLS` (round 1's could-improve 4), and its test expects `2 * ALLEY_CELLS * alleys`.
  - This agrees with `parts` (`at + ALLEY_CELLS`), but the lane emitter (`tilecity.ts` 1561) still lays only column `al.at`. So above 1 the mouths would name cells that are not lane cells, and the test's "every mouth cell is an alley lane cell" would catch it.
  - It is harmless while `ALLEY_CELLS === 1`.
- `tilecity.test.ts` "on the grid (criterion 1)" got a 60 s per-test limit. Round 1 suggested leaving it to a separate ticket. It is in an allowed file, it is a time limit rather than a check threshold, and it is CI-safe (well over 1 s), so I accept it.

**A, D and H as a whole.** Nothing outside the fix changed my round-1 findings. A1, A2, A3, A4, D18, D19, D20, D21 and H42/42a/43 are now all met, with tests that bite. Criteria 5, 22 and 44 are the main session's screenshots.

## Rule conflicts and risks
- No hard-rule break. The diff touches only `src/render3d/` (`tilecity3d.ts`, `tileslots.ts` and four test files) and `docs/city-style-guide.md`. No `src/grid/`, `src/night/`, `src/core/`, `puzzles/`, `tools/` or `assets/` change, and no new dependency (`node:zlib` and `node:crypto` are built in).
- CI-safe: the GLB and its atlas are read lazily inside `it.skipIf(!haveGlb)`, paths use `join`, and the PNGs are decoded once per image inside the test. The digests are pure computation.
- No existing check is loosened. The only removed assertion is described above.
- Risk: the "same shade" claim for the code-drawn passage floors is not met because of the metalness mismatch. Watch for a lighter passage floor beside the slabs in the criterion 22 screenshot.

## Must fix
none

## Could improve
1. **`tilecity3d.ts` `interiorGroup` code pavement.** Match the pack slab's shading, not only its colour.
   - Give the quad the slab material's `metalness: 0.5, roughness: 0.817`, typed in, pinned beside `PAVING_SLAB_COLOUR`, and re-measured from the GLB in the existing `it.skipIf`.
   - Or, when `Sidewalk_01` is loaded, reuse the slab's own material for the part-cell quads, with the texture's slab texel.
   - Then the guide's "reads the same" in 19.8 and the comment in `tileslots.ts` would be true. Otherwise, soften those two sentences.
2. **The criterion 2 fixture's hash** (`tilecity3d.test.ts` `oldVariant`) is a stand-in. Use the real `hashOf(seed, "pave", i, j)` (export it from `tilecity.ts`, or copy the 5-line function into the test) and the real `GRATE_ONE_IN`, so the fixture is literally ab9d01f's rule.
3. **The ab9d01f digest** could also cover `passages` (via `withPassages`), `greenProps` and `town`, so that "nothing else moves" is complete. The re-pin would have to be done again on `ab9d01f`, as before.
4. **No-pack fallback.** The tiles' code pavement (rig-coloured) and the interior's (slab-coloured) now differ by day. Either move the tiles' code pavement to `PAVING_SLAB_COLOUR` too (that is 063 F's file and scope, so note it there), or accept it as fallback-only.
5. **`tileinterior.test.ts`.** Keep the half of the removed assertion that still holds: the scene's `pavement` light key is the tiles' code pavement when the tiles have one.
6. **`inletCells`' `ALLEY_CELLS` loop.** It agrees with `parts` but not with the lane emitter at `tilecity.ts` 1561, which lays one column. Leave the loop, but a one-line note that the emitter must widen with it would save a later surprise.
