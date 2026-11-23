# City style: Block stacks

standard: yes
Scope: how one block, a stack of columns, is built on a terrace run: its style, columns, floors, corners and the footprint its pieces share.
Read by: buildings
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/block-grammar.md` (the grammar), `docs/city-style/fronts.md` and `docs/city-style/corner-buildings.md` (chapters 6 and 7), `docs/city-style/scale-and-lots.md` (no scaling, chapter 2), `docs/city-style/frontage-and-interiors.md` (19.1), `docs/city-style/evaluation.md` (the body measurements and the overhangs)

## Rules

### 16.3 Blocks

- **Default (050)**: a block is one stack of one style from `STACK_STYLES`. A terrace uses the three apartment styles (a style whose `depth` is "bay"); the offices are one footprint column and stay on the tall lots (chapter 5). A block is 2 to 4 columns (`TERRACE_BAYS`).
- **Default (050)**: a stack is columns side by side, each as wide as its floor piece. In each column the ground row is the base piece, then the floors, then the roof piece. Floors take `STACK_STYLES[i].pitch_m`, so a stack's height is the base pitch plus its floors plus the roof.
- **Rule [D-050e]**: a corner column's ground floor is a shop corner, and its floors and roof are the style's corner pieces (the same ruling as [D-050c]: the base units of the larger structures are the shop corners).
- **Default (050)**: the ground row of a mid column is a shop picked by hash from the six shop pieces; the two-column shop spans two free columns. Each block has one residents' door bay in a mid column, never in a corner column. So every ground bay is a shopfront, a shop corner or that one door (R3).
- **Rule [D-042l]**: on a terrace the first block of a run that starts at a corner is the corner block, with its corner column on the corner side, and no other block has a corner column (R9). Its second street face is on the cross street. A run that starts at a plaza or a clearance gap starts with an ordinary block.
- **Default (050)**: the floors over the base are `STACK_FLOORS` at least and as many as the cap allows, picked by a hash of the block key, so heights vary and never change. With the highest cap that is 2 to 4 floors, so 3 to 5 storeys with the ground floor (R2).
- **Default (050)**: a stack's doors, and a corner piece's `open` side, come from `BUILDING_FRONTS` first, then the recipe's (measured: chapter 7). All 34 City Pack stack pieces are provisional "+z" guesses (chapter 6). A wrong door is one line in `BUILDING_FRONTS`, and it moves nothing else.
- **Rule [D-063m]**: the storeys, trims and roof of a column share one footprint. Nothing is scaled (chapter 2).
- **Default [D-063n]**: a piece's **body** is the box its wall planes enclose (`BODY_M`: how far inside its bounds its front, back, -x and +x planes stand, in its own frame). `measureBodyPlane` measures it from the GLB: a base by the ground rule and a floor by the floor rule of 19.1, a roof by `measureRoofBase` (the outer face of its lowest cornice tier). `assembleStack`'s `footprint: "body"` (and `seatOnBody`, which the tile city's block pass applies to each wall-aligned block) puts the body of every piece of a column on the column's floor piece's body. The ladder's stacks are back-aligned and keep "bounds", so they are unchanged by it.
  - The floor piece is the footprint and stays where it stands; so does every base and floor in z (their front wall is on the line, 19.1).
  - Sides: in a mid column the piece's body is centred on the footprint's; in a corner column its outer flank plane (the cross street's side) is on the footprint's, so the corner's wall is one plane from the shop to the cornice. A double-bay shop is centred on both of its columns.
  - Back: a roof's back plane is on the footprint's, and the cornice steps out from there. A base may stand deeper at the back (every shop and door does), never shallower.
  - A piece with no measured body (the Octagon roof is round) is left where its bounds put it, and so is any piece whose front or corner open side was recalibrated in the gallery.
- **Default (063)**: `storeyAlignment` checks every column: a floor's or a roof's back plane, a base's depth, every piece's reference plane (the body centre in a mid column, the outer flank in a corner column) and a floor's two side planes agree with the footprint's within `STOREY_ALIGN_TOL_M`.
  - A plane that stands further than `BODY_REPORT_M` from the footprint's is reported, not failed (`BodyOverhang`).
  - The planes between `STOREY_ALIGN_TOL_M` and `BODY_REPORT_M` off the footprint (`slight`) are reported the same way, so no difference over the tolerance goes unseen.
  - The tile city passes `footprint: "body"` outright (`cityApplyOptions`), as it passes `align`.
- **Default (063)**: a style may not borrow another style's roof. `STACK_STYLES` pairs corner roof `_02` with apartment-02 and `_03` with apartment-03.

## Open questions

- **Open**: the pack's corner roofs may be cross-paired: each corner roof has the body of the other style's mid roof. Swapping them would put each style's corner roof on the cornice depth of its mid roof, and nothing is re-paired. [D-063o] Waits for: Josh's decision.
- **Open**: a shop corner's street-level flank stands 0.02 to 0.13 m back from the cross street, because the floor stays centred in its bounds-wide column. That is a small recess against the wall-line law of 19.1, which G2's flank cover tolerates. [D-063p] Waits for: ticket 064 section I, which lays the columns on their bodies.
