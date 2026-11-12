import { Channel, invoke } from "@tauri-apps/api/core";

/** Streamed by `terminal_spawn` (see src-tauri/src/terminal.rs). */
export type TerminalEvent =
  | { type: "output"; data: string }
  | { type: "exit"; code: number | null };

type SpawnOptions = {
  /** Working directory; falls back to $HOME when missing. */
  cwd: string | null;
  cols: number;
  rows: number;
};

/** Starts a login shell in a pseudo-terminal. Resolves to the session id. */
export const spawnTerminal = async (
  { cwd, cols, rows }: SpawnOptions,
  onEvent: (event: TerminalEvent) => void,
): Promise<number> => {
  const channel = new Channel<TerminalEvent>();
  channel.onmessage = onEvent;
  return await invoke<number>("terminal_spawn", {
    cwd,
    cols,
    rows,
    onEvent: channel,
  });
};

export const writeTerminal = async (id: number, data: string): Promise<void> =>
  await invoke("terminal_write", { id, data });

export const resizeTerminal = async (
  id: number,
  cols: number,
  rows: number,
): Promise<void> => await invoke("terminal_resize", { id, cols, rows });

export const killTerminal = async (id: number): Promise<void> =>
  await invoke("terminal_kill", { id });
