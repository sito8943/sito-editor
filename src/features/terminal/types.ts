import type { TerminalEngine } from "@/shared/settings";

export type TerminalPanelProps = {
  /** Workspace folder the shells start in; null starts them in $HOME. */
  cwd: string | null;
  /** Show and focus the terminal with this native id (changes on each request). */
  focusRequest?: { terminal: number; at: number } | null;
  /** Agent status per native terminal id, shown on its tab. */
  agentStatus?: ReadonlyMap<number, "working" | "permission" | "waiting" | "ended">;
};

export type TerminalSession = {
  /** Local id (also the React key); not the native session id. */
  id: number;
  /** The shell exited; the tab stays until closed. */
  exited: boolean;
  /** Native session id (src-tauri/src/terminal.rs), once the shell started. */
  nativeId?: number;
  /** Foreground program (short), null at the prompt. */
  command: string | null;
  /** Its full command line, for the tooltip. */
  detail: string | null;
  /** Using CPU right now (a build, an agent thinking), not waiting for input. */
  working: boolean;
  /** Last CPU reading of the foreground group, to measure activity. */
  cpuMs: number | null;
  /** When the current command started (ms), for the elapsed time. */
  since: number | null;
  /** Something happened here while you looked elsewhere (finished command, bell). */
  attention: boolean;
};

export type TerminalViewProps = {
  cwd: string | null;
  /** What draws it; fixed for the session's life. */
  engine: TerminalEngine;
  /** Receives a function that focuses this terminal, and null on unmount. */
  onFocusReady?: (focus: (() => void) | null) => void;
  /** The shell started; receives its native session id. */
  onSpawn?: (nativeId: number) => void;
  onBell?: () => void;
  onExit?: (code: number | null) => void;
};
