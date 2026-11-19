ticket: 063f-kerbs
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section F of ticket 063: one continuous kerb line per street side. It runs along the pavement band, steps out round build-outs, and turns in at every inlet (a return on each side, the opening, the dipped mouth between them), following Josh's worked example. The pack pieces and code strips must sit on that line within `KERB_TOL_M`, with the trench in front of build-outs and the open flank ends fixed, and the code fallback must sit on the same inset line.

## Does the branch do it?
I reviewed `git diff f4a728f 86e7b60`. The gate is green on the head. I ran the real-GLB tests in `D:\rest-prototype-063f`: `kerbline.test.ts`, `tileslots.test.ts` and `tilecity3d.test.ts` give 125 passed, and both new `it.skipIf(!haveGlb)` tests in `tileslots.test.ts` really ran (verbose output).

- **33, the line, pure.** `kerbLine` in `src/render3d/kerbline.ts` builds one path per run of pavement/kerb-cut cells in each street's first and last band, and each path ends where the run meets a crossing or junction. Edges run at the carriageway edge `E0`. A build-out moves the edge to `E1`, and a `flank` segment is emitted wherever the edge's offset changes. The cell-based tests in `kerbline.test.ts` check this against the cell grid, not against the function's own output:
  - "has one path per stretch" counts the stretches from the cells;
  - "steps out round every build-out stretch" checks a flank at every build-out end found from the cells;
  - the dip count equals the number of `kerbCut` cells.
- **34, pieces on the line.**
  - `KERB_FACES_M` in `tileslots.ts` gives `Straight_02` 0.66, `Grate_01` 0.65 and `Dip_01` 0.66, with `Dip_Corner_01` listed but never laid. The GLB re-measure test passes within 0.02 m. It also checks that no piece has a face on an unlisted side, which confirms the straight's open ends.
  - `tileKerbPlan` is pure and is the plan `tileGroup` actually draws from (`plan.kerb` → `kerbStrips(plan.kerb)`).
  - Coverage, the 0.05 m gap limit and lip height are checked by `problems()` on all 13 criterion cities, both with the full pack and with no pack.
- **35, the two jogs.**
  1. `PAVEMENT_FLUSH` cells resolve to `Sidewalk_01` at the apron level (`tileKeyOf`, `levelRole`), or to the code pavement box when the slab is absent. They bring no kerb face.
  2. Flanks are code strips (`#7b7b79`, top 0.30, 0.39 wide).
  - Both jogs fail as fixtures. "fails on today's plan" covers the trench ("is on no kerb line") and the missing returns ("a gap"), and "fails on a build-out with its flank removed" covers the open flank end.
- **36, fallback on the inset line.** `kerbStrips` now takes the plan, and fallback faces sit at `KERB_INSET_M`. The tilecity3d test checks each one at `TILE_M/2 - KERB_INSET_M` from its cell centre, which is an independent check. `Town.kerbs` and `TileStreet.carriage` are untouched (the digest proves it). `POLE_SLOT_FROM_KERB_M` stays 0.75 and is recorded as 0.09 m behind the face (the ticket says about 0.10).
- **37a, the path at an inlet.** Each inlet is built as near `return` (street to building line `Bl`), `opening` at `Bl`, then far `return`. The `dip` sits off the chain, and its ends are the two returns' `at` points. Tested by "goes round every inlet as Josh drew it" (more than 150 inlets) and "every one's returns reach the building line".
- **37b, the pieces.**
  - The mouth cells are still `Dip_01`.
  - Return cells are marked by `PAVEMENT_RETURN_NEAR/FAR` variant bits laid in `tilecity.ts` next to the kerb cut. `TILE_SLOTS` is unchanged and still exhaustive.
  - The builder measured `Dip_Corner_01`, found it unfit, and used the ticket's allowed fallback: the straight plus a squared code strip. This is reported in the guide and in a GLB test.
