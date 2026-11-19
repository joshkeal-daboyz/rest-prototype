# 061 · Fire escapes by rank: the R7 share is guaranteed, not a coin toss

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: approved (G1, Josh, 18 Nov 2026, in chat, relayed by the main session: "Yes, cut it (Recommended)", his answer to cutting this follow-up). One section. Builds on `goal/city-style`, where 058 is merged.
branch: `ticket/061-escape-share`

## Why
R7 (`citymetrics.ts`) is the share of qualifying blocks that have a fire escape. A qualifying block is an apartment style with at least `ESCAPE_MIN_BAYS` (3) columns and at least 2 floors over the base. The floor is 0.5 on the ladder and 0.4 on the tile city (`TILE_CITY_R7_MIN`, Josh 18 Nov 2026).

Today each block tosses a coin, `dressUnit(lot.key, "escape") < P_ESCAPE` (0.6), and skips if the run's previous block has an escape (`escapePrev`). The share is therefore chance:
- 0.43 to 0.50 on the tile city, and 0.53 to 0.58 on the ladder;
- with 9 blocks R7 moves in ninths;
- 057 F had to try several hash keys in `blockLens` (it kept `"width"`; the first key gave seed 3 an R7 of 0.373) to keep every seed over the floor;
- every later layout change (057 G, D) can push a seed under again.

Josh agreed the share should be a guarantee: "Yes, cut it (Recommended)".

## The rule (draft text for the guide's 16.11, which replaces 052's escape-chance paragraph)
- **Decided (Josh, 18 Nov 2026):** "Yes, cut it (Recommended)": the share of fire escapes is guaranteed, not left to chance.
- **Default (061): eligibility is unchanged.** A block can host an escape when:
  - it is an apartment style with at least `ESCAPE_MIN_BAYS` columns and 2 floors;
  - it has a mid column that is not a door or corner column and has a roof piece.
- **Default: how many.** For each map, exactly `ceil(share x qualifying)` blocks get an escape:
  - `qualifying` is R7's count, as `citymetrics.ts` counts it;
  - `share` is the map's R7 floor, which the caller passes in: `ESCAPE_SHARE_LADDER` (0.5, equal to `CITY_CHECK.R7`) on the ladder, `TILE_CITY_R7_MIN` (0.4) on the tile city.
  - The count never depends on a hash key or on how many blocks there are, only on the qualifying count.
- **Default: which ones.**
  1. The qualifying blocks that can host are ranked by `stableHash(lot.key + "escape")`.
  2. Escapes go in rank order, skipping a block when the block before or after it in its run already has one. The no-two-consecutive rule holds, as before.
  3. If the greedy pass falls short of the target, a deterministic repair re-lays the runs that are short by alternating (first, third, fifth hostable block of the run, starting from its best-ranked end) until the target is met.
  - The target can always be met when `share` ≤ 0.5. A run of k hostable blocks in a row holds ceil(k / 2), and the sum of those is at least ceil(qualifying / 2) when every qualifying block can host.
  - If fewer blocks can host than the target needs, every hostable block that the neighbour rule allows gets one. The shortfall is reported in the result (`escapeShort`), and the test names it.
- **Retired:** `P_ESCAPE` and the per-block coin toss. `RunUsed.escapePrev` becomes the set computed up front, or is removed.
- **Unchanged:** how an escape is built (058: one platform per storey under the sill, joints within 2 cm, the ladder to the ground, the code-drawn fallback). The selected escapes are placed before other dressing, as now, so `DRESS_MAX` and `DRESS_PER_BAY_MAX` never drop one. A test checks this.

## Goal
On every map, the ladder's three protocol maps and every tile city of every size and seed, R7 is at least its floor by construction, and no run has two neighbouring blocks with escapes. 057 F's chosen hash key in `blockLens` is no longer needed for R7.

## Acceptance criteria (Vitest unless marked)
1. [ ] **A pure selection.** New `escapeBlocks(sites, share): { chosen: ReadonlySet<string>; qualifying: number; target: number; escapeShort: number }`, in `escapes.ts` (pure, no three). It is deterministic for a given input, and `dressTown` uses it before dressing any block. `dressStack` places an escape exactly on the chosen blocks.
2. [ ] **At least the floor.** R7 ≥ the floor and `escapeShort` = 0 on all of these:
   - the default tile city;
   - seeds 1 to 20 at 3 x 3 and seeds 1 to 10 at 6 x 4, with share 0.4;
   - the three protocol maps, with share 0.5;
   - a sweep of fixture runs (every count of 1 to 12 hostable blocks per run, in 1 to 4 runs, at shares 0.4 and 0.5).

   The chosen count is exactly `target` in every case.
