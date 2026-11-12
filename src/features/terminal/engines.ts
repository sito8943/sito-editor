import { Terminal as XtermTerminal, type ITheme } from "@xterm/xterm";
import { FitAddon as XtermFitAddon } from "@xterm/addon-fit";

import { TERMINAL_ENGINE, type TerminalEngine } from "@/shared/settings";

import "@xterm/xterm/css/xterm.css";

// The terminal renderer behind one interface, so TerminalView does not care
// which one draws: xterm.js (default) or ghostty-web (Ghostty's VT engine as
// WASM, beta). Both talk to the same native pty (src-tauri/src/terminal.rs).

export type TerminalSurface = {
  readonly cols: number;
  readonly rows: number;
  write: (data: string) => void;
  focus: () => void;
  /** Resizes the grid to the host element. */
  fit: () => void;
  setFontSize: (size: number) => void;
  onData: (listener: (data: string) => void) => { dispose: () => void };
  dispose: () => void;
};

export type SurfaceOptions = {
  theme: ITheme;
  fontFamily: string;
  fontSize: number;
};

const SCROLLBACK = 5000;

const createXterm = (host: HTMLElement, options: SurfaceOptions) => {
  const terminal = new XtermTerminal({
    ...options,
    lineHeight: 1.2,
    cursorBlink: true,
    allowProposedApi: false,
    macOptionIsMeta: true,
    scrollback: SCROLLBACK,
  });
  const fit = new XtermFitAddon();
  terminal.loadAddon(fit);
  terminal.open(host);
  fit.fit();
  const surface: TerminalSurface = {
    get cols() {
      return terminal.cols;
    },
    get rows() {
      return terminal.rows;
    },
    write: (data) => terminal.write(data),
    focus: () => terminal.focus(),
    fit: () => fit.fit(),
    setFontSize: (size) => {
      terminal.options.fontSize = size;
      fit.fit();
    },
    onData: (listener) => terminal.onData(listener),
    dispose: () => terminal.dispose(),
  };
  return surface;
};

/**
 * Option as Meta, like xterm.js `macOptionIsMeta`: macOS turns Option+key into
 * another character (Option+B is "∫"), so read the physical key. Option+arrows
 * move by word the way zsh and readline expect (ESC b / ESC f).
 */
const optionAsMeta = (event: KeyboardEvent): string | null => {
  if (!event.altKey || event.metaKey || event.ctrlKey) return null;
  switch (event.code) {
    case "ArrowLeft":
      return "\x1bb";
    case "ArrowRight":
      return "\x1bf";
    case "Backspace":
      return "\x1b\x7f";
  }
  const letter = /^Key([A-Z])$/.exec(event.code)?.[1];
  if (letter) {
    return `\x1b${event.shiftKey ? letter : letter.toLowerCase()}`;
  }
  const digit = /^Digit([0-9])$/.exec(event.code)?.[1];
  return digit ? `\x1b${digit}` : null;
};

/**
 * Copies with the native copy command from a hidden field: works in WKWebView
 * on any click or key, where navigator.clipboard may be refused.
 */
const copyThroughField = (
  field: HTMLTextAreaElement | undefined,
  text: string,
) => {
  if (!field || !text) return;
  const focused = document.activeElement;
  field.value = text;
  field.select();
  document.execCommand("copy");
  field.value = "";
  if (focused instanceof HTMLElement) focused.focus();
};

