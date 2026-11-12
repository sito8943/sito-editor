import type { RefObject } from "react";

export type TerminalPanelProps = {
  /** Workspace folder the shell starts in; null starts in $HOME. */
  cwd: string | null;
};

export type TerminalViewProps = {
  cwd: string | null;
  /** Set to a function that focuses the terminal while it is mounted. */
  focusRef?: RefObject<(() => void) | null>;
  onSpawn?: () => void;
  onExit?: (code: number | null) => void;
};
