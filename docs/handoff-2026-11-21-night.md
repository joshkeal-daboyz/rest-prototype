# Handoff, 21 Nov 2026 night: city pipeline after stage 9, K1 and 071 B

For the next main session, and for the Fable session that plans the city's transformations. This note wins over `docs/handoff-2026-11-21.md` where they differ.

## Where things stand

Branch `goal/city-style` in `D:\rest-prototype-goal`. Nothing is pushed and `main` is untouched. Every merge below had a green gate, review must-fix 0 and playtest regressions 0, and quotes Josh in its commit.

| What | Merge |
| --- | --- |
| 072: four new Synty packs converted (Sci-Fi Frontier, Palm City, Sci-Fi City, Nature), with texture aliases; pack.json `exclude` | b42b65f |
| 070 TR1: stage 9 traffic control (signals at inner two-way crossroads, all-way stops, stop signs) | e2fee20 |
| 070 TR1b: parking signs | 72aec07 |
| 070 TR2: stage 9 drawn in 3D (dark, stop sign on the `01_A` atlas, R12 allowance for five LightPole keys) | 574d8cc |
| 070 L2a, L2b, L2c: tests stop reading the old tile path; L1 doc leftovers | 525342c, 954a035, cf254e7 |
| 070 K1 + K1a: stage 6 design note (CK1 to CK16), pre-check, worked city map `city-two-ways-round` | c7a97ed |
| 071 A (power-kit pre-check note) and B (`src/render3d/powerkit.ts`) | 638b7a2, 2eb1674 |

The last gate on goal-equivalent code passed 193 files, about 4,320 tests.

## In flight when this was written

- **070 TR1d**: traffic masts move 2.6 m in onto the corner's walk, one push button per crosswalk (Josh: "Functionally these stop lights don't make sense. They should be on the side walk. Pedestrians would not be able to touch the button to indicate they want to use the crosswalk."; Q50 "Back on the corner (Recommended)"). Builder on `ticket/070tr1d-mast-on-walk` (`D:\rest-prototype-070tr1d`). Check the git log: if it isn't merged, it needs gate, review, playtest, and a browser re-shoot of `?view=3d&city=plan&stage=assemble&seed=1&cam=street&at=51,15&dir=+x`.

## Next, cut and waiting

