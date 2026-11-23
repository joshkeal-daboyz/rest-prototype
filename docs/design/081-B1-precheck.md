# 081 B1p · Pre-check of CK17 (roof structures and roof spans)

23 Nov 2026, pipeline-designer. Branch `ticket/081b1-roof-spans` at d6a437b (no `src/` change from a2f819e). Not committed. Nothing here is decided until Josh says so in chat.

**This is a sketch.** A throwaway probe outside the repo re-laid K1's CK1 to CK11 (it reproduces K1's seed-1 counts exactly: 562 poles, 126 corner spans, 74 crossings, 250 drops, 386 post places, one network) and CK17 as `081-B1-roof-spans.md` words it, on the merged stages 1 to 9. Pole picks use `poleAt`'s rule (`stableHash(id) % 3`), so the heights match what K3 would draw. The fit search is a heuristic, not P1: "no fit" means none found within its budget, unless marked *impossible*. K2d's and P1's numbers are the record.

Runs: the 20 named runs (6 x 6 seeds 1 to 10, one-way on and off), as B1p asks. Fits: 6 x 6 seed 1, one-way on (answer 3).

## 1. Verdict

**Mostly holds. Three findings change the rule's numbers. One of them needs Josh's word.**

| CK17 part | Verdict on 20/20 runs |
| --- | --- |
| (a) Roof structures on street-corner roofs | **Holds.** 99 to 152 a run, 2,490 in all. 0 big roof props on their columns on every run. |
| (a) Heights and CK7's 4.2 m floor | **Holds.** The lowest attachment is 11.5 m. The lowest point of any offered span is 5.85 m, at its ground-pole end. |
| (a) The 1.2 m keep square (H4) | **Holds, but H4 has more to move.** It overlaps a small roof prop on 24 to 48 roofs a run (697 in all). On seed 1 that is **26**, not the note's 14. |
| (b, c) Span kinds, the 40 m cap, street cells only | **Holds.** No offered span runs over a block. The longest is 39.54 m. |
| (d) 7.5 m over junctions | **Holds as a check** (offered spans clear every stage 9 piece by 2.50 m or more, with 0 through one). **It does not hold as the note words it:** it depends on the ground pole's pick, which stage 6 cannot read. This is finding 1 and new question A. |
| (d) Down spans against stage 7 | **Reported, as the note proposes.** 136 of 5,731 offered down places pass through a stage 7 piece: 3 to 12 a run, mostly fire escapes. |
| Pilot fits with carriers (answer 5) | **Not on poles alone.** 6 of the 16 pilot puzzles cannot stand on poles in any district. With roof nodes (6b), 15 of 16 fit. Puzzle 15 fails CK14 whatever is done (finding 2). |

### Finding 1. The 7.5 m junction floor is set by the pole's model, and stage 6 can't see the model
- Over a junction, the low point of a roof-to-pole span is at its pole end. On a Palm pole (8.5 m) it clears 7.5 m. On an Apocalypse pole (5.86 m) it never does, on any run.
- So the note's fail line ("from a 3-storey roof ... fails, 5-storey passes") is wrong. Measured over the 20 runs:

| Roof | Roof-to-pole places over a junction that pass 7.5 m |
| --- | --- |
| 3 storeys | 417 of 637 |
| 4 storeys | 394 of 569 |
| 5 storeys | 396 of 595 |
| any roof, to an Apocalypse pole | 0 of 1,801 |

- **The cause.** The pick is `poleAt` in `src/render3d/powerkit.ts`. `src/city/circuit/` may import only `src/core/` and `src/city/` (ticket rule). So K2d can only assume the lowest pole, 5.86 m. Under that assumption:
  - no roof-to-pole span is ever offered over a junction;
  - 1,937 roof-to-pole street spans that land near a junction go too (5,237 offered becomes 3,300).
- The floor is also cautious. Of the 1,617 places that fail only the 7.5 m floor, 287 come within 1 m of a real signal mast or arm.
- **The pilot doesn't need these spans.** No fit found for 01 to 16 uses a span over a junction (section 3), whatever the pole pick.

### Finding 2. No pole on seed 1 has more than 3 spans, so a junction with 4 wire lines can't stand on one
- The 33 "four-attachment" poles in K1 have 3 spans and a drop. A drop serves only a lamp.
- A junction whose 4 or more lines go to things other than lamps needs 4 or more spans. That rules out **03, 04, 07, 11, 12 and 15 on poles, in any district**. The note's "fit on poles if the district has enough four-attachment poles" doesn't work: 05 and 13 fit on poles, and 03, 07, 11 and 12 never do.
- **Roofs fix it in a way the note didn't name.** A roof structure's `down` spans end on poles, so a pole at a corner gains up to 2 more ports. With 6b alone, every one of those puzzles fits except 15.
- **Puzzle 15 fails CK14, not CK17.** Each of its two feeds has 2 lines. Josh's K1 Q10 gives a feed one entering span, so it needs a rework, which answer 4 already covers ("Change the puzzle instead"). No question.

### Finding 3. Smaller corrections for the designer and the architect (not questions)
- **Keep square:** 26 small props on seed 1, not 14 (the note measured pivots, not footprints).
- **Down places per roof:** 4 for 824 roofs (33%), 2 for 1,205, 0 for 450 (18%). A roof with 0 does nothing in a one-block job: no node, no carrier.
- **"Street cells within one cell of the junction"** catches 11 `down` spans over the pavement (CK17d). Read it as carriageway and crossing cells only, or accept losing those 11 places.
- **Down spans meet escapes (170 boxes), air-conditioners (18), face signs (7) and roof props (7). They meet no blade signs.** Stage 6 runs before stage 7, so it can't filter them. With question 3's "only where used", they show only when a job uses one.
- **A lever, for information:** if `down` places also reach the block's own crossing pole at that corner, the roofs able to hold a switch in a one-block job rise from 831 to 2,040. CK17c is Proposed, so this is the designer's choice, not Josh's.
- **A taller roof structure helps.** At Sci-Fi City `Powerpoll`'s 5.02 m attachment instead of 2.0 m, down spans through stage 7 fall from 136 to 26. Nothing else moves.

