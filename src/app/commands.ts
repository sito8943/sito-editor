import {
  CommandRegistry,
  type HotkeyConfig,
  type Keymap,
} from "@sito/commands";

export const APP_COMMAND = {
  OPEN_DOCUMENT: "editor.open_document",
  CLOSE_DOCUMENT: "editor.close_document",
  SAVE_DOCUMENT: "editor.save_document",
  TOGGLE_DIRECTORY: "explorer.toggle_directory",
  REFRESH_DIRECTORY: "explorer.refresh_directory",
  COLLAPSE_EXPLORER: "explorer.collapse_all",
} as const;

export type AppCommandId =
  (typeof APP_COMMAND)[keyof typeof APP_COMMAND];

export type AppCommandContext = {
  path?: string;
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
};

export const APP_HOTKEY_CONFIG = {
  globalScope: APP_HOTKEY_SCOPE.GLOBAL,
  precedence: {
    [APP_HOTKEY_SCOPE.GLOBAL]: 0,
  },
} satisfies HotkeyConfig<AppHotkeyScope>;

export const createAppCommandRegistry = () =>
  new CommandRegistry<AppCommandContext>();