/** Ghostty's default word boundaries: paths, URLs and user@host stay whole. */
const WORD_BOUNDARY = /[\s'"│`|:;,()[\]{}<>$]/;

/** Pixels the pointer must move for a press to count as a drag selection. */
const DRAG_PX = 3;

type GhosttyTerminal = InstanceType<
  Awaited<ReturnType<typeof loadGhostty>>["Terminal"]
>;

/**
 * Selection like the Ghostty app, on top of ghostty-web: double-click selects
 * a word (Ghostty's boundaries, not just [\w-]), triple-click the line, and
 * every selection is copied. Off while the program uses the mouse (vim, htop).
 * Returns the cleanup.
 */
const selectLikeGhostty = (
  terminal: GhosttyTerminal,
  copyText: (text: string) => void,
): (() => void) => {
  const host = terminal.element;
  const renderer = terminal.renderer;
  if (!host || !renderer) return () => undefined;

  const cellAt = (event: MouseEvent) => {
    const metrics = renderer.getMetrics();
    const rect = renderer.getCanvas().getBoundingClientRect();
    const clamp = (value: number, max: number) =>
      Math.max(0, Math.min(value, max));
    return {
      col: clamp(Math.floor((event.clientX - rect.left) / metrics.width), terminal.cols - 1),
      row: clamp(Math.floor((event.clientY - rect.top) / metrics.height), terminal.rows - 1),
    };
  };
  const rowText = (row: number) => {
    terminal.select(0, row, terminal.cols);
    return terminal.getSelection();
  };
  const appOwnsMouse = () => terminal.hasMouseTracking();

  const onDoubleClick = (event: MouseEvent) => {
    if (appOwnsMouse()) return;
    // Replaces ghostty-web's own double-click, which stops at "." and "/".
    event.stopPropagation();
    const { col, row } = cellAt(event);
    const text = rowText(row);
    if (col >= text.length || WORD_BOUNDARY.test(text[col])) {
      terminal.clearSelection();
      return;
    }
    let start = col;
    while (start > 0 && !WORD_BOUNDARY.test(text[start - 1])) start -= 1;
    let end = col;
    while (end < text.length - 1 && !WORD_BOUNDARY.test(text[end + 1])) end += 1;
    terminal.select(start, row, end - start + 1);
    copyText(terminal.getSelection());
  };

  const onClick = (event: MouseEvent) => {
    if (event.detail !== 3 || appOwnsMouse()) return;
    const { row } = cellAt(event);
    terminal.selectLines(row, row);
    copyText(terminal.getSelection().trimEnd());
  };

  // A drag selection is copied when the button is released.
  let pressedAt: { x: number; y: number } | null = null;
  const onMouseDown = (event: MouseEvent) => {
    pressedAt = event.detail === 1 ? { x: event.clientX, y: event.clientY } : null;
  };
  const onMouseUp = (event: MouseEvent) => {
    const from = pressedAt;
    pressedAt = null;
    if (!from || appOwnsMouse()) return;
    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) < DRAG_PX) return;
    window.setTimeout(() => {
      if (terminal.hasSelection()) copyText(terminal.getSelection());
    }, 0);
  };

  host.addEventListener("dblclick", onDoubleClick, true);
  host.addEventListener("click", onClick);
  host.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  return () => {
    host.removeEventListener("dblclick", onDoubleClick, true);
    host.removeEventListener("click", onClick);
    host.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mouseup", onMouseUp);
  };
};

/** Loaded on first use only, so xterm.js users never fetch the WASM. */
let ghosttyModule: Promise<typeof import("ghostty-web")> | null = null;

const loadGhostty = () => {
  ghosttyModule ??= import("ghostty-web").then(async (module) => {
    await module.init();
    return module;
  });
  return ghosttyModule;
};

const createGhostty = async (host: HTMLElement, options: SurfaceOptions) => {
  const { Terminal, FitAddon } = await loadGhostty();
  const terminal = new Terminal({
    ...options,
    cursorBlink: true,
    scrollback: SCROLLBACK,
  });
  const fit = new FitAddon();
  terminal.loadAddon(fit);
  terminal.open(host);
  fit.fit();
  // Input goes through our listeners so the key handler below can send its
  // own sequences down the same path as typed text.
  const dataListeners = new Set<(data: string) => void>();
  const emit = (data: string) => {
    for (const listener of dataListeners) listener(data);
  };
  terminal.onData(emit);

  const copyText = (text: string) => copyThroughField(terminal.textarea, text);
  const stopSelection = selectLikeGhostty(terminal, copyText);

  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type !== "keydown") return false;
    // ghostty-web leaves Cmd+C to the browser, but its selection lives on a
    // canvas, so the native copy would find nothing.
    if (event.metaKey && event.code === "KeyC" && terminal.hasSelection()) {
      copyText(terminal.getSelection());
      return true;
    }
    const meta = optionAsMeta(event);
    if (meta !== null) {
      emit(meta);
      return true;
    }
    return false;
  });
  const surface: TerminalSurface = {
    get cols() {
      return terminal.cols;
    },
    get rows() {
      return terminal.rows;
    },
    write: (data) => terminal.write(data),
    focus: () => terminal.focus(),
    fit: () => fit.fit(),
    setFontSize: (size) => {
      terminal.options.fontSize = size;
      fit.fit();
    },
    onData: (listener) => {
      dataListeners.add(listener);
      return { dispose: () => dataListeners.delete(listener) };
    },
    dispose: () => {
      stopSelection();
      dataListeners.clear();
      terminal.dispose();
    },
  };
  return surface;
};

export const createSurface = async (
  engine: TerminalEngine,
  host: HTMLElement,
  options: SurfaceOptions,
): Promise<TerminalSurface> =>
  engine === TERMINAL_ENGINE.GHOSTTY
    ? await createGhostty(host, options)
    : createXterm(host, options);
