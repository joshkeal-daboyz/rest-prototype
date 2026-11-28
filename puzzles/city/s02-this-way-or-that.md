# 02 · This way or that — design note (series v1, puzzle 2)

A new puzzle designed on the city (ticket 081 section N1; `puzzles/series-v1.md`, row 2). It has no schematic and no `from`. **Re-laid 26 Nov 2026 (section NR)** so that each switch holds only its own three wires; see "The re-lay" below, and **the open reading on `sw_pump`**.

- **New concept:** the switch. It sends power down one of its two lines, so lighting one line darkens the other; and only a switch that current reaches changes anything on screen.
- **The reasoning move:** find which switch has current. Trace the target's wire back through both switches to the feed.
- **Builds on:** 1 (trace the gold building's wire back to the feed).
- It uses no breaker, fault, part, fuse box, relay, spring, battery or second feed, and the feed has room for every state of the map (the most it can draw is 3 of 4).

## Where it stands

- City: 6 x 6 seed 1, one-way on. **District: `block:6:1`** (kept), now at its north-west corner, where `x:1` meets `z:6`. The feed stands across `x:1`.
- Capacity **4**: its own 2, raised once by `npm run fit -- --raise` for the 2 scenery buildings its solution lights.
- Target: `pump_house`. Priority: `home`. Parts: none.
- Every lamp is a building fed by its drop. `npm run check puzzles/city/` passes it with W1's rules (it uses no roof).

| Node | Type | Place | Metres (x, z) |
| --- | --- | --- | --- |
| `feed` | feed | pole `pole:x:1:lo:272.50` (crossing, block:6:0, across `x:1`) | 272.50, 69.25 |
| `sw_corner` | switch, on `l_home` | pole `pole:x:1:hi:272.50` (end, block:6:1, -z side) | 272.50, 85.75 |
| `home` | lamp, load 1 | building `block:6:1/a\|outer\|-z\|55,18`, by its drop from `pole:x:1:hi:283.33` | 282.50, 90.00 |
| `sw_pump` | switch, on `l_store` | pole `pole:z:6:hi:104.17` (slot, block:6:1, -x side) | 265.75, 104.17 |
| `store` | lamp, load 1 | building `block:6:1/a\|outer\|-x\|54,20`, by its drop from `sw_pump`'s pole | 270.00, 102.50 |
| `pump_house` | lamp, load 1, **target** | building `block:6:1/a\|outer\|+z\|54,25`, by its drop from `pole:x:3:lo:272.50` | 272.50, 130.00 |

| Line | From → to | Span chain | Length, m |
| --- | --- | --- | --- |
| `l_feed` | `feed` → `sw_corner` | 1 span: crossing (over `x:1`) | 16.50 |
| `l_home` | `sw_corner` → `home` | 1 span: along `x:1`, + drop | 10.83 |
| `l_mid` | `sw_corner` → `sw_pump` | 2 spans: corner (into `z:6`), along | 21.21 |
| `l_store` | `sw_pump` → `store` | drop | — |
| `l_pump` | `sw_pump` → `pump_house` | 3 spans: 2 along `z:6`, corner (into `x:3`), + drop | 32.88 |

**What each switch's pole carries** (every span and drop the city has at that pole, a line's or not):

| Control | Pole | Every wire that meets there |
| --- | --- | --- |
| `sw_corner` | `pole:x:1:hi:272.50`, the block's north-west corner pole | 3 wires, all spans. The crossing span from the feed's pole (`l_feed`, in); the span east along `x:1` to `pole:x:1:hi:283.33` (`l_home`, out 1); the corner span south into `z:6` to `pole:z:6:hi:92.50` (`l_mid`, out 2). No drop, no span that no line owns, no other node. Its two outs leave by different spans, down different streets. |
| `sw_pump` | `pole:z:6:hi:104.17`, a slot pole in mid street | 3 wires. The span from `pole:z:6:hi:92.50` (`l_mid`, in); the span on to `pole:z:6:hi:115.83` (`l_pump`, out 2); **the store's drop** (`l_store`, out 1). No scenery drop, no crossing or corner span, no span that no line owns, no other node. **One of its two outs is a drop, not a span: see the open reading.** |

Scenery (section S), 2 buildings, each 1, both on the block's own side of `z:6`:

| Building | Hangs on | Live when |
| --- | --- | --- |
| `block:6:1/a\|outer\|-x\|54,18` | `l_mid`'s carrier pole `pole:z:6:hi:92.50`, before `sw_pump` | `sw_corner` sends power down `z:6` |
| `block:6:1/a\|outer\|-x\|54,22` | `l_pump`'s first carrier pole `pole:z:6:hi:115.83` | the pump house is lit |

