// Anonymous feature usage (sito-feature-usage), following sito-file-browser's src/shared/usage.

/** App id in the usage service's `APPS` list. */
export const USAGE_APP = "editor";

// Build-time endpoint and public app key. An empty endpoint turns tracking off
// (local builds without a .env, forks), so the app never depends on the service.
export const USAGE_URL = import.meta.env.VITE_USAGE_URL ?? "";
export const USAGE_KEY = import.meta.env.VITE_USAGE_KEY ?? "";

/** Where the user's choice lives in the webview's local storage (per device). */
export const CONSENT_STORAGE_KEY = "sito-editor:consent";

/** Bump when the notice text or what is counted changes: older choices are asked again. */
export const CONSENT_VERSION = 1;

/** Feature-name prefixes: every counted feature is `<prefix>.<snake_case id>`. */
export const USAGE_PREFIX = {
  HOTKEY: "hotkey",
  EXPLORER_MENU: "explorer.menu",
  EXPLORER_TOOLBAR: "explorer.toolbar",
} as const;

/**
 * Features counted at their choke point (the one function every trigger goes
 * through). They overlap `hotkey.*` and `explorer.menu.*` on purpose: those say
 * which input was used, these say the feature was used.
 */
export const USAGE_EVENT = {
  WORKSPACE: {
    OPEN_FOLDER: "workspace.open_folder",
    OPEN_FILE: "workspace.open_file",
    // Started or reached with `sito-editor <path>`.
    LAUNCH_PATH: "workspace.launch_path",
    // The last workspace reopened on launch.
    RESTORE_LAST: "workspace.restore_last",
    // A workspace's remembered tabs came back.
    RESTORE_TABS: "workspace.restore_tabs",
  },
  EDITOR: {
    OPEN_DOCUMENT: "editor.open_document",
    SAVE: "editor.save",
    CLOSE_TAB: "editor.close_tab",
    CLOSE_TAB_MIDDLE_CLICK: "editor.close_tab_middle_click",
    SWITCH_TAB: "editor.switch_tab",
    CYCLE_TAB: "editor.cycle_tab",
    REORDER_TAB: "editor.reorder_tab",
    FIND: "editor.find",
    GO_TO_LINE: "editor.go_to_line",
    // Opened at a line/column (search result).
    REVEAL: "editor.reveal",
    RELOAD_DISCARD: "editor.reload_discard",
    KEEP_DRAFT: "editor.keep_draft",
  },
  NAVIGATION: {
    QUICK_OPEN: "navigation.quick_open",
    QUICK_OPEN_FILE: "navigation.quick_open_file",
    QUICK_OPEN_RECENT: "navigation.quick_open_recent",
    BREADCRUMB_FOLDER: "navigation.breadcrumb_folder",
    BACK: "navigation.back",
    FORWARD: "navigation.forward",
  },
  SEARCH: {
    // One typed query (counted once per burst of typing).
    PROJECT: "search.project",
    OPEN_MATCH: "search.open_match",
    MATCH_CASE: "search.match_case",
    REGEX: "search.regex",
  },
  EXPLORER: {
    TOGGLE_FOLDER: "explorer.toggle_folder",
    OPEN_FILE: "explorer.open_file",
    REFRESH: "explorer.refresh",
    COLLAPSE_ALL: "explorer.collapse_all",
    CREATE_FILE: "explorer.create_file",
    CREATE_FOLDER: "explorer.create_folder",
    RENAME: "explorer.rename",
    // Dragged into another folder.
    MOVE: "explorer.move",
    TRASH: "explorer.trash",
  },
  DISK: {
    // An open document took a change made outside the editor.
    EXTERNAL_RELOAD: "disk.external_reload",
    EXTERNAL_CONFLICT: "disk.external_conflict",
    EXTERNAL_DELETE: "disk.external_delete",
  },
  TERMINAL: {
    // A shell session started (first open, new workspace, +).
    OPEN: "terminal.open",
    NEW_SESSION: "terminal.new_session",
    CLOSE_SESSION: "terminal.close_session",
    SWITCH_SESSION: "terminal.switch_session",
    REORDER_SESSION: "terminal.reorder_session",
  },
  SETTINGS: {
    OPEN_MENU: "settings.open_menu",
    FONT_BIGGER: "settings.font_bigger",
    FONT_SMALLER: "settings.font_smaller",
    FONT_RESET: "settings.font_reset",
    // A size picked from the Font size submenu.
    FONT_SIZE: "settings.font_size",
    TAB_SIZE: "settings.tab_size",
    WORD_WRAP: "settings.word_wrap",
    TERMINAL_FONT_BIGGER: "settings.terminal_font_bigger",
    TERMINAL_FONT_SMALLER: "settings.terminal_font_smaller",
    TERMINAL_FONT_RESET: "settings.terminal_font_reset",
    TERMINAL_FONT_SIZE: "settings.terminal_font_size",
  },
  PRIVACY: {
    OPEN_CHOICES: "privacy.open_choices",
  },
} as const;

/** Calls closer together than this are one burst and count once. */
export const USAGE_BURST_GAP_MS = 1000;

export const DATA_CHOICES_TITLE_ID = "DataChoices_title";
