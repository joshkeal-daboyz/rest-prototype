# 062 · Door sills, the gaps 055 F left: every building measured, mixed-sill terraces, and windows on single-material models

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: approved (G1, Josh, 18 Nov 2026, in chat, relayed by the main session: "Merge 055 F (Recommended)". With that answer he merged 055 F and chose this follow-up for its known gaps). Sections A, then B.
branch: `ticket/062a-every-sill`, `ticket/062b-mixed-sills`

## Where 055 F left it (from `reviews/055f-door-sills.md` and `sills.ts`/`sills.test.ts` at `1a356b9`)
- **22 placeable keys have no sill.** `DOOR_SILLS` has 41 entries. `UNSETTLED` (`sills.test.ts`) lists 22 keys, because no door floor starts within `SILL_DEPTH_M` (1 m) of the front face. They are drawn unchanged.

  | Pack | Keys | Why (depth to the first door floor) |
  | --- | --- | --- |
  | City Pack | `SM_Bld_Shop_06` | no upward floor at all: a flat front |
  | Town Pack | `SM_Bld_House_Preset_04` | 1.15 m threshold, 5.05 m back, in a deep porch |
  | Town Pack | `SM_Bld_House_Preset_10`, `_11` | 1.05 m threshold, 2.57 m back, in a recessed porch |
  | Town Pack | `SM_Bld_House_Preset_Garage_01` | the only threshold (1.05 m) is on the back, 8.17 m in; the front is the vehicle door |
  | SIMPLE Town | `Building_Shop_03/04/05` | 0.20 m, 2.29 m back |
  | SIMPLE Town | `Building_BaberShop` | 0.35 m, 1.32 m back |
  | SIMPLE Town | `Building_Gym` | 0.35 m, 2.45 m back |
  | SIMPLE Town | `store_small_mesh` | 0.20 m, 1.35 m back |
  | SIMPLE Town | `store_corner_mesh` | 0.20 m, 1.08 m back |
  | SIMPLE Town | `Building_Garage_01/02/03` | no floor within 14 m |
  | SIMPLE Town | `house_mesh` | 0.55 m, 9.28 m back; its steps are at the back |
  | SIMPLE Town | `Building_House_05` to `_08` | 0.35 m, 2.43 m back |
  | SIMPLE Town | `Building_PetrolStation` | 0.40 m, 18.37 m back |
  | SIMPLE Town | `Building_CoffeeShop` | 0.35 m, 3.49 m back |

  - **On all three protocol maps,** `Preset_10` and `Garage_01` keep a plinth of about 1.05 m, beside houses that now sink 1.05 to 1.17 m. So the garage stands about a metre higher than its neighbours.
  - The reviewer's re-measure with a 3 m search reads `Preset_10` at 1.05 m.
  - `Garage_01` has no front floor at all.
- **Mixed-sill stacks.** A stack sinks as one, by its largest ground-piece sill (`stackSill`), so its lower doors end up under the walk.
  - Every apartment style mixes `SHOPS`, `DOORS` and `SHOP_CORNERS`. Their sills are:
    - `Shop_01` 0.106, `Shop_02` 0.071, `Shop_03` 0.043, `Shop_04` 0.077, `Shop_05` **0.361**;
    - `Door_01` 0.029, `Door_02` **0.206**;
    - `Corner_01` 0.159, `Corner_02` **0.376**.
  - A block holding `Shop_05` or `Corner_02` sinks about 0.36 m, which leaves its `Shop_03` and `Door_01` doors 0.32 to 0.35 m under the walk. `Shop_01` beside `Shop_05` ends 0.255 m under.
  - That is the opposite of Josh's complaint, and likely on most terrace blocks.
  - The piece pitch (`stacks.ts`): the base pitch is 3.0 m for every ground piece, and the floors start at y = 3.0. The ground pieces stand 3.0 to 3.30 m high; the part above 3.0 m is signs and parapets, which already overlap the first floor's lower band.
- **Windows on single-material models.** SIMPLE Town and the City Pack have no glass material, so `window_m` is null, and these models sink by their whole sill with no window check.
  - `Building_House_01` to `_04` and `_012` to `_015` sink 1.035 to 1.053 m.
  - The reviewer found a 0.6 m porch step in front of `Building_House_01`'s 1.04 m floor that now ends up below ground.
- **Two edits 055 F made outside its Files list** (recorded here, as the reviewer asked; neither touches a must-not-touch file):
  1. `dressdraw.test.ts`: one assertion adds `frame.y`. The default table now sinks the blocks that test draws, so the old assertion could not pass. It is no weaker: `frame.y` is checked against `stackSill` in `sills.test.ts`.
  2. `docs/city-style-guide.md`: the "Decided, not yet built" bullet for 055 F became "built, now 16.10", as the new drift check requires (the same housekeeping 058 did).

## The rules (draft text for the guide's 16.10, extending 055 F's; B writes it)
- **Decided (Josh, 18 Nov 2026):**
  - "That's going to have to be a variable that we measure for each individual building." (055 F)
  - "Merge 055 F (Recommended)", choosing this follow-up.
