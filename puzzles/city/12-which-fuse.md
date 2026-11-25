# 12 · Which fuse (city form) — design note

The city form of [`puzzles/12-which-fuse.md`](../12-which-fuse.md), laid by `npm run fit` (ticket 081 P1) and checked by the designer (P2a). The element under test (**fuse ratings as a plan**: which fuse carries the shrine, and making room down a chain of two moves), the read, the trap and the schematic's numbers are in that note and are not repeated here. **Raised, not reworked:** the schematic's nodes, lines, faults, parts, loads and targets, with only the capacity and two fuse ratings raised by the scenery the win lights.

## Where it stands

- `from`: `12-which-fuse`. City: 6 x 6 seed 1, one-way on.
- District: `block:6:11`, in the south-east of the city, with roof structures and buildings on `block:6:9` (across `x:13`, north) and `block:5:10` (across `z:6`, west) (CK14, B1-Q5 "Neighbouring blocks too"). The feed comes across `x:13` at the block's north-west corner, to `j0` on the corner pole. Three branches leave it:
  - `fb_1`'s, east along `x:13`: `fb_1`, `sw_1` (the well across the street, or on to `j_shrine`);
  - `fb_2`'s, round the corner on `z:6`, then onto a roof across `z:6` (`sw_2`): back across to the gate's junction, or the long way round the block's south and east sides to `j_shrine` (177 m);
  - `br_3`'s, on the corner roof across `x:13`, back over the street to `fb_3` on the district's corner roof, down to `sw_3` on `z:6` (the mill across `z:6`, or the gate's junction).
- Capacity **14** (the schematic's 4, raised by 10); ratings `fb_1` **3** (1, raised by 2), `fb_2` **10** (2, raised by 8), `fb_3` **3** (unchanged); 2 fuses; target the shrine, the well and the gate, as the schematic.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:13:lo:272.50` (crossing, block:6:9, +z side) | 272.50, 454.25 |
| `j0` | junction | pole `pole:x:13:hi:272.50` (end, block:6:11, -z side) | 272.50, 465.75 |
| `fb_1` | fuse box, rating 3 | pole `pole:x:13:hi:285.83` (slot, block:6:11, -z side) | 285.83, 465.75 |
| `sw_1` | switch, 0 `l_1w`, 1 `l_1s`; set 0, spring | pole `pole:x:13:hi:294.17` (slot, block:6:11, -z side) | 294.17, 465.75 |
| `well` | lamp, load 1 | building `block:6:9/a\|outer\|+z\|58,89`, its drop across `x:13` | 292.50, 450.00 |
| `fb_2` | fuse box, rating 10 | pole `pole:z:6:hi:472.50` (end, block:6:11, -x side) | 265.75, 472.50 |
| `sw_2` | switch, 0 `l_2g`, 1 `l_2s`; set 0, spring | roof structure `roof:48:99` (mid, on `block:5:10/b\|outer\|+x\|48,96`) | 244.40, 497.50 |
| `j_shrine` | junction | pole `pole:x:13:hi:305.00` (slot, block:6:11, -z side) | 305.00, 465.75 |
| `shrine` | lamp, load 2 | building `block:6:11/b\|outer\|-z\|59,94` | 302.50, 470.00 |
| `br_3` | breaker, open | roof structure `roof:54:89` (corner, on `block:6:9/a\|outer\|+z\|54,89`) | 270.60, 449.40 |
| `fb_3` | fuse box, rating 3 | roof structure `roof:54:94` (corner, on `block:6:11/a\|outer\|-x\|54,94`) | 270.60, 470.60 |
| `sw_3` | switch, 0 `l_3m`, 1 `l_3g`; set 0 | pole `pole:z:6:hi:484.17` (slot, block:6:11, -x side) | 265.75, 484.17 |
| `j_gate` | junction | roof structure `roof:54:98` (mid, on `block:6:11/a\|outer\|-x\|54,97`) | 270.60, 492.50 |
| `gate` | lamp, load 1 | building `block:6:11/a\|outer\|-x\|54,97` | 270.00, 497.50 |
| `mill` | lamp, load 3 | building `block:5:10/b\|outer\|+x\|48,96`, its drop across `z:6` | 245.00, 482.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 11.50 |
| `l_1a` | `j0` → `fb_1` | 1 span: along | 13.33 |
| `l_1b` | `fb_1` → `sw_1` | 1 span: along | 8.33 |
| `l_1w` | `sw_1` → `well` | drop | — |
| `l_1s` | `sw_1` → `j_shrine` | 1 span: along | 10.83 |
| `l_2a` | `j0` → `fb_2` | 1 span: corner | 9.55 |
| `l_2b` | `fb_2` → `sw_2` | 1 span: roof (street) | 32.88 |
| `l_2g` | `sw_2` → `j_gate` | 1 span: roof (street) | 26.67 |
| `l_2s` | `sw_2` → `j_shrine` | 14 spans: roof (street), corner, 8 along, 4 roof (pavement) | 176.69 |
| `l_shrine` | `j_shrine` → `shrine` | drop | — |
| `l_3a` | `j0` → `br_3` | 1 span: roof (street) | 16.46 |
| `l_3b` | `br_3` → `fb_3` | 1 span: roof (street) | 21.20 |
| `l_3c` | `fb_3` → `sw_3` | 1 span: roof (pavement) | 14.41 |
| `l_3m` | `sw_3` → `mill` | drop | — |
| `l_3g` | `sw_3` → `j_gate` | 1 span: roof (pavement) | 9.64 |
| `l_gate` | `j_gate` → `gate` | 1 span: roof (pavement) + drop | 5.88 |

**12 needed fix (a), and the fit found it.** The pre-check (`docs/design/081-all-connected-powered.md`, section 2) found 12's first fit blowing `fb_2` at the start at "Whole". Fix (a) is a re-lay in which `fb_2`'s start carries no more scenery than its win. P1's fit passes over embeddings that don't play the same raised; on 6 x 6 seed 1 it tried 37 districts and laid 12 on `block:6:11`. Here `fb_2` carries 1 scenery building at the start (on its own pole) and 8 at the win (that one, and 7 on `sw_2`'s long way, lit only once `sw_2` sends the shrine that way), so raising it by the win's 8 leaves the start well under: 2 of 10. Fix (b) (a rating sized to the start) was not needed, and the spring switch's trap is the schematic's: `fb_1` still blows on the first wrong click, and only there.

## What changed from the schematic, and why

Three numbers changed: **the capacity, 4 to 14; `fb_1`'s rating, 1 to 3; `fb_2`'s rating, 2 to 10.** `fb_3`'s 3 is unchanged.

- **Why.** Josh, 24 Nov 2026, in chat: "I would like all buildings to receive power if they are connected to the feed." On cards: "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark", and "Raise (Recommended)": each capacity and fuse rating is raised by the scenery its intended win lights. The win lights 10 buildings: 2 under `fb_1` (on its own pole), 8 under `fb_2`, none under `fb_3`.
- **What the bars read.** `fb_1` opens full, 3 of 3 (the well and its 2 buildings), as the schematic's 1 of 1; the shrine's 2 still cannot go on it. `fb_2` opens at 2 of 10 and is full at the win, 10 of 10, as the schematic's 2 of 2. `fb_3` is the schematic's exactly (1 of 3 with the gate; 3 of 3 with the mill, which holds).

| Hidden lamp | Where its buildings hang | Buildings | District / across a street | Lit at start | Lit at the win |
| --- | --- | --- | --- | --- | --- |
| `fb_1~s` | node pole: `fb_1` | 2 | 1 / 1 | yes | yes |
| `fb_2~s` | node pole: `fb_2` | 1 | 1 / 0 | yes | yes |
| `l_2s~h1~s` | carrier of `l_2s` | 7 | 6 / 1 | no | yes |
| | | **10** | **8 / 2** | | |

Buildings: `fb_1~s`: `block:6:9/a|outer|+z|56,89`, `block:6:11/b|outer|-z|57,94`; `l_2s~h1~s`: `block:6:9/b|outer|+z|62,89`, `block:6:11/a|outer|-x|54,100`, `block:6:11/b|outer|-z|64,94`, `block:6:11/b|outer|+x|67,95`, `block:6:11/b|outer|+x|67,98`, `block:6:11/b|outer|+z|58,101`, `block:6:11/b|outer|+z|61,101`; `fb_2~s`: `block:6:11/a|outer|-x|54,94`.

The loads (S1's conversion on 6 x 6 seed 1, one-way on, replayed on `src/grid/`), the city form against the schematic, at the start, at the win and at the end of each trap's moves:

- start: city feed 5 of 14; `fb_1` 3, `fb_2` 2, `fb_3` 0; schematic feed 2 of 4; `fb_1` 1, `fb_2` 1, `fb_3` 0
- win (sw_2, sw_3, br_3): city feed 14 of 14; `fb_1` 3, `fb_2` 10, `fb_3` 1; schematic feed 4 of 4; `fb_1` 1, `fb_2` 2, `fb_3` 1
- trap "the nearest switch" (sw_1): city feed 2 of 14; `fb_1` 0, `fb_2` 2, `fb_3` 0; schematic feed 1 of 4; `fb_1` 0, `fb_2` 1, `fb_3` 0
- trap "let the mill in" (sw_2, br_3): city feed 16 of 14; `fb_1` 3, `fb_2` 10, `fb_3` 3 (brownout); schematic feed 6 of 4; `fb_1` 1, `fb_2` 2, `fb_3` 3 (brownout)

## The intended read from the default camera

1. The view opens at 5 of 14: the well (the building across `x:13`) and the gate (on the block's west side) are lit. `fb_1`'s bar is full; `fb_2`'s reads 2 of 10. `br_3`, on the corner roof across `x:13`, is open, so `fb_3` and the mill are dark. The shrine, on the block's north side one pole east of `sw_1`, is dark, and `sw_1`'s second line runs straight to it.
2. Count. The shrine is 2. `fb_1` is full, so it can't carry it. `fb_2` can, but its switch then drops the gate, whose other way is through `fb_3`, behind the open breaker, whose switch is set to the mill.
3. Throw `sw_2` (on the roof across `z:6`) to the shrine. The long way round the block goes live, the shrine lights, the gate goes dark. `fb_2` 10 of 10.
4. Throw `sw_3` (on `z:6`) to the gate's junction.
5. Close `br_3`. The gate lights through `fb_3`, 1 of 3. 14 of 14, every fuse holds. **Win.**

Closing `br_3` before `sw_3` lets the mill in: 16 of 14, **brownout**, and `fb_3` holds at 3 of 3. That is the capacity saying the mill stays dark.

## The trap

The schematic's: `sw_1` is nearest the shrine and its line runs straight to it. Throw it and **`fb_1` blows** (the shrine's 2 onto a bar already full; with the long way's buildings fed back from `j_shrine`, 11 against 3), the well goes dark, and the spring switch snaps back. One repair with a fuse recovers it, and it holds; the intended route then wins with a fuse left. Falling in a third time with no fuse left is the only dead end, with `fb_1`'s ✕ on screen and Undo to clear it.

To watch when Josh plays it: until S4 draws scenery windows lit, the bars' numbers include buildings the player cannot see light (2 under `fb_1` from the start, 7 more under `fb_2` when `sw_2` turns). The fuse's arithmetic still decides the same way at every step.

## Expected numbers

The analyzer on the conversion (6 x 6 seed 1, one-way on), against `npm run analyze puzzles/12-which-fuse.json`. **Equal but for the feed's load.**

| | Schematic | City form, raised |
| --- | --- | --- |
| States | 48, exhaustive | 48, exhaustive |
| Solvable | yes | yes |
| Min clicks | 3 (sw_2, br_3, sw_3) | 3 (sw_2, br_3, sw_3) |
| Winning orders / configurations | 6 / 1 | 6 / 1 |
| Parts used | none | none |
| Feed at the win | feed 4 of 4 | **feed 14 of 14** |
| Fuses that blow (shortest win / any move) | none / fb_1 | none / fb_1 |
| Dead-end states | 8 of 48 (16.7%) | 8 of 48 (16.7%) |
| First moves that lead only to dead ends | none | none |

Parts needed: none on the intended route; 1 fuse for each fall into the trap, as the schematic. Salvage, trips and walking: n/a (map scope).

## Check

The schematic note has no check block (01 to 16 were written before ticket 027's blocks), so there was none to copy. This one is the schematic note's intended read, its trap and its brownout aside, made executable. It replays the same on the schematic (`puzzles/12-which-fuse.json`) and through this file's conversion, and `npm run check puzzles/city/12-which-fuse.city.json` passes.

```check
{
  "clickSeconds": 1,
  "solution": ["sw_2", "sw_3", "br_3"],
  "traps": [
    { "name": "the nearest switch",
      "moves": ["sw_1"],
      "expect": { "blown": ["fb_1"], "complete": false },
      "recover": ["repair:fb_1", "sw_2", "sw_3", "br_3"] },
    { "name": "let the mill in",
      "moves": ["sw_2", "br_3"],
      "expect": { "brownout": true, "blown": [], "complete": false },
      "recover": ["sw_3"] }
  ]
}
```

## What it taught us
