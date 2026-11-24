# 081 CK9 pre-check: every street-facing building wired

**Josh, 24 Nov 2026, after seeing the 3D city:**
- In chat: "The buildings are not attached to the Power lines".
- Card, asked whether every street-facing building should be wired (overturning his 21 Nov "Keep pole side only"): **"Every building wired"**.
- Card, asked whether a wall fitting should be drawn where a drop meets a building: **"Yes, a fitting (Recommended)"**.

**Josh's answers to this note, 24 Nov 2026, on cards (option C is taken):**
- Wall height for drops across the street: **"Same height (Recommended)"**. The 5.5 m wall point is kept, and 059's 5.5 m road clearance is lifted for drops (about 45 a city at 4.8 to 5.5 m, none under 4.2 m).
- The 9 to 15 new clashes with fire escapes and face signs: **"Leave (Recommended)"**.
- The 1 to 4 drops a city running diagonally over a T junction: **"Allow (Recommended)"**.
- The wall fitting: **"Shortlist (Recommended)"**. A few candidates from the owned packs, for Josh to pick by eye.

24 Nov 2026, pipeline-designer. Measured on `ticket/081-puzzles-on-the-city` at 3452599, 6 x 6 one-way on, seeds 1, 2, 3 and 8 (the four pin cities). Not committed. Nothing here is decided until Josh says so in chat.

**This is a sketch.** A throwaway probe outside the repo built each city through stage 9 with the merged code (read only), then laid the new drops beside stage 6's.
- **Wire heights.** The pole end is the model's lowest attachment (`poleModels`, as `circuitdraw.ts` hangs it). The sag is the renderer's, `SAG_RATIO` 0.04 of the 3D length.
- **Clash boxes.** The stage 7 boxes are the kit bounds in `traffic/facadebounds.ts`.
- **Estimates.** The street-light shape (a 4.37 m post and a 1.72 m arm at 3.9 to 4.37 m, from 059) and a roof span's end (deck + 2.0 m) are estimates.
- **The record is the builder's.** The probe reproduces K1's count for today's drops: 25 stage 7 clashes on seed 1 (19 escapes, 6 face signs).

## 1. What is wrong

- **The premise holds.** On seed 1, 426 buildings face a street. 250 have a drop, and 176 face the non-pole pavement. The other pin cities have 456, 456 and 428 facing a street, with 199, 194 and 180 on the non-pole side.
- **Every unwired building can be wired: 0 are left over** on the four cities. Each one faces a pole line across its street. A building facing a park has no street front, so it is outside "street-facing". The 1 to 4 a city that face a T junction's mouth are wired too, but their drops run over the junction (section 2).
- **No drop across a street fits `DROP_MAX_M` 7.5 m.**
  - The shortest is 10.75 m (a 5 m carriageway), then 15.75 m (10 m) and 20.75 m (15 m).
  - The longest is **23.03 m**: a building facing a T junction's mouth, whose nearest pole is 10 m along the street.
- **At today's 5.5 m wall point, a third hang under 5.5 m over the road.** They are all on Apocalypse poles, which attach at 5.86 m. The lowest is 4.82 m on a 15 m street; none is under CK7's 4.2 m floor. 059's 5.5 m road clearance (a Ruling) still binds every wire that is not a crossing. Card 5 lifted it for crossings only.
- **Meeting the wall at storey 2 (8.5 m) clears 5.5 m on every drop**, the lowest at 5.82 m. Every far-side building has 3 to 5 storeys. The lowest single wall point that clears them all is 7.1 m.
- **A new clash: wire against wire.** No drop today comes within 1 m of another wire; the closest is 1.14 m, to a roof span. Drops across the street come within 1 m of a corner span or a roof span on 14 to 21 drops a city at 5.5 m, and on 47 to 64 at 8.5 m. The closest gaps are 0.02 to 0.09 m, which is touching.
- **Most corner-span touches are avoidable.** Every corner-span touch is on a building that is within 7.5 m of a **crossing pole on its own pavement**. There are 50 to 63 such buildings a city. Fed from that pole instead, their drops never cross the street, are 4.25 to 6.56 m long (inside `DROP_MAX_M`), and touch no wire.

## 2. Options, measured (per city, four pin cities)

The new drops are 176 to 199 a city. "Own pole first" means a far-side building within 7.5 m of a crossing pole on its own pavement takes its drop from it; the rest go across.