- **Default (062): every placeable building has a sill.**
  - `SILL_DEPTH_BY_KEY` (a per-key search depth, each with its reason) extends the 1 m search for a key whose door floor stands back, up to `SILL_DEPTH_MAX_M` (4 m). This covers `Preset_10` and `_11` (2.57 m) and the SIMPLE Town shops, stores, houses 05 to 08, the gym and the coffee shop (1.08 to 3.49 m).
  - Beyond 4 m, or where there is no front floor, the sill is a **typed-in value with its reason**:
    - `Preset_04`: its 1.15 m threshold in the porch;
    - Town Pack `Garage_01`: 1.05 m, "sinks like its houses", the same level as the house thresholds.
  - Or the key goes in `NO_STREET_DOOR`, each with its reason (sill 0, drawn unchanged):
    - `Building_Garage_01/02/03`: vehicle bays at ground level;
    - `Building_PetrolStation`: a forecourt at ground level;
    - `house_mesh`: its door is at the back;
    - City Pack `Shop_06`: a flat front with no floor.
  - After A, `UNSETTLED` is empty.
- **Default: mixed-sill stacks get a per-piece lift.**
  - The stack sinks by its largest ground-piece sill, as today. Then each ground piece is **lifted** by (block sink − its own sill), so **every** door's sill meets the walk.
  - A lifted piece's bottom stays below the walk (at −its sill), so no gap opens under it.
  - Its top rises into the first floor's lower band by at most the lift. That is 0.33 m at most with today's pieces (`Door_01` in a `Corner_02` block).
  - A combination where a lifted piece's top (its height above 3.0 m plus the lift) would reach within 0.05 m of the first floor's measured window sill (058's `WINDOW_SILL_M`) is not allowed. The stack's ground-piece choice then keeps to one **sill band** of `SILL_BAND_M` (0.16 m): the low band holds `Shop_01` to `_04`, `Door_01` and `Corner_01`; the high band holds `Shop_05`, `Door_02` and `Corner_02`.
  - Each lifted piece's own dressing (shop glass at `GLASS_SILL_M`, awning, sign) moves up with it.
  - Considered and not chosen: sinking each column by its own sill with the floors above following. That breaks the terrace's level window rows and roof line by up to 0.35 m from column to column.
- **Default: windows on single-material models.** `window_m` is measured from geometry where there is no glass material: the lowest front-facing **recessed** face (at least 0.05 m behind the front plane, at least 0.3 m², above the door floor), which is a window's reveal.
  - Where none can be read, the key gets a typed-in `window_m` with its reason. Failing that, its sink is capped so that its lowest front step stays at or above the walk, and the rest is made up with steps (055 F's rule).
  - No sink may bury a window or a front step.

## Goal
On the tile city and the three protocol maps:
- every building's street door meets the walk, within 0.15 m above or 0.05 m below it, or has steps (055 F);
- no terrace has a shop door sunk below the pavement;
- no house has a buried window or front step;
- the plinths on the protocol maps' `Preset_10` and garage are gone.

## Sections
- **A. Every building measured** (about 1 day). `SILL_DEPTH_BY_KEY`, the typed values, `NO_STREET_DOOR`, the recessed-face `window_m`, and their tests. Needs nothing beyond `1a356b9`.
- **B. Mixed-sill stacks** (about 1 day). The per-piece lift, the sill band, the drawing in `models3d.ts`, the guide. Needs A.

## Acceptance criteria
**CI-safe:** typed-in fixtures only; real-geometry re-measures inside an `it.skipIf(!have)`; no Windows paths; no timer under 1 s.

### A (Vitest)
1. [ ] **Every key accounted for.** `sills.test.ts`'s "has an entry, or a reason it has none" becomes "every key the town can place on the ground is in `DOOR_SILLS` or in `NO_STREET_DOOR` (each with a reason), and never both". `UNSETTLED` is removed or empty.
   - Every `SILL_DEPTH_BY_KEY` entry has a depth of at most `SILL_DEPTH_MAX_M` and a reason.
   - Every typed-in sill has a reason string, and the test lists them.
2. [ ] **The new values.**
   - **Pinned:** `Preset_10` and `_11` read 1.05 m (±0.02 m) with a 3 m search. `Preset_04` and `Garage_01` carry their typed values and reasons.
   - **Measured:** each SIMPLE Town key with a per-key depth gets its re-measured sill, pinned as a typed-in fixture and re-measured within 0.02 m.
3. [ ] **Windows measured.** Every entry with `window_m` null at `1a356b9` either has a measured `window_m` (re-measured within 0.02 m) or a typed one with a reason, or is listed as having no front window.
   - `planHouse` with those values never lets a window end less than `SILL_WINDOW_CLEAR_M` above the walk.
   - A new test checks that no key's lowest front step (an upward surface in front of the door floor) ends below the walk after its sink.
4. [ ] **Failing fixtures.**
   - The `1a356b9` table with `UNSETTLED` restored fails criterion 1.
   - A house with a 1.04 m floor, a 0.6 m front step and `window_m` null, planned by `1a356b9`'s rule, fails criterion 3's step check.

### B (Vitest unless marked)
5. [ ] **The lift.** New `stackLift(stack, table)` (pure, in `sills.ts`) gives the block sink and each ground piece's lift. For every stack on the default tile city, seeds 1 to 10 at 3 x 3, and the three protocol maps:
   - every door's (shop, corner or residents') sill after sink and lift is within +0.15 m and −0.05 m of the walk;
   - every lifted piece's top is at least 0.05 m under the first floor's measured window sill;
   - every piece's bottom is at or under the walk.
6. [ ] **The band.** When a stack's ground pieces would break criterion 5's window rule, the stack's ground choice keeps to one sill band.
   - This choice is a new option in `stacks.ts`, `assembleStack(..., { sillBand })`, default off, so the ladder's stacks are unchanged where no band is needed.
   - A fixture of `Door_01` in a `Corner_02` block shows the band is applied, or the lift is within the window rule. The builder reports which happens with today's pieces.
7. [ ] **Dressing follows.** A lifted piece's glass, awning, sign and door canopy rise with it, and nothing else moves. 058's escapes stand on mid, non-door columns and are unaffected; a test checks their joints and ladder foot still pass `escapeCheck`.
8. [ ] **Failing fixture.** `1a356b9`'s block-sink-only rule on a `Shop_05` and `Shop_03` stack leaves `Shop_03`'s sill 0.318 m under the walk, which fails criterion 5.
9. [ ] **Ladder maps.** Only building, ground-piece and dressing heights change, plus a band choice where needed. Layout, packing (except the band), furniture and `evaluateCity` stay deep-equal on the three protocol maps, and `npm run playtest` has no snapshot change.
10. [ ] **Guide.** 16.10 gains the per-key depth, `NO_STREET_DOOR`, the window method, the per-piece lift and the sill band, with Josh's words as **Decided**. Its Open items for the 22 keys, the stoops and mixed-sill stacks are closed. Numbers rows cover every new `sills.ts` constant, and the existing drift check over `sills.ts` covers them; no existing check is edited.
11. [ ] (Main session, screenshots, `npm run dev`, `&light=day`) Check these URLs:
    - `/?puzzle=01-first-light&view=3d&city=tiles&cam=street&run=0` and `&run=1`: every shop and residents' door meets the pavement, none sunk and none up a plinth;
    - `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0`, and the run the builder names that shows `Preset_10` and the garage: no plinth, no buried window or step;
    - `64-the-whole-chain` overhead.

    Screenshots go to Josh.
12. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) Before review:
    - `npm run gate` green, and the test count grew;
    - `npm run playtest` with no snapshot change;
    - the diff only in Files;
    - `git ls-files assets/private` empty.

