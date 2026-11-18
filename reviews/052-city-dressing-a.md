ticket: 052-city-dressing-a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A only: a pure `src/render3d/dressing.ts` that gives every 050 recipe role its dressing slots and places glass, awnings, signs, an ATM, door canopies, fire escapes, wall props and roof props by hash, under the per-block, per-run and town caps. `dressing.test.ts` covers criteria 1 to 4 with typed-in fixtures, CI-safe. This is round 2. Round 1 raised one must-fix: the roof billboard's face stuck out past the `ROOF_EDGE_M` inset, and a test exemption hid it.

## Does the branch do it?
Round 2 scope: commit 4fc0822 touches only `dressing.ts` and `dressing.test.ts`. The branch diff is still those two files. I ran `src/render3d/dressing.test.ts` alone: 20 passed, up from 17. I relied on the main session's gate for the rest.

- **Round 1 must-fix (billboard face inside the roof inset): fixed.** I checked the arithmetic in the billboard branch of `dressing.ts` (around lines 516 to 538).
  - Let `fd = turned(fsize, yawOf(face)).d`. The structure is placed with `onRoof(..., { ...cell, front: cell.front - fd }, "front")`, so its front sits at `cell.front - fd`.
  - The face centre is at `structure.z + structure.d/2 + d/2`, where `d` comes from the same `turned(fsize, yaw)` and equals `fd`. Its front is therefore at `cell.front - fd + d = cell.front`, exactly on the inset (`cell.front = roof front - ROOF_EDGE_M`, from `roofCell`).
  - The structure's back stays inside `cell.back`, because `onRoof` rejects a structure deeper than the shrunk cell. Structure plus face therefore fits only when the roof cell is at least 1.611 + 0.118 m deep.
  - `fits` now also requires `faceP.z + d/2 <= cell.front + EPS`. A future `DRESS_NUDGE_M` entry for a face or structure can only drop the billboard, never push it out.
  - Variants: all seven `Billboard_Sign_0N` faces share one typed size (4.193 x 2.028 x 0.118) and are picked per lot, and `fd` is computed from whichever face is picked. When the face key is missing from entries, `fd` is 0 and `group` stays empty, so a lone structure is never placed.
  - In the roof test ("every roof prop's base is on the roof top..."), the `BILLBOARD_FACES` exemption on both z bounds is gone. The only billboard special case left is the y check: the face must be above the roof top rather than on it, which is correct because the face is raised by `BILLBOARD_SIGN_Y_M`. Despite the builder's note, the x bounds were never exempt and still apply to every piece.
  - No other exemption in the roof test hides an overhang. Wraps are exempt only in the front-face test (they are centred on their base), as in round 1.
  - The new test "a roof billboard's face ends on the roof inset, not past it" asserts `seen > 0`, so the sweep really produces billboards.
- **Per-lot kerb distance (round 1 could-improve 3): threaded and tested.**
  - `dressBlock` and `dressStack` take `kerbM = KERB_FROM_FRONT_M`, and `DressBlockInput.kerbM?` is passed by `dressTown`. An undefined value falls to the default.
  - Inside `dressBlock`, every kerb use now reads the local `kerb`: `onFace`'s default `reach` (so glass, signs, canopies, the ATM, wall props and escapes), `awnReach` for both straight and corner awnings, and the billboard `fits`. No bare `KERB_FROM_FRONT_M` is left in the body.
  - The test "dressStack takes the lot's own kerb distance" checks three things over 400 sweep lots. Passing the default explicitly deep-equals the old output. At 2.08 m no front piece (corner glass wraps excepted) reaches past 2.08. Fewer pieces are placed at the nearer kerb.
  - `dressTown`'s pass-through has no direct test (could-improve 1).
- **Fire-escape order (round 1 could-improve 4): added.** The new test checks four things over 50 large and tall blocks (`seen > 10`). The first piece is `ESCAPES[2]` (`_03`) at the first floor's y. Each piece's base is on the previous one's top. The middle pieces are `_02` and the last is `_01`. The top is not above the roof's base.
- **No-op removed** (`&& i >= 0` in `escQual`). **Departures documented** in the module header: the ATM by a residents' door, and the dropped "unless every block qualifies" clause (round 1 could-improve 1).
- **Criteria 1 to 4 otherwise:** the round 1 tests for keys, attachment sweep, overlaps, caps, run caps, `DRESS_MAX`, determinism and rates are unchanged and pass. Moving the billboard structure back 0.118 m changes geometry only. The large-prop choice, caps and hash inputs are untouched, so determinism holds. A billboard that no longer fits a shallow roof simply isn't placed, which is within the caps.
- **Criterion 13:** I can't tell from the branch, as in round 1.

## Rule conflicts and risks
- None new. Purity is unchanged: there are no new imports, and no DOM, timer or three.
- Round 1's risk about small roof props ignoring `hMax` still stands (could-improve 2 below). It is a look and occlusion issue for section B's ray test, not a section A criterion.

## Must fix
none

## Could improve
1. Add one `dressTown` case with `kerbM` set on a block, so the pass-through is pinned. Right now only `dressStack` is tested with a non-default kerb.
2. Carried from round 1: apply the `hMax` check to small roof props too (`onRoof(..., hMaxM)` instead of `Infinity`), or record why they are exempt.
3. Carried from round 1: run the "every shop with a _Glass gets it" test over corner variants too.
