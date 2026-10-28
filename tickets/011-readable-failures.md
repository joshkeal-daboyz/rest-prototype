# 011 · Make failures readable: say what broke and why

owner: ui (part A), renderer (part B), interaction (part C)
status: open (awaiting G1)
branch: ticket/011-readable-failures

## Josh's words
On the battery run, after the fix: "it's still a hard read on why it breaks."

## Goal
When something breaks because of what the player did, the game says so in words, at the moment it happens, and the broken thing looks broken from across the map.

## Acceptance criteria
- [ ] **A (ui): event notices.** A short notice near the top of the map, in words, for each of these events, fading after ~4 s and stacking if several arrive: `fuse:blown` → *Fuse blew: 3 load through a ≤1 fuse* (numbers from the payload); `grid:brownout` entering → *Brownout: load 6 over capacity 4*; `battery:flat` (not stopped) → *Battery flat*; a refused relay throw → *No power at that relay*. The notice text logic is pure and tested. Notices are text, not colour.
- [ ] **B (renderer): a blown fuse looks blown, and load is shown, not written.** A readable `blown-fuse` draws the fuse bar snapped in two with a scorch mark and the `≤rating` label in the alarm colour, large enough to read at map scale; the pop on blow grows to ~2× its current size. **Lamp load:** Josh's words after playing: "the 3 is off to the side, I didn't understand that the lamp required additional power." So a lamp's load is drawn as **size and count**, not a bare digit: a load-1 lamp is the standard circle; a load-3 lamp is drawn as a cluster of three bulbs (or one lamp three times the area) with a `load 3` caption under it, so it visibly *eats more* than its neighbours. The feed's readout and the fuse's `≤1` use the same unit word (`load`), so `≤1` reads as "carries load 1". Josh checks that the mill reads as hungry at a glance.
- [ ] **B2 (renderer, from ticket 007):** the map fit leaves room for the HUD (top inset from `main.ts`), so the mill isn't half hidden under the parts chips. Fold ticket 007 part A in here.
- [ ] **C (interaction): hover explains.** Hovering a fusebox shows *Fuse ≤1 — carrying 3* (current load through it, from a new `GridState.fuseLoad: ReadonlyMap<string, number>` if the grid-simulator adds it in a one-line sub-ticket; otherwise *Fuse ≤1*) or *Blown fuse — Repair (fuse)* / *Blown fuse — Needs: fuse*. Hovering a lamp shows *Lamp, load 3*. Tests for the prompt strings.

## Files
`src/ui/`, `src/render/`, `src/play/`; `src/grid/` only for the optional `fuseLoad` map.

## Open questions
- Should the notice also name the lamp that caused the overload ("the mill")? Needs lamp names in the schema (`"name"` on a node); cheap to add if Josh wants it.
