ticket: 050-city-pack-assembly-b
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B only. Load the recipe pieces into an optional `ModelSet.stack` slot, build one unpickable `stack:<style>` Group per assembled stack (design item 5), and add a dev-only stack gallery (`gallery=city-pack&stacks=1`, design item 7). The gallery shows every style on each lot type it serves, at max floors, mid-row and both corner variants, with captions that mark guesses. It also has a click line of exactly the recipe pieces (roofs included) that saves through 045's saver unchanged. The town is not touched.

## Does the branch do it?
The diff against `goal/city-style` touches seven files, all in `src/render3d/`: `gallery.ts`, `models.ts`, `models3d.ts`, `stacks.ts`, `stacks.test.ts`, and the new `stackgallery.ts` and `stackgallery.test.ts`. `town.ts`, `calibration.ts`, `renderer.ts`, `gallery.test.ts`, `models.test.ts` and the models3d tests are untouched, and `git ls-files assets/private` is empty. I did not re-run the suite, as instructed; the gate is green at 1786.

**6. Loading: met.** `stackgallery.test.ts`, "loading the stack pieces":
- "the recipe pieces load into ModelSet.stack, in key order, and every other slot is as before" uses a fixture manifest and a fake box GLB. Dressing and the whole tower are never loaded.
- "without stackKeys nothing extra is fetched and the set has no stack slot" shows no GLB is fetched and `"stack" in set` is false. A plain `ModelSet` literal and `NO_MODELS` still type, which `ModelSet = Record<...> & { stack?: ... }` guarantees.
- "a piece whose root is missing from the GLB drops only the styles that need it": `apartment-01` drops while `apartment-02` and the office survive.
- "with no city-pack in the manifest the slot is null and nothing else changes".
- The existing load tests are not in the diff.
- `planStackPieces` in `models.ts` is a load-planning helper only, which is what the ticket allows there.

**7. One unit: met.** `stackGroup` (`models3d.ts`) is a `Group` named `stack:<style>` with one wrapper per piece (a bare wrapper when a root is missing). Its tests:
- "each child's world transform is the assembly's" composes the expected matrix independently, over every style x {none, +x, -x, both} on large, within 1e-6.
- "its clones share the cached roots' geometry and materials, and nothing in it can be picked" checks `toBe` identity, a real `Raycaster` returning `[]`, and a raycast on every node.

**8. The stack gallery: met.**
- `stacks=1` alone, with no `gallery=`, with `stacks=0` and with `gallery=town-pack` all return null (`stackGalleryRequested`).
- The layout test checks every style x type against `stackRange`: a mid row, both corner variants exactly where assembly can make them, and max floors.
- No-overlap is checked with `galleryRectsOverlap` over cells, outlines and click-line cells.
- The click line equals `recipePieceKeys()`, roofs included, with four copies each. A test shows the plain pack gallery still leaves roofs out.
- Click and shift-click patches equal the pack gallery's and the literal `{ key, entry: { front } }`.
- Captions: "marks guess exactly where neither the code's table nor the saved file has the key" goes through the real `effectiveFronts` merge of a code table and a saved file, and checks every piece line in every shown stack.
- `gallery.test.ts` is not edited. The new `only` and `originX` options default to the old behaviour.

**9. Josh's check:** this is not mine to judge. The title and captions give him what he needs: guesses, `open ... guess`, the z alignment, and the corner-side strip on the outline.

**Every section (16 to 18):** nothing in the diff touches the excluded folders. `stacks.test.ts` changes only section A's own tests on this ticket (the A-review follow-ups), not pre-existing tests.

**A-review follow-ups**
- **`open` precedence, table > recipe > "+x": done.** `stacks.ts` `cand` now reads `bf?.open ?? style.open?.[key] ?? "+x"`. The A test is rewritten to match and adds the "no table line" and "saved front with no open" cases. `openOf` in `stackgallery.ts` uses the same order, and "the open the caption names is the open the assembly turns the piece by" ties the caption to the assembly.
- **Offices centred in z: done.** `zExtent` gives "footprint" styles centre alignment, and `worstDepth` uses it too, so fit and assembly agree. New test: "an office is centred in z: base, floors and roof share one middle, and the deepest piece's front is on the lot's front edge". Captions say `z: centred (office)` or `z: back-aligned`.
- **Dressing-key test: done.** `props` keys are excluded from the dressing regex, so ticket 052 can fill a slot without editing this test.
- The 1 cm / 5 cm name and the `sweep` comment are fixed.

