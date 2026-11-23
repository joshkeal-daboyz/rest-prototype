# City style: Decisions

# City style guide: how the 3D town looks and is assembled

Written 17 Nov 2026 for ticket 043 section A, against `main` after ticket 042 section A (commit 32544f2). Owner: the renderer agent, who owns the code this guide describes.

How to read it:

- Every rule below starts with one tag.
  - **Decided**: a ticket decided it. The ticket number is beside it, and Josh's words where he gave them.
  - **Default**: an open-question default in an approved ticket that Josh did not comment on.
  - **Pending**: work that is approved or planned and not built. What it waits for is written beside it.
  - **Open**: a question Josh has not answered. The guide does not pick.
  - **Info**: a fact about the code or the packs, not a rule.
- Numbers are not retyped in the prose. They live in the [Numbers](#numbers) table at the end, which `src/render3d/styleguide.test.ts` checks against the code on every test run. The prose names constants.
- A change to a rule is a ticket. From ticket 043 section C on, a ticket that changes a constant or a rule here changes this guide in the same branch.


## 1. Purpose and status

- **Decided (043, Josh, 17 Nov 2026: "We should create a city style guide.")**: this guide is the one written record of how the 3D town looks and is assembled. It records decisions and decides nothing.
- **Info**: it covers `src/render3d/` only. The 2D view (`src/render/`) is not described and is not changed by anything here.
- **Default (043 Q2)**: the renderer writes and keeps it. Rule changes still come only through tickets.
- **Info (043 section B)**: a building gallery (`gallery=<pack-id>`) shows every building-sized entry of a pack so its door sides are settled in one look (chapter 15).
- **Pending (043 section C)**: the Pending markers below are replaced as 042 B to E and the pack adoptions land.


## Decided, not yet built (the tile city, 18 Nov 2026)

Josh's rulings from the tile-city work, in his own words, each with the ticket that builds it.

**These are not chapters yet.** As each ticket lands, its builder writes the real chapter or section named beside it, with the ruling as its **Decided** line, Numbers rows for its constants and a drift check. In the same branch, the builder removes the entry here or points it to that chapter. Nothing below changes the chapters above until then.


### Roads and the grid (ticket 055; chapter 17 and chapter 10 when 055 D lands)
- **Default (055, Josh 18 Nov 2026)**: roads on a 90 degree grid only, because the packs' road tiles allow nothing else: "In order for those tiles to work we are going to have to fix the power lines. Currently, the powerline puzzles define the map structure and distort the style of the city in such a way that the city pack doesnt allow."
- **Default (055, Josh 18 Nov 2026)**: angled roads are deferred: "Maybe in the future, we could fix the city to accommodate for all roads that aren't 90*, but for now the map packs don't support that."
- **Info (057 F and G, Josh 18 Nov 2026)**: built, now 19.5 and 19.6: 90 degrees is not a uniform square grid. The streets and everything on them are at 90 degrees, but blocks vary in width and depth, with alleys and parks: "Keep in mind, 90 degrees does not mean a grid of squares. You can have varying widths for blocks, alleyways, parks... etc"
- **Default (055, Josh 18 Nov 2026)**: build the road tiles first, without power lines, and put parking in the map: "Build out the use of the road tiles first. If you don't have that built out without the power lines in place, you won't be able to test and verify that things look right when they are placed on the map. You're going to have to figure out a way to integrate things like parking lots into the map as well or else it will feel. A city with no place to park is strange."
- **Default (055, Josh 18 Nov 2026)**: the puzzles are rebuilt later, to the new style: "The puzzles are going to have to be rebuilt in order to conform to the new style. These puzzles were built to demonstrate a skill. They aren't the final puzzles anyway. We can start with 10 puzzles and move from there." This is a puzzle-designer ticket after the circuit-on-the-grid ticket (059 stage B).
- **Default (055, Josh 18 Nov 2026)**: R7 (fire escapes) has a floor of 0.4 on the tile city, and the ladder's 0.5 is unchanged: "Just choose the recommended option for now" (chapter 17). Built: both floors are now guaranteed by construction, not met by chance (ticket 061, 16.11: "Yes, cut it (Recommended)").
- **Info (057 G, Josh 19 Nov 2026)**: built, now 19.7: R1 (the frontage share) has a floor of 0.88 on the tile city, because its alleys cut R1 to about 0.90, and the ladder's 0.90 is unchanged: "Tile-city R1 floor 0.88 (Recommended)". It is `TILE_CITY_R1_MIN`, beside the tile-city floors for R6 (0.45) and R7 (0.4).


### Corners and frontage (ticket 055 B, then 057; built, now chapter 19)
- **Default (055, Josh 18 Nov 2026)**: the corner inset was kept at first: "Keep the inset". Each row's first block stood up to 2.5 m back from its corner. Replaced by 057: corners are flush (19.2).
- **Info (057 A and B, Josh 18 Nov 2026)**: built, now 19.1 and 19.2: buildings meet the pavement with no gap, and an overlap of up to 0.6 m onto it is allowed (the City Pack shop pieces reach the ground up to 0.557 m in front of their walls). This overrode the inset, so corners are flush: "This is a great start. There are gaps between the buildings and the sidewalk. It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
- **Info (057 C, Josh 18 Nov 2026)**: built, now 19.4: blank block interiors are filled: "There are blank open areas where the buildings don't exist. Those need to be filled in with something. You could fill that with parking lots, parks, or you could have those squares of buildings be thinner so that the buildings are butted up right against each other." Then: "Grass and pavement should fill the blank areas."


### Buildings (ticket 055 F is built, now section 16.10; ticket 058 is built, now section 16.11)
- **Info (055 F, Josh 18 Nov 2026; F approved with Q10 to Q13 at their defaults: "Approved and confirmed")**: built, now section 16.10: each building's door sill is measured, and the building is sunk to the walk or given steps: "That's going to have to be a variable that we measure for each individual building."
- **Info (058, Josh 18 Nov 2026)**: built, now section 16.11: fire escapes connect, and their platforms are level with the windows: "There are gaps on the fire escapes. Additionally, fire escapes should always be level with windows or else people can't get out of the building."


### Poles, wires and lights (ticket 059; chapter 20, with lines in chapters 8 and 12)
- **Default (059, Josh 18 Nov 2026)**: street lights and power lines go on the tile city: "There are no streetlights either, or power lines." Also, from 055: "There are also models inside the city pack to showcase power lines."
  - Poles stand in the reserved slots, with code-drawn wires and Town Pack street lights distinct from puzzle lamps.
  - No never-used model is lifted unless Josh asks.


### Testing daylight (ticket 060; built, now section 16.12)
- **Info (060, Josh 18 Nov 2026)**: a dev-only day mode, for testing only, is built and is section 16.12. The game's night look (chapter 11) is unchanged: "please create a day light mode so it's easy to see" and "the purpose of the day mode is for testing".

