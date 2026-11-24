# 081 pre-check: every building on a live pole is powered, and adds load

**Josh, 24 Nov 2026, in chat:** "I would like all buildings to receive power if they are connected to the feed. I would also like the feed to show as being connected to each building."

**On cards:**
- Which buildings count: **"Drop on a live pole (Recommended)"**. Any building whose drop hangs from a pole that a live puzzle line runs through lights up, scenery included.
- Do they draw on the feed's capacity: **"Yes, they add load"** (not the recommended visual-only).
- How to show it: **"Live drops glow (Recommended)"**.

**Josh's answers to this note, 24 Nov 2026, on cards:**
- How to fix the puzzles: **"Raise (Recommended)"**. Each puzzle's capacity and fuse ratings are raised by the scenery its intended win lights; 09 gets a hand fix.
- What one building draws: **"Whole"** (1 lamp-load each; this note measured 14 of 16 holding at 1, with 09 and 12 failing).
- The building on the feed's own pole, outside the district: **"Dark"**.
- L2's real street lights, given 26 lit buildings in P0's win: **"Raise the cap"** (measured first).

24 Nov 2026, pipeline-designer. Measured on `ticket/081-puzzles-on-the-city` at c4195bb (K2e merged), 6 x 6 seed 1, one-way on. Not committed. Nothing here is decided until Josh says so in chat.

**This is a sketch.** A throwaway probe outside the repo built seed 1 with the merged code (read only). The jobs it measured:
- `puzzles/city/city-two-ways-round` (P0), the one hand-laid city puzzle;
- the 15 pilot fits, from B1q's heuristic fit (as in K2ep), re-run on the merged drops. 15 still has no fit.

**How the probe modelled scenery:**
- Each scenery building on a job pole became a plain hidden lamp on `src/grid/`, which is unchanged.
- On a carrier pole, the lamp hangs from a hidden junction on that line, on its side of the cut.
- To keep the grid's hop ties, every line was split the same way (into 3).
- Play was judged by the analyzer (solvable, fewest clicks, winning configs, dead first moves), the start state and the shortest win replayed. P0 also ran its check block.
- The schematic notes 01 to 16 have no check blocks, so their traps are judged by the analyzer's dead first moves only.

The builder's numbers are the record.

## 1. What is wrong

- **The premise holds only with new numbers.** Every pilot is tuned to its capacity and fuse ratings, often with 0 to spare. Any per-building load added to the numbers as they stand breaks most of them: at 0.05 already, and the same at 0.25, 0.5 and 1.
- **How it breaks:**
  - 05 and 13 brown out at the start;
  - 09, 11, 12 and 14 blow a fuse at power-up;
  - P0, 03, 04, 07, 10 and 16 can no longer be won (or are won another way).
- **P0 is the clearest case.** It has 23 scenery buildings on its poles, and its winning state lights all 23. It wins at 2 of 3, so it can take at most **0.043** a building:
  - at 0.04 it plays the same;
  - at 0.05 the win is 3.15 of 3, a brownout, and the trap cannot recover.
- **The fits carry few buildings, P0 many.** The fits put nodes on neighbouring poles, so they carry 1 to 6 buildings, except 09 (19) and 10 (20). P0's ring carries 23. P2a's fits, laid for the camera, will likely be nearer P0's count. That is an estimate.
- **Fractions need care.** 0.1 is not exact in floating point. Sized to 0.1, 11 and 14 failed on rounding (2.3000000000000003 > 2.3). 0.25 and 0.5 are exact. `words.ts` prints numbers as given ("using 7.75 of 8.75").

Scenery buildings on each job's poles (seed 1):

