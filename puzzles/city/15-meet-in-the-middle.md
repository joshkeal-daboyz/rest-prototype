# 15 · Meet in the middle (city form, reworked) — design note

The city form of [`puzzles/15-meet-in-the-middle.md`](../15-meet-in-the-middle.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **who carries what on a ring between two feeds** (ticket 015 rule 2, *nearest feed carries it*; kept). The schematic does not fit W1's rules, so this is a **rework** under ticket 081 answer 4 ("Change the puzzle instead"); what changed and why is below.

## Where it stands

- `from`: `15-meet-in-the-middle`. City: 6 x 6 seed 1, one-way on.
- District: `block:5:10` and `block:6:11`. A U round `block:6:11`. West comes in over `x:13` at the block's north-west corner and its side of the ring runs down `z:6` to `jB` on the south-west corner roof; East comes in over `x:13` at the north-east corner, down `z:7` to `j_e`, and its side runs along `x:14` (the south side) to `jD`. The shrine is across `z:6`, on `block:5:10`.
- West (`west`) capacity **7**, East (`east`) capacity **7**. Target: `forge`, `shrine`, `well`, `inn`, `mill`; priority: `gate`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `west` | feed "West", capacity 7 | pole `pole:x:13:lo:272.50` (crossing, block:6:9, +z side) | 272.50, 454.25 |
| `east` | feed "East", capacity 7 | pole `pole:x:13:lo:337.50` (crossing, block:6:9, +z side) | 337.50, 454.25 |
| `inn` | lamp, load 1, **target** | building `block:6:9/a\|outer\|+z\|56,89`, by its drop from `pole:x:13:hi:285.83` across `x:13` | 287.50, 450.00 |
| `sw_w` | switch, 0 `l_w_short`, 1 `l_w_long`; set 0 | pole `pole:z:6:hi:472.50` (end, block:6:11, -x side) | 265.75, 472.50 |
| `d1` | junction | roof structure `roof:48:99` (mid, on `block:5:10/b\|outer\|+x\|48,96`) | 244.40, 497.50 |
| `d2` | junction | pole `pole:z:6:hi:507.50` (end, block:6:11, -x side) | 265.75, 507.50 |
| `jA` | junction | pole `pole:z:6:hi:495.83` (slot, block:6:11, -x side) | 265.75, 495.83 |
| `forge` | lamp, load 1, **target** | building `block:6:11/a\|outer\|-x\|54,97`, by its drop from `pole:z:6:hi:495.83` | 270.00, 497.50 |
| `jB` | junction | roof structure `roof:54:101` (corner, on `block:6:11/a\|outer\|-x\|54,100`) | 270.60, 509.40 |
| `br_sh` | breaker, open | pole `pole:z:6:lo:507.50` (crossing, block:5:10, +x side) | 249.25, 507.50 |
| `shrine` | lamp, load 2, **target** | building `block:5:10/b\|outer\|+x\|48,100`, by its drop from `pole:z:6:lo:507.50` | 245.00, 507.50 |
| `jC` | junction | pole `pole:x:14:lo:294.17` (slot, block:6:11, +z side) | 294.17, 514.25 |
| `well` | lamp, load 1, **target** | building `block:6:11/b\|outer\|+z\|58,101`, by its drop from `pole:x:14:lo:294.17` | 292.50, 510.00 |
| `jD` | junction | pole `pole:x:14:lo:326.67` (slot, block:6:11, +z side) | 326.67, 514.25 |
| `br_g` | breaker, closed | pole `pole:x:14:lo:337.50` (end, block:6:11, +z side) | 337.50, 514.25 |
| `gate` | lamp, load 1 | building `block:6:11/b\|outer\|+z\|64,101`, by its drop from `pole:x:14:lo:337.50` | 337.50, 510.00 |
| `mill` | lamp, load 1, **target** | building `block:6:11/b\|outer\|+x\|67,98`, by its drop from `pole:z:7:lo:495.83` | 340.00, 497.50 |
| `j_w` | junction | pole `pole:x:13:hi:272.50` (end, block:6:11, -z side) | 272.50, 465.75 |
| `j_e` | junction | pole `pole:z:7:lo:495.83` (slot, block:6:11, +x side) | 344.25, 495.83 |
| `jE` | junction | roof structure `roof:67:101` (corner, on `block:6:11/b\|outer\|+z\|64,101`) | 339.40, 509.40 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_w0` | `west` → `j_w` | 1 span: crossing | 11.50 |
| `l_e0` | `east` → `j_e` | 4 spans: crossing, corner, 2 along | 44.38 |
| `l_inn` | `j_w` → `inn` | 1 span: along + drop | 13.33 |
| `l_w` | `j_w` → `sw_w` | 1 span: corner | 9.55 |
| `l_w_short` | `sw_w` → `jA` | 2 spans: 2 along | 23.33 |
| `l_w_long` | `sw_w` → `d1` | 1 span: roof (street) | 32.88 |
| `l_d` | `d1` → `d2` | 1 span: roof (street) | 23.58 |
| `l_d_a` | `d2` → `jA` | 1 span: along | 11.67 |
| `l_forge` | `jA` → `forge` | drop | — |
| `l_ab` | `jA` → `jB` | 1 span: roof (pavement) | 14.41 |
| `l_b_br` | `jB` → `br_sh` | 1 span: roof (street) | 21.43 |
| `l_shrine` | `br_sh` → `shrine` | drop | — |
| `l_bc` | `jB` → `jC` | 2 spans: roof (pavement), along | 24.32 |
| `l_well` | `jC` → `well` | drop | — |
| `l_cd` | `jC` → `jD` | 3 spans: 3 along | 32.50 |
| `l_d_br` | `jD` → `br_g` | 1 span: along | 10.83 |
| `l_gate` | `br_g` → `gate` | drop | — |
| `l_mill` | `j_e` → `mill` | drop | — |
| `l_e` | `j_e` → `jE` | 1 span: roof (pavement) | 14.41 |
| `l_e2` | `jE` → `jD` | 1 span: roof (pavement) | 13.63 |

## What changed from the schematic, and why

Item by item, under ticket 081 answer 4 ("Change the puzzle instead"). Changes from the schematic (`puzzles/15-meet-in-the-middle.json`) and from P2a's rework (branch `ticket/081p2a-pilots`, PR #69, closed).

1. **Two junctions, `j_w` and `j_e`, one beside each feed** (P2a's rework, kept). *Why:* CK14 gives a city feed one line over one entering span, and the schematic's feeds have two lines each. `west` → `j_w` (`l_w0`) → the inn and `sw_w`; `east` → `j_e` (`l_e0`) → the mill and the ring. *Cost:* none; every hop count grows by one on that feed's side.
2. **New in P2a2: South's long way is gone.** `sw_e`, `k1` and `k2` and their lines (`l_e_short`, `l_e_long`, `l_k`, `l_k_d`) are removed; in their place a plain junction **`jE`** carries East's short way, `j_e` → `jE` (`l_e`) → `jD` (new line `l_e2`). *Why:* P2a's rework does not fit W1's rules (W0), and `npm run fit` gives up on it within `FIT_BUDGET` on every district. Each switch's long way is a second loop on the ring, and with both loops the fit finds no lay that passes W1's rules within its budget. The designer also tried dropping the inn and the mill (both loops kept) and shortening each loop to one junction: neither fits, and the second is unsolvable. *Why `jE`:* it keeps East's hop count where `sw_e` had it. Without it (review round 1's must-fix) `jB` was 4 hops from both feeds and the trap held only because `west` is listed first; with it, `jB` is **4 from West and 5 from East** with `sw_w` short, and 6 against 5 with `sw_w` long, so no tie decides anything. Checked: the reworked schematic and this file, each with the two feeds' order swapped, replay the same in all 8 settings and pass the check block.
   *What it costs:* the schematic's best trap, **"throw the switch on the side with room"** (`sw_e`, which moves the meeting point toward East and browns West out), and "throw both" with it. What remains is the core of the lesson: to hand the shrine to East, lengthen **West's** route.
3. **The capacities raised by section S: West 3 to 7, East 4 to 7.** On this lay each feed's spare room is the schematic's in all 8 settings of `br_g`, `sw_w` and `br_sh` (replayed on the reworked schematic, a scratch run, and on this file: the same lamps lit, the same feed over or none, the same room on each feed).
4. **The feeds keep their names, West and East:** on this lay they stand at the north-west and north-east corners of `block:6:11`, 65 m apart on `x:13`. (P2a's lay had renamed them North and South.)

**Where the element cannot be kept as it was.** Besides the lost trap: the schematic draws the shrine near the mill, on East's side, so the player expects East to carry it. Here the shrine is at the far end of West's side of the ring (West 4 hops to `jB`, East 5; by wire about 70 m from West and 120 m from East), so a player reading the wire will expect West to carry it, which it does. P2a's review asked for this to be named when Josh plays it (its could-improve 1): **this is the pilot to judge whether 15 is still worth a place**, or should be redesigned for the city rather than reworked again.

**Lamps** (against P2a's lay, which W-Q5 closed):

- **`inn` (a target) moved from a lamp post to a building**, fed by its drop.
- **`forge` (a target) moved from a lamp post to a building**, fed by its drop.
- `shrine` (a target) stays a building (re-laid with the district).
- **`well` (a target) moved from a roof structure to a building**, fed by its drop.
- `gate` stays a building (re-laid with the district).
- `mill` (a target) stays a building (re-laid with the district).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. HUD: West 6 of 7, East 6 of 7. Each feed has 1 to spare; neither has room for 2. **The shrine (2) is the building across `z:6` from `br_sh`, by the block's south-west corner**, dark behind `br_sh` (open).
2. Make room on East: the gate (the priority home, on `x:14` at `br_g`) is the only lamp not wanted. Open `br_g`: East 5 of 7.
3. Count hops to `jB`, the shrine's junction on the corner roof: West reaches it in 4, East in 5, so West carries it. Lengthen West's route: throw `sw_w` (on `z:6`, two poles down from West's corner). `jB` is now 6 from West against 5 from East. Nothing visible changes.
4. Close `br_sh`. The shrine lights, on East. West 6 of 7, East 7 of 7. **Win.** The three clicks go in any order.

## The trap

Two wrong moves, both brownouts on West:
- **the shrine on West**: `br_g` then `br_sh`. The shrine goes to West, **West 8 of 7**, East 5 of 7 with 2 unused. Throw `sw_w` and it clears.
- **the shrine before making room**: `br_sh` first. West 8 of 7. Throwing `sw_w` moves it to East, which browns out instead (8 of 7) until `br_g` is opened.

Every state can still win; nothing dead-ends.

## To watch when Josh plays it

Both feeds' crossings stand on `x:13` at the district's two northern corners (CK14: just outside the district), and East's approach is 44 m round the corner and down `z:7`, so both should be in the default camera's frame; the designer could not open the view to confirm it. Watch whether the player can tell the two feeds apart and see which one is over.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the reworked schematic (a scratch run):

- start: city west 6 of 7, east 6 of 7; schematic west 2 of 3, east 3 of 4
- win (br_g, sw_w, br_sh): city west 6 of 7, east 7 of 7; schematic west 2 of 3, east 4 of 4
- trap "the shrine on West" (br_g, br_sh): city west 8 of 7, east 5 of 7 (brownout); schematic west 4 of 3, east 2 of 4 (brownout)
- trap "the shrine before making room" (br_sh): city west 8 of 7, east 6 of 7 (brownout); schematic west 4 of 3, east 3 of 4 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/15-meet-in-the-middle.json` and the reworked schematic (a scratch run). **Equal, but for the feeds' loads.**

| | Schematic | Reworked schematic | City form, raised |
| --- | --- | --- | --- |
| States | 16, exhaustive | 8, exhaustive | 8, exhaustive |
| Solvable | yes | yes | yes |
| Min clicks (one shortest win) | 3 (sw_w, br_sh, br_g) | 3 (sw_w, br_sh, br_g) | 3 (sw_w, br_sh, br_g) |
| Winning orders / configurations | 6 / 1 | 6 / 1 | 6 / 1 |
| Parts used | none | none | none |
| Feed at that win | west 2 of 3, east 4 of 4 | west 2 of 3, east 4 of 4 | **west 6 of 7, east 7 of 7** |
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
    { "name": "the shrine on West",
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
