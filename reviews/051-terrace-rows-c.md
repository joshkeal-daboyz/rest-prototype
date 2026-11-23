ticket: 051-terrace-rows-c
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Round 2, judged against the re-cut ticket (a694612). Section C is a pure `packTerrace` that re-cuts each terrace run into flush, unscaled apartment stacks. Its far end must close to a seam (at most `TERRACE_SEAM_M`) or an alley (`ALLEY_MIN_M` to `ALLEY_MAX_M`), never a slit. That gap is measured to the next corner block's real back wall. Each apartment style must make up 20% to 50% of the terrace blocks.

## Does the branch do it?
I judged HEAD 2ce5648. The fix commit touches `terrace.ts`, `terracepack.test.ts`, `stacks.ts` (one new export), `town.ts` (the `townClears` exposure), `styleguide.test.ts` and `docs/city-style-guide.md`.

I did not re-run the suite; a full gate is running separately. I did run my own headless probe with `tsx`, from a scratchpad script that is not on the branch. It packs every run of every committed puzzle with the test's fixture entries and the test's `nextRunOf`/`farWall_m` wiring.

**Round 1 must-fix (criterion 12 lowered without a re-cut): resolved.** The architect re-cut criterion 12. The old floors (`> 0.1`, `> 0.6`) are gone, and the new floors are the re-cut's 85% and 5%, unlowered (`terracepack.test.ts`, "ends at least 85% of ladder runs...").

**Criterion 12: partly met.**
- **Met:**
  - **Flush, no overlap, inside the union.** Met as in round 1. The flush test now includes `farOverhang_m` in the sum. The clearance test clips the part of a block past the band line before comparing it with other runs' lots, and the new footprint test covers that part.
  - **Never negative.** Met (`Math.max(0, …)` in `packTerrace`, and asserted per run).
  - **The builder's figures reproduce.** My probe gives 3568 runs: 816 seam, 2302 alley, 3 slit, 447 big. That is 87.4% seam or alley and 0.08% slit. The three slits are all 10.86 m runs with a 0.361 m gap (`34-main-fuse`, `35-cell-light`, `40-the-priests-list`).
  - **Synthetic 90 to 120 m runs close to the seam at least 90% of the time,** at both corner and plain starts ("keeps the seam wherever the pieces allow it").
  - **Style shares are 26.5% / 31.3% / 42.3%** (apartment-01 / -02 / -03), inside 20% to 50%, and tested ("gives each apartment style 20% to 50%...").
  - **Numbers rows** for `TERRACE_SEAM_M`, `TERRACE_SLACK_M`, `ALLEY_MIN_M` and `ALLEY_MAX_M` are in the guide. The drift test now reads `terrace.ts` and pins all four (`styleguide.test.ts`).
  - **Chapter 4** states "seam, or alley, never a slit". The header no longer says "near-even" and now says `FAMILY_SHARE_MAX` is "not what bounds the terrace" (a source test checks both).
