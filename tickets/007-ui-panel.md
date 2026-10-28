# 007 · UI for a panel

owner: ui
status: open
branch: ticket/007-ui-panel
depends on: 006

## Goal
Josh sees the prompt under the pointer, his satchel with its four slots, the night as a moon crossing the top of the screen, a panel picker, a Fetch parts button, a log download, and the pause, dawn and death screens in the GDD's words.

## Acceptance criteria
- [ ] Prompt text appears near the pointer from `PanelPlay.view().prompt`; nothing shows when it is null.
- [ ] Satchel: four slots, part icon plus text label, selected slot clear; draggable (the drag itself is `src/play/`'s; the UI exposes slot elements).
- [ ] Night: the moon's position shows elapsed time; a toggle shows minutes. After one shock the screen edges dim. No health bar.
- [ ] Screens: pause (dims, clock stopped), dawn (*The repairs held. Come back ready.*), death (*That night's work is undone.*), each with one button to continue.
- [ ] Panel picker lists every file in `puzzles/` and `puzzles/locked/` (marked), reloads the game on choice.
- [ ] Buttons: Fetch parts (shows its night cost), Download log.
- [ ] Keyboard-only play possible for every button; text on every control. (test: which prompt/screen to show for a given state)
- [ ] No game rules in `src/ui/`; it renders data from `src/play/` and `src/night/` state.

## Files
`src/ui/`

## Interfaces
```ts
mountUI(root: HTMLElement, hooks: { play: PanelPlay; night: Night; puzzles: string[]; onPick(id: string): void }): { update(): void }
```

## Open questions
none
