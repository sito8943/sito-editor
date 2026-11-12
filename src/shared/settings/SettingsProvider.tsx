import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { readJson, writeJson } from "@/shared/services/storage";
import { USAGE_EVENT, useUsage } from "@/shared/usage";

import {
  DEFAULT_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  SETTINGS_STORAGE_KEY,
  TAB_SIZES,
  type EditorSettings,
  TERMINAL_ENGINE,
  type FontTarget,
  type TerminalEngine,
} from "./constants";
import { SettingsContext, type SettingsValue } from "./SettingsContext";

const clampFontSize = (size: number) =>
  Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)));

const storedSize = (value: unknown, fallback: number) =>
  typeof value === "number" ? clampFontSize(value) : fallback;

type StoredSettings = Omit<Partial<EditorSettings>, "fontSize"> & {
  /** A number in 0.6.0 previews (editor only), a record since. */
  fontSize?: number | Partial<Record<FontTarget, number>>;
};

/** Stored values are checked: a bad or old entry falls back to the default. */
const loadSettings = (): EditorSettings => {
  const stored = readJson<StoredSettings>(SETTINGS_STORAGE_KEY, {});
  const sizes =
    typeof stored.fontSize === "number"
      ? { editor: stored.fontSize }
      : (stored.fontSize ?? {});
  return {
    fontSize: {
      editor: storedSize(sizes.editor, DEFAULT_SETTINGS.fontSize.editor),
      terminal: storedSize(sizes.terminal, DEFAULT_SETTINGS.fontSize.terminal),
    },
    wordWrap:
      typeof stored.wordWrap === "boolean"
        ? stored.wordWrap
        : DEFAULT_SETTINGS.wordWrap,
    tabSize: (TAB_SIZES as readonly number[]).includes(stored.tabSize ?? 0)
      ? (stored.tabSize as number)
      : DEFAULT_SETTINGS.tabSize,
    terminalEngine: (
      Object.values(TERMINAL_ENGINE) as readonly string[]
    ).includes(stored.terminalEngine ?? "")
      ? (stored.terminalEngine as TerminalEngine)
      : DEFAULT_SETTINGS.terminalEngine,
  };
};

const FONT_EVENTS = {
  editor: USAGE_EVENT.SETTINGS,
  terminal: {
    FONT_SIZE: USAGE_EVENT.SETTINGS.TERMINAL_FONT_SIZE,
    FONT_BIGGER: USAGE_EVENT.SETTINGS.TERMINAL_FONT_BIGGER,
    FONT_SMALLER: USAGE_EVENT.SETTINGS.TERMINAL_FONT_SMALLER,
    FONT_RESET: USAGE_EVENT.SETTINGS.TERMINAL_FONT_RESET,
  },
} as const;

/** Editor settings shared by the editor, the terminal and the status bar. */
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState(loadSettings);
  const { track } = useUsage();

  useEffect(() => {
    writeJson(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  const update = useCallback(
    (patch: (current: EditorSettings) => Partial<EditorSettings>) =>
      setSettings((current) => ({ ...current, ...patch(current) })),
    [],
  );

  const writeFontSize = useCallback(
    (target: FontTarget, next: (current: number) => number) =>
      update((current) => ({
        fontSize: {
          ...current.fontSize,
          [target]: clampFontSize(next(current.fontSize[target])),
        },
      })),
    [update],
  );
  const setFontSize = useCallback(
    (target: FontTarget, size: number) => {
      track(FONT_EVENTS[target].FONT_SIZE);
      writeFontSize(target, () => size);
    },
    [track, writeFontSize],
  );
  const changeFontSize = useCallback(
    (target: FontTarget, delta: number) => {
      track(
        delta > 0
          ? FONT_EVENTS[target].FONT_BIGGER
          : FONT_EVENTS[target].FONT_SMALLER,
      );
      writeFontSize(target, (size) => size + delta);
    },
    [track, writeFontSize],
  );
  const resetFontSize = useCallback(
    (target: FontTarget) => {
      track(FONT_EVENTS[target].FONT_RESET);
      writeFontSize(target, () => DEFAULT_SETTINGS.fontSize[target]);
    },
    [track, writeFontSize],
  );
  const setTabSize = useCallback(
    (size: number) => {
      track(USAGE_EVENT.SETTINGS.TAB_SIZE);
      update(() => ({ tabSize: size }));
    },
    [track, update],
  );
  const toggleWordWrap = useCallback(() => {
    track(USAGE_EVENT.SETTINGS.WORD_WRAP);
    update((current) => ({ wordWrap: !current.wordWrap }));
  }, [track, update]);

  const setTerminalEngine = useCallback(
    (engine: TerminalEngine) => {
      track(USAGE_EVENT.SETTINGS.TERMINAL_ENGINE);
      update(() => ({ terminalEngine: engine }));
    },
    [track, update],
  );

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      setFontSize,
      changeFontSize,
      resetFontSize,
      setTabSize,
      toggleWordWrap,
      setTerminalEngine,
    }),
    [
      settings,
      setFontSize,
      changeFontSize,
      resetFontSize,
      setTabSize,
      toggleWordWrap,
      setTerminalEngine,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
};
