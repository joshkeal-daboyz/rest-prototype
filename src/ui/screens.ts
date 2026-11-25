/**
 * The screens before play (ticket 081 T3): the splash ("Uronacid"), the title (the game's name, "start" and "exit"),
 * the stage select (one dropdown with a Play button), and the exit line. They are DOM in `#screens`, over the title
 * backdrop (T1, `createTitleView`): this module draws that backdrop each frame, and disposes it on close.
 *
 * Words are white text and every choice is text with a marker (the chosen item gets a "›" and a bold underline), so
 * no colour alone says what is chosen. Keys and clicks belong here; the rules (which stages are listed, what a win
 * records) do not. `onPlay` hands the chosen stage back to the page, which opens it.
 */

import type { TitleView } from "../render3d/titleview";
import { EXIT_LINE, SPLASH, SPLASH_WORD, TITLE_ITEMS, TITLE_NAME, menuStep } from "./logic";
import type { StageRow } from "./progress";

export interface ScreensDeps {
  /** The `#screens` element. It is shown while the screens run and hidden on close. */
  root: HTMLElement;
  /** The page's canvas, which the backdrop draws on. Its fades are reset on close. */
  canvas: HTMLCanvasElement;
  /** The title backdrop. The screens own it from here: `close` disposes it. */
  backdrop: TitleView;
  /** The stage select's lines, read each time the select opens and after a clear. */
  stages: () => readonly StageRow[];
  /** Play this stage (its id). The page closes the screens and opens it. */
  onPlay: (id: string) => void;
  /** Clear the progress (after the browser's confirm). The select is refilled from `stages` afterwards. */
  onClear: () => void;
}

export interface Screens {
  /** Called every animation frame with the page time in ms: draws the backdrop and moves the splash on. */
  frame(nowMs: number): void;
  /** Ends the screens: removes the DOM and the listeners, disposes the backdrop and returns the canvas to the play view. */
  close(): void;
}

type Screen = "splash" | "fade" | "title" | "select" | "exit";

/** After a screen changes, input is ignored for this long, so the click or Enter that changed it cannot act on the new screen. */
const SETTLE_MS = 300;

