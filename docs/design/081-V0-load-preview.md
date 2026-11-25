**Josh's answers, 25 Nov 2026, on cards:** V-Q5: "On, a key hides it (Recommended)". V-Q4: "+3, load added (Recommended)". V-Q6: "Keep counting it (Recommended)" (a fault the player has read stays in the numbers).

**Josh's answer:** *(open: V-Q4, V-Q5, V-Q6)*

# 081 V0 · Pre-check of V2: what the load numbers give away, pilot by pilot

*Pipeline designer, 25 Nov 2026. A probe sketch on `origin/main` 49ae1af (P2a2's 16 pilots and P0, all on 6 x 6 seed 1, one-way on), run through the conversion on `src/grid/` as `npm run check` does. At every state of each check block's solution, traps and recoveries (117 distinct states), every breaker, switch and readable fault got its preview three ways: **drawn** (V-Q2 as answered: unreadable faults treated as sound), **true** (the real what-if) and **known** (drawn, but a fault the player has already read stays counted). The V2 builder's numbers are the record. The 13 named cities were not run: the preview is a pure grid function on authored puzzles, and no city check changes.*

## 0. First: two premises in the ticket are off
- **The true what-if leaks on 6 pilots, not 2.** The ticket names 07 and 16. 06, 09, 10 and P0 leak too: a throw onto a line with a hidden break shows a smaller number. That is a break on a switch's other line, not a fault behind a fault.
- **05 is not untouched.** Its trap's wrong move (`br_n`, +2) is red before it is made: North browns out.

## 1. Holds
**"Faults hide faults" holds with the drawn load: 0 leaks in 117 states** (by construction: it never reads a hidden fault; the probe confirms it). The fuse and feed "2 of 3" labels (V3 criterion 4) read only the lit state, so they leak nothing either.

**The cost is the puzzle.** Red marks the trap's wrong move before it is made on **10 of 17** pilots. It is the same under all three counts. On 03 the numbers do the sum without any red.

| Pilot | Traps red before made | The giveaway (drawn) | True what-if leaks (states) |
| --- | --- | --- | --- |
| 01 | 0 of 0 | | 0 |
| 02 | 0 of 1 | every switch reads 0 | 0 |
| 03 | 0 of 2 (1 of 2 under reading R1) | −3, −2, −1 at 7 of 5: the sum is done | 0 |
| 04 | 1 of 1 | `br_A` +2 red | 0 |
| 05 | 2 of 2 | `br_n` +2 red | 0 |
| 06 | 0 of 1 | | **1**: `sw_1` −1, not 0 (the lane's spark) |
| 07 | 1 of 1 | fuse +3 red at the start | **2**: fuse +2, not +3 (the dead bulb) |
| 08 | 0 of 1 | | 0 |
| 09 | 1 of 1 | `sw_1` +5 red at the start | **2**: `sw_1` 0, not +5 (the break on `l_b`) |
| 10 | 1 of 1 | `br_long` +6 red, then the repair +6 red | **1**: `br_long` 0, not +5 |
| 11 | 1 of 1 | `br_s` red (the fuse blows) | 0 |
| 12 | 2 of 2 | `sw_1` red (blow), `br_3` +4 red | 0 |
| 13 | 1 of 1 | the fuse 0 red (it blows again) | 0 |
| 14 | 1 of 1 | `l_r3` −3 red (`fb_W` blows) | 0 (2 on a fault already read) |
| 15 | 2 of 2 | `br_sh` +2 red | 0 |
| 16 | 0 of 1 | | **1**: fuse +3, not +5 (`j3` dead) |
| P0 | 0 of 1 | | **2**: switch +11, not +22 |

Elements that survive the numbers: **01, 02, 06, 08, 16, P0** (faults and routes, no capacity choice).

## 2. Readings the V2 builder will hit (measured)
- **R1, red when the feed is already over.** Does a move that leaves a feed browned out count as "takes it over"? Read strictly, no. Read as "over after", 3 trap moves turn red: 03 `br_C`, 04 `br_C`, 05 `sw_s`. The "13 of 25" form (V-Q4) settles this by itself, since its red is the feed after.
- **R2, the number on a blow.** After the fuse blows, the change can go negative for a move that adds load. 11 `br_s` reads **−4 red** after the blow, **+2** before it; 14's repair reads −3 after, +5 before. This happens in 24 entries on 11, 12, 13 and 14.
- **R3, drawn forgets faults already read.** A fault the player has read goes hidden again when current is routed away. Drawn then counts it as sound, and the number is false:
  - 10, after `sw_1`: throwing back reads **+6 red**. The truth is 0, and the player saw it a click ago.
  - The same happens on 09, 14 and P0: 17 false entries in 10 states.
  - **Known** fixes all 17 and still leaks nothing unread. It costs one input: V2's `loadPreview` must be given the fault ids read so far (the page keeps them).
- **A false red on a right move:** 10's solution step `br_long` reads +6 red (+5 with known). The truth is 0, because `l_long2` is hidden. That comes from the drawn rule itself, and the ticket expects it.
- 04's solution passes through a brownout (`br_A`, honest red). The order `br_B`, `br_C`, `br_A` avoids it.

## 3. Recommendation, and what it costs
**Build V2 on drawn load with known faults (R3)**, with the "+3" form showing the load the move puts on before any fuse blows (R2), red if any feed ends over or a fuse blows (R1). Show it on by default, with a key that hides it.
- **Moves:** V2's interface (one more input, the read fault ids) and criterion 3's fixture (it stays drawn). It adds 1 test case to V2 (5, not 4).
- **Unchanged:** no merged section, no digest pin, no approved number, no Decided rule.
- **Not mine to decide:** losing 10 pilots' capacity traps when the numbers are on trades away the brief's Draft question 2. That is Josh's call (V-Q5).

## 4. Questions for Josh
- **V-Q4, the number's form:**
  - "+3, load put on (Recommended)": before any blow, red if a feed ends over or a fuse blows.
  - "13 of 25".
  - "Both".
- **V-Q5, when the numbers show:** they give away 10 of 17 pilots' traps.
  - "On, a key hides it (Recommended)".
  - "Always on".
  - "Only on hover": an estimate, it gives the same away for one hover per icon.
  - "Off on capacity pilots": off on 03, 04, 05, 07 and 09 to 15.
- **V-Q6, a fault already read:**
  - "Keep counting it (Recommended)".
  - "Forget it, as cut": 17 false numbers on 09, 10, 14 and P0.

## 5. What the orchestrator does for each answer
- **V-Q4 "+3" or "Both":** the architect writes R1 and R2 into V2 criterion 4 and the `LoadPreview` type. With "Both", V3 draws two labels. **"13 of 25":** `delta` becomes the feed after; V3 criterion 1's zero rule is dropped.
- **V-Q5:**
  - "On, a key hides it": V4 criterion 2 as written, with the HUD naming the key.
  - "Always on": no key.
  - "Only on hover": V3 takes a hovered id, and V4 sends it.
  - "Off on capacity pilots": the architect adds a puzzle-file flag (core, schema) and the puzzle-designer sets it on 11 pilots. That re-opens P2a2's files.
- **V-Q6 "Keep counting":** the architect adds the read-ids input to `loadPreview` and the page's state (V4). **"Forget":** V2 as cut.
- In every case V2 starts after the re-cut. V1 and W4 are untouched.

## 6. The probe
`C:\Users\Josh\AppData\Local\Temp\probe-081-V0\probe\v1.ts`. Run it from that folder with `tsx probe/v1.ts`, or `-v` for every state. Its outputs are `probe\sum.txt` and `probe\full.txt`. It is a sketch, outside the repo.
