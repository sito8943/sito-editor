import {
  CommandRegistry,
  type HotkeyConfig,
  type Keymap,
} from "@sito/commands";

export const APP_COMMAND = {
  OPEN_DOCUMENT: "editor.open_document",
  CLOSE_DOCUMENT: "editor.close_document",
  SAVE_DOCUMENT: "editor.save_document",
  NEXT_DOCUMENT: "editor.next_document",
  PREVIOUS_DOCUMENT: "editor.previous_document",
  TOGGLE_DIRECTORY: "explorer.toggle_directory",
  REFRESH_DIRECTORY: "explorer.refresh_directory",
  COLLAPSE_EXPLORER: "explorer.collapse_all",
  CREATE_FILE: "explorer.create_file",
  CREATE_FOLDER: "explorer.create_folder",
  RENAME_ENTRY: "explorer.rename_entry",
  MOVE_ENTRY: "explorer.move_entry",
  TRASH_ENTRY: "explorer.trash_entry",
  OPEN_FOLDER: "workspace.open_folder",
  OPEN_FILE: "workspace.open_file",
  QUICK_OPEN: "navigation.quick_open",
  GO_BACK: "navigation.back",
  GO_FORWARD: "navigation.forward",
  PROJECT_SEARCH: "search.project",
} as const;

export type AppCommandId =
  (typeof APP_COMMAND)[keyof typeof APP_COMMAND];

export type AppCommandContext = {
  path?: string;
  /** New path for renames/moves. */
  targetPath?: string;
};

export const APP_HOTKEY_SCOPE = {
  GLOBAL: "global",
} as const;

type AppHotkeyScope =
  (typeof APP_HOTKEY_SCOPE)[keyof typeof APP_HOTKEY_SCOPE];

export const APP_KEYMAP: Keymap<AppCommandId> = {
  [APP_COMMAND.CLOSE_DOCUMENT]: {
    keys: ["w"],
    mod: true,
  },
  [APP_COMMAND.SAVE_DOCUMENT]: {
    keys: ["s"],
    mod: true,
  },
  [APP_COMMAND.NEXT_DOCUMENT]: {
    keys: ["Tab"],
    ctrl: true,
  },
  [APP_COMMAND.PREVIOUS_DOCUMENT]: {
    keys: ["Tab"],
    ctrl: true,
    shift: true,
  },
  [APP_COMMAND.OPEN_FOLDER]: {
    keys: ["o"],
    mod: true,
  },
  [APP_COMMAND.OPEN_FILE]: {
    keys: ["o"],
    mod: true,
    shift: true,
  },
  [APP_COMMAND.QUICK_OPEN]: {
    keys: ["p"],
    mod: true,
  },
  [APP_COMMAND.PROJECT_SEARCH]: {
    keys: ["f"],
    mod: true,
    shift: true,
  },
  // Ctrl+- / Ctrl+Shift+- (VS Code). Cmd+[ and Cmd+] belong to CodeMirror indentation.
  [APP_COMMAND.GO_BACK]: {
    keys: ["-"],
    ctrl: true,
  },
  [APP_COMMAND.GO_FORWARD]: {
    keys: ["-", "_"],
    ctrl: true,
    shift: true,
  },
};

export const APP_HOTKEY_CONFIG = {
  globalScope: APP_HOTKEY_SCOPE.GLOBAL,
  precedence: {
    [APP_HOTKEY_SCOPE.GLOBAL]: 0,
  },
} satisfies HotkeyConfig<AppHotkeyScope>;

export const createAppCommandRegistry = () =>
  new CommandRegistry<AppCommandContext>();
