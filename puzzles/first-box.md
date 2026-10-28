# First box — design note

**Element under test:** the whole minigame loop, once, with nothing to deduce. Probe → breaker off → splice → breaker on → Relight.

## The intended read

Two lamps are dark. The player probes anywhere: `t1` is live, `t3` is dead, so the break is in `w4` between `t2` and `t3`. (`w4` also sparks on its own, so a player who looks before probing finds it without a probe. That is fine for the first box.) Cut the breaker, drag the wire onto the break, hold, throw the breaker back on. Both lamps light; the Relight plays.

## The trap

None. The spare bulb in the satchel is there so the player learns that dragging a part onto a good socket does nothing but cost time.

## Expected numbers (by hand; confirm with the analyzer)

- Faults readable at start: 1 of 1 (and visible without a probe, as sparks).
- Fewest probes to locate: 0 (sparks) or 2 (`t2`, `t3`).
- Parts needed: 1 wire. Satchel starts with wire and bulb.
- Fuse load after repair: 2 on a rating of 3. Holds.

## What it taught us

*(Josh's verdict goes here, in his words.)*