3. [ ] **No two neighbours.** In every case of criterion 2, no two consecutive blocks of a run both have an escape.
4. [ ] **Deterministic.** The same size and seed, or the same map, give the same chosen set twice. Changing `blockLens`' hash key in a test copy changes which blocks are chosen, but never puts R7 under the floor.
5. [ ] **The worst case.** A fixture of one run of 12 hostable, all-qualifying blocks at share 0.5 gets exactly 6 escapes, alternating. A fixture where greedy-by-rank picks blocks 2 and 3 first is repaired to the target.
6. [ ] **Failing fixtures.**
   - Today's coin-toss selection (a test copy of the 058 rule) on 057 F's first key gives seed 3 an R7 of 0.373, which fails criterion 2's check.
   - A fixture with fewer hostable blocks than the target reports `escapeShort` > 0, and the check fails on it.
7. [ ] **The callers.** The tile view passes `TILE_CITY_R7_MIN` through `applyModels`' tile options to `dressTown`. The puzzle path passes `ESCAPE_SHARE_LADDER`. Each existing tile-city R7 test (`tilecity.test.ts`, `tileintegrate.test.ts`) reads R7 from the real dressing and still passes, now with no tuned key behind it.
8. [ ] **The ladder maps.** Which blocks have escapes may change on the three protocol maps; this is the intended change. R7 there becomes ceil(0.5 x qualifying) / qualifying, about 0.50, where today's chance gives 0.53 to 0.58.
   - Every other dressing piece of a block whose escape state did not change is deep-equal to today's.
   - A block that gains or loses an escape changes only its escape pieces and its escape column's ground row (058: plain under an escape).
   - **Playtest snapshots are not affected:** the harness replays the puzzle grid, not the 3D dressing, so `npm run playtest` must show no snapshot change.
9. [ ] **Guide.** In `docs/city-style-guide.md`:
   - 16.11 gains the rule above, with Josh's words as **Decided**;
   - 16.5's escape-chance sentence points to 16.11;
   - the Numbers table loses the `P_ESCAPE` row and gains `ESCAPE_SHARE_LADDER`;
   - the "Decided, not yet built" R7 entry is updated.

   *Guide test:* the one allowed edit to an existing check in `styleguide.test.ts` is to the tag check's ticket pattern, which accepts 037 to 059 (or 060 if 060 widened it) and must accept 061. If the pattern already accepts 06x, no existing check is edited. The existing drift check over `dressing.ts` exports covers the new constant.
10. [ ] (Main session, screenshots, `npm run dev`, with `&light=day`) Check `/?puzzle=01-first-light&view=3d&city=tiles` (overhead) and `&cam=street&run=0`, then `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0`. Escapes are spread along the runs, never on two neighbouring blocks, and still built as 058 makes them.
11. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) Before review:
    - `npm run gate` green, and the test count grew;
    - `npm run playtest` with no snapshot change;
    - the diff only in Files;
    - `git ls-files assets/private` empty.

## Files
- **May touch:**
  - `src/render3d/dressing.ts`: the escape choice; `P_ESCAPE` and `escapePrev` retired; `ESCAPE_SHARE_LADDER`; `dressTown` takes `share`;
  - `escapes.ts`: `escapeBlocks`;
  - `models3d.ts`: the option pass-through, with the puzzle path's default the ladder share;
  - `tilecity3d.ts`: pass `TILE_CITY_R7_MIN` in the tile options;
  - `dressing.test.ts`: only the escape-chance cases;
  - `escapes.test.ts`, `tileintegrate.test.ts` (new cases);
  - `docs/city-style-guide.md` (16.5, 16.11, Numbers, the "Decided, not yet built" entry);
  - `styleguide.test.ts` (only the edit named in criterion 9).
- **Must not touch:**
  - `tilecity.ts`: `blockLens` keeps its key, and 057 G's comment item records that R7 no longer depends on it;
  - `citymetrics.ts` (R7's definition and floors are unchanged), `stacks.ts`, `terrace.ts`, `town.ts`, `furniture.ts`;
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`.

## Dependencies
- **058 is merged**, so this builds on its escape placement and `escapes.ts`.
- **Independent of 057 G and D:** 061 does not touch `tilecity.ts` or the interior drawing. If 057 G lands first, 061's tests run on G's cities. If 061 lands first, G no longer needs R7 tuning. In either order, the R7 tests must pass with no tuned key.
- **Shared files:** `models3d.ts` and `tilecity3d.ts` with 057 D and 059 A2, and `dressing.ts` with nothing open. The main session merges one at a time.
- No `src/core/` change, no schema or event change, no new dependency.

## Interfaces
- `escapes.ts`: `escapeBlocks(sites, share)`, returning `{ chosen; qualifying; target; escapeShort }`.
- `dressing.ts`: `ESCAPE_SHARE_LADDER = 0.5`; `dressTown(..., opts?: { escapeShare?: number })`, defaulting to `ESCAPE_SHARE_LADDER`.
- `models3d.ts`: the tile options gain `escapeShare`.

The builder may rename any of these.

## Open questions
None blocks the build. Recorded for Josh:
- the ladder maps' escape share drops from today's 0.53 to 0.58 to about 0.50 (exactly the floor);
- if he wants today's density back, the target can be a share above the floor (for example 0.55 on the ladder and 0.45 on the tile city): one constant each.
