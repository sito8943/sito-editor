export const AGENT_STATUS = {
  /** Thinking or running tools. */
  WORKING: "working",
  /** Blocked on a permission prompt in its terminal. */
  PERMISSION: "permission",
  /** Done with its turn (or just started): your move. */
  WAITING: "waiting",
  ENDED: "ended",
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

export type AgentSession = {
  /** Claude Code session id. */
  id: string;
  /** Native terminal it runs in. */
  terminal: number | null;
  cwd: string | null;
  status: AgentStatus;
  /** Your last prompt, first line. */
  prompt: string | null;
  /** What it is doing now ("Edit App.tsx", "Bash npm test"). */
  activity: string | null;
  /** Files it changed in this session, most recent first. */
  files: string[];
  startedAt: number;
  /** When the current status began. */
  statusSince: number;
};

export type AgentDashboardProps = {
  sessions: AgentSession[];
  connected: boolean | null;
  now: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenFile: (path: string) => void;
  onGoToTerminal: (terminal: number) => void;
  onClose: () => void;
};
