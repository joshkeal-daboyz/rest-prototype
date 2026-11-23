# City style: Furniture

standard: yes
Scope: street furniture on the pavements in front of terrace runs, its keep-outs, and what open lots and alleys are dressed with.
Read by: landscape
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/facades.md` (16.5, the dressing and its drawing), `docs/city-style/alleys-and-parks.md` (19.6, alleys and parks), `docs/city-style/evaluation.md` (R10, 16.8)

## Rules

#### From 16.5 Dressing and furniture

- **Default (052)**: furniture stands only on the pavements in front of terrace runs, never on the circuit's streets or the ring's inside, so nothing new stands near a node or a wire. A run has two lines: a wall line (an item's back edge `FURN_WALL_M` in from the pavement's wall edge) and a kerb line (its front edge `FURN_KERB_M` in from the kerb). Items on a line are `FURN_PITCH_M` apart centre to centre (trees `TREE_PITCH_M`), with a hashed gap of up to `FURN_GAP_SPAN_M` after that, `FURN_GAP_M` clear between footprints, and a candidate place is filled with probability `P_FURN` (busy, not cluttered; R10).
- **Default (052)**: the keep-outs. Nothing within `FURN_CORNER_M` of a run's end, `FURN_KEEP_M` of a pole, lamp post, node, junction pad or service drop, nothing taller than `FURN_MAX_H_M` within `WIRE_CLEAR` of a wire span, and an item taller than a dressing piece stays out from under it. Bins, planters, pot plants, benches, a mailbox and newspaper boxes go on the wall line; parking meters, trees, a hydrant and a bus stop on the kerb line; a bollard just beyond each corner keep-out with probability `P_BOLLARD`. Per-run caps: `HYDRANT_PER_RUN`, `MAILBOX_PER_RUN`, `NEWSPAPER_PER_RUN`, `BUS_STOP_PER_RUN` (on a run of at least `BUS_STOP_MIN_RUN_M`), `BOLLARD_PER_RUN`.
- **Default (052)**: open lots and alleys are dressed. A parking lot gets two tiles of lines that cover it, two or three barriers along its back edge, a meter (sometimes two) and, with probability `P_PARKING_BILLBOARD`, a pole billboard whose board stands `BILLBOARD_BOARD_LIFT_M` up and only under its run's lowest cap; it has no cars. A plaza gets four paving panels, one or two trees, benches, a planter, pot plants, and a picnic table with an umbrella or a hot-dog stand. An alley gets one or two bins with probability `P_ALLEY` (`P_ALLEY_SECOND` for the second) against its walls. The pack has no gate that fits an alley, so there is none. A piece lower than `SLAB_MAX_M` is ground: things stand on it.

## Open questions

None here.
