# 081 P2a: Josh plays pilots 01 to 16 (25 Nov 2026)

Josh played the P2a pilots (PR #69, branch `ticket/081p2a-pilots`, dev server on port 5187) and answered "Some need work".

## On the cards

- Which need work: all four groups (01-04, 05-08, 09-12, 13-16).
- What is wrong: hard to read, plays wrong, looks wrong, too samey.
- Hard to read, worst: targets unclear, wires untraceable, framing.
- Plays wrong: no preference given.
- Looks wrong: wires bad, lights wrong, scenery clash.
- Fix first: hard to read.

## His words

> Lv1
> It's not clear what needs to be done to win because the lamp is prior to the breaker in the line. The light on the lamp isn't 3D. Also, the light from the windows in the buildings needs to be ambient, and it's not on every level.
>
> Lv2
> Similar problem, it's not clear that the circuit reaches the lamp that needs lighting. Also the flow of electricity is moving away from the power source on one side.
>
> Lv3
> The pole Atop the corner building and the reversal over the power source is confusing in 3D, especially when you can't rotate your camera.
>
> Lv4
> Similar problems to 1&2, the lamp is confusing because it's not connected to the power source. It's just kind of in the middle of the street on the sidewalk without any wires attached.
>
> All levels:
> Only the light coming from the doorways seems to glow into the street. I think that instead of lamps, the game should focus on lighting the buildings. It would be a lot less confusing, and the runs would just be around blocks and within blocks.

## What his screenshots show (described by the main session)

1. **01 First light, after the win.** The target lamp is a street lamp on the pavement with a flat tan disc of light on the ground and a flat disc at its head. It has no wire to it. The blue overlay line runs from the feed pole up a corner pole to a building-top drop, and its far end goes off past the lamp. The lit building's windows are flat yellow squares that light only some storeys, and they cast nothing onto the street.
2. **02 This way or that.** Josh drew green arrows on the two runs that leave the feed. On one side the flow dashes run away from the feed and then come back, so the current reads as running in the wrong direction. The target lamp sits beside a pole with no clear link to either run.
3. **03 Not enough for all, after the win.** The lines climb to a pole on a corner building's roof and double back over the feed. Breakers and switches are drawn far from the poles they sit on. The lit building on the right glows; the targets at the bottom corners are icons over dark roofs.
4. **04 The tired feed, after the win.** Four runs fan out from one point over a building's front and end at switch icons on the roofline. The target lamp stands on the pavement below with a flat disc of light and no wire to it.

## P2a2: Josh plays the re-laid pilots (25 Nov 2026, PR #74 on main with W2 and W3)

- 01: "Issue with level 1 and the flow of electricity"; on a card: "Pulses run backward"; "that's exactly what I meant". The pulses on `l_br` (junction j0 up to the breaker) move from the breaker down into the junction.
- 02: "Same thing with lv2". Feed at the right; the pulses along the whole run to the target at the left move toward the feed.
- 03: "Lv3 looks good, but is it possible to make the animations visible through the buildings? Maybe faded?" Added to W4 (approved: "Approve W4 (Recommended)").
- 04: "lv4 has two reverse flows". His arrows: on the run from the OFF switch at bottom left up to the hub junction, and on the run from the ON breaker at the top down to the OFF switch at the right. Both runs end at a switch that is OFF.
