# 058 · Fire escapes that connect and meet the windows

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: approved (G1, Josh, 18 Nov 2026, in chat, relayed by the main session: "Approve 057, 058 and 059"; given on the main session's summary of the scope, before he saw this text). Every open question is at its default. Independent of 057 except as noted under Dependencies. Sections A, then B.
branch: `ticket/058a-escape-geometry`, `ticket/058b-escape-placement`

## Josh's words (18 Nov 2026, in chat)
> "There are gaps on the fire escapes. Additionally, fire escapes should always be level with windows or else people can't get out of the building."

His screenshot shows a street-level view of one escape on the tile city:
- a diagonal flight stops short of the platform above;
- the drop ladder hangs apart from its platform;
- the platforms do not line up with the storeys' windows.

## Measured (architect, 18 Nov 2026, `goal/city-style` at `793bbf7`, no browser)
**The pieces** (City Pack, converted manifest, metres, x by y by z, pivot centred, min y 0):

| Key | Bounds | Used as |
| --- | --- | --- |
| `SM_Bld_FireEscape_03` | 4.25 x **3.802** x 1.76 | the first landing, with the drop ladder |
| `SM_Bld_FireEscape_02` | 3.25 x **3.609** x 1.64 | one storey up: platform and flight |
| `SM_Bld_FireEscape_01` | 3.25 x **1.492** x 1.64 | the top: platform and railing |

No other fire-escape or ladder piece is in the City Pack. The Town Pack's `SM_Prop_Ladder_01` is a ladder lying flat (1.7 x 0.09 x 0.43).

**The rule** (`dressing.ts`, 052, the escape block of `dressStack`):
- An apartment block of at least `ESCAPE_MIN_BAYS` (3) columns and 2 floors takes an escape with probability `P_ESCAPE` (0.6). The run's previous block must not have one (`escapePrev`).
- It goes on a mid column that is not a door or corner column.
- The pieces stack from `firstFloorY`, the top of the base: `_03`, then `_02` while `_02 + _01` still fits under the roof, then `_01`.
- **Each piece goes on top of the last by its bounding height** (`y += p.h`).

**The storeys:** the apartment styles have `pitch_m` base 3, floor 3, so the floors start at y 3, 6, 9 and 12. The window sill of each floor piece is not in any table; it is inside the floor piece's geometry.

**Cause 1: the platforms drift off the floors.** The pieces climb by 3.802 and 3.609 m against a storey pitch of 3.0 m, so each landing sits higher than the last by more than a storey:

| Floors over base | Floor y | Platform base y | Off its floor by |
| --- | --- | --- | --- |
| 2 | 3, 6 | 3.0, 6.802 | 0, +0.80 |
| 3 | 3, 6, 9 | 3.0, 6.802, 10.411 | 0, +0.80, +1.41 |
| 4 | 3, 6, 9, 12 | 3.0, 6.802, 10.411 (`_01` to 11.9) | 0, +0.80, +1.41, **and floor 4 has no platform** |

- The top piece of a 4-floor block stops at 11.9 m: the `_02 + _01` fit test leaves the top storey without an escape.
- This drift is why the platforms "are not level with windows": by the third floor a platform is well over a metre above its floor.

**Cause 2: the gaps.**
- A bound's height is not a flight's rise. Each piece's bound runs from its lowest point (the platform's underside, or the drop ladder's foot on `_03`) to its highest (the railing or the flight's top step).
- Stacking by bounds therefore puts the next platform where the last piece's railing or flight top was, not where its flight ends: the flight stops short of the next deck, or overshoots it.
- Without the geometry, the deck, flight-top and ladder-foot heights inside each piece are not known. The screenshot shows gaps of roughly half a metre. **Section A measures them.**

**Cause 3: the drop ladder.** `_03` stands at the top of the base (y 3.0), so its ladder's foot is wherever the piece's geometry puts it, at no planned height. Nothing places it on the ground.

**How many:** R7 (`citymetrics.ts`, share of qualifying blocks with an escape) is 0.43 to 0.50 on the tile city (floor 0.4, Josh 18 Nov) and 0.53 to 0.58 on the ladder (floor 0.5).

## The rules (draft text for the guide's new 16.11 "Fire escapes"; B writes it)
- **Decided (Josh, 18 Nov 2026):** "There are gaps on the fire escapes. Additionally, fire escapes should always be level with windows or else people can't get out of the building."
- **Default (058): one platform per storey.**
  - Every floor over the base gets exactly one platform, the top floor included.
  - Each platform's deck is at that floor's measured window sill less `ESCAPE_DECK_BELOW_SILL_M` (0.15), within ±`ESCAPE_DECK_TOL_M` (0.05).
  - So a person steps out over the sill onto a deck no more than a hand's height lower.
- **Default: one continuous run.**
  - Flights join each platform to the next from the lowest platform to the top. Each flight's top step meets the deck above, and its foot the deck below, within `ESCAPE_JOINT_TOL_M` (0.02).
  - Pieces are placed **by their measured deck heights, not their bounds**: the next piece's deck goes where this piece's flight ends.