- **37c, the test.** The required city set (seeds 1 to 10 at 3 x 3, seeds 1 to 3 at 6 x 4) is checked for all of:
  - both returns on every inlet, counted from the cells;
  - faces on the line within tolerance;
  - each return reaching the cell's back edge, computed from `z_m`/`centre_m`;
  - the dip meeting both returns.

  The old layout (`asBefore`) fails, and so does an inlet with one return removed.
- **37, 37d.** Main-session screenshots. Not mine to judge.
- **45, guide.** Chapters 10 and 19.8 have the Decided/Info/Default lines, and the Numbers rows cover every new constant. One existing line was damaged (Could improve 1).

**Your question 1 (is the path continuous, do the tests bite, is the check circular).**
- The chain-continuity test checks that every segment starts where the previous one ended and that all segments are axis-aligned.
- The plan check is partly circular: `expectedLines` and `tileKerbPlan` both derive from `kerbLine`'s segments shifted by `KERB_INSET_M`. On its own it proves only three things:
  - the per-key insets agree with the common inset;
  - the variant bits gate the returns and flush cells correctly;
  - the drawn faces carry no stray kerb.
- What keeps it from being trivial is the cell-based tests above, the cell-centre test in tilecity3d, and the GLB inset measurement. Together these pin the line itself.
- The two required fixtures both bite: no returns gives a gap, and removing one far return gives "return" problems only.

**Your question 2 (rounded vs squared).** I checked the GLB myself with a standalone parser of `city-pack.glb`.
- `Dip_Corner_01` has only two full-height (0 to 0.30 m) vertical face groups: +x at x 1.83 to 1.88 over about 1.0 m, and +z at z about 1.8 over about 1.0 m. There is no full-height face at any intermediate normal, and the top heights between the legs fall through 0.14 and 0.09, which is a ramp.
- So the builder's "about 1.1 m per leg, the rest a ramp" is right (I get about 1.0 m), and the piece cannot carry a rounded return. 37b allows "the measured straight plus a code-drawn return strip ... rounded by the piece's radius or squared", so the squared fallback is allowed.
- In principle the strip is coherent: the same lip top (0.30) and width (0.39) as `Straight_02`'s lip, in the sampled lip colour. Two things to check on screen are in Could improve 3 and 4.
- Squared differs from Josh's rounded drawing. That is his call at 37d.

**Your question 3 (digest re-pin).** I verified this rather than trusting it.
- I extracted `ab9d01f`'s `src/` to the scratchpad, ran the branch's exact `digestOf` on it (grate = 2), and got all four pinned digests byte for byte.
- The fold to "kerb" is computed from roles and positions only, never from variants. It hides only the grate/plain distinction on cells F deliberately overrides; roles, positions, yaws, streets, bays, slots, courts and the rest still hash.
- The "bites" test still checks that changing a build-out's role, swapping a court drive or moving a grate changes the digest. The pin is sound and honest.

**Your question 4 (edits to existing tests).**
- `tilecity3d.test.ts`: the old kerb-strip test is replaced because `kerbStrips` changed signature, which F owns. The draw-call pin goes from 16 to 17 for the new mesh; the cap stays 40. The 063 A and H counts are re-counted exactly to include flush cells, and flush cells get their own exact test (`[TILE_SLOTS.apron[0]]`, n > 100). No count is loosened.
- `tilecity.test.ts`: the variant sanity check is widened to "grate alone or plain with kerb bits, < 16". The new describe pins every bit exactly (near, far and flush each against a cell-computed expectation), so overall this is tighter.
- `tileintegrate.test.ts`: a one-line exact recount, apron = drives + flush cells. It is legitimate and not loosened, but the file is outside F's Files list (Could improve 2).

