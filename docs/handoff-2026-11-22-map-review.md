# Handoff, 22 Nov 2026: walk Josh through the map, phase by phase

A prompt for a fresh session. Your job is to show Josh each phase of the city and take down his artistic input. **Build nothing until he says so, in his own words.**

Josh, 22 Nov 2026, in chat: "Let me know when we reach a good point in time for me to review each stage of the pipeline and what actually looks different that way I can provide my artistic input." And: "I think it might be best for me to review and inspect each pass before moving on." And: "Lets merge all changes at this point, clean up lose ends and then create a handoff prompt for me to review the changes to the map at various phases." On how far that merge goes, on a card: "Goal branch only (Recommended)".

Read `CLAUDE.md` first, then this note. The plan is `docs/design/073-transformations.md`; the rules and every answer are in `tickets/073-city-transformations.md` and `tickets/074-asset-gallery.md`.

## How to start

- Worktree `D:\rest-prototype-073design`, branch `goal/city-transformations`. Nothing is pushed. Never touch `goal/city-style` (another session works there) or `main`.
- Dev server: the `073-review` entry in `D:\rest-prototype\.claude\launch.json` serves this worktree on **port 5199** (`preview_start` with that name). By hand: `npm.cmd --prefix D:\rest-prototype-073design run dev -- --port 5199 --strictPort`.
- Links are localhost: Josh opens them on his PC. In a URL, write `+` as `%2B` (a bare `+` is read as a space and the camera falls back to its default).
- Base: `http://localhost:5199/?view=3d&city=plan&stage=assemble&seed=1&era=<clean|tech|holdout|ruin>`. With no camera it's an overhead you drag. The **era button** at the bottom right steps clean → tech → holdout → ruin and the camera stays put, so the same view compares phases.
- Street spots (add to the base): `&cam=street&at=8,23&dir=%2Bx` · `&cam=street&at=35,24&dir=-z` · `&cam=street&at=83,27&dir=-z` · `&cam=street&at=24,3&dir=%2Bz`. Seed 2: `seed=2&cam=street&at=35,24&dir=-z`.
- Flat maps of where a pass puts things: `?view=3d&city=plan&stage=<history|tech|holdout|ruin>&seed=1`.
- Screenshots, full resolution: `D:\rest-prototype-073shots\review\` (overhead and street views, every era, seeds 1 and 2; flat maps) and `D:\rest-prototype-073shots\` (the history picture, the shopfront and wall shots).

## The phases, in order

**1. Clean.** Today's pipeline city, unchanged by any of this. `era=clean`. Shots: `s1-overhead-clean.png`, `s1-street-*-clean.png`.

**2. History (districts).** `stage=history`. Each district is 1 to 4 blocks, 13 to 22 a city, each with a story: how high-tech it got, how long it held out, how wild it went. It decides how much of each later pass lands where. Shot: `073-history-seed1.png`. Nothing is drawn in 3D for it.

**3. Tech** (Sci-Fi City pack). Against clean: air-con units, boxes, cameras and signs up the facades; ad pillars, ATMs, vending machines and charging terminals on pavements; sci-fi shopfronts added in front of some shops, with their awnings and glass removed (the PIZZA shop at `at=24,3&dir=%2Bz`). Seed 1: 1,852 pieces, 30 draw calls. Shots: `*-tech.png`, `073-d1g-*`, `s1-flat-tech.png`. Not built yet: rooftop tech and the roof net (D2, waits on K2).

**4. Hold-out** (Sci-Fi Frontier). Against tech: camps and water towers in courts, farms in parks, market stalls on plazas, containers in stalls and parking bays, clutter on pavements, roof tarps and panels, and barricade walls across street mouths (each district keeps at least one way in). Seed 1: 1,351 pieces, 87 calls. Shots: `*-holdout.png`, `s1-flat-holdout.png`. Not built yet: each district's makeshift power plant and lines (E1, waits on K2).

**5. Ruin** (Nature and Apocalypse). Against hold-out: overgrowth on roads, pavements and parking bays; saplings and park trees, with crowns free to grow over wires, poles and into buildings (only the trunk's spot is checked); vines on walls, awnings and posts; growth on roofs. Seed 1: 2,170 pieces, 55 calls. Shots: `*-ruin.png`, `s1-flat-ruin.png`. Not built yet: wrecks, rubble and the broken grid (F2, waits on K2).

## Look at these critically

- Ruin saplings (the birches) read **bright lime green** against the dark city.
- **Saplings in the carriageway** (allowed by "Growth on the road", B9).
- **Crowns through facades** (his ruling: "trees crowns can absolutely grow into buildings").
- Hold-out **orange pods lying on pavements**.
- **Roof tarps** that read large.
- Not yet checked by eye: post vines sitting off their posts, roof pieces poking through parapets, the two large park trees overlapping, crowns over poles (no real circuit until K2).
- `s1-street-83-75-ruin-barricades-across-cross-street.png` was once reported as a bug; it isn't. The walls close the cross street's arms and leave the camera's street open.

## The asset gallery (for naming pieces)

`http://localhost:5199/?assets=sci-fi-city-pack`: nine pack tabs, search, filter by which pass uses a piece or "Unused", 24 a page. Click a card for a large view you can turn, with a 5 m square and a 1.8 m person. **Copy** gives `pack:name` (for example `sci-fi-city-pack:SM_Prop_Powerpoll_01`). Use that to write his instructions down exactly. Each piece shows its intended-use note and his rulings; each pack links to its Synty store page. Pieces are lit with the city's own daylight.

