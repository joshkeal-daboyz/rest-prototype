# Lamp Row — design note

The GDD's tutorial job, laid out as a grid for the first time. Numbers are the GDD's placeholders: 8 faults (5 dead lamps, 2 blown fuses, 1 damaged cable), 6 salvage spots (3 bulb, 1 fuse, 1 wire, 1 random), a 4-part satchel, 6 favor on completion.

## The intended read, night one

Enoch starts at the feed with the breakers closed and the lamp raised.

1. `j1`: `lamp_01` is lit. `lamp_02` gets pulses but is dark: **dead lamp** (bulb). Tie a ribbon.
2. `fb_A`: pulses in, none out: **blown fuse** (fuse). Ribbon. Everything past it (`lamp_03`, `j2`, `lamp_04`, `lamp_10`, and the whole far end) is dark and unreadable.
3. The side branch: `breaker_side` → `j5` → `lamp_08` lit. The overhead line `l_side3` is **sparking**, visible from the ground: **damaged cable** (wire, climb). `lamp_09` and `lamp_12` beyond it are dark and unreadable.

Three faults readable at the start. Five are behind them. The player can carry 4 parts, so a sensible first night is: salvage what is nearby, fix `lamp_02`, `fb_A` and `l_side3`, throw the breaker back on, read again.

## The intended read, after the first round

- Past `fb_A`: `lamp_03` lights. `lamp_04` gets pulses and is dark (bulb). `lamp_10` lights.
- `fb_B` sits inside a storefront at `(24, -3)`, off the street. From the street, with the lamp's 5 m reach, the player sees `l_main4` carrying pulses toward the shop and nothing coming back out along `l_main5`. The far end (`lamp_05`, `lamp_06`, `lamp_07`, `lamp_11`) is dark. **The trap:** a player who assumes the far end is "more dead lamps" carries four bulbs and finds that two of them light nothing. The right move is to walk into the shop and read the box.
- Past the damaged cable: `lamp_12` lights, `lamp_09` is dark with pulses: bulb.

## What this puzzle tests

- The hidden fuse box as "a repaired bulb that stays dark tells you to look upstream" (GDD review, finding 4).
- Whether five dead lamps feel like a job or a chore (finding 2).
- Whether a two-trip job is planning or friction (finding 5).
- How long the whole thing takes against a 15-minute night (finding 3).

## Expected numbers (to confirm with the analyzer)

- Parts needed: 5 bulb, 2 fuse, 1 wire.
- Salvage per night: 3 bulb, 1 fuse, 1 wire, 1 random. Two nights of salvage cover it only if the random spot gives a fuse once; otherwise the stores are needed for one fuse (2 favor = 2 offerings).
- Minimum trips with a 4-part satchel: 2.
- Walking: head to far end is 38 m; the side branch adds about 12 m.