- **Default: the drop ladder reaches the ground.**
  - The ladder under the first platform ends on the walk in front of the building (y 0, or the lot ground on the ladder maps), within 0.02 m.
  - If `_03`'s own ladder is short, a code-drawn ladder (two rails and rungs at 0.3 m, in the escape's colour) extends it to the ground. If its ladder is too long, the piece is scaled in y within the limits below.
  - Note: real drop ladders hang about 2.5 m up; Josh's "not floating" wins, so it touches down.
- **Default: when the pack piece does not fit the storey pitch.** A piece's flight rise is scaled in y to the storey pitch when the factor is within `ESCAPE_SCALE_Y` (0.8 to 1.2): steeper or shallower stairs read as stairs.
  - Outside that range, the escape for that style is **code-drawn** from boxes: decks, railings, diagonal flight stringers with treads, and the ladder, in the pack escape's dark colour.
  - A style is never silently skipped, so R7's count stays.

## Goal
On the tile city and the ladder maps, every fire escape reads as one connected steel stair:
- a platform at each storey, just under that storey's window sill;
- flights that meet the platforms above and below with no gap;
- a drop ladder that reaches the pavement.

## Sections
- **A. Measure** (about ½ day, pure). New `src/render3d/escapes.ts`:
  - per escape key: deck height, flight foot and top (height and the x where they meet the deck), ladder foot, railing top;
  - per apartment floor and `stack3` key: the window sill above the piece's base;
  - pinned tests.
- **B. Place and draw** (about 1 day). `dressing.ts`'s escape block re-written to the rules; `models3d.ts` draws y-scaled pieces and the code-drawn ladder and fallback; the checks; the guide. Needs A.

## Acceptance criteria
**CI-safe (every section):** typed-in fixtures only; real-geometry checks inside an `it` that skips without `assets/private/out/`; no Windows paths; no timer under 1 s.

### A (Vitest, new `escapes.test.ts`)
1. [ ] **Measured escape pieces.** `ESCAPE_GEOMETRY: Readonly<Record<CalibrationKey, { deck_m: number; flightFoot_m: number; flightTop_m: number; flightFootX_m: number; flightTopX_m: number; ladderFoot_m: number | null; railTop_m: number }>>` holds an entry for `SM_Bld_FireEscape_01`, `_02` and `_03`.
   - **How each is read:** from the converted GLB, as `4d952c6` read `TILE_FRONTS`:
     - the deck is the largest upward-facing horizontal surface;
     - the flight is the run of tread faces, its foot and top the lowest and highest tread;
     - the ladder is the rung set below the deck.
   - **Tests:** a CI-safe test pins every value as a typed-in fixture, and a real-geometry test inside an `it` re-measures each within 0.02 m.
2. [ ] **Measured window sills.** `WINDOW_SILL_M: Readonly<Partial<Record<CalibrationKey, number>>>`: for every apartment floor, corner floor and `stack3` piece of `STACK_STYLES`, the sill height of its front windows above the piece's base. A `stack3` piece has three, one per storey: `number[]`.
   - **How:** the lowest point of the window openings, or of glass material, on the `BUILDING_FRONTS` face.
   - **Tests:** pinned and re-measured, as in criterion 1.
   - A key the geometry cannot settle gets no entry and is reported. Its storeys use the style's median sill.

### B (Vitest unless marked)
3. [ ] **Placement.** `dressStack`'s escape places one platform per floor over the base, the top floor included.
   - Each platform's deck is at floor y + sill − `ESCAPE_DECK_BELOW_SILL_M`, within `ESCAPE_DECK_TOL_M`.
   - Each piece's y and y-scale come from `ESCAPE_GEOMETRY`, so the flight top of each piece meets the deck above within `ESCAPE_JOINT_TOL_M`. Its x is set so the flight's top x and the deck meet.
   - The y-scale is within `ESCAPE_SCALE_Y`, or the escape is the code-drawn fallback (`DressPiece.key` `"code:escape"`, with its parts).
   - The ladder foot is at the walk (0) within 0.02 m, with a code-drawn extension where needed.
   - Eligibility is unchanged: `P_ESCAPE`, `ESCAPE_MIN_BAYS`, `escapePrev`, mid column, not door or corner.
4. [ ] **The check.** New `escapeCheck(stack, pieces, tables)`, pure, in `escapes.ts`, returns per escape the worst deck-to-sill offset, the worst flight joint, the ladder foot height, and the storeys without a platform.
   - It passes (all within tolerance, none missing) for every escape on the default tile city, seeds 1 to 10 at 3 x 3, and the three protocol maps, on the fixture plan.
   - It **fails on `793bbf7`'s placement**, the bound-stacked fixture: decks drifting +0.80 and +1.41 m and floor 4 missing.
   - It fails on a second fixture with one flight short by 0.1 m, and on a third with the ladder foot at 0.5 m.