- **Not met: the far gap is not measured to the next corner block's real back wall.** The criterion and design item 4 say the wall is "its front line plus the depth of that corner block's deepest column piece".
  - **What the builder did.** `farWall_m` uses `stackDepth`, the worst case over every piece any corner-capable style could pick (5.918 m). On the grounds that "the corner styles' depths differ by 0.03 m", it is the same wall for every corner end: `run.len + 0.082 m`.
  - **What the corner blocks really are.** Pieces are back-aligned. So a stack's back wall is flat, at `stack.depth_m` behind the front line. I checked in the probe that `depth_m` equals the pieces' real z extent. The assembled corner blocks that end the 2818 corner-ended runs are 5.624 m deep in 1783 cases (apartment-02 in 758, apartment-03 in 1025). They are 5.877 m in 235, 5.886 m in 229, and 5.918 m (all apartment-01) in only 571. The 0.03 m spread is between the styles' deepest candidate pieces, not between the blocks the hash actually builds.
  - **The effect.** In 63% of corner ends the real wall is 0.294 m beyond the one `packTerrace` closes to. Measured to the next corner block's real back wall (`run.len + TERRACE_DEPTH_M − nextBlock.stack.depth_m`, the formula the branch's own footprint test uses), the ladder is:

    | | Runs | Share |
    |---|---|---|
    | Seam | 590 | 16.5% |
    | Alley | 1174 | 32.9% |
    | Slit | 229 | 6.4% |
    | Big | 1575 | 44.1% |

    That is 49.4% seam or alley, against a floor of 85%, and 6.4% slit, against a ceiling of 5%. Many 47.89 m runs that the test counts as a 1.0 to 1.5 m alley stand 1.3 to 1.8 m short of the real wall. Many "seams" are about 0.3 m slits, which is exactly the look the re-cut set out to remove (criterion 17's screenshots would show them).
- **The builder's deviation, judged.** `cornerStyle` is only a preference, and `packTerrace` picks another corner style in 510 of 2818 corner blocks when that closes its own row better. On its own that would be acceptable, since the Interfaces allow renames. But it rests on the premise that the next corner block's depth does not depend on what is chosen, and that premise is false: depth follows the roof-corner and shop pieces the block draws, not only the style. The design's reason for fixing the corner block first ("to know the next corner block's depth before packing this run") is therefore not met. The 85% figure the branch reports is measured to a wall that stands in front of the real one for most corner ends.

**Criteria 13 and 14 (corner blocks, variety, caps, determinism): still met.** The tests are unchanged in substance. Determinism is still a node count (`SEARCH_NODES = 60000`), not a clock. The probe cache is a `WeakMap` keyed on the entries and fronts, so it adds no order dependence.

**The three risks handed on (criterion 16's list, done early here):**
- **The strip past the last nominal lot.** A test covers it on every map ("passes the town's own lot rules..."). It runs `townClears` at the block's `hMax` on more than 500 strips and asks for every one to pass, so no block needed to drop. The test covers the strip only up to `run.len`. The bit past the band line (0.082 m today, up to 0.376 m once the wall is measured properly) lies in the next corner nominal lot, which was cleared at that lot's own cap, not this block's. Could improve 3.
- **Overhang.** A test covers it ("holds every piece... out of the next row's corner block"). It checks every piece against the actual next corner block's `depth_m` wall, so it passes, and the conservative wall makes that safe. Neighbours of equal height are for the builder's report under criterion 17; I did not judge that.
- **Probe-width mismatch.** A test covers it ("drops the last block, not the whole run..."), with a fixture style that has two floor widths. Blocks come back non-empty, `dropped > 0` appears, and nothing passes the far end. In the code, the old `return empty` is now a `break` (`terrace.ts` line 313).

**`town.ts` `townClears`: no behaviour change.**
- **What changed.** `build` gains an optional `sink`. After the `clears` closure is defined, it is wrapped (`mkPoly(rectPts(...))`, `outsideRing` false, default margin 0) and stored in a module `WeakMap` keyed on the frozen town. Nothing in `build` reads the sink, and the returned `TownData` is unchanged.
- **Terraces off.** `terraces: false` goes through the same path and gets the same data, and criterion 6's deep-equal tests are untouched.
- **A caveat.** The closure reads `placed` as it stands after the whole layout, so a caller asks about the final town. That is the right reading for the strip.

**Other checks.**
- **`stacks.ts`.** `stackDepth` is a new export that wraps the existing `kitOf`/`worstDepth`. No existing path changes.
- **CI-safety.**
  - Puzzles and sources are read only inside an `it`; the module-level `readdirSync("puzzles")` is the same as in round 1.
  - Tests use `path.join` and no timers.
  - No test reads `assets/private`.
  - `git ls-files assets/private` is empty.
  - `git diff main...HEAD` is empty for `src/core`, `src/render`, `src/grid`, `src/night`, `src/play`, `src/ui`, `src/main.ts`, `tests`, `puzzles`, `tools`, `package.json`, `public` and `index.html`.

## Rule conflicts and risks
- **No hard-rule break.**
  - `src/grid/` and `src/night/` are untouched.
  - There is no new dependency.
  - No Decided rule changes, and nothing is scaled: block width is still `stack.width_m`.
- **`town.ts` is not on C's file list.** The ticket gives it to D ("export `clears` unchanged, nothing else"), and the three risks are D's criterion 16. The change stays in the renderer's own folder and does what D allows, so I do not count it as a break. Main session: note that D's criterion-16 risk tests now live in C.
- **`cornerStyle`'s signature** returns `StackStyle | null`, where the Interfaces have `StackStyle`. The Interfaces allow renames, so this is fine.
- **Once the wall is measured properly, the alley search may still hold 85%, or it may not.** The packer would then aim at a wall up to 0.29 m farther. The re-cut's rule then applies: report the measured share and stop for a re-cut, without lowering the floor.

## Must fix
1. **Measure and close the far gap to the next corner block's real back wall** (`src/render3d/terrace.ts` `farWall_m` and `cornerStyle`/`packTerrace`; `terracepack.test.ts`'s pack wiring and the 85%/5% test).
   - **The far wall** must be the next corner block's actual back wall: `run.len + TERRACE_DEPTH_M − depth_m` of the corner stack that run will really build. It must not be the worst-case candidate depth: assembled corner blocks are 5.624 m deep in 1783 of 2818 cases, not 5.918 m.
   - **One way to do it** is the ticket's design. Fix each corner block (style from `stableHash(nextRun.id)`, its columns and therefore its pieces) before any run is packed. Pass its real `depth_m` as `farWall_m`, and have `packTerrace` take that corner block as given. That also breaks the round-the-block dependency that a preferred-only corner style creates.
   - **The test** then counts tiers against that wall. The criterion-12 test and the branch's own footprint test already compute it as `run.len/W + TERRACE_DEPTH_M − nextBlock.stack.depth_m`.
   - **Expected effect.** The reported seam/alley share and slit share describe the gaps that will actually stand on the street. If they miss 85% / 5%, the builder reports the measured figures and stops for a re-cut (criterion 12's own rule), without lowering the floor. Today, measured that way, they are 49.4% and 6.4%.

## Could improve
1. **The `terrace.ts` header** (line 10) and the `cornerStyle`/`farWall_m` doc comments say the corner styles' depths "differ by 0.03 m". That is true of their deepest candidate pieces and false of the blocks they build. Correct it with the fix above.
2. **In the alley-window synthetic test**, also assert against a real-wall far wall. Today `packSynth` passes no `farWall_m`, so it measures to `run.len`.
3. **Extend the strip test** (the strip occlusion test) to the part of a block past `run.len`, up to the far wall, at the block's height. Once the wall is measured properly that part can be up to 0.376 m deep, in a corner lot that may carry a lower cap.
4. **The three 10.86 m slit runs** (0.361 m) are within the 5% bound. A one-line note in the report for criterion 17 would let the main session find them in screenshots.
