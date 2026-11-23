ticket: 073d1g-tech-walls-drawn
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
At `era=tech` and later, the plan assemble view draws D1's adds (bolt-ons, cameras, signs, shopfront panels, pavement tech), dark, read only through `resolvePlan`. Swapped pieces show their new key and removed pieces are not drawn. R12 gets an era-scoped allowance table. `clean` stays exactly as it is today, and no draw-call cap goes up.

## Does the branch do it?
This is round 2. The round-1 file was replaced in place, not archived. I checked round 2's commit (d96304a) against round 1's one must-fix and three could-improves.

I ran `src/render3d/techdraw.test.ts` and `src/render3d/tilecity3d.test.ts` at `--maxWorkers=1`: 81 of 81 pass (11 and 70). The main session's gate covered the whole suite and typecheck on this commit, so I did not run them.

1. **Adds once, at their placement, through `resolvePlan`; swaps and removes; clean unchanged.** Met.
   - Round 1's evidence still holds. "the tech era's adds are the resolver's own" and "every add is drawn once, at its placement" cover the adds. "at clean the draw is exactly today's" covers clean, and the plan3d tests are not edited.
   - New in round 2: "one swap and one remove in a synthetic tech layer show in the drawn dressing, by key, placement and identity". It builds a tech layer with a guarded `swap` on `facades.dressing[0]` and a `remove` on `[1]`, then runs it through `planAtEra`, which means through `resolvePlan`, and then through `plan3dGroups`.
   - It asserts:
     - the drawn list is one shorter;
     - piece 0 has the same placement with the new key;
     - the old key's count drops by one and the new key's rises by one, adjusted when the removed piece has the same key;
     - the rest of the list equals the clean list without index 1, by placement, so the removed piece is checked by identity and not only by count.
   - This is round 1's must-fix as asked.
2. **Dark (X-5).** Met, unchanged from round 1. "no material of the drawn tech meshes is emissive or lit" walks the drawn `plan:tech` group.
3. **R12 allowance, era-scoped.** Met, unchanged. `PLAN_AUDIT_TECH_ALLOWED` and `PLAN_AUDIT_TECH_ERAS` are tested, with cases for the kind, the era and clean.
4. **No draw-call cap rises.** Met in letter, unchanged. The four existing caps are untouched, and the tech pieces get their own `TECH_DRAW_CALLS_MAX`. The browser report line now prints `tech: N of M added pieces drawn in K calls (cap 100)` (`plan3d.ts` line 1352), so the main session can read the per-era count on screen. That was round 1's could-improve 1.
5. and 6. Browser criteria. The main session checked these itself; not judged here.

## Rule conflicts and risks
- **Files.** `src/render3d/models3d.ts` is still edited outside the ticket's list. It is the same folder and the same owner, and the ticket's goal needs it, as noted in round 1. In round 2, `TECH_KEYS` loads only when `signColourways` is passed. Only the plan view's `sharedTileModels(planKeys(), [STOP_SIGN_COLOURWAY])` passes it; the tile city's call (`tilecity3d.ts` line 1501) does not. So the 33 tech fetches are now plan-view-only, which was round 1's could-improve 2.
  - The key is chosen by a stand-in condition: the code asks "does this view want a sign colourway", not "does it want tech". If a later view passes sign colourways, it would load tech pieces too. The doc comment says so.
- **Shared cache.** `sharedTile` is one promise shared by both views. If the tile view loaded it first in a page, the plan view would get a set with no tech pieces. This already happens with sign colourways today, and one page shows one view, so it is not new.
- `src/grid/` and `src/night/` are untouched, there is no new dependency, no GDD Decided rule changes, and nothing in `src/city/` is edited.

## Must fix
none

## Could improve
1. `src/render3d/models3d.ts` line 374: put the tech pieces behind their own flag, for example `techKeys: true` in the `loadPageModels` extras, instead of behind `signColourways`. The intent is then explicit and does not depend on the stop sign.
2. `src/render3d/techdraw.test.ts`, the new swap test: `newKey` is the first `dressKeys()` entry that differs from the old key, and the test draws with empty root maps. It shows the drawn list is right, but not that a mesh is built for the new key. A loaded stub root for `newKey`, and a check that one instance of it is placed in the `dress` group at piece 0's spot, would prove the mesh too. It is cheap, and it matters once E2 or F1 swap for real.