## The re-lay (section NR, 26 Nov 2026)

**What moved, and why.** The first lay was at the block's north-east corner: `sw_corner` on the corner pole and `sw_pump` one pole along `x:1`, on a pole that held the store's drop, a scenery building's drop from across the street, the line in and the line out: four wires. Josh: "Puzzle 2 has the same problem. You don't know which lines are turning off or on."

It is now at the same block's north-west corner. `sw_corner` is on the bare corner pole with exactly its three spans, one in from the feed and one out down each street. `sw_pump` is two spans down `z:6` on a pole with exactly three wires: in, on, and the store's drop. The home is alone on its line (no scenery lights with it), and the pump house is round the block's south-west corner, three spans past `sw_pump`.

**The open reading on `sw_pump` ("stop 081 NR", for this switch only).** The series rule says "A switch's two outs leave its pole by different spans." `sw_corner` holds that. `sw_pump` holds the rest of the rule (only its own three wires at its pole, nothing of anyone else's) but one of its outs is the store's drop.

It cannot be otherwise on a 1-block district with ground wires. A switch on spans alone needs a pole where three spans meet. On this city no pole has three spans inside one block (0 of 562): the only three-span poles are corner poles, and the third span is the crossing to the next block. The feed's corner uses its crossing as the way in, which is `sw_corner`. A second switch at another corner would have to send one of its outs across the street, out of the district (CK14). So with two switches, one block and no roof wire, the second switch has a span in, a span out and a building at its own pole. The other ways to give it two span outs are a roof hop from its pole or a second block; the first I judge worse to read than what Josh already found hard (N1's note on roof hops stands), and the second is outside the 1-block rule for puzzles 1 to 10.

If the strict reading is wanted, this puzzle needs Josh's ruling: allow a switch's own building as one of its two outs, or give puzzle 2 a second block, or cut it to one switch (which loses its concept: with one switch there is no switch without current).

## The intended read from the default camera

The camera opens on `block:6:1` and its four streets. **The pump house is round the block's south-west corner, on `x:3`**, carrying the target mark. The feed's pole is across `x:1` from the north-west corner.

1. The feed's wire crosses `x:1` to `sw_corner`, the corner pole. Pulses leave it east along `x:1`, one span, and the home there is lit. The other line, south down `z:6`, is dark. The HUD reads 1 of 4.
2. Trace the pump house's wire back: its drop hangs from the pole round the south-west corner; three spans back up `z:6` is `sw_pump`, set to the store beside it; two more spans back is `sw_corner`, set to the home. Two switches are turned away, and only `sw_corner` has current.
3. Throw `sw_corner`. The home goes dark; pulses run down `z:6` past a house, which lights, to `sw_pump` and down the store's drop; the store lights. 2 of 4.
4. Throw `sw_pump`. The store goes dark; pulses run on down `z:6`, a house lights, and round the corner the pump house lights gold. 3 of 4. **Win.**

## Guide (ticket 084 D1)

The file's `guide` walks a first-time player through this puzzle's one idea: the switch. It runs until the stage has been won once (084 D2 shows it; until D2 merges the field is checked on load and nothing draws it). Each step points at one thing, says one thing, and waits. No step throws anything for the player, and the last waits for the job to complete, so the player does the job.

Buildings are named by number, as the goal list names them (084 A1): `pump_house` is Building 1 (the target), `home` is Building 2 (priority), `store` is Building 3. The rest of this note keeps the lamp ids.

| # | Points at | Text | Waits for | Why it is there |
| --- | --- | --- | --- | --- |
| 1 | `pump_house` | "The priests want Building 1 lit. It is dark: the power is being sent somewhere else." (84) | Next | The goal, and the puzzle's question: nothing is broken or off, the power is going the other way. |
| 2 | `sw_corner` | "This is a switch. Power comes in and goes out by one of its two wires, never both. Now it feeds Building 2." (107) | Next | What a switch is, on the one that has power, with the building it lights now named so "one of its two wires" has something to look at. |
| 3 | `sw_corner` | "Click the switch to send the power down its other wire, and watch Building 2." (77) | the player throws `sw_corner` | The try. It waits for the player's own throw of `sw_corner`. "Watch Building 2" is the lesson's other half: lighting one line darkens the other (the first puzzle where a home is lost). |
| 4 | `sw_pump` | "Building 2 went dark: a switch lights one side by taking from the other. This second switch has power now." (106) | Next | Says what they just saw, then moves the eye to `sw_pump`, which the power has only now reached. |
| 5 | `sw_pump` | "A switch only changes things while power reaches it. This one feeds Building 3. Click it to light Building 1." (109) | the job completes | The trap's rule in one line (a switch without power turns and nothing changes), then the player finishes the job. A player who threw `sw_pump` first saw nothing happen; this is the step that says why. |

