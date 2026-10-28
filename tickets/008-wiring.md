# 008 · Wire it together and deploy

owner: interaction
status: open
branch: ticket/008-wiring
depends on: 005, 006, 007

## Goal
`npm run dev` opens `first-box` and it is playable to the Relight. `main` deploys to GitHub Pages.

## Acceptance criteria
- [ ] `src/main.ts` loads the puzzle list (Vite `import.meta.glob` over `puzzles/*.json` and `puzzles/locked/*.json`), creates bus, grid, night, renderer, play and UI, and runs a `requestAnimationFrame` loop that calls `play.tick(dt)`, `renderer.draw(...)`, `ui.update()`.
- [ ] `?puzzle=<id>` in the URL opens that panel.
- [ ] Hidden tab or lost focus pauses (GDD Decided).
- [ ] `npm run build` with `GITHUB_PAGES=1` produces a site that works at `/rest-prototype/`; a GitHub Actions workflow deploys `main` to Pages. (Josh enables Pages in the repo settings; note it in the PR.)
- [ ] Josh plays `first-box` to the Relight in the deployed build.

## Files
`src/main.ts`, `.github/workflows/`

## Interfaces
none new

## Open questions
- Repo is private; GitHub Pages on a free plan needs it public. Josh decides when to flip it.