**Your question 5 (kerb cut beside a junction corner).** It does not happen in practice.
- I generated 200 cities (3x3, 4x4, 6x4, 5x3 and 2x2, seeds 1 to 40 each). No kerb-cut cell has a non-pavement, non-kerbCut neighbour along its street, and no `return` segment has `cell === null`.
- If it did happen on a tested seed, "lays a return on both sides" would fail (it asserts both neighbours are pavement), and so would the coverage check, because the path still has the return segment while the plan has no face.
- So the gap is not hidden. In code, though, `tileKerbPlan` would skip it silently (Could improve 5).
- In 5,986 of those cases the return cell is also flush (a build-out in front). These are handled: the return runs 10 m from the build-out's outer kerb to the building line, and the length test accepts 5 or 10 m.

**Your question 6 (hard rules, CI-safety, draw calls).**
- Nothing in `src/grid`, `src/night`, `src/core` or `package.json` changed, and there is no new dependency.
- GLB reads are lazy inside `it.skipIf(!haveGlb)`, with 120 s timeouts and no Windows paths.
- `kerbline.test.ts` reads its own source file at describe level (`"src/render3d/kerbline.ts"`). That is not an asset and is present on CI (Could improve 7).
- `tile:kerb-strips` is one InstancedMesh, counted in `codeKinds` under `TILE_DRAW_CALLS_MAX` (40). The full pack goes from 16 to 17 draw calls.

## Rule conflicts and risks
- No GDD Decided rule is changed. Purity of grid/night is not touched.
- Files: `tileintegrate.test.ts` is edited, but it is not in F's Files list. It is the same folder and an exact recount; the main session should name it.
- `docs/city-style-guide.md` chapter 10: the existing "**Pending (042 C, gated on Josh's converted road pack)**" bullet lost its label. It is now a dangling line starting with `: the road, junction, kerb and pavement slots...`.
- The squared returns differ from Josh's drawing (rounded). The ticket allows it and the builder reported it, but it should be put to Josh at 37d.
- Marked cells (returns and flush cells) can no longer be grates, so there are slightly fewer grates. This is reported in the guide.

## Must fix
none

## Could improve
1. `docs/city-style-guide.md`, chapter 10: restore the `- **Pending (042 C, gated on Josh's converted road pack)**` label on the line now starting with `: the road, junction, kerb and pavement slots in MODEL_TABLE...`. The edit swallowed it when the F bullets were inserted.
2. `src/render3d/tileintegrate.test.ts` is outside F's Files list. The change is needed (an exact recount) and is not a loosening, but the main session should name it when checking the diff against Files, or the ticket should list it.
3. `tilecity3d.ts`: the kerb strip's material is no longer registered with `addSurface(surfaces, "kerb", …)`, so the strip keeps `#7b7b79` in every light mode. The old code-kerb mesh took the 060 day/night surface colour. Check it in the `&light=day` and night screenshots; if it stands out next to the code pavement boxes at night, register it.
4. Return strip, for the 37d screenshot:
   - on the mouth side it is a 0.07 m ridge across the walk (the guide says so);
   - at the street corner its 0.30 m top is coplanar with `Straight_02`'s lip over a 0.39 x 0.39 m square, so watch for z-fighting.

   If either reads badly, the strip could stop at the pack lip's back edge.
5. `kerbline.ts` `tileKerbPlan`: `if (c === null || c.role !== "pavement") continue;` drops a return silently. Since no generated city has this case, a comment, or a dev-time warning, would keep a future layout change from losing a return unnoticed on seeds the tests do not cover.
6. Test nits, all in tests:
   - in `tilecity3d.test.ts`, `expect(own.length).toBeGreaterThanOrEqual(want - 0)` is redundant with the next line;
   - "fails on an inlet with one return removed" removes only a far return, and a near one would cost one more line;
   - a one-line comment in `kerbline.test.ts` saying that the plan check is relative to `kerbLine`, and that the cell-based tests pin the line, would help the next reader.
7. `kerbline.test.ts`: move the describe-level `readFileSync("src/render3d/kerbline.ts")` inside its `it`, to match the ticket's lazy-read convention. It is harmless on CI.