The texts quote what is on screen at that step (the feed's label and the number by the control). If the layout, a load or the capacity changes, the guide's numbers change with it.

## The trap

**The switch nearer the target moves and nothing changes, because no current reaches it yet.** As the plan's row. `sw_pump` is the last control on the pump house's wire, 33 m back from it; `sw_corner` is 54 m back at the far corner. Thrown first, `sw_pump` turns and every window on screen stays as it was. It is not wasted (a plain switch can be set dark, and it has to be thrown anyway); the lesson is why nothing happened.

**What the re-lay changed in the trap:** its distance only. `sw_pump` was 10 m from the pump house, next door; it is now three spans away round a corner, because the pole one span past a switch is the only kind of pole that can hold it (see above) and the buildings next to it here are the store and a house. It is still the nearer switch, and still the one the wire reaches last.

## The numbers (section V)

**None is red**, because nothing binds. The lesson is a zero: at the start `sw_pump` reads **+0** and `sw_corner` reads +1 (the home goes, a house and the store come). After `sw_corner`, `sw_pump` reads +1 (the store goes, a house and the pump house come). The lay was chosen so that neither switch reads +0 while it has current; at the block's other corner `sw_corner` would have swapped two houses for two and read +0 too.

## The tribe's homes

`home` (priority) is lit at the start and **dark at the win**: `sw_corner` can feed `x:1` or `z:6`, never both. This is the first puzzle where lighting the target takes light from a home.

## Series rules

- Size 0 faults / 0 parts / 2 switches, as the row. Own buildings: 3. Faults: 0.
- No fuse box, so no fuse blow.
- Kit: none (the plan's own empty kit for 1 to 3).
- Heavy building: none.
- **Shrine count: 1 of 5** (puzzle 1; the target here is the pump house).
- District `block:6:1`; puzzle 1 is on `block:4:8`, puzzle 3 on `block:8:1`. The feed's pole is on `block:6:0`, which no series puzzle 1 to 10 is on.
- **No breaker or switch on a branch pole:** `sw_corner` held in full. `sw_pump` holds "only its own lines" and not "two outs by different spans": the open reading above.

## Expected numbers

`npm run analyze puzzles/city/s02-this-way-or-that.city.json`:

| | |
| --- | --- |
| States | 4, exhaustive |
| Solvable | yes |
| Fewest clicks | 2 (`sw_corner`, `sw_pump`) |
| Winning click orders | 2 |
| Winning configurations | 1 |
| Parts used | none |
| Feed at the shortest win | 3 of 4 |
| Fuses that blow | none |
| Dead-end states | 0 of 4 (0.0%) |
| First moves that lead only to dead ends | none |
| Hidden at the start | nothing |

**The obvious wrong first move:** `sw_pump`. Read: the switch turns, the home stays lit, the pump house stays dark, the HUD stays at 1 of 4, and its number read +0. Recovered by `sw_corner` with no Undo (win). The check block replays it.

Salvage, trips and walking: n/a (map scope).

## Check

```check
{
  "clickSeconds": 1,
  "solution": ["sw_corner", "sw_pump"],
  "traps": [
    { "name": "the switch nearer the pump house, first",
      "moves": ["sw_pump"],
      "expect": { "lit": ["home"], "brownout": false, "complete": false },
      "recover": ["sw_corner"] }
  ]
}
```

## To watch when Josh plays it

- Whether `sw_corner`'s two lines, one down each street from a bare corner pole, now read as "this way or that".
- Whether `sw_pump`'s two lines read apart: one is the store's drop at its own pole, the other the span on down `z:6`.
- Whether a dark switch that has turned reads as turned (its icon, and which of its two lines is picked out).
- The pump house is round a corner from `sw_pump`; whether its wire can be traced back from the default camera.

## What it taught us

- Josh, 26 Nov 2026, on the first lay (at the block's north-east corner): "Puzzle 2 has the same problem. You don't know which lines are turning off or on."
- Josh, 26 Nov 2026, asked how to fix it, on a card: "Both (Recommended)" (the card's option: "Re-lay 1-3 so each breaker/switch sits on a single run, AND add a cue in the game: hovering or throwing one highlights exactly the wires it controls. The cue also helps every later puzzle.").
- What the re-lay changed (section NR): both switches moved to the block's north-west corner; `sw_corner` holds only its three spans, `sw_pump` only its line in, its line on and the store's drop, and no scenery building hangs on either. Whether a drop may be one of a switch's two outs is open (above). Not yet replayed.