export function mountScreens(deps: ScreensDeps): Screens {
  const { root, canvas, backdrop } = deps;
  const doc = root.ownerDocument;
  let screen: Screen = "splash";
  let startedAt: number | null = null;
  let fadeAt = 0;
  let settledAt = 0;
  let index = 0;
  let closed = false;

  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const live = (): boolean => performance.now() >= settledAt;

  // ---- DOM ----
  const word = make("p", "screen-word", SPLASH_WORD);
  const titleGroup = make("div", "screen-title");
  const name = make("h1", "title-name", TITLE_NAME);
  const menu = make("div", "title-menu");
  const marks: HTMLSpanElement[] = [];
  const items = TITLE_ITEMS.map((label, i) => {
    const button = make("button", "title-item");
    button.type = "button";
    const mark = make("span", "title-mark");
    mark.setAttribute("aria-hidden", "true");
    marks.push(mark);
    button.append(mark, label);
    button.addEventListener("pointerenter", () => {
      if (screen === "title") setIndex(i);
    });
    button.addEventListener("click", () => choose(i));
    menu.append(button);
    return button;
  });
  titleGroup.append(name, menu);

  const panel = make("section", "screen-select");
  panel.setAttribute("aria-label", "Stage select");
  const stageLabel = make("label", "select-label", "Stage");
  const select = make("select", "select-stage");
  select.id = "stage-select";
  stageLabel.htmlFor = select.id;
  const row = make("div", "select-row");
  const playButton = make("button", "select-play", "Play");
  playButton.type = "button";
  const clearButton = make("button", "select-clear", "Clear progress");
  clearButton.type = "button";
  const backButton = make("button", "select-back", "Back");
  backButton.type = "button";
  row.append(playButton, clearButton, backButton);
  panel.append(make("h2", "select-head", "Stages"), stageLabel, select, row);

  const exitLine = make("p", "screen-exit", EXIT_LINE);
  root.replaceChildren(word, titleGroup, panel, exitLine);
  root.hidden = false;

  // ---- state ----
  const paint = (): void => {
    items.forEach((button, i) => {
      const on = i === index;
      button.classList.toggle("is-chosen", on);
      button.setAttribute("aria-current", on ? "true" : "false");
      const mark = marks[i];
      if (mark) mark.textContent = on ? "›" : "";
    });
  };
  const show = (): void => {
    word.hidden = screen !== "splash" && screen !== "fade";
    titleGroup.hidden = screen !== "title";
    panel.hidden = screen !== "select";
    exitLine.hidden = screen !== "exit";
    settledAt = performance.now() + SETTLE_MS;
  };
  const setIndex = (i: number): void => {
    index = i;
    paint();
  };
  const fill = (): void => {
    const rows = deps.stages();
    const options = rows.map((r) => {
      const option = make("option", "", r.text);
      option.value = r.id;
      return option;
    });
    if (options.length === 0) {
      const none = make("option", "", "No stages yet");
      none.value = "";
      none.disabled = true;
      options.push(none);
    }
    select.replaceChildren(...options);
    const def = rows.find((r) => r.next) ?? rows[rows.length - 1];
    if (def) select.value = def.id;
    playButton.disabled = rows.length === 0;
  };

  /** The canvas's fade-in, as a CSS animation (the play view clears it on close). */
  const fadeInCanvas = (): void => {
    canvas.style.transition = "";
    canvas.style.opacity = "";
    canvas.style.animation = `screen-in ${SPLASH.fade_s}s ease both`;
  };

  const goTitle = (fadeIn: boolean): void => {
    if (screen === "splash" || screen === "fade") backdrop.setMode("title");
    screen = "title";
    setIndex(0);
    show();
    if (fadeIn) {
      fadeInCanvas();
      titleGroup.style.animation = `screen-in ${SPLASH.fade_s}s ease both`;
    }
    items[0]?.focus({ preventScroll: true });
  };
  const toSelect = (): void => {
    screen = "select";
    show();
    fill();
    select.focus({ preventScroll: true });
  };
  const toExit = (): void => {
    screen = "exit";
    show();
  };
  const skip = (): void => {
    if (screen !== "splash" && screen !== "fade") return;
    goTitle(true);
  };
  const choose = (i: number): void => {
    if (!live() || screen !== "title") return;
    setIndex(i);
    const item = TITLE_ITEMS[i];
    if (item === "start") toSelect();
    else if (item === "exit") toExit();
  };
  const playSelected = (): void => {
    const id = select.value;
    if (!id || playButton.disabled) return;
    deps.onPlay(id);
  };

  // ---- input ----
  const menuKeys: readonly string[] = ["ArrowUp", "ArrowDown", "Enter"];
  const onKey = (e: KeyboardEvent): void => {
    if (closed) return;
    if (screen === "splash" || screen === "fade") {
      e.preventDefault();
      if (live()) skip();
      return;
    }
    if (screen === "title") {
      if (!menuKeys.includes(e.key)) return;
      e.preventDefault();
      const step = menuStep(index, TITLE_ITEMS.length, e.key);
      if (step.choose) choose(step.index);
      else {
        setIndex(step.index);
        items[step.index]?.focus({ preventScroll: true });
      }
      return;
    }
    if (screen === "select" && e.key === "Escape") {
      e.preventDefault();
      if (live()) goTitle(false);
      return;
    }
    if (screen === "exit" && live()) {
      e.preventDefault();
      goTitle(false);
    }
  };
  const onClick = (): void => {
    if (closed || !live()) return;
    if (screen === "splash" || screen === "fade") skip();
    else if (screen === "exit") goTitle(false);
  };
  select.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    playSelected();
  });
  playButton.addEventListener("click", playSelected);
  clearButton.addEventListener("click", () => {
    if (!window.confirm("Clear the best moves and times kept in this browser?")) return;
    deps.onClear();
    fill();
  });
  backButton.addEventListener("click", () => {
    if (live()) goTitle(false);
  });
  doc.addEventListener("keydown", onKey);
  doc.addEventListener("click", onClick);

  backdrop.setMode("splash");
  show();
  paint();

  return {
    frame(nowMs: number): void {
      if (closed) return;
      backdrop.draw(nowMs / 1000);
      if (startedAt === null) startedAt = nowMs;
      if (screen === "splash" && nowMs - startedAt >= SPLASH.hold_s * 1000 && backdrop.ready()) {
        // The splash fades out (the word and the sky), then the backdrop turns to the title and the title fades in.
        screen = "fade";
        fadeAt = nowMs + SPLASH.fade_s * 1000;
        show();
        word.style.transition = `opacity ${SPLASH.fade_s}s ease`;
        word.style.opacity = "0";
        canvas.style.transition = `opacity ${SPLASH.fade_s}s ease`;
        canvas.style.opacity = "0";
      } else if (screen === "fade" && nowMs >= fadeAt) {
        goTitle(true);
      }
    },
    close(): void {
      if (closed) return;
      closed = true;
      doc.removeEventListener("keydown", onKey);
      doc.removeEventListener("click", onClick);
      backdrop.dispose();
      root.replaceChildren();
      root.hidden = true;
      canvas.style.animation = "";
      canvas.style.opacity = "";
      canvas.style.transition = "";
    },
  };
}