| Job | Feed capacity | Lamp load | Fuses | Buildings | On carriers | On node poles | On the feed's pole | Other block |
|---|---|---|---|---|---|---|---|---|
| P0 | 3 | 3 | none | **23** | 19 | 4 | 1 | 10 |
| 01, 02, 13 | 3 | 2 to 6 | 13: 2 | 1 each | 0 | 1 | 1 | 0 |
| 03, 04, 06, 07 | 3 to 4 | 2 to 6 | 07: 3 | 2 each | 0 | 2 | 1 | 0 |
| 08, 14, 05, 16 | 3 to 4 (05: 3 + 4) | 4 to 7 | 14: 2, 3; 16: 3 | 3 to 4 | 0 | 3 to 4 | 0 to 1 | 1 to 2 |
| 11, 12 | 6, 4 | 5, 7 | 11: 2; 12: 1, 2, 3 | 5, 6 | 2, 3 | 3 | 1 | 0 to 1 |
| 09, 10 | 4, 3 | 6, 4 | 09: 3 | **19, 20** | 14, 17 | 5, 3 | 1 | 3, 5 |

The added load is buildings x the per-building load. For P0: 5.75 at 0.25, 11.5 at 0.5 and 23 at 1, against a capacity of 3.

## 2. Options, measured

"Plays the same" means: the same start (no new brownout or blow, the same lit lamps and readable faults), the shortest win still wins, and the analyzer's fewest clicks, winning configs and dead first moves are unchanged. For P0, the check block's solution and trap pass too. There are 16 jobs (P0 and 15 fits).

| Option | Per building | Plays the same | What stops it |
|---|---|---|---|
| **A.** Load added, numbers as they are | 0.05 | 5 of 16 (01, 02, 06, 08, 10) | Tuned slack is 0 to 1 |
| | 0.25 | 4 (01, 02, 06, 08) | 05 and 13 brown out at the start; 09, 11, 12 and 14 blow at power-up |
| | 0.5 / 1 | 3 (01, 02, 06) | Also 08 |
| **B.** Load added; each feed's capacity and fuse rating raised by the scenery its intended win lights | **0.25** | **15 of 16** | 09: its start lights more scenery under `fb_A` (rating 3) than its win, so the fuse blows at once |
| | 0.5 / 1 | 14 | 09, and 12 (`fb_2` blows at the start) |
| | 0.1 | 13 | 09, plus 11 and 14 on rounding |
| C. Visual only (Josh declined it) | 0 | 16 | Nothing |

What B does to the numbers, at 0.25:
- P0's capacity becomes 3 + 23 x 0.25 = **8.75**: it starts at 1.5 of 8.75 and wins at 7.75 of 8.75, a slack of 1, as before.
- At 1 a building, it becomes 26: "using 25 of 26".

What B still keeps under A's flaws:
- A building beyond a damaged span stays dark. The line is live only up to the break, which is the Decided signature: "current up to a sparking break".
- Buildings on another block light when their drop hangs from a district pole: 10 of P0's 23. That is Josh's rule read literally, and K2e's reading that a drop belongs to its pole's block.

## 3. Recommendation: B at 0.25 a building

**The rule (a sketch for the architect).**
- A building whose drop hangs from a pole of a live job line is a load of **0.25**: on a carrier pole, on a node pole, or on the feed's pole.
- It is live only on the side of a cut that current reaches.
- Each city puzzle's feed capacity and fuse ratings are its schematic's, plus the scenery load its intended solution lights. P1's fit writes them into the draft.
- 0.25 is exact in binary, so there is no rounding.

**What it costs:**
- **Every pilot becomes a rework under answer 4.** Its capacity and ratings change, so each note gets its "What changed" line and its own analyzer numbers.
  - P0's file and note re-open: capacity 3 to 8.75.
  - **09 needs a hand re-lay:** a fit that keeps `fb_A`'s branch off poles with buildings, or a rating sized to its start.
- **K2c re-opens (the converter, CK15).**
  - It adds hidden lamp and junction ids, split the same way on every line to keep "nearer feeder" ties. The probe did this; a split of only some lines was not measured.
  - So criterion 3 ("same node and line ids, none added") flips.
  - The hidden lamps stay out of `target`. All 16 pilot files name their targets; an absent `target` means every lamp.
  - `CityPuzzleConverted` gains a building-to-lamp map for the glow.
  - K2c's "plays the same" case moves with P0.
