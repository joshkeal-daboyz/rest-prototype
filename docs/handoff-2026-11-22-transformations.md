# Morning note, 22 Nov 2026: the transformations goal (ticket 073), overnight

For Josh, and for the next session. Everything is on `goal/city-transformations` in `D:\rest-prototype-073design`. Nothing is pushed; `main` and `goal/city-style` are untouched. Every merge had a gate matching the baseline, review must-fix 0 and playtest regressions 0, and quotes your goal words.

> **Superseded later on 22 Nov 2026.** You answered all three decisions below on cards the same day: "Yes, passes only (Recommended)" (1); "Through any dead line", "Poles too", "Yes, from the trunk (Recommended)" and, in chat, "trees crowns can absolutely grow into buildings, but the trunks should not grow out of buildings" / "Yes trees don't care about structures outside of where they" "Start their growth" (2: ruin tree crowns are free, only trunks are checked); "Yes, switch it on (Recommended)" (3: ruin roof growth on); and "Allow both" for the Sci-Fi City pole (roofs and the kerb). F1b1 to F1b3 built them. You then chose "Draw both eras now (Recommended)", so the hold-out and the ruin are drawn (E2g, F1g) before instancing, and asked to review each pass before anything else moves. The barricade "bug" reported that afternoon was a misreading (every wall lies across its street). The current state and the review walk-through are in `docs/handoff-2026-11-22-map-review.md`; the URLs below with a bare `+` need `%2B`.

## Three things for you to decide (answered or held overnight; you may reverse any)

1. **B-Q3, T-1 on the clean city.** The ticket said a clean-city T-1 failure goes to you before any pass. The B pre-check found the clean city fails T-1 on 20/20 runs, mostly from things you already chose: fire escapes and face signs over drop ends ("Leave the clashes", K1 card 1), street furniture on poles until K's I2, and furniture on about 1 in 30 lamp-post places. Instead of waiting, it was answered on your delegation (by the Fable session): **T-1 judges only what a pass adds or swaps; the clean city's own clashes are reported per run, not failed.** C1 is built on that. Reversing it means no pass can pass T-1 until H2 and H1c re-open.
2. **F1-Q1, "Trees under dead wires" (B8) against "with T-1 and T-2 holding"** (both card 5). Every tree under a span has its crown over the line, so T-1 fails all of them: 109 to 283 sapling spots a run, 3.6 to 5.4 m tall. Taken provisionally: ruin trees are free of the 3.2 m cap but stand **beside** a line, never over it. The two ways out: (a) as built; (b) T-1 judges only a job's live lines and trees grow through scenery-only dead spans, which needs K2's job/scenery split. F1 keeps the under-span spots as a computed set behind `RUIN_TREES_UNDER_SPANS` (false), so (b) is a switch and a re-pin.
3. **Held for you: roof growth in the ruin.** Bushes, dead trees and overgrowth on roofs (about 450 to 950 pieces a run) would widen B10 ("Crowded roofs"), which you gave to tech and the hold-out only. The nearest thing you've said: "I added the nature pack to to assist us in showcasing nature growing over the roads and growing over the buildings and the existing structures in many places." That was before the break table, so it wasn't taken as lifting the hold. F1 builds it behind `RUIN_ROOF_GROWTH` (false). Yes is one line and a re-pin. Wall vines aren't affected.

Also for you, smaller:
- **The store-image rule.** Your instruction, relayed by the Fable session ("You should check some of the images on the asset pack page to ensure that the agents are using the assets properly"), is now X-11. `docs/design/073-pack-intended-use.md` lists how each pack's images show its pieces, and every use the images don't show. **The Sci-Fi City power pole:** the store images show it standing on the pavement at the kerb, not on a roof. Your ruling (roofs and objects, never the ground) stands unchanged; the ticket records that the rooftop use is your choice, not the images'.
- **Barricades:** E2 places 10 to 58 barricade lines a city (40 to 225 wall pieces), more than the pre-check's sketch of 16 to 40. Each one passes T-1 and T-2 and every district keeps at least one way in.
- **Market stalls (E2b):** with the facade clearance, a plaza or front lot where every try meets an awning or escape gets no stall, so E2's "one stall per plaza or front lot" became "where one fits": 2 to 12 stalls placed in 3 to 13 places a city. Keeping the clearance seemed the safer reading; say if you'd rather have the stall.
- **Shopfronts (D1):** the added sci-fi front stands 0.7 m out in front of the old shop. You asked for a look along the pavement: from `at=24,3&dir=+z` it sits flush beside the PUB and doesn't read as a loose panel, so it stays on (`TECH_SHOPFRONTS`). With it switched off, the pavement pieces on those runs change slightly, because the panels count in the clear walk.

