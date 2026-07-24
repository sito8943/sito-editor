import {
  CommandRegistry,
  type HotkeyConfig,
  type Keymap,
} from "@sito/commands";

export const EDITOR_COMMAND = {
  CLOSE_DOCUMENT: "editor.close_document",
  SAVE_DOCUMENT: "editor.save_document",
} as const;

export type EditorCommandId =
  (typeof EDITOR_COMMAND)[keyof typeof EDITOR_COMMAND];

export type EditorCommandContext = {
  path?: string;
};

export const EDITOR_HOTKEY_SCOPE = {
  GLOBAL: "global",
} as const;

type EditorHotkeyScope =
  (typeof EDITOR_HOTKEY_SCOPE)[keyof typeof EDITOR_HOTKEY_SCOPE];

export const EDITOR_KEYMAP: Keymap<EditorCommandId> = {
  [EDITOR_COMMAND.CLOSE_DOCUMENT]: {
    keys: ["w"],
    mod: true,
  },
  [EDITOR_COMMAND.SAVE_DOCUMENT]: {
    keys: ["s"],
    mod: true,
  },
};

export const EDITOR_HOTKEY_CONFIG = {
  globalScope: EDITOR_HOTKEY_SCOPE.GLOBAL,
  precedence: {
    [EDITOR_HOTKEY_SCOPE.GLOBAL]: 0,
  },
} satisfies HotkeyConfig<EditorHotkeyScope>;

export const createEditorCommandRegistry = () =>
  new CommandRegistry<EditorCommandContext>();
