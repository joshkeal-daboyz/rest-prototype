# 12 · Which fuse (city form, reworked) — design note

The city form of [`puzzles/12-which-fuse.md`](../12-which-fuse.md), laid on **building targets** by `npm run fit` under W1's rules (ticket 081 P2a2; Josh, 25 Nov 2026: "instead of lamps, the game should focus on lighting the buildings") and checked by the designer. The element under test is the schematic's: **fuse ratings as a plan**: which fuse carries the shrine, and making room down a chain of two moves (kept). The schematic does not fit W1's rules, so this is a **rework** under ticket 081 answer 4 ("Change the puzzle instead"); what changed and why is below.

## Where it stands

- `from`: `12-which-fuse`. City: 6 x 6 seed 1, one-way on.
- District: `block:6:6` and `block:6:8`. Two blocks either side of `x:9`. The feed crosses `x:10` to `block:6:8`'s corner. `fb_1`'s branch runs along `x:10` to the well and the shrine; `fb_2`'s and `fb_3`'s go round the corner down `z:6` (through the new `j1`) to `block:6:6`, where the gate and the mill are.
- Capacity **13**; `fb_1` rated **1**, `fb_2` rated **8**, `fb_3` rated **4**. Target: `shrine`, `well`, `gate`. Parts: fuse, fuse.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes W1's rules on it: each line reads outward from where it takes its power (`READ_BACK_M` 3 m), no job roof span comes within `FEED_CLEAR_M` 6 m of the feed, and no two job spans cross.

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:10:hi:272.50` (crossing, block:6:9, -z side) | 272.50, 390.75 |
| `j0` | junction | pole `pole:x:10:lo:272.50` (end, block:6:8, +z side) | 272.50, 374.25 |
| `j1` | junction | pole `pole:z:6:hi:367.50` (end, block:6:8, -x side) | 265.75, 367.50 |
| `fb_1` | fusebox, rating 1 | pole `pole:x:10:lo:285.83` (slot, block:6:8, +z side) | 285.83, 374.25 |
| `sw_1` | switch, 0 `l_1w`, 1 `l_1s`; set 0, spring | pole `pole:x:10:lo:294.17` (slot, block:6:8, +z side) | 294.17, 374.25 |
| `well` | lamp, load 1, **target** | building `block:6:8/b\|outer\|+z\|58,73`, by its drop from `pole:x:10:lo:294.17` | 292.50, 370.00 |
| `fb_2` | fusebox, rating 8 | pole `pole:z:6:hi:355.00` (slot, block:6:8, -x side) | 265.75, 355.00 |
| `sw_2` | switch, 0 `l_2g`, 1 `l_2s`; set 0, spring | roof structure `roof:59:62` (mid, on `block:6:6/b\|outer\|+z\|58,62`) | 297.50, 314.40 |
| `j_shrine` | junction | pole `pole:x:10:lo:326.67` (slot, block:6:8, +z side) | 326.67, 374.25 |
| `shrine` | lamp, load 2, **target** | building `block:6:9/b\|outer\|-z\|62,79`, by its drop from `pole:x:10:lo:326.67` across `x:10` | 327.50, 395.00 |
| `br_3` | breaker, open | roof structure `roof:48:68` (corner, on `block:5:8/built\|outer\|-z\|45,68`) | 244.40, 340.60 |
| `fb_3` | fusebox, rating 4 | pole `pole:z:6:hi:312.50` (end, block:6:6, -x side) | 265.75, 312.50 |
| `sw_3` | switch, 0 `l_3m`, 1 `l_3g`; set 0 | roof structure `roof:54:62` (corner, on `block:6:6/b\|outer\|+z\|54,62`) | 270.60, 314.40 |
| `j_gate` | junction | pole `pole:x:9:hi:272.50` (crossing, block:6:8, -z side) | 272.50, 335.75 |
| `gate` | lamp, load 1, **target** | building `block:6:6/b\|outer\|+z\|54,62`, by its drop from `pole:x:9:lo:272.50` | 272.50, 315.00 |
| `mill` | lamp, load 3 | building `block:6:6/a\|outer\|-x\|54,57`, by its drop from `pole:z:6:hi:289.17` | 270.00, 287.50 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `j0` | 1 span: crossing | 16.50 |
| `l_hub` | `j0` → `j1` | 1 span: corner | 9.55 |
| `l_1a` | `j0` → `fb_1` | 1 span: along | 13.33 |
| `l_1b` | `fb_1` → `sw_1` | 1 span: along | 8.33 |
| `l_1w` | `sw_1` → `well` | drop | — |
| `l_1s` | `sw_1` → `j_shrine` | 3 spans: 3 along | 32.50 |
| `l_2a` | `j1` → `fb_2` | 1 span: along | 12.50 |
| `l_2b` | `fb_2` → `sw_2` | 2 spans: roof (pavement), roof (street) | 52.75 |
| `l_2g` | `sw_2` → `j_gate` | 1 span: roof (street) | 32.88 |
| `l_2s` | `sw_2` → `j_shrine` | 9 spans: 3 roof (pavement), 4 along, crossing, corner | 108.80 |
| `l_shrine` | `j_shrine` → `shrine` | drop | — |
| `l_3a` | `j1` → `br_3` | 1 span: roof (street) | 34.34 |
| `l_3b` | `br_3` → `fb_3` | 1 span: roof (junction) | 35.29 |
| `l_3c` | `fb_3` → `sw_3` | 1 span: roof (pavement) | 5.21 |
| `l_3m` | `sw_3` → `mill` | 2 spans: roof (pavement), along + drop | 25.99 |
| `l_3g` | `sw_3` → `j_gate` | 1 span: roof (street) | 21.43 |
| `l_gate` | `j_gate` → `gate` | 1 span: crossing + drop | 16.50 |

## What changed from the schematic, and why

Item by item, under ticket 081 answer 4 ("Change the puzzle instead").

1. **A junction added, `j1`, between the hub and the two lower branches.** *Why:* W0 found 12 misses W1's rules under every roof answer (the feed's clearance and a crossing), and `npm run fit` says so: "gave up after 300001 steps (FIT_BUDGET 300000)". The schematic's hub `j0` has four wires (the feed and three fuse branches). Now `j0` → `fb_1` and `j0` → `j1` (new line `l_hub`); `l_2a` and `l_3a` start at `j1`. Every other id is the schematic's.
   *What it costs:* nothing in play. `fb_2`'s and `fb_3`'s routes each grow by one hop, so the nearer feeder for each shared lamp is unchanged (the shrine still goes to `fb_1` when both switches point at it; the gate to `fb_2`). On the reworked schematic (a scratch run, not a file on the branch) the analyzer gives the schematic's numbers exactly; the table below shows the city form equal to them.
2. **`fb_3` rated 4, not 3, set by hand.** *Why:* the mill's run (`l_3m`) carries one scenery building. Section S's raise (`npm run fit`) raises a rating by what the *winning* state lights, and the mill is dark in the win, so it left `fb_3` at 3. Then closing `br_3` with `sw_3` on the mill **blows** `fb_3` (mill 3 + 1 against 3), where the schematic's note says "`fb_3` holds at 3 of 3: the capacity telling them the mill is the branch that stays dark". At 4, the mill fills `fb_3` exactly (4 of 4) and the feed, not the fuse, says no, as in the schematic. **Do not run `npm run fit -- --raise` on this file**: it would put `fb_3` back to 3.
3. **The other numbers raised by section S:** capacity 4 to 13, `fb_2` 2 to 8 (the long way round `block:6:8` to the shrine lights 6 buildings under `fb_2`). `fb_1` stays 1, so the trap is the schematic's.

**Where the element is not kept exactly:** closing `br_3` *alone*, before anything else, browns out in the schematic (5 of 4) and does not here (the long shrine run's scenery is not yet on, so the feed has room). The check block's "let the mill in" (`sw_2`, then `br_3`) browns out on both. Every other setting of the four controls lights the same lamps and browns out or wins the same on both (replayed in a scratch run).

**Lamps** (against P2a's lay, which W-Q5 closed):

- `well` (a target) stays a building (re-laid with the district).
- `shrine` (a target) stays a building (re-laid with the district).
- `gate` (a target) stays a building (re-laid with the district).
- `mill` stays a building (re-laid with the district).

## The intended read from the default camera

The camera opens on the district (E3), with each node's icon over its piece (E4). Every lamp is a building: a lit one glows at every storey (W2), and a target building burns gold, or carries the target mark while dark (W3).

1. The view opens at 6 of 13: the well (on `sw_1`'s pole along `x:10`) and the gate (`block:6:6`'s corner building) are lit. `fb_1`'s bar is full, 1 of 1; `fb_2` reads 2 of 8. `br_3`, on a corner roof across `z:6`, is open, so `fb_3` and the mill are dark. **The shrine, the building across `x:10` from `j_shrine`, three poles past `sw_1`, is dark**, and `sw_1`'s second line runs straight to it.
2. Count. The shrine is 2. `fb_1` is full, so it can't carry it. `fb_2` can, but its switch then drops the gate, whose other way is through `fb_3`, behind the open breaker, whose switch is set to the mill.
3. Throw `sw_2` (on the roof of `block:6:6`'s `+z` side) to the shrine. The long way round `block:6:8` goes live, the shrine lights, the gate goes dark. `fb_2` 8 of 8.
4. Throw `sw_3` (on the corner roof by the gate) to the gate's junction.
5. Close `br_3`. The gate lights through `fb_3`, 1 of 4. 13 of 13, every fuse holds. **Win.**

Closing `br_3` before `sw_3` (after `sw_2`) lets the mill in: 16 of 13, **brownout**, and `fb_3` holds at 4 of 4. That is the capacity saying the mill stays dark.

## The trap

The schematic's: `sw_1` is nearest the shrine and its line runs straight to it. Throw it and **`fb_1` blows** (the shrine's 2 against a rating of 1), the well goes dark, and the spring switch snaps back. One repair with a fuse recovers it, and it holds; the intended route then wins with a fuse left. Falling in a third time with no fuse left is the only dead end, with `fb_1`'s ✕ on screen and Undo to clear it.

## To watch when Josh plays it

`l_2s`, the long way to the shrine, is 9 spans (109 m) round `block:6:8`, and the gate's run crosses `x:9` twice. Watch whether the player can follow `sw_2`'s line to the shrine.

## Loads

The conversion (6 x 6 seed 1, one-way on) replayed on `src/grid/`, the city form against the reworked schematic (a scratch run):

- start: city feed 6 of 13; `fb_1` 1 of 1, `fb_2` 2 of 8, `fb_3` 0 of 4; schematic feed 2 of 4; `fb_1` 1 of 1, `fb_2` 1 of 2, `fb_3` 0 of 3
- win (sw_2, sw_3, br_3): city feed 13 of 13; `fb_1` 1 of 1, `fb_2` 8 of 8, `fb_3` 1 of 4; schematic feed 4 of 4; `fb_1` 1 of 1, `fb_2` 2 of 2, `fb_3` 1 of 3
- trap "the nearest switch" (sw_1): city feed 5 of 13; `fb_1` 0 of 1, `fb_2` 2 of 8, `fb_3` 0 of 4; blown `fb_1`; schematic feed 1 of 4; `fb_1` 0 of 1, `fb_2` 1 of 2, `fb_3` 0 of 3; blown `fb_1`
- trap "let the mill in" (sw_2, br_3): city feed 16 of 13; `fb_1` 1 of 1, `fb_2` 8 of 8, `fb_3` 4 of 4 (brownout); schematic feed 6 of 4; `fb_1` 1 of 1, `fb_2` 2 of 2, `fb_3` 3 of 3 (brownout)

## Expected numbers

The analyzer (`analyzePuzzle`, as `npm run analyze` runs it) on the conversion, against `npm run analyze puzzles/12-which-fuse.json` and the reworked schematic (a scratch run). **Equal, but for the feeds' loads.**

| | Schematic | Reworked schematic | City form, raised |
| --- | --- | --- | --- |
| States | 48, exhaustive | 48, exhaustive | 48, exhaustive |
| Solvable | yes | yes | yes |
| Min clicks (one shortest win) | 3 (sw_2, br_3, sw_3) | 3 (sw_2, br_3, sw_3) | 3 (sw_2, br_3, sw_3) |
| Winning orders / configurations | 6 / 1 | 6 / 1 | 6 / 1 |
| Parts used | none | none | none |
| Feed at that win | feed 4 of 4 | feed 4 of 4 | **feed 13 of 13** |
| Fuses that blow (shortest win / any move) | none / fb_1 | none / fb_1 | none / fb_1 |
| Dead-end states | 8 of 48 (16.7%) | 8 of 48 (16.7%) | 8 of 48 (16.7%) |
| First moves that lead only to dead ends | none | none | none |

Parts on hand: fuse, fuse. Salvage, trips and walking: n/a (map scope), as the schematic.

## Check

The schematic's note has no check block (01 to 16 were written before ticket 027), so this rework has its own: the intended read and the traps, made executable. It replays the same on the reworked schematic and through this file's conversion, and `npm run check puzzles/city/12-which-fuse.city.json` passes.

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