## What merged

| Section | What | Merge |
| --- | --- | --- |
| Agents | `tech-pass`, `holdout-pass`, `ruin-pass` (card 8); the planner gains `src/city/history/`; X-11 line | ff75837, 0d5933c, b2072b4 |
| F0 | `apocalypse-ruin` GLB: 89 models, 0 failures, 0 warnings, scale 1, one 17 s run, 7.4 MB. The other eight packs are unchanged (manifest backup `out/manifest.json.bak-073f0`) | not in git |
| Notes | B, D1 (with its kit check), E2 and F1 pre-checks; the intended-use note | 0a61c9d, 111f3b9, 98762a2, 6ddffae, 63b3f36, e834669 |
| A | era types in `src/core/cityera.ts` (`cityplan.ts` untouched, so K's typing can't conflict); ticket re-cut (A2, D1g, X-11) | 4a5077f |
| C1 | `resolvePlan`, `runCityEra` (a clean run runs no era stage), `t1Failures`, `t2Failures`, `t1CleanClashes` | 5a0ad0f |
| B | stage 10, `history`: 13 to 22 districts a run, each with `tech`, `held` and `wild` | 62b7cd2 |
| A3 | tech and hold-out piece kinds; the hold-out's steps (power, settle, barricade) | ba9cc62 |
| C2 | the era switch on the page; `stage=history` picture | 2a92eec |
| D1 | stage 11, tech: wall bolt-ons, cameras, signs, tall vents, pavement tech, added shopfronts (1,387 to 1,973 pieces a city) | 3cd522a |
| A4 | the ruin's piece kinds and steps | 25dd338 |
| E2 | stage 12, hold-out: camps, water towers, farms in parks, market stalls, containers, clutter, roof items, barricades (474 to 1,369 pieces a city). Not drawn (waits for J2) | a254591 |
| D1g | tech drawn: 1,852 pieces on seed 1 in 30 draw calls, dark and textured | 5b29623 |
| E2b | a fix found after E2 merged: a probe I ran showed 30 to 45 hold-out pieces a city through fire escapes, canopies and awnings (E2 read only the facade roofs). Now every hold-out piece keeps 0.3 m clear of them, tested on all 20 runs; F1's pins re-taken. E2 is now 469 to 1,351 pieces a city | f225819 |
| F1 | stage 13, ruin growth: Apocalypse overgrowth first, clumps, saplings, park trees, vines (1,619 to 3,764 pieces a city), kept 0.3 m clear of every facade piece and earlier era's add; T-2 by option G. Not drawn (waits for J2) | 9be274a |

## What to look at (`npm run dev` in `D:\rest-prototype-073design`)

- `?view=3d&city=plan&stage=history&seed=1`: the districts and their stories.
- `?view=3d&city=plan&stage=assemble&seed=1&era=clean&cam=street&at=24,3&dir=+z`, then tap the era button at the bottom right: clean, then tech (the PIZZA shop gets its sci-fi front). The camera doesn't move.
- `...&era=tech&cam=street&at=8,23&dir=+x`: wall bolt-ons, signs, ad pillars, ATMs and charging terminals.
- `...&era=tech&cam=street&at=24,16&dir=-z`: wall boxes and an ad pillar.
- The hold-out and the ruin don't draw yet: their eras show the tech city until J2 (instancing), then E3 and F3.

