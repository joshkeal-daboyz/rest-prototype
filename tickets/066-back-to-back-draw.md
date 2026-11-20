# 066 · Back to back, drawn: ring 2, lane rows and blind columns on screen, with quiet-frontage dressing (C2)

**Superseded by ticket 070** (`tickets/070-city-pipeline.md`) on Josh's approval of 070 (19 Nov 2026, in chat). Not to be built as written. Where its content went (070's "What happens to the other tickets"): the drawing to 070 E and G; partner colourways (M4c) to F1; quiet dressing to H1 and H2; inlets paved to E; draw calls to G and J.

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: superseded by 070 (Josh's approval of 070, 19 Nov 2026). Was: open. Cut from 063 section C on 19 Nov 2026, re-cut on `docs/city-grammar.md` (rules 4, 9 and 12). It is covered by Josh's goal waiver; the main session records the start.
branch: `ticket/066-back-to-back-draw`

## Josh's words (19 Nov 2026, in chat)
> "Notice how the backs of buildings are also butted up against the backs of other buildings Also intentional. Without this you end up with featurless walls."

> "If you're going to have an inlet to areas between buildings it needs to be paved"

> On the grammar's Q2 (backs are other buildings) he gave no answer of his own. It takes the recommendation under his goal waiver: "I don't want to constantly approve all of these improvments."

## Goal
In the dev view (`city=tiles`), every ring-2, lane-row and blind column that 065 planned is drawn. Interior and lane faces carry quiet-frontage dressing, the drives and walk-throughs are paved through both rings, and the frame rate is measured.

## Checks this ticket builds (grammar)
- **M4's colourway clause:** a ring-2 building's colourway differs from its partner's and its row neighbours'.
- **M8's dressing half:** no shop dressing on a quiet frontage.

## Acceptance criteria (Vitest unless marked)
**CI-safe:** typed-in fixtures; GLB reads only inside `it.skipIf(!have)`, lazily; no Windows paths; no timer under 1 s.

1. [ ] **Drawn as rows.** `applyModels` draws the quiet runs' and blind columns' stacks like the street rows', at `WORLD_PER_METRE`, from 065's packed plan. A test on fixture stacks counts one stack group per planned building, ring 2 and lane rows included.
2. [ ] **Colourways (M4, the colourway clause).** `assignColourways` takes the back-to-back partner as a neighbour. A ring-2 building's colourway differs from its partner's and its row neighbours'. A blind ring-2 corner takes its ring-1 corner building's colourway (065 criterion 2), and R13 holds on every row.
   - **Failing fixture:** a ring-2 building given its partner's colourway.
3. [ ] **Quiet dressing (M8, the dressing half).** `dressBlock` with a quiet frontage (`dressing.ts`, a frontage-kind input; the default is "street", so the ladder is unchanged) places no shop glass, awning, fascia sign, blade sign or ATM.
   - It places the door canopy, wall air-conditioners, planters and fire escapes by 058's rules, and bins against the wall clear of doors.
   - Escapes on quiet faces do not count toward R7.
   - **Failing fixture:** a quiet building dressed as a street one.
4. [ ] **Inlets paved through both rings.** 063 H's paving covers a drive's ring-2 cells and the walk-throughs (065 criterion 6) as well as ring 1. The court's stalls start at ring 3.
5. [ ] **Roof props on ring 2** follow 16.5 as on a street row. The roof exit is 068's.
6. [ ] **Draw calls.**
   - The builder reports stack pieces before and after on the default city.
   - The main session reports `renderer.info.render.calls` from the dev view's log. Expect about twice the building calls.
   - No cap is raised. If the frame rate on Josh's PC cannot hold, that goes to Josh, and the remedy is instancing the stack pieces (a later ticket), not a higher cap.
7. [ ] **Nothing else moves.**
   - The street rows' pieces, dressing and colourways deep-equal 065's, apart from colourway choices made to meet criterion 2. The builder lists those.
   - `packpin.test.ts`, `townpin.test.ts` and the playtest snapshots are unchanged.
8. [ ] **Guide.** 16.5 and 19.8 gain the quiet frontage's dressing and the drawing of ring 2. 16.9 gains the partner colourway rule. Josh's words are marked, and so is the waiver for Q2.
9. [ ] (Main session, screenshots, `&light=day`, overhead and street camera, default city) buildings stand back to back, court and lane faces show windows and doors, no shopfront faces a court, and drives and walk-throughs are paved. Compare with Josh's reference.
10. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) The gate, the playtest, the diff in Files, and `git ls-files assets/private` empty.

## Files
- **The code:**
  - `src/render3d/models3d.ts`: drawing the quiet runs and blind columns, and the colourway neighbours;
  - `src/render3d/colourway.ts`: partner neighbours;
  - `src/render3d/dressing.ts`: the frontage-kind input and quiet dressing;
  - `src/render3d/tilecity3d.ts` and `tileslots.ts`: drive ring-2 and walk-through paving.
- **Tests:** `colourway.test.ts`, `dressing.test.ts`, `dressdraw.test.ts`, `tilecity3d.test.ts`, `tileinterior.test.ts`.
- **The guide:** `docs/city-style-guide.md`.
- **Must not touch:**
  - `tilecity.ts`, `stacks.ts`, `terrace.ts`, `town.ts`, `citymetrics.ts`, `parkmetrics.ts`, `frontage.ts`, `sills.ts`, `escapes.ts`;
  - `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`, `docs/city-grammar.md`.

## Dependencies
- **Needs:** 065 A and B merged.
- **Before:** 067 and 068.
- **Shared files:** `dressing.ts` with 067 and 068, and `models3d.ts` with 064 and 065. The main session merges one at a time.
- No new dependency.

## Interfaces
- `dressing.ts`: `dressBlock(..., { frontage?: "street" | "quiet" })`.
- `colourway.ts`: `assignColourways` takes a partner list beside its row neighbours.

The builder may rename either.
