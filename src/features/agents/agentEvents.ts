import { pathName } from "@/shared/utils";

import { AGENT_STATUS, type AgentSession, type AgentStatus } from "./types";

/** Claude Code tools that change files; their `file_path` goes in the files list. */
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const firstLine = (value: string, max = 120) => {
  const line = value.split("\n")[0];
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

/** "Edit App.tsx", "Bash npm test", "Grep useState", or just the tool name. */
export const describeTool = (
  tool: string,
  input: Record<string, unknown> | undefined,
): string => {
  const file = text(input?.file_path) ?? text(input?.notebook_path);
  const detail =
    (file && pathName(file)) ??
    text(input?.command) ??
    text(input?.pattern) ??
    text(input?.url) ??
    text(input?.description) ??
    text(input?.query);
  return detail ? `${tool} ${firstLine(detail, 60)}` : tool;
};

export type Transition = {
  session: AgentSession;
  from: AgentStatus | null;
};

/**
 * Applies one hook event to the sessions. Returns the new map and the session
 * whose status changed (for notifications), if any.
 */
export const applyAgentEvent = (
  sessions: Map<string, AgentSession>,
  terminal: number | null,
  event: Record<string, unknown>,
  now: number,
): { sessions: Map<string, AgentSession>; transition: Transition | null } => {
  const id = text(event.session_id);
  const name = text(event.hook_event_name);
  if (!id || !name) return { sessions, transition: null };

  const previous = sessions.get(id);
  const session: AgentSession = previous
    ? { ...previous, terminal: terminal ?? previous.terminal }
    : {
        id,
        terminal,
        cwd: text(event.cwd),
        status: AGENT_STATUS.WAITING,
        prompt: null,
        activity: null,
        files: [],
        startedAt: now,
        statusSince: now,
      };
  session.cwd = text(event.cwd) ?? session.cwd;

  const toolName = text(event.tool_name);
  const toolInput = event.tool_input as Record<string, unknown> | undefined;
  let status: AgentStatus = session.status;

  switch (name) {
    case "SessionStart":
      status = AGENT_STATUS.WAITING;
      break;
    case "UserPromptSubmit": {
      const prompt = text(event.prompt);
      session.prompt = prompt ? firstLine(prompt) : session.prompt;
      session.activity = null;
      status = AGENT_STATUS.WORKING;
      break;
    }
    case "PreToolUse":
      session.activity = toolName ? describeTool(toolName, toolInput) : null;
      status = AGENT_STATUS.WORKING;
      break;
    case "PostToolUse": {
      const file = text(toolInput?.file_path) ?? text(toolInput?.notebook_path);
      if (toolName && EDIT_TOOLS.has(toolName) && file) {
        session.files = [file, ...session.files.filter((item) => item !== file)];
      }
      status = AGENT_STATUS.WORKING;
      break;
    }
    case "PermissionRequest":
      session.activity = toolName ? describeTool(toolName, toolInput) : session.activity;
      status = AGENT_STATUS.PERMISSION;
      break;
    case "Notification": {
      const kind = text(event.notification_type);
      if (kind === "permission_prompt") status = AGENT_STATUS.PERMISSION;
      else if (kind === "idle_prompt") status = AGENT_STATUS.WAITING;
      break;
    }
    case "Stop":
      session.activity = null;
      status = AGENT_STATUS.WAITING;
      break;
    case "SessionEnd":
      session.activity = null;
      status = AGENT_STATUS.ENDED;
      break;
    default:
      break;
  }

  const changed = status !== session.status || !previous;
  if (status !== session.status) session.statusSince = now;
  session.status = status;

  const next = new Map(sessions);
  next.set(id, session);
  return {
    sessions: next,
    transition: changed ? { session, from: previous?.status ?? null } : null,
  };
};
