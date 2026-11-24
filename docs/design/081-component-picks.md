# 081 · Component picks

Josh's picks of the model for each puzzle component, in his words. He chose each one on a question card in chat on 23 Nov 2026, with the shortlist sheets from [081-D1-component-shortlist.md](081-D1-component-shortlist.md) in front of him. No agent chose. D3 transcribes this table; a component with no pick draws as a placeholder.

| Component | `pack:name` | Josh's words (the option he picked) |
| --- | --- | --- |
| feed | `palm-city-pack:SM_Prop_Powerpole_03` | "C: Palm Powerpole_03" |
| breaker | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_01` | "B: SciFi Electronics_01" |
| switch | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_05` | "D: SciFi Electronics_05" |
| relay | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_04` | "C: SciFi Electronics_04" |
| spring | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03` | "C: SciFi Electronics_03" |
| fusebox | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_02` | "D: SciFi Electronics_02" |
| junction | `sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03` | "B: SciFi Electronics_03" |
| battery | `sci-fi-frontier-pack:SM_Prop_Battery_05` | "D: Frontier Battery_05" |
| lampBuilding | `palm-city-pack:SM_Prop_Light_Wall_01` | "B: Palm Light_Wall_01" |
| lampPost | `sci-fi-city-pack:SM_Prop_Streetlight_01` | "C: SciFi Streetlight_01" |
| damagedLine | `sci-fi-frontier-pack:SM_Prop_Cable_09` | "D: Frontier Cable_09" |
| roofMast | `sci-fi-frontier-pack:SM_Prop_Power_Pole_03` | "D: Frontier Power_Pole_03" |

## What follows from the picks (from the shortlist's own notes; for the builders, not decisions)

- **spring and junction share one model** (`SM_Prop_WallAttach_Electronics_03`); the overlay icon tells them apart.
- **feed** replaces the feed's pole (an H-frame with a transformer platform, 10.83 m) rather than standing on it: it needs its own `placePole` entry.
- **lampPost**: its arm makes it 2.64 m deep; whether the head overhangs the carriageway from 0.75 m is not measured. Street lights must now use another model (059).
- **damagedLine**: hung from the lowest crossing (5.20 m) it reaches 3.85 m, under the walk's 4.2 m floor. Whether CK7's floor binds a prop is open.
- **roofMast**: it has no cross-arm (071 A: one-sided brackets), so three conductors (Decided 041) need a code-drawn arm.
- **Load**: picks from `sci-fi-frontier-pack` (battery, damagedLine, roofMast) need a subset GLB run (071 D's kind) before K3 draws them; `sci-fi-city-pack` (breaker, switch, relay, spring, fusebox, junction, lampPost) adds a 35 MB pack the city does not load today; the Palm picks join 071 D's Palm subset.

## Scenery (081 D4)

Josh, 24 Nov 2026, on cards, from the D4 shortlist (`docs/design/081-D4-wall-fitting-shortlist.md`):

| Role | Pick | Josh's words |
| --- | --- | --- |
| `wallFitting` | C: `city-pack:SM_Prop_Sign_Attachment_02` (a 0.67 m wall bracket; the drop ties to its upper arm, 0.34 m out, at 5.5 m) | "C: City bracket" |
| `dropWire` | `POWER_LINE` (today's City wire, 6.4 cm) | "Keep POWER_LINE" |

## Removed (081 L)

| Role | Was | Josh's words |
| --- | --- | --- |
| `lampBuilding` | Palm `Light_Wall_01` | 24 Nov 2026, on a card, when lit windows replace the wall lamp: "Remove it (Recommended)" |