- **070 TR1c**: the stop sign's keep-out measured from its post (Josh Q48). Shares files with TR1d, so after it. Q49 open: parking signs too? (recommended no).
- **070 TR2a**: grammar rule 13 catch-up (masts 2.6 m, two buttons, the post line). After TR1c and TR1d.
- **070 L2d**: delete the old tile city; L2a to L2c are in (Q46: no need to wait for K1). Keep the tile sheet (Q47). L2c's review: re-point the `tileGroupOf`/`interiorGroupOf` pin, move `DRIVE_CELLS`, `COURT_CELLS`, `LOT_STALLS`, `TILE_ROW_INSET_M` rows to `src/city/mass/constants.ts`.
- **070 K**: the architect types `CityCircuitLayer`, then K2 (grid-simulator gains `src/city/circuit/`; edit its agent file quoting Josh's "I approve both"). K2 re-measures corner spans and stage 6 points against the moved masts (TR1d). K1 review could-improves: CK14 feed wording, the note's 113/103 lights and 18.5/18.0 m spans, question 8's superseded Sci-Fi heights.
- **071 C, D, E**: C draws the ladder with the kit; D builds a `palm-city-pack-power` GLB only; E the 2D overlay on the ladder (Q14). B's review risks for C/K3: ladder strand is a flat ribbon; Palm's centre wire misses its centre insulator by 0.05 to 0.10 u; spot ids must be `<run>#<index>`; a three-pole run repeats A, B, C.
- **Josh to play** `City · Two ways round` (K1 criterion 8); his verdict goes under "What it taught us" in `puzzles/city-two-ways-round.md`.
- **On hold, his word only:** J2 instancing.

## Josh's direction for the Fable session (verbatim)

- "Eventually we are going to augment this city with technology from the sci-fi city pack. The city should showcase the integrated of technology followed by the desperate attempts to maintain power within districts (these changes will break rules). I have another session waiting on the completion of your work here. Once you are done with your work here. We will pass a ppanning of that work to a fable session and transform this city into an apocalyptic ruin, littered with the remnants of a dying species."
- "The fable session will plan all of these transformations. Not just the apocalyptic one."
- "The scifi power poles are intended to be atop buildings and other objects they are not intended to come out of the ground"
- On crossings: "There are no cars anymore, if they are in use at a crossing its fine."

So the Fable session plans three passes over the clean city: Sci-Fi City technology integrated into it (rooftop/object-mounted Sci-Fi City poles belong here), each district's desperate attempts to keep its power, then the ruin. Those passes will break current rules; each break needs Josh's words.

Assets on disk for it (`assets/private/out`): `sci-fi-city-pack.glb` (602 models, 108 still untextured: signs, neon, emissive), `sci-fi-frontier-pack.glb` (512; 16 untextured), `palm-city-pack.glb` (1,101; 188 untextured, ~30 miscoloured by the single-atlas alias), `nature-pack.glb` (202; 5 untextured). Measured power pieces: `docs/design/071-power-kit-precheck.md`.

## Josh's standing rules (unchanged, plus one)

- He decides in his own words; sections merge into `goal/city-style` without asking once gate green, review must-fix 0, playtest regressions 0. Ask first for `main`, any push, and loosening or pinning any check.
- You never write feature code; builders do, in their own worktrees. City agents and the pipeline-designer spawn as general-purpose with the agent `.md` and an explicit model.
- **New, 21 Nov: "You can run multiple tasks at once right now I am remote, but leave one core Available or the computer moght seize"**: keep total load at 7 of 8 cores (a vitest at --maxWorkers=2 is about 3), never two gates at once.
- Check every renderer section in the browser; send full-resolution screenshots (canvas `toDataURL` in rAF, POST to a local HttpListener on 5300). Ask questions as question cards, recommended answer first.
- 3x3 cities are best effort; named test cities are 6x6 seeds 1 to 10, one-way off and on.

## Lessons from tonight

- The vitest worker timeout (`Timeout calling "onTaskUpdate"`) appears when long synchronous test files run under load. TR1 added an `afterEach` yield to `facades/stage.test.ts`; `plan3d.test.ts` (113 s), `facades/escapereport.test.ts`, `traffic/report.test.ts` are still long. If it recurs on an unrelated branch, re-run the gate with less parallel load; a test-only ticket adding the same yield to the long files would end it.
- Branches cut before a merge miss its test fixes: merge `goal/city-style` into the branch and gate the result before it lands (done for TR2 and K1 tonight).
- A data check that counts a whole cell as walkable can hide a piece standing in a gutter: TR1's TC4 passed while every mast stood outside the kerb return. Look at the browser picture, not only the checks.
- Reviewers sometimes write into `D:\rest-prototype` instead of the worktree; check `reviews/` there after each review.

## Housekeeping

- Leave the untracked `tickets/069-parking-first-tile-matching.md` alone.
- Cleaned up 21 Nov night (Josh: "Clean up any orphaned branches please"): 38 merged worktrees removed (junctions unlinked first) and 82 merged branches deleted with `git branch -d`. Left: `main`, `goal/city-style`, `ticket/037-three-view-spike` (checked out in `D:\rest-prototype`), `ticket/070tr1d-mast-on-walk` (in flight), `claude/city-grammar-9b849d` (another session's worktree), and the gate and main worktrees.
- `D:\facades.bak` is a stray copy of a committed file; a safety check stopped its deletion, Josh may delete it.
- `tickets/usage.md` was not updated tonight.