## 2. Options for finding 1, measured (20 runs; offered places)

| Option | Junction roof-to-pole | Street roof-to-pole | Pilot fits | What it costs |
| --- | --- | --- | --- | --- |
| **A. Stage 6 assumes the lowest pole (5.86 m)** | 0 | 3,300 | 15 of 16 (all but 15) | Over an intersection a roof wire goes **roof to roof only**: 441 places at 293 of 1,218 junctions. This narrows Josh's 6c at junctions, so only his words can do it. No merged code moves. |
| B. The pole pick moves into `src/core/` so stage 6 reads it | 1,207 (Palm poles only) | 5,237 | 15 of 16 | An architect re-cut: `poleAt` and the three attachment heights move out of merged 071 B (`powerkit.ts`), and the renderer reads them back. 6c holds where the pole is tall. |
| C. Drop the 7.5 m floor to the masts' real reach | estimate: most of the 1,617 places that fail only the floor return, less the 287 that meet a mast or arm | (in the same 1,617) | 15 of 16 | Stage 6 can't see stage 9's masts (it runs before). It would need a floor stage 9 keeps instead, which is a re-open of merged TR1. Not measured as a rule. |

## 3. Pilot fits on 6 x 6 seed 1 (sketch search; the fewest blocks found)

| Puzzle | Poles only (carriers) | + breakers, switches, fuse boxes on roofs (6b) | + junctions on roofs (Q1 "yes") |
| --- | --- | --- | --- |
| 01, 02, 05, 06, 08, 13, 16 | 1 block | 1 block | 1 block |
| 03, 07 | impossible (4-wire junction) | 1 block | 1 block |
| 09 | none found up to 2 blocks | 1 block | 1 block |
| 10, 14 | 2 blocks | 1 block | 1 block |
| 11 | impossible (4-wire junction) | 2 blocks | **1 block** |
| 04 | impossible (5-wire junction) | 2 blocks (its junction on a pole fed by roof spans) | 2 blocks |
| 12 | impossible (4-wire junction) | 2 blocks | 2 blocks |
| 15 | impossible (CK14 feeds) | impossible | impossible |

Every roof fit uses `down` spans. 04, 11 and 12 also use one `street` span each. None uses a `junction` span. Roofs in the pilot add ports to poles; they hardly ever carry the diagonal Josh's rule is about.

**Effect on the note's questions:**
- **Q1.** The case for "junctions yes" is weaker than the note says. 04 doesn't need a roof hub: even a roof junction can't take its 5 lines on one block, where a roof has at most 4 down places. Roof junctions save one block, on 11 only. The recommendation can stand, but on that reason.
- **Q3, Q4 and Q5.** The numbers support the recommendations: 0 big props on corner roofs, and every fit stays inside its district.
- **Q2.** Not affected.

## 4. Recommendation
**Option A, roof to roof only over an intersection.** The pilot loses nothing. Stage 6 stays independent of the renderer's pick, and no merged section moves.
- **Cost:** it narrows Josh's 6c ("Roof or pole") at intersections. That needs his own words.
- **Not changed:** no check is loosened, no threshold changed, no digest pin moved.
- H4's job grows from about 14 to about 26 props on seed 1 (24 to 48 a run). That is H4's planned re-pin.

## 5. Question for Josh (new; the note's questions 1 to 5 are asked separately)

**A. "Over an intersection, a roof wire may only go roof to roof (Recommended), or also come down to a ground pole where that pole is a tall one?"**
- **Roof to roof (Recommended):** no pilot puzzle uses it, and the city stage stays simple. 441 places over 293 intersections remain.
- **Tall poles too:** the architect moves the pole-model choice into the shared types first, a re-cut of merged code. Then about two thirds of the roof-to-pole places return.

## 6. What the orchestrator does for each answer

- **"Roof to roof":**
  - The architect writes Josh's words at the top of both B1 notes and into ticket 081.
  - The designer amends CK17d and its fail line: stage 6 checks every roof span against the lowest pole, 5.86 m. The fail fixture becomes a roof-to-pole span over a junction to any pole. Finding 3's wording fixes go in too.
  - K2d is cut in full. P1's fit needs no change.
- **"Tall poles too":**
  - The architect re-cuts first: a `src/core/` section types `poleAt`'s choice and the three attachment heights, and the renderer (071 B's owner) reads them back from core. That is a small re-open of merged 071 B, with its pins kept.
  - K2d then reads the pick. B1p re-runs finding 1's table on the real pick.
- **Either way:**
  - Puzzle 15 goes to rework in P2a under answer 4.
  - H4 is cut for about 26 props on seed 1.
  - P2a may plan 03, 04, 07, 09 to 12 and 14 with roof nodes. Without 6b, they would need reworks.

## 7. The probe
`C:\Users\Josh\AppData\Local\Temp\b1pre\`: `layout.ts` (CK1 to CK11), `roofs.ts` (CK17), `main.ts` (the 20 runs; switches `attach=`, `pick=hash|low|high`, `mid=1`), `fit.ts` (pilot fits; `mode=poles|roofs|roofsJ`, `maxb=`, `budget=`). It runs on a copy of `src/core` and `src/city` from d6a437b, with `node_modules` linked, one process at a time. The other cities (3 x 3, 6 x 4) were not run.