5. [ ] **R7 holds.** On the tile city R7 ≥ 0.4 (Josh's floor), and on the three protocol maps R7 ≥ 0.5; the tables and `citymetrics.ts` are not edited. If the fallback or a measured misfit changes the count, the builder reports the numbers.
6. [ ] **Drawn.** `models3d.ts`'s dressing instancer takes a per-instance y-scale for escape pieces, and draws the code-drawn ladder extension and the fallback escape as instanced boxes, together at most 3 draw calls. With no pack (CI), escapes are the code-drawn ones.
7. [ ] **What changes on the ladder maps.** Only the escape pieces of `dressStack`'s output and their drawing. Every other dressing piece, `packTown`, `furnitureLayout` and `evaluateCity` stays deep-equal on the three protocol maps. This is a deliberate change to the ladder: Josh's rule is about every fire escape, and the 3D view is not in the playtest snapshots.
   - `dressing.test.ts` cases that pin today's escape stacking are updated to the new rule; this ticket allows that edit, and no other existing test is edited.
   - `npm run playtest` has no snapshot change.
8. [ ] **Guide.** `docs/city-style-guide.md`:
   - 16.5's fire-escape paragraph points to a new 16.11 "Fire escapes", which has the rules above, with Josh's words as the **Decided** line.
   - Numbers rows cover every new constant of `dressing.ts` and `escapes.ts`. The existing drift check already reads `dressing.ts`, and a new check covers `escapes.ts` only.
9. [ ] (Main session, screenshots, `npm run dev`, each with `&light=day`) Check these URLs:
   - `/?puzzle=01-first-light&view=3d&city=tiles&cam=street&run=0`, `&run=1`, `&run=2` (the builder names a run with an escape in its report);
   - `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0` (the builder names a run with an escape).

   On them:
   - every platform is just under a window sill;
   - no flight ends in mid air;
   - the ladder reaches the pavement;
   - the top floor has its platform.

   Screenshots go to Josh.
10. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) `npm run gate` green and the test count grew, `npm run playtest` with no snapshot change, the diff only in Files, and `git ls-files assets/private` empty.

## Files
- **A:** new `src/render3d/escapes.ts`, `escapes.test.ts`.
- **B:**
  - `dressing.ts`: the escape block, and the new constants;
  - `escapes.ts`: `escapeCheck`;
  - `models3d.ts`: the per-instance y-scale for escape pieces, the code-drawn ladder and fallback;
  - `dressing.test.ts`: only the escape-stacking cases;
  - `escapes.test.ts`, `dressdraw.test.ts` (new cases only);
  - `docs/city-style-guide.md` (16.5 pointer, 16.11, Numbers), `styleguide.test.ts` (the new drift check only).
- **Must not touch:**
  - `stacks.ts`, `terrace.ts`, `citymetrics.ts`, `town.ts`, `tilecity*.ts`, `furniture.ts`, `streetcam.ts`;
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`.

## Dependencies
- **None to start.** 058 touches the escape block of `dressing.ts` and the instancer in `models3d.ts`.
- **055 F** (door sills, which also edits `models3d.ts`): whichever merges second rebases. F sinks a block's dressing with the block, and the ladder foot rule then reads the walk after the sink. If F lands first, 058's ladder foot is checked against the sunk walk.
- **057:**
  - 057 A aligns stacks on their wall plane. Escapes stand on the host piece's front face (`onFace`), so they follow the wall.
  - 057 19.1's 0.5 m overlap cap is for the building's own geometry. Escapes (1.64 to 1.76 m deep) and awnings are dressing, still bounded by `onFace`'s kerb reach. This is recorded in 057 when its E writes chapter 19.
  - 057's alleys (19.6) carry no rear escapes in either ticket.
- **R7:** the tile-city floor of 0.4 and the ladder's 0.5 stay. 058 changes where escapes stand, not how many.
- No `src/core/` change, no schema or event change, no new dependency.

## Interfaces
- `escapes.ts`: `ESCAPE_GEOMETRY`, `WINDOW_SILL_M`, `escapeCheck(...)`.
- `dressing.ts`: `ESCAPE_DECK_BELOW_SILL_M = 0.15`, `ESCAPE_DECK_TOL_M = 0.05`, `ESCAPE_JOINT_TOL_M = 0.02`, `ESCAPE_SCALE_Y = { min: 0.8, max: 1.2 }`, and `DressPiece.scaleY?: number`, default 1.

The builder may rename any of these.

## Open questions (answered 18 Nov 2026: every default applies, "Approve 057, 058 and 059")
1. **Deck height against the sill.** Default: the deck is 0.15 m under the sill (step out over the sill). Alternative: the deck at floor level, the window sill about 0.8 m above it, as real escapes are.
2. **The drop ladder.** Default: it reaches the pavement (Josh: no floating). Alternative: hang it 2.5 m up, as real drop ladders do.
3. **When the piece does not fit.** Default: scale it in y from 0.8 to 1.2, else draw that escape in code. Alternative: never scale; code-drawn whenever the pack's flight does not meet the next deck as it is.
4. **The ladder maps.** Default: **fixed there too** (every escape, Josh's rule). Alternative: the tile city only.
