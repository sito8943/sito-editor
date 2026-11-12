export type TerminalPanelProps = {
  /** Workspace folder the shells start in; null starts them in $HOME. */
  cwd: string | null;
};

export type TerminalSession = {
  /** Local id (also the React key); not the native session id. */
  id: number;
  /** The shell exited; the tab stays until closed. */
  exited: boolean;
};

export type TerminalViewProps = {
  cwd: string | null;
  /** Receives a function that focuses this terminal, and null on unmount. */
  onFocusReady?: (focus: (() => void) | null) => void;
  onSpawn?: () => void;
  onExit?: (code: number | null) => void;
};
