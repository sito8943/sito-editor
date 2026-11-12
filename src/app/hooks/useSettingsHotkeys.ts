import type { HotkeyHandler } from "@sito/commands";

import { FONT_TARGET, useSettings, type FontTarget } from "@/shared/settings";
import { useTrackedHotkey } from "@/shared/usage";

import { APP_COMMAND } from "../commands";

/** Zoom acts where the focus is: the terminal (its tabs or a shell), else the editor. */
const focusedFontTarget = (): FontTarget =>
  document.activeElement?.closest(".TerminalPanel")
    ? FONT_TARGET.TERMINAL
    : FONT_TARGET.EDITOR;

/**
 * Cmd only: the keymap's `mod` also matches Ctrl, and Ctrl+- is Go back.
 * Returning false hands the key to the next binding.
 */
const cmdOnly =
  (action: (target: FontTarget) => void): HotkeyHandler =>
  (event) => {
    if (!event.metaKey) return false;
    action(focusedFontTarget());
  };

/** ⌘= / ⌘- / ⌘0 text size of the focused area and ⌥Z word wrap, also while typing. */
export const useSettingsHotkeys = (): void => {
  const { changeFontSize, resetFontSize, toggleWordWrap } = useSettings();
  const options = { allowInInput: true };

  useTrackedHotkey(
    APP_COMMAND.FONT_BIGGER,
    cmdOnly((target) => changeFontSize(target, 1)),
    options,
  );
  useTrackedHotkey(
    APP_COMMAND.FONT_SMALLER,
    cmdOnly((target) => changeFontSize(target, -1)),
    options,
  );
  useTrackedHotkey(APP_COMMAND.FONT_RESET, cmdOnly(resetFontSize), options);
  useTrackedHotkey(APP_COMMAND.TOGGLE_WORD_WRAP, toggleWordWrap, options);
};
