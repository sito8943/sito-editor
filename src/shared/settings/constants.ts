/** Where the settings live in the webview's local storage (per device). */
export const SETTINGS_STORAGE_KEY = "sito-editor:settings";

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 24;
/** Sizes offered in the menu; the hotkeys step by 1 px within the bounds. */
export const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20] as const;
export const TAB_SIZES = [2, 4, 8] as const;

/** The areas with their own text size; zoom acts on the focused one. */
export const FONT_TARGET = {
  EDITOR: "editor",
  TERMINAL: "terminal",
} as const;

export type FontTarget = (typeof FONT_TARGET)[keyof typeof FONT_TARGET];

/** What draws the terminal; the shell behind it is the same. */
export const TERMINAL_ENGINE = {
  XTERM: "xterm",
  /** ghostty-web: Ghostty's VT engine compiled to WASM (beta). */
  GHOSTTY: "ghostty",
} as const;

export type TerminalEngine =
  (typeof TERMINAL_ENGINE)[keyof typeof TERMINAL_ENGINE];

export type EditorSettings = {
  /** Text size in px, per area. */
  fontSize: Record<FontTarget, number>;
  wordWrap: boolean;
  /** Spaces per indent and the width of a tab character. */
  tabSize: number;
  terminalEngine: TerminalEngine;
};

/** The look before settings existed. */
export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: { editor: 14, terminal: 13 },
  wordWrap: true,
  tabSize: 2,
  terminalEngine: TERMINAL_ENGINE.XTERM,
};
