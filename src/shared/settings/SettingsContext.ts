import { createContext, useContext } from "react";

import type { EditorSettings, FontTarget, TerminalEngine } from "./constants";

export type SettingsValue = {
  settings: EditorSettings;
  setFontSize: (target: FontTarget, size: number) => void;
  changeFontSize: (target: FontTarget, delta: number) => void;
  resetFontSize: (target: FontTarget) => void;
  setTabSize: (size: number) => void;
  toggleWordWrap: () => void;
  setTerminalEngine: (engine: TerminalEngine) => void;
};

export const SettingsContext = createContext<SettingsValue | null>(null);

export const useSettings = (): SettingsValue => {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
};
