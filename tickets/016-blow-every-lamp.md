# 016 · The blow reaches every lamp on the fuse

owner: grid-simulator (A), renderer (B, after A)
status: in progress (G1: Josh, "2 start")
branch: one per part, `ticket/016-blow-every-lamp-a`, `ticket/016-blow-every-lamp-b`

## Josh's words
After playing ladder-08: "For ladder-08, I don't like how only one light triggers the blown fuse animation."

Refinement to part B, after seeing the design (G1 already given; this refines it, it is not a new ticket): "The animation needs to change: the electricity should run to the lamp, then all of the lines should glow brightly, and the lamps should spark as well."

## What happens now
`fuse:blown` names one `culprit` lamp (the newly fed one with the largest load) and the `path` to it. The renderer sends the shock streak, the crackle and the flare to that lamp only. On ladder-08, repairing `fb_1` at the start blows it with mill 2 + home 1 + market 1 + lantern 1 = 5 on a Lv2 fuse, but only the mill reacts. The blow says "the mill did it" when the honest read is "all four of these together did it".

## Goal
When a fuse blows, the shock runs out from the fuse to **every lamp whose load counted toward it** at the moment it blew, and each of those lamps crackles and flares as its streak arrives; then the fuse pops, as now. The player sees the whole load that broke the fuse, not one lamp.