## Files
- **A:** `src/render3d/sills.ts` (the per-key depth, typed values, `NO_STREET_DOOR`, the window method), `sills.test.ts`.
- **B:**
  - `sills.ts` (`stackLift`);
  - `stacks.ts` (the `sillBand` option only, default off);
  - `models3d.ts` (the per-piece lift and the dressing that follows it);
  - `sills.test.ts`, `dressdraw.test.ts` (only assertions that read the lift, as 055 F's `frame.y` did; named here so it is not an out-of-list edit again);
  - `docs/city-style-guide.md` (16.10, Numbers).
- **Must not touch:**
  - `dressing.ts` (061's file), `escapes.ts`, `tilecity.ts`, `town.ts`, `terrace.ts`, `citymetrics.ts`, `furniture.ts`;
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`.

## Dependencies
- **055 F is merged** (`1a356b9`), so this builds on it.
- **058 is merged:** B reads its `WINDOW_SILL_M` and checks its escapes.
- **Shared file `models3d.ts`** with 061, 057 D and 059 A2. The main session merges one at a time.
- **057 A's wall alignment** and this ticket's lift are independent: one moves the stack in z, the other the ground pieces in y.
- No `src/core/` change, no schema or event change, no new dependency.

## Interfaces
- `sills.ts`:
  - constants: `SILL_DEPTH_BY_KEY: Readonly<Partial<Record<CalibrationKey, { depth_m: number; why: string }>>>`, `SILL_DEPTH_MAX_M = 4`, `NO_STREET_DOOR: Readonly<Partial<Record<CalibrationKey, string>>>`, `SILL_BAND_M = 0.16`;
  - each typed-in table entry gains `why?: string`;
  - `stackLift(stack, table): { sink_m: number; lift_m: ReadonlyMap<number, number> }`, the lift keyed by column.
- `stacks.ts`: `AssembleOptions.sillBand?: number`.

The builder may rename any of these.

## Open items (not blocking; the defaults above apply)
- If Josh prefers that a terrace's shop doors may sit a few centimetres below the walk, as a sunk threshold, rather than having pieces lifted, `SILL_BAND_M` alone without the lift is the simpler rule. It leaves up to 0.16 m under.
- The 4 m search limit is a judgement. A deeper porch is typed in by hand rather than searched.