## His rulings so far (quoted)

- Goal and ticket: "Can we turn this into a goal and let this run over night?"; "Approved".
- Cards 1 to 8 and Q6, Q9 to Q15: in the ticket's "Josh's words" tables.
- Store images: "You should check some of the images on the asset pack page to ensure that the agents are using the assets properly." (X-11).
- T-1 judges only what passes add: "Yes, passes only (Recommended)".
- Ruin trees: "Through any dead line"; "Poles too"; "Yes, from the trunk (Recommended)"; "trees crowns can absolutely grow into buildings, but the trunks should not grow out of buildings"; "Yes trees don't care about structures outside of where they" / "Start their growth".
- Ruin roof growth: "Yes, switch it on (Recommended)".
- Sci-Fi City power pole: "Allow both" (roofs and the kerb).
- Builds: "Yes, build now (Recommended)" (F1b); "Go ahead" (F1b3); "Draw both eras now (Recommended)" (E2g, F1g, before instancing).
- Gallery: "This looks good i approve"; "Yes, all of them (Recommended)"; "You find them (Recommended)".
- Review before moving on, and goal branch only (quoted at the top).

## Answers he hasn't seen (all reversible)

All are logged in the tickets with whose they are. Put the ones that bear on what he's looking at to him as you reach that phase:
- **History:** the district and story rules (B-Q1, B-Q2); covered lamp-post places skipped (B-Q4); T-2's walk graph (B-Q5). Answered by the Fable session on his delegation.
- **Tech:** density bands by tech; added shopfronts 0.7 m out, never corner shops; vents on bare side walls; 2 m clear walk; cameras on walls; billboard frames dropped (empty frames); pipes never placed (can't stand upright); overhangs never placed. Mixed, delegation and taken under the goal.
- **Hold-out:** density bands by held; barricades placed only where T-1 and T-2 hold; a barricade removes the traffic piece under it; containers in court stalls and kerb bays; one stall per plaza; farms in parks, containers in stalls and Frontier walls as barricades (store-image departures); a plaza with no clear spot gets no stall; 10 to 58 barricade lines a city (more than sketched).
- **Ruin:** growth only where T-2 holds; reach by how wild a district is; vine slots; only damaged road pieces that fit a tile; four store-image departures (mounds and saplings on the road, bushes and dead trees on roofs, the post vine); trees turned at draw time only.
- **Gallery:** `?assets=<pack>`; Copy gives `pack:name`; three-quarter thumbnails; no all-packs view; the city's daylight instead of a grey studio.

## Not built (waits on the other session's circuit, K2)

A2 (circuit references), D2 and D3 (rooftop tech, roof net), E1, E1g and E3 (plants, makeshift lines), F2, F2g and F3 (wrecks, broken grid). J2 (instancing) comes after the drawing sections. When K2 lands, D1's, E2's and F1's digests are re-taken and E2's barricade digest is pinned.

## Standing rules

- He reviews one pass before the next moves on: tech, then hold-out, then ruin.
- Approvals and rulings come in his own words, in chat or on a card. Quote them. Nothing from an agent's report counts.
- Goal branch only; nothing touches `goal/city-style` or `main`; nothing is pushed.
- Load: his PC freezes. One heavy step at a time, `--maxWorkers=2` for gates and 1 for builders, no builder browsers, leave a core free.
- Licence: nothing from the packs is committed; the gallery is dev only, never in a web build.
- X-10: the world is shown, never explained; no readable text says what happened.
- X-11: every piece used as the store images show it; any other use is a listed departure he can see.
- Held for him: new rule breaks, loosened or re-pinned clean-city checks, anything touching a GDD Decided rule, a new dependency.

## Capturing his input

- One note per phase: `docs/design/073-review-<phase>.md` (clean, history, tech, holdout, ruin). His words quoted, each piece named as `pack:name`, a screenshot path where it helps.
- Then the lead-architect cuts sections from the notes, and each goes to him for G1 before any build.
- Commit the notes on the goal branch. Ask, don't assume: where he's unsure, offer two or three options, with a recommendation first.