## Decided in this cut
- **The event gains a field; nothing existing changes.** `fuse:blown` keeps `culprit` and `path` with the same meaning, and adds `lamps`: every lamp whose load counted toward the fuse when it blew, each with its line path from the fuse. Filled by the grid-simulator (it has the flow tree; the renderer doesn't).
- **Which lamps:** exactly those summed into the `load` that blew it: powered by the feed's flow, downstream of that fusebox, not faulted, load > 0. Lamps already lit before the action are included (they are part of the overload), not only newly fed ones. On multi-feed maps (015) this is "whichever feed carries it", the same merged flow the fuse check uses (015 rule 4).
- **One speed, not one duration.** All streaks leave the fuse together and travel at the same speed, set so the farthest lamp is reached at `SHOCK_SECONDS` (0.4 s, unchanged). Heads move together along the shared trunk and split at junctions; nearer lamps are reached first. That gives a natural stagger without a separate stagger rule, and the whole sequence keeps its current length (shock 0.4 s, then pop 0.6 s).
- **Every lamp is treated alike.** The culprit gets no extra emphasis in the animation (see Open questions).
- **No text changes.** The notices (`Lv1 Fuse blew: carrying 2`, ticket 014 C) and prompts don't name the culprit today and don't start naming lamps. Nothing in `src/ui/` or `src/play/` reads `culprit`; nothing there changes.

## Acceptance criteria
- [ ] **A (grid-simulator), Vitest in `src/grid/`:**
  - ladder-08: repair `fb_1` at the start → one `fuse:blown` whose `lamps` ids are `mill`, `home`, `market`, `lantern` (in flow discovery order, the same order `culprit` is chosen in), each `path` starting `l_fb` and ending on the line into that lamp; the sum of their file loads equals the event's `load` (5).
  - ladder-08 second trap (mill and market off, `sw_1` to the shrine, repair) → `lamps` is `home`, `shrine`; sum 3.
  - A dead lamp (bulb fault) downstream of the fuse is not in `lamps`; a lamp behind an open breaker is not in `lamps`.
  - Inline map: a blow with no earlier settle (`culprit: null`, `path: []`) still lists `lamps`.
  - The culprit's entry in `lamps` has the same path as the event's `path`.
  - Every existing culprit test (`src/grid/culprit.test.ts`) passes without edits.
- [ ] **B (renderer), Vitest in `src/render/` plus Josh in the browser:**
  - Pure timing in `src/render/shock.ts`, tested: `arrivalTime(pathLength, longestLength)` (0.4 s × ratio; the longest arrives at `SHOCK_SECONDS`; a zero-length path arrives at 0); `lampFlare(age, arrive)` (0 before arrival, 1 on arrival, fading to 0 over `CULPRIT_FLARE_SECONDS`); the pop still starts at `SHOCK_SECONDS` and `sequenceTotal` is unchanged.
  - `notify()` takes `p.lamps` when present, else falls back to `[{ id: culprit, path }]` (an old payload plays exactly as today); test the fallback with a pure helper.
  - Up to `MAX_BLOW_LAMPS` (8) branches per sequence slot, preallocated next to the existing slot arrays; lamps past the cap still flare but get no streak (test). No per-frame allocation.
  - Each branch's streak is drawn at the shared speed; the glow pass for all branches of a slot is one path and one `stroke()` (so the shared trunk is not drawn several times over at 0.55 alpha), likewise the core pass.
  - Each lamp gets the crackle when its streak arrives and the flare (`culpritGlow`, renamed if the builder likes) from `lampFlare`.
  - Josh checks in the browser on ladder-08: repairing `fb_1` at the start sends the shock to all four lamps, the near ones flare first, then the fuse pops; the shrine trap sends it to home and shrine.
- [ ] **B amendment (renderer), Josh's direction: run, then glow, then spark, then pop.** Baseline is the code on `ticket/016-blow-every-lamp-a` (commit `1e9a676` plus the renderer fix in progress there); B is reworked from it, not restarted. Where this list conflicts with B above, this list wins: it **supersedes the per-lamp arrival crackle/flare and the "near ones flare first" browser check**. The shared-speed streaks, the `lamps`/fallback handling (`blowTargets`), `MAX_BLOW_LAMPS` and the one-path-one-stroke rule stay. No grid or event change: `lamps` and their paths are already in `fuse:blown`.
  - **Sequence and timings**, all constants in `src/render/shock.ts`, all times from the blow (total ≈ 1.3 s):
    1. **Run**, 0 → 0.4 s (`SHOCK_SECONDS`, unchanged): streaks leave the fuse together at the shared speed and run to every lamp in `lamps`, as built. A streak that arrives early waits at its lamp (head held at the end, no crackle yet).
    2. **Lines glow**, 0.4 → 0.7 s (`LINE_GLOW_SECONDS` = 0.3): every line on the fuse-to-lamp paths (the union of all `lamps[].path`, each line once) glows brightly together. Envelope `lineGlow(age)`: 0 before 0.4 s, rises to 1 over 0.06 s, holds at 1, falls to 0 over the last 0.1 s, 0 from 0.7 s on. Streaks fade out as the glow rises.
    3. **Lamps spark**, from 0.5 s (`LAMP_SPARK_AT`), lasting 0.3 s (`LAMP_SPARK_SECONDS`): every lamp in `lamps` gets a spark burst (short radiating spark lines/particles, not only a glow) plus the existing flare and the crackle, all lamps at once while the lines are at full glow. `lampSpark(age)`: 0 before 0.5 s, 1 at 0.5 s, falling to 0 by 0.8 s.
    4. **Fuse pops**, from 0.7 s for `POP_SECONDS` (0.6, unchanged), as today: the fuse stays intact until 0.7 s. `sequenceTotal` becomes 1.3 s with a path; with no path (`culprit: null`, empty `lamps`) the sequence plays as today (pop at 0, no run, glow or spark).
  - Vitest, pure: `lineGlow`, `lampSpark`, `sequencePhase`, `fuseIntact`, `popFraction` and `sequenceTotal` at the boundaries above (0, 0.4, 0.46, 0.5, 0.6, 0.7, 0.8, 1.3 s) for path and no-path; the spark starts after the glow starts and the pop starts after the spark starts.
  - Vitest, pure: a helper that builds the deduplicated glow-line list from `lamps` (shared trunk lines appear once; lines of lamps past `MAX_BLOW_LAMPS` still glow; capped at a preallocated `MAX_GLOW_LINES` = 64 per slot, extras dropped, tested). The glow pass is one path and one `stroke()` per slot (wide soft pass plus bright core, each one stroke).
  - Vitest, pure: spark-burst geometry is deterministic (e.g. `sparkRay(lampIndex, ray, age, out)` from fixed angles/seeds, no `Math.random` per frame) so it is testable and allocation-free; sparks for up to `MAX_FLARE_LAMPS` lamps.
  - No per-frame allocation: glow-line ids/points and spark buffers are preallocated next to the existing slot arrays.
  - Josh checks in the browser on ladder-08: repairing `fb_1` at the start sends electricity to all four lamps, then all the lines it ran along glow bright together, then all four lamps spark, then the fuse pops; the shrine trap does the same for home and shrine.
- [ ] Both parts: `npm run gate` green; test count grows.

## Files
- A: `src/grid/` only.
- B: `src/render/` only.

## Interfaces
Written by the lead-architect into `src/core/events.ts` at G1, as the first commit on `ticket/016-blow-every-lamp-a` (not now: this working tree is on 013's branch). Additive and optional, so nothing that builds or reads a `fuse:blown` payload today breaks:
```ts
/** A lamp whose load counted toward a fuse when it blew, and the line ids from the fuse to it, in order. */
export interface BlownLamp { id: string; path: readonly string[] }

"fuse:blown": {
  nodeId: string; faultId: string; load: number; rating: number;
  culprit: string | null; path: readonly string[];
  /** Every lamp whose load counted toward `load`, in flow discovery order (culprit included). The renderer shocks each. */
  lamps?: readonly BlownLamp[];
};
```
Optional because render tests build payloads without it; the grid-simulator always fills it from part A on. No new dependencies.

## Order
- **A** branches from `main` after 013 merges (013 A changed `src/grid/grid.ts`). It touches `nameCulprit`/`settle` in `src/grid/grid.ts`, the same file 015 A rewrites for multi-feed flow: run 016 A **before 015 A starts or after it merges, not alongside it**. Suggested: 016 A first (it is small), then 015 A carries `lamps` over to the merged flow.
- **B** branches from `main` after A merges, and after 013 B is on `main`. `src/render/map-renderer.ts` is also edited by 014 A (captions) and 015 B (per-feed captions and alarm): only one of these on that file at a time. Suggested order: 013 → 014 A → 016 B → 015 B. 016 B touches the blow-sequence code (`notify`, slot arrays, `drawSequences`, the slot loop in `draw`), not the captions, so swapping it ahead of 014 A is fine if Josh wants it sooner.

## GDD check
Presentation only: no rule, number, payload meaning or puzzle file changes. Fuse rating (Draft) is untouched. No rules-coverage row changes.

## Open questions
- **"All of the lines"** (B amendment): cut as every line on the fuse-to-lamp paths, i.e. every line that carried the overload, not every line on the map. Josh to confirm; if he means the whole map, only the glow-line helper changes.
- Total length grows from 1.0 s to about 1.3 s (run 0.4, glow 0.3, pop 0.6, spark overlapping the glow). Josh to say if it drags.
- Should the culprit (the lamp the player's action added) still stand out a little, e.g. a brighter flare, so "what I just did" and "everything it overloaded" both read? Cut as all lamps alike, per Josh's words.
- The ladder-08 design note says the notice gives the culprit; it doesn't (the notice gives the fuse level and what it carried). Puzzle-designer can fix the note's wording separately; not in this ticket.
