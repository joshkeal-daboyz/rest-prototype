# City style: Alleys and parks

standard: yes
Scope: the service lanes that split a block, the parks that replace or halve one, how often each occurs, and what each block type gets.
Read by: landscape, planner
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/block-interiors.md` (19.4, the interior and its courts), `docs/city-style/frontage-and-interiors.md` (19.2, deliberate openings), `docs/city-style/block-grammar.md` (the block types), `docs/city-style/interior-drawing.md` (19.8), `docs/city-style/furniture.md` (the alley's bins), `docs/city-style/evaluation.md` (what the default city has)

## Rules

### 19.6 Alleys and parks

- **Default (057)**: an **alley** is a one-cell (`ALLEY_CELLS`, 5 m) service lane across a block, parallel to its short side, from street to street.
  - It enters through a one-cell gap in each row it crosses, with a kerb cut at each end and a plain parking cell in front of it, as a lot's cut has. The rows it crosses end flush on the lane. The gap is a deliberate opening under 19.2.
  - A block it splits is laid as two **parts** (`TileCity.parts`), each as a block of its own: its rows face the streets, and the side beside the alley is a quiet frontage with a row of its own (grammar rule 9; on the old path it was a rear, `TilePart.alleySide`, an apron and not a frontage). Quotas stay per street block, not per part.
  - The lane is the interior role `alley`. It is dressed as a lane: bins (`TileCity.alleyBins`) on the aprons beside it every `ALLEY_BIN_EVERY_M`, alternating sides, at `ALLEY_BIN_OFFSET_M` from its centre line, and never in the lane, in an end cell or on a court. No furniture stands in the lane.
  - Rear doors and rear fire escapes are not drawn: the City Pack has no rear-door piece.
  - Each alley block's first court opens on its alley lane: a two-cell drive beside the lane, then stalls, an aisle and stalls, in the wider part of the split block. The part must be at least `ALLEY_COURT_PART_MIN_CELLS` wide and the lane at least `ALLEY_COURT_LANE_MIN_CELLS` long. This court's `run` is the empty string (it belongs to no terrace run), its `street` is `alley:<block>`, it has no kerb cut (the lane is its way in), and it answers one lot of the block's quota, so the street rows are asked for one less.
- **Default (057)**: alley rates.
  - Every **long** block, and every block with a side of `ALLEY_SIDE_LONG_M` (70 m) or more, gets one at its middle, if a side is at least `ALLEY_SIDE_MIN_CELLS` cells (45 m), so each part has room for a court.
  - Every city has at least one alley per `ALLEY_ONE_IN_BLOCKS` (4) blocks: where too few blocks qualify, the longest blocks take one, in id order.
- **Default [D-057o]**: **parks**, under the grass-and-pavement fill of 19.4. On the pipeline stage 2's planner (`planBlocks` in `src/city/land/plan.ts`) chooses them from the blocks' own types and sides and the seed, so one size and seed give one city.
  - **Whole-block park:** a **small** block can become all green with crossing paths, benches, trees on one cell in `GREEN_TREE_ONE_IN`, and a pavement edge of `PARK_EDGE_CELLS` (the role `parkEdge`) round all four sides. It has no rows, so no units.
  - **Half-block park:** a **large** block whose short side is at least `PARK_HALF_SIDE_MIN_CELLS` can give half its short side, rounded down, on one long side to green. The other half is laid as a part of its own, whose park-facing row faces the park's pavement edge (`TilePart.parkSide`), so those buildings front the park. A park edge counts as a frontage where buildings face it.
  - Rate: at least one park per `PARK_ONE_IN_BLOCKS` (6) blocks. Small blocks go first, as whole parks by hash, then large blocks, as half parks, those with no claim to an alley first. A block never has both an alley and a park.
  - A park's green has a cross path as well wherever it is at least three cells each way, so its paths cross.
- **Rule [D-057p]**: on the pipeline a whole park that nothing across a street can serve takes one tile of kerb bays on its own kerb, and the first tiles are handed out as a best fit over the city.

A whole-block park carries no units, but it still asks its neighbours across a street for a tile of kerb bays and one lot, as 056 serves any block with no side of its own that has room (the old path's `parkmetrics.ts` expects every street block to have both). A neighbour that cannot host leaves it unserved, which P2 allows for ceil(blocks / 9) blocks.

- **Default (057)**: the mix by type.

| Block type | Default treatment |
| --- | --- |
| small | terraces with the interior fill; a whole-block park by hash until the park quota is met |
| medium | terraces with the interior fill of 19.4 |
| long | terraces split by an alley |
| large | terraces with the interior fill, or half of it a park by hash until the quota is met; an alley if a side is at least `ALLEY_SIDE_LONG_M` |

- **Default (057)**: the alley lanes and their bins, the park edges, the court cells whose run is the empty string and the small gate at an alley mouth are drawn (19.8).

## Open questions

None here.