| Option | Cross the road | Under 5.5 m over the road | New stage 7 clashes | Within 1 m of another wire (corner / roof) |
|---|---|---|---|---|
| Today | 0 | 0 | 0 (today's: 17 to 25) | 0 |
| A. All across, wall 5.5 m | 176 to 199 | 58 to 71 | 9 to 19 | 14 to 21 (5 to 8 / 14 to 21) |
| B. All across, wall 8.5 m | 176 to 199 | 0 | 8 to 10 | 47 to 64 (13 to 21 / 44 to 63) |
| **C. Own pole first, rest across at 5.5 m** | 123 to 139 | 42 to 53 | 9 to 15 | **3 to 10 (0 / 3 to 10)** |
| D. Own pole first, rest across at 8.5 m | 123 to 139 | 0 | 9 to 10 | 14 to 26 (0 / 14 to 26) |

The same for every option:
- **Nothing else is hit:** no tree, street light, signal or sign, at either height.
- **Clearances at 5.5 m:** 0.55 m over a street light's top (estimated shape), 1.25 m over a tree and 0.20 m over a shop sign.
- **Over junction cells:** 1 to 4 drops a city. Over a zebra crossing's cells: 4 to 10.
- **Fan-out is small:** at most 3 drops on any pole (today 1 to 2), and each crossing pole takes 1. The drops across run square to the street, a median of 1 m along.

What stops each option:
- **A and C:** 059's 5.5 m over the carriageway. Lifting it for drops is a change only Josh's own words can make.
- **B and D:** nothing breaks a check, but they add a second wall height. At 8.5 m the drops rise into the roof spans' height: 14 to 26 near-touches a city.
- **Roof spans are drawn only where a job uses them** (`usedRoofSpans`), so a roof touch shows only in a puzzle that uses that span. CK17d keeps a roof span 1 m from pole spans but does not look at drops.

## 3. Recommendation: C

**CK9, re-worded (a sketch for the architect).** A building on the non-pole pavement takes one drop:
- from the **crossing pole on its own pavement**, when one is within `DROP_MAX_M` 7.5 m of a front column. The pairing and the ties are as today;
- otherwise **across the street**, from the closest pole of the facing pole line, up to **`DROP_CROSS_MAX_M` 23.5 m** in plan (23.03 m is the longest measured).

Every drop meets the wall at 5.5 m and gets a wall fitting there (K3).

It is the smallest rule that wires every building:
- one clause added to the pairing;
- one wall height and one fitting height;
- no corner-span touches, and the fewest roof-span touches (3 to 10).

Its cost is that 42 to 53 drops a city hang 4.82 to 5.5 m over the road. That is below 059's 5.5 m, and above the 5.20 m crossings Josh accepted and the 4.2 m floor.

If Josh keeps 5.5 m over the road, **D** is the rule: 0 under 5.5 m, but 14 to 26 roof touches a city.

What it costs:
- **Josh's rulings it moves:**
  - Q4 and Q12 ("Keep pole side only"), already overturned by "Every building wired".
  - 059's 5.5 m road clearance, for drops (question 1). Only his words can make this change.
- **Proposed numbers it moves:**
  - `DROP_MAX_M` gains a second reach for drops across a street.
  - CK9's ban on drops from crossing poles goes.
- **Merged work it re-opens:**
  - K2b: `layDrops`, CK9's check in `checkplaces.ts` (the own-side and crossing-pole tests and "never crosses" all flip) and its 2 fixtures.
  - Stage 6's digest pin `9ff1b134`.
  - K3: the drawn drops and the new fitting.
  - CK11 and CK12: building lamp nodes rise from about 250 to every street-front building.
  - The eras read drops (`tech/circuit.ts`, `holdout/guard.ts`, `ruin/grow.ts`, `ruin/guard.ts`), so their digests move.
  - Stages 7, 8 and 9 do not move: their keep points are poles and lights only.
- **CK14 needs a reading.** It asks for "both poles on a district block", but a drop across the street hangs from a pole of the facing block.
- **CK17d** may need drops added to what a roof span keeps 1 m from. That is the architect's to word; the probe did not measure what it would refuse.

## 4. Questions for Josh

1. **"Drops across the street at the same 5.5 m wall point would hang 4.8 to 5.5 m over the road, about 45 a city (crossings already hang at 5.2 m). Or meet the wall at storey 2 (8.5 m) to keep 5.5 m over the road, with more wires touching roof lines in puzzles?"** Answer "Same height" or "Storey 2". *Recommended: Same height.*
2. **"Feeding every building adds 9 to 15 clashes a city with fire escapes and face signs, on top of today's 17 to 25. Leave them, as before?"** Answer "Leave" or "Fix". *Recommended: Leave (card 1's "fix them later").*
3. **"1 to 4 buildings a city face the mouth of a T junction, so their drop runs 23 m diagonally over the junction. Allow it?"** Answer "Allow" or "Unwired". *Recommended: Allow.*

## 5. What the orchestrator does for each answer

- **Same height, Leave, Allow:**
  - The lead-architect re-cuts CK9 (option C) in `docs/design/070-K1-circuit.md` and ticket 081, quoting Josh, and writes that 059's 5.5 m does not bind drops. K2 checks drops against CK7's 4.2 m (lowest 4.82 m).
  - The architect gives CK14 a reading and decides on CK17d.
  - K2b re-opens on the branch: the drops, the CK9 check and fixtures, and stage 6's pin. K3 re-opens for the fitting and the new drops.
  - The node tables and the era pins are re-counted.
  - A fresh pre-check is needed only if the architect's re-cut differs from section 3, or adds drops to CK17d.
- **Storey 2:** the same, with option D. Drops across the street meet the wall at 8.5 m, and CK9's check reads the wall height by side. There is no change to 059.
- **Fix:** H2 and H1c re-open, as K1's question 5 first proposed: escapes and face signs skip a column that takes a drop. That needs a pre-check before their builder, and stage 7's pins move.
- **Unwired:** CK9 skips a drop whose plan line crosses a junction's cells. Its check names the case, and 1 to 4 buildings a city stay unwired.

## 6. The probe

The probe is in `C:\Users\Josh\AppData\Local\Temp\ck9probe\`: a copy of `src/core` and `src/city`, with `node_modules` linked to the repo's.
- **The probe file:** `src/city/ck9.probe.test.ts`. Its output is `pins.json`, summarised by `sum.cjs` and `c.cjs`.
- **To re-run:** `SEEDS=1,2,3,8 npx vitest run --maxWorkers=2 src/city/ck9.probe.test.ts`.

Nothing of it is in the repo.
