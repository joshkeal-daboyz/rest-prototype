# 067 · Party walls dressed above a lower roof (M7, the pipe lift) and strips between a street and a lane (C3)

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open. Cut from 063 section C on 19 Nov 2026, re-cut on `docs/city-grammar.md` (rules 4, 8 and 12).
- Q3 is Decided by Josh.
- Q6 (strips) takes the grammar's recommendation under his goal waiver.

The main session records the start.
branch: `ticket/067a-party-walls`, `ticket/067b-strips`

## Josh's words (19 Nov 2026, in chat)
> "This doesn't mean the buildings need to be the same height."

> "Notice how the backs of buildings are also butted up against the backs of other buildings Also intentional. Without this you end up with featurless walls."

> On the grammar's Q3, the wall above a lower neighbour's roof: "Dress it, lift the pipes (Recommended)". **Decided:** the pipe runs (`SM_Prop_Pipe_Present_*`) leave `CITY_NEVER_USED` for party walls only.

> On Q6 (strips, a 10 m deep part cut off a block by a lane, two rows back to back) he gave no answer of his own. It takes the recommendation under his goal waiver: "I don't want to constantly approve all of these improvments."

Law that holds: 16.11, Decided: a fire escape needs a window to step out of, so none stands on a party wall.

## Checks this ticket builds (grammar)
- **Section A:** M7, no bare party wall, in full. This is 063 C's former `blankFaces`, defined on storey faces.
- **Section B:** M3 and M4 extended to strips.

## Section A. Party walls above a lower roof (Vitest unless marked)
1. [ ] **The faces.** New `partyWalls(city, packed)` (in `src/render3d/backs.ts`) lists every column side that is a party wall and shows above its neighbour's roof. Each is one storey face, 5 m wide by `STOREY_M`, from the lower roof up to the taller building's roof. Heights stay free (R2 unchanged).
2. [ ] **The kit.** `dressing.ts` places on each such storey face at least one piece of the party-wall kit, by hash, with no key twice running along a row:
   - `SM_Prop_Billboard_Sign_01` to `_07` (4.19 by 2.03 m): one per storey face, with 0.4 m margins;
   - `SM_Prop_Pipe_Present_01` and `_03` (one or two storeys). `_02` stands 3.17 m off the wall and is not used;
   - `SM_Prop_Window_01` (1.30 by 2.31 m): two to a storey face.
   - Each lies on the face: its back on the wall plane plus `DRESS_NUDGE_M`, and never past the roof's cornice.
   - No fire escape stands on a party wall.
3. [ ] **The pipe lift** (`citymetrics.ts`, an authorised exception: the never-used rule for one prefix only).
   - `SM_Prop_Pipe_Present_*` is allowed on a party-wall placement (its slot is "partyWall") and stays forbidden everywhere else.
   - The never-used check still fails on a pipe placed on a street face, as a fixture.
4. [ ] **M7** (`blankFaces(city, packed, dressing)` in `backs.ts`, pure). On the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4, each storey face of `partyWalls` carries a kit piece lying on it, and its widest bare stretch is at most `BLANK_RUN_MAX_M`.
   - `BLANK_RUN_MAX_M` is 3 m, provisional. The builder measures the apartment fronts' window pitch in an `it.skipIf` and sets it to that pitch plus 0.5 m, reporting the value.
   - A party wall with an open cell beside it is M3's failure, not this check's.
   - **Failing fixture:** 066's city with no kit pieces. Every height step between two row neighbours is bare.
5. [ ] **Draw calls.** The kit adds one InstancedMesh per key and sub-mesh, under the dressing's cap (`FURN_DRAW_CALLS_MAX` or its own). No cap is raised, and the builder reports the count.

## Section B. Strips (Vitest unless marked)
6. [ ] **Laying strips.** An alley may cut a block so that one part has a short side of exactly 2 cells: a strip, two rows back to back, each facing its own edge, the street and the lane, with no interior.
   - The lane is placed by hash among the positions that leave each part 2 or 6 and more cells (065 criterion 4, widened).
   - A strip row is a street row on its street edge and a quiet row on its lane edge (rule 9).
   - Its four end columns are corner columns (rule 7).
7. [ ] **M3 and M4 on strips.**
   - Every strip cell has one open side, or two adjacent at its ends.
   - Every strip column has its back-to-back partner.
   - No part has a short side of 3 to 5 cells.
   - **Failing fixture:** a part 3 cells deep.
8. [ ] **The rates hold.** V1 to V4, P1 to P6, G1 to G4 and R1 to R13 hold, with no threshold changed.
   - The builder reports alleys, strips and parks before and after on the default city and seeds 1 to 10.
   - If 065 had to stop on V3, strips are the answer measured here.

**Both sections:**
9. [ ] **Guide.**
   - 16.6: the pipe runs' new line, with Josh's Q3 words as **Decided**.
   - 19.6: strips, marked adopted under the waiver.
   - 19.9: party walls.
   - Numbers rows and drift checks are updated, and no existing check is edited.
10. [ ] (Main session, screenshots, `&light=day`) a row with a height step shows a board, pipes or windows on the step, and no bare wall. A strip shows street fronts on one side and lane fronts on the other.
11. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) The gate, the playtest, the diff in Files, and `git ls-files assets/private` empty. The ladder pins are unchanged: the party-wall kit is the tile city's only, by its frontage input.

## Files
- **A:**
  - `src/render3d/dressing.ts`: the party-wall kit;
  - `src/render3d/backs.ts`: `partyWalls`, `blankFaces`;
  - `src/render3d/citymetrics.ts`: authorised exception, the pipe prefix's party-wall allowance only;
  - `src/render3d/models3d.ts`: passing the faces to the dressing;
  - tests: `dressing.test.ts`, `dressdraw.test.ts`, `backs.test.ts`, `citymetrics.test.ts`.
- **B:**
  - `src/render3d/tilecity.ts`: strip parts and lane placement;
  - `src/render3d/terrace.ts`: authorised exception, only if a strip row needs corner columns at both ends beyond 065's;
  - tests: `backs.test.ts`, `tilecity.test.ts`, `alleys.test.ts`, `parkmetrics.test.ts`, `frontage.test.ts` (re-measured numbers only).
- **Both:** `docs/city-style-guide.md`.
- **Must not touch:**
  - `town.ts`, `parkmetrics.ts`, `frontage.ts`, `sills.ts`, `escapes.ts`, `stacks.ts`;
  - `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`, `docs/city-grammar.md`.

## Dependencies
- **Needs:** 066 merged. A and B are independent of each other: A is dressing, B is layout.
- **Shared files:** `dressing.ts` with 066 and 068, and `tilecity.ts` with 065. One merge at a time.
- No new dependency.

## Interfaces
- `backs.ts`: `partyWalls(city, packed): readonly { run: string; column: number; side: "-x" | "+x"; from_m: number; to_m: number }[]` and `blankFaces(city, packed, dressing): readonly { face: string; from_m: number; to_m: number }[]`.
- `BLANK_RUN_MAX_M = 3` (provisional).
- The dressing slot `"partyWall"`.

## Open items
- Whether a painted board on most steps reads as too many adverts is for Josh's eye (grammar rule 8). Criterion 2's hash mix keeps boards to about a third of steps.