Screenshots (sent with this note) are in `D:\rest-prototype-073shots\`.

## What is left, and what each part waits for

| Section | Waits for |
| --- | --- |
| A2 (circuit references, plant place) | K's `CityCircuitLayer` merged into `goal/city-style`, then into this branch |
| D2 (tech roofs, roof net) and its pre-check | K2, plus your answer on roof storeys (`Bld_Raised_*` is a street-level deck in the images) |
| D3 (D2 drawn) | D2 |
| J2 (instancing) | D3 (your card 7) |
| E1 (plants, makeshift lines), E1g | K2, A2 |
| E3 (hold-out drawn) | E1, J2 |
| F2 (remnants, broken grid), F2g | K2, E1 |
| F3 (ruin drawn) | F1, F2, J2 |
| Re-pins when K2 lands | D1's, E2's and F1's digests (circuit keeps proven on fixtures only tonight); E2's barricade digest pins once E1 merges |

K work belongs to the other session, so I stopped here.

## Every answer taken overnight

All are logged in `tickets/073-city-transformations.md` under "Questions for Josh", in two groups: **answered by the Fable session on your delegation** ("If the opus session has questions, it can hand off the questions to you, feel free to answer those questions on my behalf") and **taken under the goal** (the recommended answer). None is written as your ruling.

- **B pre-check:** district rule A (hashed sizes 1 to 4); the story rule (tech falls off from a centre, about a quarter of districts left at once with held 0, wild the opposite of held); B-Q3 (above); lamp-post places already covered by furniture are skipped; T-2 walks street cells only. Delegation.
- **D1 pre-check:** three density bands by tech; added shopfronts 0.7 m out, add plus removes, never corner shops; tall vents on bare side walls only; 2 m clear walk; cameras on walls at the first floor; 1.5 m from lamp-post places. Delegation. Billboard frames dropped (empty frames), taken under the goal. `Prop_Pipes_01` vertical only (it can't be rolled upright, so it is never placed); overhangs and the kerb charger allowed as "not shown". Delegation.
- **E2 pre-check:** density bands by held; barricades placed only where T-1 and T-2 still hold, last in the pass; a barricade removes the stage 9 piece under it; containers in court stalls and kerb bays; one `Stall_02` per plaza or lot. Taken under the goal. Farms in parks, containers in stalls, and Frontier walls as barricades allowed as departures. Delegation.
- **F1 pre-check:** T-2 by "option G" (growth only where T-2 holds; about 1 in 20 left out once K2 is in); reach round(wild x 3); vine slots as measured; only damaged road pieces that fit a tile. Taken under the goal. F1-Q1 (above) and the four store-image departures (mounds and saplings on the road, bushes and dead trees on roofs if you allow roof growth, the post vine). Delegation.
- **Architect's readings:** A split so it doesn't wait for K (types in a new file); C1 and D1 built now against hand-placed fixtures and re-pinned when K2 lands; road tiles get a "broken" state, not a swap; the ruin's steps; the merged district id; D1 kept whole. Taken under the goal.

## For the K session (not for Josh)

- After I2, 8 to 22 pavement-tree canopies a run stay over wires unless I2's span rule reads a tall item's bounds in plan (B pre-check).
- Skip lamp-post places that furniture already covers (B-Q4).
- K's ids: see the ticket's "A note for K's architect"; the circuit reader `circuitPoints` in `src/city/pipeline/readable.ts` is the one place to fill.

## Notes on running it

- **A failing test on the base.** `src/render3d/powerkit.test.ts` "every ladder span ... 0.29x to 0.88x" fails at 0.2481 against 0.25 on `goal/city-style` 103ce43 itself (071's ladder spans; the other session's `ticket/071b2-ladder-spans` looks like its fix). Every gate tonight was judged against that baseline: green means "only that failure".
- **launch.json.** The browser tool reads `D:\rest-prototype\.claude\launch.json`, not this folder's, so each check used a named entry there on port 5199, removed afterwards. The uncommitted "goal" entry there was left alone.
- **Worktrees:** `D:\rest-prototype-073{a,a3,a4,b,c1,c2,d1,d1g,e2,f0,f1,f1cut}` are merged and can be removed (unlink the junctions first). `D:\rest-prototype-073gate` is the gate folder.
- **Token use** is in `tickets/usage.md`.