- **CK14:** its Proposed "a building the job does not name stays dark" goes. A district building fed from a pole off the job stays dark.
- **Drawing moves:**
  - L1's "Puzzle buildings only (Recommended)" is overtaken by Josh's new words. Scenery windows light from their lamps.
  - L-Q5's "up to 10" street lights meets **26 lit buildings** in P0's win.
  - The drop glow is new renderer work.
  - Hidden nodes get no overlay icon, no pick and no HUD line.
- **Nothing in the GDD's Decided rules stops it.**
  - Capacity and fuse rating are "New for the minigame (Draft, Josh's to tune)" in the brief, and Draft in the GDD (05, "Capacity and restraint").
  - The Decided "Lamps are leaves" holds: scenery loads are leaves and never block.
  - The GDD's Draft "Live cables don't glow" (08, "Cables in the dark") differs from "Live drops glow". Josh's card stands, since that line is Draft; the GDD may want a line.
- **No stage, digest pin or city number moves.** Stage 6 is untouched.

## 4. Questions for Josh

1. **"With your current capacities, any building load breaks 12 of 16 pilots (brownout at the start, fuses blowing, or no win). Raise each puzzle's feed and fuses by what its street draws in the intended solution, or keep the numbers and rework those puzzles by hand?"** Answer "Raise" or "Rework". *Recommended: Raise.*
2. **"How much does one building draw, against a lamp of 1? A quarter (P0's feed becomes 8.75; 15 of 16 hold), a half or a whole bulb (14 hold)."** Answer "Quarter", "Half" or "Whole". *Recommended: Quarter.*
3. **"The feed's own pole stands outside the district (your 'rest of the city dead'). It has a building on it in 15 of 16 jobs. Light it too?"** Answer "Lit" or "Dark". *Recommended: Lit. It is always live, and "Raise" absorbs it.*

## 5. What the orchestrator does for each answer

- **Raise, Quarter, Lit:**
  - The lead-architect re-cuts CK14's scenery clause and CK15 (hidden loads, the uniform split, the building-to-lamp map). It opens a converter section after K2c (grid-simulator).
  - It adds the sizing to P1 (the fit tool writes the raised capacity and ratings, from the schematic's shortest win), and a drawing section for the glowing drops and scenery windows (renderer, after L1).
  - P0's file and note re-open. P2a's notes each become reworks; 09 is flagged for a hand re-lay.
  - L-Q5 is re-asked with the 26-building count.
  - No fresh pre-check, unless the re-cut differs from section 3.
- **Rework:** the same converter and drawing sections, with no sizing in P1. P2a's designer reworks 11 to 13 pilots by hand. P0 needs a capacity of at least 3 + 23 x the load.
- **Half or Whole:** as Raise. 09 and 12 need hand re-lays.
- **Dark:** the converter skips drops on the feed's pole. That is one building fewer in 15 of 16 jobs.

## 6. The probe

`C:\Users\Josh\AppData\Local\Temp\allpow081\`: a copy of `src/core`, `src/city` and `src/grid`, with `tools/checkrun.ts` and `tools/analyzerun.ts` and `node_modules` linked to the repo.
- `src/city/allpow.probe.test.ts` is the driver. `k2efit.ts` is K2ep's fit, now also returning its places and routes.
- `out-main.json` holds every job; `sum2.cjs` summarises it.
- To re-run: `LOADS=0.05,0.1,0.25,0.5,1 npx vitest run --maxWorkers=2 src/city/allpow.probe.test.ts`. `ONLY=P0,10` limits the jobs.
- The GDD was read from a shallow clone at `C:\Users\Josh\AppData\Local\Temp\gdd081\` (f6e5ea3).

Nothing of it is in the repo.
