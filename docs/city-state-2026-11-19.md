# Where the tile city is, 19 Nov 2026 (evening)

Written for the session that drafts the city grammar (`docs/city-grammar.md`). Read `CLAUDE.md` first (hard rules), then this file, then `docs/city-style-guide.md` (chapters 16 to 19, its **Decided** lines are Josh's rulings and are law), then `tickets/063-uniform-sidewalk-and-street-width.md`.

## The pack

POLYGON City Pack by Synty: https://syntystore.com/products/polygon-city-pack (listing: 331 unique assets, x4 alternative colours, modular office buildings, apartments, roads, shop fronts, parks; characters and cars excluded here). An earlier research note with the licence reading and the Fab listing is `assets/candidates/synty-subscription-town-view.md`. Licence rulings (16 Nov): nothing from the packs is committed; no public build serves the GLBs without the password gate. The converted pack is in the gitignored `assets/private/out` (`city-pack.glb`, `manifest.json`, `reports/city-pack.json`); `docs/city-style-guide.md` and `src/render3d/` hold the code that places it. The target look is the stylised reference city Josh keeps showing: tall apartment and shop buildings standing wall to wall in continuous terraces, every visible face carrying windows, fire escapes, awnings, signs; blocks of buildings back to back; no blank walls, no gaps except alleys, passages and courts.

## What the pack pieces are (measured, by the architect and builders, 19 Nov)

- Every apartment and shop piece's **side wall is at +-2.50 m**, a 5.0 m wall body. A piece's *outline* is wider only because of trim (Apartment_02 5.170 m, Apartment_03 5.281 m). The packer lays columns by outline, so at each column joint the walls stand 0.09 to 0.28 m apart and only trims bridge the gap (Josh's "sliver").
- **Only a piece's front carries windows, doors or shopfronts.** Its sides and back are one solid blank plane.
- Roof pieces are 5.31 m over a 5.0 m floor; corner roof 5.90 m over a 5.20 m corner floor; roofs overhang their walls (Josh: "roof tiles aren't properly scaled").
- Corner pieces are all turned on a guessed open side ("+x"); the model's angled face, glass and L awning sit on the "-x" side (Josh: corner store not angled on the corner).
- `Sidewalk_Straight_01` is the only see-through (BLEND) piece in play: that was the two sidewalk shades. `Sidewalk_Panel_02` has inset service plates in the model. The plain slab is `Sidewalk_01` (colour #8c8987). The kerb face of pack sidewalk pieces sits about 0.65 m inside each tile.
- Streets are 5 cells (25 m) with a 3-cell road (15 m); avenues 6 cells (30 m) with a 4-cell road (20 m). Cells are 5 m. Blocks are 6 to 16 cells deep.
- No scaling of pieces is a **Decided** rule.

## Josh's rulings (his words, this week)

- 90 degrees does not mean a grid of squares: varying block widths, alleys, parks.
- "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
- "Grass and pavement should fill the blank areas."
- "That's going to have to be a variable that we measure for each individual building." (door sills)
- "Make the side walk one uniform color." / "The streets do not need to be 4 tiles wide."
- "There is white space behind the buildings. To form the backs of buildings you can re use the stacked build blocks of the same type."
- "the buildings are intended to be butted up against eachother." Heights may differ; gaps are allowed but must be intentional (alley ways etc.). "the backs of buildings are also butted up against the backs of other buildings. Also intentional. Without this you end up with featurless walls."
- Corners: "corner store is not angled on the corner"; "corner buildings only on corners" (17 Nov). Roof exits "should be on the roof", not opening to the street. Kerbs may stretch out in spots but "the curb structures have to follow the curb"; at an inlet the kerb turns in with a rounded return along each side. "If you're going to have an inlet to areas between buildings it needs to be paved."
- Fire escapes level with windows and connected. Parking: rules for street vs lots, residential vs business.
- Goal run (19 Nov): "I want all of it to be packaged together as a goal." "I don't want to constantly approve all of these improvments." So tickets start and merge into `goal/city-style` without asking; `main` and pushes still need his word.
- He judges by eye and wants screenshots (he is often on his phone). He rejects loosening a check silently.

## What is merged on `goal/city-style` (never pushed; main untouched)

Tickets 050 to 054 (overnight city-pack assembly), 055 A to F (tile city on a 90 degree 5 m grid, lots, drawing, door sills measured per building), 056 (parking rules), 057 A to G (wall line, flush corners with gated passages, block interiors, block variety, alleys and parks; **D** drew the interiors; **E** guide chapter 19), 058 (fire escapes connect), 060 (dev daylight `light=day`), **061** (fire escapes by hash rank, R7 guaranteed), **062** (every building's door sill measured; mixed-sill stacks lifted; `bandPacked`), **063 A, D, H** (one solid sidewalk piece; plain interior paving; paved inlets). Gate on the head is green (about 2600 tests).

## In flight right now

- **063 E1 and E2**: corner pieces turned from the measured open side; every storey, trim and roof of a building share one footprint (builder in `D:\rest-prototype-063e`).
- **063 F**: one continuous kerb line with rounded returns wrapping each inlet (builder in `D:\rest-prototype-063f`).

## Queued in ticket 063 (sections each buildable alone, order E1, E2, I, C)

- **I**: columns laid by wall body, not outline, so neighbouring walls touch; a pure `wallJoints` check; gaps only where intentional (drives, frontage lots, alley mouths, plazas, gated passages).
- **C**: building backs; the architect's options: C-rows (a back row of its own buildings on ring 2, back to back, recommended), C-stack (repeat each column's own pieces turned round), C-dress, C-thin; plus a "no blank exposed face" check (provisional N 3 m).
- **G** roof exit inside the roof with the door facing away from streets; **B** street width (options B1 drop avenues to 15 m everywhere, recommended; B2/B3 10 m roads; B0 keep).
- Then ticket 059 (poles, wires, street lights), the ~10 rebuilt puzzles for the 90 degree style, the circuit on the 90 degree grid, and whether `goal/city-style` goes to `main`.

## The question for the grammar session

Ten sections of 063 are symptoms of one missing thing: a single rule set for how a building, a row and a block are put together from this pack. Write `docs/city-grammar.md` (design only, no code) that settles, using the rulings above as law and the measurements as evidence: (1) what a building's footprint is (wall body vs outline); (2) how rows and blocks form (single row, back-to-back, block depth, what stays open: courts, greens, paths); (3) which gaps are intentional and how every other gap is closed (and what to do when a row cannot close flush); (4) what every exposed face must carry (windows, fire escapes, props) and the party-wall rule; (5) corners (open sides, which pieces sit on corners only); (6) the street cross-section (carriageway, parking band, build-outs, kerb line, returns at inlets, widths); (7) roofs and rooftop items; (8) how heights and styles vary; (9) the checks that enforce each rule (pure tests over the layout, with fixtures that fail on today's packing), and which existing guide checks change. Then say which of 063's sections B, C, E2, I change, and what order to build them in. Do not write feature code; do not edit `puzzles/` or `src/grid`/`src/night`.