**Builder's flags**
1. **`stackgallery.ts` is a new file not in the list.** It is the pure data half: no three, no DOM, no fetch, no import from `gallery.ts`. It sits in the owner's folder, so it breaks no folder rule. Splitting it out makes it easier to test and keeps `gallery.ts` from growing. Accept.
2. **The click line comes after the stacks, not below them.** The ticket says "below". A row after the stacks, reached with End, is a fair reading for a camera that pans only along x. The layout test checks it starts past the last stack. But `rig.jumpToEnd()` goes to `world.maxX`, which is the last click-line copies, not the line's start (see Could improve 1).
3. **The 49 saved "+z" lines count as saved, so they are not marked guess.** This is what criterion 8 literally says ("neither the code's table nor the saved file"). It does mean finding 2's unseen first-click "+z" lines read as confirmed. Josh should be told that a missing `guess` mark does not mean he has seen that door (Could improve 2).
4. **A clicked corner front is saved without `open`.** This is consistent with 045's saver, which the ticket keeps unchanged. Criterion 9 already has Josh report wrong second faces in chat, for C to promote. `effectiveFronts` keeps a code line's `open` when a saved front overrides it and logs that the open side is not recalibrated. Acceptable for B.
5. **Shift-click exclude is saved but not applied to the stacks.** `stackGalleryLayout` passes `exclude` only to the click line, not to `shownStacks`. The ticket gives exclusion-drops-style to C's chain (item 6), so B is not required to apply it.
6. **The town doesn't pass `stackKeys`.** That is correct for B ("the town is not touched"). The gallery uses its own whole-pack load (`pack.root` with a `hasRoot` filter), so no extra fetch happens in the town or on CI.

**Dev-only gating.** `stackGalleryRequested` is evaluated only inside `createGalleryRenderer3d`, which is the existing gallery path and unchanged in how it is reached. The saver stays behind `dev && pack.manifest`. Nothing new enters the build path.

**CI-safety.**
- `describe.skipIf(!existsSync(REAL))` calls `existsSync` at module level. That is a stat, not a read; the `readFileSync` is inside the `it`, and the comment explains why.
- `REAL` is a relative POSIX path.
- There are no timers. Every other test uses typed-in fixtures and a fake GLB.

**3D portability.** `src/grid/` and `src/night/` are untouched, and `stackgallery.ts` imports only `core`, `models`, `stacks` and `town`.

## Rule conflicts and risks
- No hard rule is broken: no file outside `src/render3d/`, no `src/core/` change, no new dependency, no GDD rule touched, nothing from the packs committed.
- **Risk for Josh's check (finding 2):** with the 49 saved "+z" lines, most shop and apartment pieces will show no `guess`, although Josh may never have looked at them. The gallery itself is the check, but the B summary should say so.
- **The corner `open` trap is narrowed, not gone.** A saved front change on a corner piece still leaves the recipe's lot-frame `open` in place, so the second face may flip. This is visible in the gallery and is reported in chat per criterion 9.

## Must fix
none

## Could improve
1. `gallery.ts`, End handling: with the stack gallery, End lands on the last click-line copies (`world.maxX`), not on the start of the click line. Make it jump to `stacks.lineTitleAt.x`, or change the title line "End jumps to the click line" to match what End does.
2. `stackgallery.ts` `stackGalleryTitle`: add a line saying that a saved "+z" counts as saved even if it came from a first click. Then Josh knows that a piece without a `guess` mark still needs a look.
3. `stackgallery.test.ts`, the real-manifest test: `if (... ) return;` passes silently on a wrong-version manifest. Use `ctx.skip()` there, as `stacks.test.ts` does.
4. `stackGalleryLayout`: consider passing `exclude` through to `shownStacks`, so that a style with a shift-clicked piece drops from the row as it will in C. Or note in the title that exclusion takes effect in the town only.
