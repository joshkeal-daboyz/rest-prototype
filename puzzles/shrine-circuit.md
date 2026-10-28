# The shrine circuit — design note

The GDD's MVP mission, as a map: a shrine at the edge of Lamp Row has gone dark, the priests treat it as an omen, and Enoch fixes it in a way no one expected — he reroutes power around a dead junction instead of replacing it.

**Element under test:** the whole minigame loop in one small map. The obvious repair can't be afforded, the switch is the answer, and then capacity forces a choice.

## The intended read

The map opens with the feed (capacity 4) live. Three street lamps are lit through `fb_A` (load 3). The switch `sw_1` sends power down `l_a` to `j_dead`: pulses go in, none come out, no fuse to blame — a **dead junction**, which needs two wires. Enoch brought one. The shrine is dark.

1. The player tries the dead junction: *Needs: wire × 2*. Can't.
2. Throw `sw_1` to `l_b`. Power runs toward `j4` and stops at a **spark**: a damaged cable, one wire. Fix it.
3. Power reaches `j4`, lights the **floodlight** (load 2) and reaches the shrine through `j5`. Total would-be load: 3 street + 2 flood + 1 shrine = 6 > 4. **Brownout**: everything flickers.
4. Throw `br_street` off. Load 3 ≤ 4. The shrine lights, the flood lights, the street goes dark. **Win**, and the Relight.

## The trap

Two of them. First, the dead junction is the obvious target and the one thing the player can't fix; the switch is marked but not pointed at. Second, the reroute brings the flood with it, and the only way to afford the shrine is to darken the street the tribe already lives on (the `priority` lamps). The priests get their omen answered; the street pays.

## What this map tests

- Whether a reroute reads as the clever answer rather than a workaround (GDD review, finding 1).
- Whether brownout reads clearly and the fix (shed load) is discoverable without text.
- Whether darkening a priority lamp lands as a choice (restraint) or as a bug.

## Expected numbers (by hand; confirm with the analyzer)

- Faults readable at start: 1 of 2 (`f1`). `f2` is hidden until the switch is thrown.
- Parts needed for the winning route: 1 wire. (Fixing `f1` instead would need 2.)
- Fewest actions to win: 3 (throw `sw_1`, repair `f2`, throw `br_street`).
- Final load: 3 of 4. Fuse `fb_A` never exceeds 3.
- Winning configurations: 1 (with `br_main` on).

## What it taught us

*(Josh's verdict goes here, in his words.)*
