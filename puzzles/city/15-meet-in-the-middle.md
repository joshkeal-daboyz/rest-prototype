# 15 · Meet in the middle (city form, reworked) — design note

The city form of [`puzzles/15-meet-in-the-middle.md`](../15-meet-in-the-middle.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **who carries what on a ring between two feeds** (ticket 015 rule 2, *nearest feed carries it*; kept). The schematic does not fit W1's rules, so this is a **rework** under ticket 081 answer 4 ("Change the puzzle instead"); what changed and why is below.

## Where it stands

- `from`: `15-meet-in-the-middle`. City: 6 x 6 seed 1, one-way on.
- District: `block:6:11` and `block:6:9`. Two blocks either side of `x:13`, down `block:6:9`'s and `block:6:11`'s `-x` side on `z:6`. North comes in from `x:10` at the top; East comes in from `z:7` (100 m of approach) to `j_e` at the bottom, by the mill. The ring runs from `sw_w` down `z:6` to `jD`.
- North (`west`) capacity **10**, East (`east`) capacity **8**. Target: `forge`, `shrine`, `well`, `inn`, `mill`; priority: `gate`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed "North", capacity 10 | pole `pole:x:10:lo:272.50` (end, block:6:8, +z side) | 272.50, 374.25 |
| `east` | feed "East", capacity 8 | pole `pole:z:7:hi:472.50` (crossing, block:7:11, -x side) | 360.75, 472.50 |
| `inn` | lamp, load 1, **target** | building `block:6:9/a\|outer\|-z\|55,79`, by its drop from `pole:x:10:hi:272.50` | 277.50, 395.00 |
| `sw_w` | switch, 0 `l_w_short`, 1 `l_w_long`; set 0 | pole `pole:z:6:hi:436.25` (slot, block:6:9, -x side) | 265.75, 436.25 |
| `d1` | junction | roof structure `roof:54:89` (corner, on `block:6:9/a\|outer\|+z\|54,89`) | 270.60, 449.40 |
| `d2` | junction | roof structure `roof:58:94` (mid, on `block:6:11/b\|outer\|-z\|57,94`) | 292.50, 470.60 |
| `jA` | junction | pole `pole:x:13:lo:272.50` (crossing, block:6:9, +z side) | 272.50, 454.25 |
| `forge` | lamp, load 1, **target** | building `block:6:9/a\|outer\|+z\|54,89`, by its drop from `pole:x:13:lo:272.50` | 272.50, 450.00 |
| `jB` | junction | roof structure `roof:54:94` (corner, on `block:6:11/a\|outer\|-x\|54,94`) | 270.60, 470.60 |
| `br_sh` | breaker, open | pole `pole:z:6:hi:472.50` (end, block:6:11, -x side) | 265.75, 472.50 |
| `shrine` | lamp, load 2, **target** | building `block:6:11/a\|outer\|-x\|54,94`, by its drop from `pole:z:6:hi:472.50` | 270.00, 472.50 |
| `jC` | junction | pole `pole:z:6:hi:484.17` (slot, block:6:11, -x side) | 265.75, 484.17 |
| `well` | lamp, load 1, **target** | building `block:5:10/b\|outer\|+x\|48,96`, by its drop from `pole:z:6:hi:484.17` across `z:6` | 245.00, 482.50 |
| `jD` | junction | pole `pole:z:6:hi:495.83` (slot, block:6:11, -x side) | 265.75, 495.83 |
| `br_g` | breaker, closed | pole `pole:z:6:hi:507.50` (end, block:6:11, -x side) | 265.75, 507.50 |
| `gate` | lamp, load 1 | building `block:6:11/a\|outer\|-x\|54,100`, by its drop from `pole:z:6:hi:507.50` | 270.00, 507.50 |
| `mill` | lamp, load 1, **target** | building `block:6:11/b\|outer\|+z\|58,101`, by its drop from `pole:x:14:lo:294.17` | 292.50, 510.00 |
| `j_w` | junction | pole `pole:x:10:hi:272.50` (crossing, block:6:9, -z side) | 272.50, 390.75 |
| `j_e` | junction | pole `pole:x:14:lo:294.17` (slot, block:6:11, +z side) | 294.17, 514.25 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `j_w` | 1 span: crossing | 16.50 |
| `l_e0` | `east` → `j_e` | 8 spans: crossing, 5 along, 2 roof (pavement) | 100.37 |
| `l_inn` | `j_w` → `inn` | drop | — |
| `l_w` | `j_w` → `sw_w` | 5 spans: corner, 4 along | 48.30 |
| `l_w_short` | `sw_w` → `jA` | 2 spans: along, corner | 20.80 |
| `l_w_long` | `sw_w` → `d1` | 1 span: roof (pavement) | 14.02 |
| `l_d` | `d1` → `d2` | 1 span: roof (street) | 30.48 |
| `l_d_a` | `d2` → `jA` | 3 spans: roof (pavement), along, crossing | 33.08 |
| `l_forge` | `jA` → `forge` | drop | — |
| `l_ab` | `jA` → `jB` | 1 span: roof (street) | 16.46 |
| `l_b_br` | `jB` → `br_sh` | 1 span: roof (pavement) | 5.21 |
| `l_shrine` | `br_sh` → `shrine` | drop | — |
| `l_bc` | `jB` → `jC` | 1 span: roof (pavement) | 14.41 |
| `l_well` | `jC` → `well` | drop | — |
| `l_cd` | `jC` → `jD` | 1 span: along | 11.67 |
| `l_d_br` | `jD` → `br_g` | 1 span: along | 11.67 |
| `l_gate` | `br_g` → `gate` | drop | — |
| `l_mill` | `j_e` → `mill` | drop | — |
| `l_e` | `j_e` → `jD` | 3 spans: along, 2 roof (pavement) | 38.73 |

## What changed from the schematic, and why

Item by item, under ticket 081 answer 4 ("Change the puzzle instead"). Changes from the schematic (`puzzles/15-meet-in-the-middle.json`) and from P2a's rework (branch `ticket/081p2a-pilots`, PR #69, closed).

1. **Two junctions, `j_w` and `j_e`, one beside each feed** (P2a's rework, kept). *Why:* CK14 gives a city feed one line over one entering span, and the schematic's feeds have two lines each. `west` → `j_w` (`l_w0`) → the inn and `sw_w`; `east` → `j_e` (`l_e0`) → the mill and the ring. *Cost:* none; every hop count grows by one on that feed's side.
2. **New in P2a2: South's long way is gone: `sw_e`, `k1` and `k2` and their lines (`l_e_short`, `l_e_long`, `l_k`, `l_k_d`) are removed, and `l_e` runs straight from `j_e` to `jD`.** *Why:* P2a's rework does not fit W1's rules (W0), and `npm run fit` gives up on it within `FIT_BUDGET` on every district. Each switch's long way is a second loop on the ring, and with both loops the fit finds no lay that passes W1's rules within its budget. Without South's loop it fits (on 4 of the first 5 districts it tries). The designer also tried dropping the inn and the mill (both loops kept) and shortening each loop to one junction: neither fits, and the second is unsolvable.
   *What it costs:* the schematic's best trap, **"throw the switch on the side with room"** (`sw_e`, which moves the meeting point toward South and browns North out), and "throw both" with it. Two of the three wrong moves are gone. What remains is the core of the lesson: to hand the shrine to South, lengthen **North's** route.
3. **The capacities raised by section S: West 3 to 10, East 4 to 8.** On this lay each feed's spare room is the schematic's in all 8 settings of `br_g`, `sw_w` and `br_sh` (replayed on the reworked schematic and the city file: the same lamps lit, the same feed over or none, the same room on each feed), so the HUD's arithmetic is the schematic's.
4. **`west` is named "North"** in the HUD: it stands at the district's north end (`x:10`), and `east` stays "East" (it comes in from `z:7`, east of the district). The ids stay `west` and `east`.

**Where the element cannot be kept as it was.** Besides the lost trap: the schematic draws the shrine near the mill, so the player expects East to carry it. Here the shrine is at `jB`, near North's end of the ring (North 4 hops to `jB`, East 5), so the bait is weaker and a player reading the wire will expect North to carry it, which it does. P2a's review asked for this to be named when Josh plays it (its could-improve 1): **this is the pilot to judge whether 15 is still worth a place**, or should be redesigned for the city rather than reworked again.

**Lamps** (against P2a's lay, which W-Q5 closed):

- **`inn` (a target) moved from a lamp post to a building**, fed by its drop.
- **`forge` (a target) moved from a lamp post to a building**, fed by its drop.
- `shrine` (a target) stays a building (re-laid with the district).
- **`well` (a target) moved from a roof structure to a building**, fed by its drop.
- `gate` stays a building (re-laid with the district).
- `mill` (a target) stays a building (re-laid with the district).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. HUD: North 9 of 10, East 7 of 8. Each feed has 1 to spare; neither has room for 2. **The shrine (2) is the building on `z:6` at `br_sh`'s pole, on `block:6:11`'s corner**, dark behind `br_sh` (open).
2. Make room on East: the gate (the priority home, two poles down `z:6` at `br_g`) is the only lamp not wanted. Open `br_g`: East 6 of 8.
3. Count hops to `jB`, the shrine's junction: North reaches it in 4, East in 5, so North carries it. Lengthen North's route: throw `sw_w` (on `z:6`, the pole before the loop over the roofs). `jB` is now 6 from North against 5 from East. Nothing visible changes.
4. Close `br_sh`. The shrine lights, on East. North 9 of 10, East 8 of 8. **Win.** The three clicks go in any order.

## The trap

Two wrong moves, both brownouts on North:
- **the shrine on North**: `br_g` then `br_sh`. The shrine goes to North, **North 11 of 10**, East 6 of 8 with 2 unused. Throw `sw_w` and it clears.
- **the shrine before making room**: `br_sh` first. North 11 of 10. Throwing `sw_w` moves it to East, which browns out instead (9 of 8) until `br_g` is opened.

Every state can still win; nothing dead-ends.

## To watch when Josh plays it

East's approach (`l_e0`) is 8 spans, 100 m, from `z:7`; North's run to `sw_w` is 5 spans. The camera frames the district, so East's feed may sit off screen. Watch whether the player can tell which feed is which.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the reworked schematic (a scratch run):

- start: city west 9 of 10, east 7 of 8; schematic west 2 of 3, east 3 of 4
- win (br_g, sw_w, br_sh): city west 9 of 10, east 8 of 8; schematic west 2 of 3, east 4 of 4
- trap "the shrine on North" (br_g, br_sh): city west 11 of 10, east 6 of 8 (brownout); schematic west 4 of 3, east 2 of 4 (brownout)
- trap "the shrine before making room" (br_sh): city west 11 of 10, east 7 of 8 (brownout); schematic west 4 of 3, east 3 of 4 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/15-meet-in-the-middle.json` and the reworked schematic (a scratch run). **Equal, but for the feeds' loads.**

| | Schematic | Reworked schematic | City form, raised |
| --- | --- | --- | --- |
| States | 16, exhaustive | 8, exhaustive | 8, exhaustive |
| Solvable | yes | yes | yes |
| Min clicks (one shortest win) | 3 (sw_w, br_sh, br_g) | 3 (sw_w, br_sh, br_g) | 3 (sw_w, br_sh, br_g) |
| Winning orders / configurations | 6 / 1 | 6 / 1 | 6 / 1 |
| Parts used | none | none | none |
| Feed at that win | west 2 of 3, east 4 of 4 | west 2 of 3, east 4 of 4 | **west 9 of 10, east 8 of 8** |
| Fuses that blow (shortest win / any move) | none / none | none / none | none / none |
| Dead-end states | 0 of 16 (0.0%) | 0 of 8 (0.0%) | 0 of 8 (0.0%) |
| First moves that lead only to dead ends | none | none | none |

Parts on hand: none. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this rework has its own: the intended read and the traps, made executable. It replays the same on the reworked schematic and through this file's conversion, and `npm run check puzzles/city/15-meet-in-the-middle.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["br_g", "sw_w", "br_sh"],
  "traps": [
    { "name": "the shrine on North",
      "moves": ["br_g", "br_sh"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["sw_w"] },
    { "name": "the shrine before making room",
      "moves": ["br_sh"],
      "expect": { "brownout": true, "complete": false },
      "recover": ["sw_w", "br_g"] }
  ]
}
```

## What it taught us
