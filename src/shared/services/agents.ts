import { invoke } from "@tauri-apps/api/core";

/** A Claude Code hook event, as its hook wrote it (see src-tauri/src/agents.rs). */
export type AgentEvent = {
  /** Native terminal id the agent runs in (SITO_TERMINAL_ID). */
  terminal: number | null;
  /** Claude Code hook input: `hook_event_name`, `session_id`, `cwd`, … */
  event: Record<string, unknown>;
};

export type ClaudeConnection = {
  connected: boolean;
  settingsPath: string;
};

/** Events since the last call, oldest first. */
export const getAgentEvents = async (): Promise<AgentEvent[]> =>
  await invoke<AgentEvent[]>("agent_events");

export const getClaudeConnection = async (): Promise<ClaudeConnection> =>
  await invoke<ClaudeConnection>("claude_connection");

/** Installs the hook and adds it to ~/.claude/settings.json (backup kept). */
export const connectClaude = async (): Promise<ClaudeConnection> =>
  await invoke<ClaudeConnection>("connect_claude");

/** Removes only our hooks from ~/.claude/settings.json. */
export const disconnectClaude = async (): Promise<ClaudeConnection> =>
  await invoke<ClaudeConnection>("disconnect_claude");
