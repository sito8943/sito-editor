import { useCallback, useEffect, useRef, useState } from "react";

import { t } from "@/lang";
import {
  connectClaude,
  disconnectClaude,
  getAgentEvents,
  getClaudeConnection,
} from "@/shared/services/agents";
import { notify } from "@/shared/services/notify";
import { getTerminalStatus } from "@/shared/services/terminal";
import { USAGE_EVENT, useUsage } from "@/shared/usage";
import { pathName } from "@/shared/utils";

import { applyAgentEvent, type Transition } from "../agentEvents";
import { AGENT_STATUS, type AgentSession } from "../types";

const POLL_MS = 1000;
/** Ended sessions stay visible this long, then leave the list. */
const ENDED_LINGER_MS = 60_000;

const notifyTransition = ({ session, from }: Transition) => {
  if (document.hasFocus()) return;
  const where = session.cwd ? pathName(session.cwd) : t.agents.claude;
  if (session.status === AGENT_STATUS.PERMISSION) {
    void notify(t.agents.notifyPermission(where), session.activity ?? undefined);
  } else if (
    session.status === AGENT_STATUS.WAITING &&
    from === AGENT_STATUS.WORKING
  ) {
    void notify(t.agents.notifyDone(where), session.prompt ?? undefined);
  }
};

/**
 * Claude Code sessions running in this app's terminals, from their hook
 * events (never from the terminal screen), plus the hook connection state.
 */
export const useAgentSessions = () => {
  const { track } = useUsage();
  const [sessions, setSessions] = useState<Map<string, AgentSession>>(
    () => new Map(),
  );
  const [connected, setConnected] = useState<boolean | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  useEffect(() => {
    void getClaudeConnection()
      .then((connection) => setConnected(connection.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const [events, terminals] = await Promise.all([
        getAgentEvents().catch(() => []),
        getTerminalStatus().catch(() => null),
      ]);
      if (!active) return;
      const at = Date.now();
      setNow(at);
      let next = sessionsRef.current;
      const transitions: Transition[] = [];
      for (const { terminal, event } of events) {
        const result = applyAgentEvent(next, terminal, event, at);
        next = result.sessions;
        if (result.transition) transitions.push(result.transition);
      }
      // A session whose terminal is gone or back at the prompt has ended,
      // even if Claude Code was killed before it could say so.
      if (terminals) {
        const running = new Map(
          terminals.map((status) => [status.id, status.command]),
        );
        for (const session of next.values()) {
          if (session.status === AGENT_STATUS.ENDED || session.terminal === null) {
            continue;
          }
          if (!running.has(session.terminal) || running.get(session.terminal) === null) {
            next = new Map(next);
            next.set(session.id, {
              ...session,
              status: AGENT_STATUS.ENDED,
              activity: null,
              statusSince: at,
            });
          }
        }
      }
      for (const session of next.values()) {
        if (
          session.status === AGENT_STATUS.ENDED &&
          at - session.statusSince > ENDED_LINGER_MS
        ) {
          next = new Map(next);
          next.delete(session.id);
        }
      }
      for (const transition of transitions) {
        if (transition.from === null) track(USAGE_EVENT.AGENTS.SESSION_SEEN);
        notifyTransition(transition);
      }
      if (next !== sessionsRef.current) {
        sessionsRef.current = next;
        setSessions(next);
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async () => {
    track(USAGE_EVENT.AGENTS.CONNECT);
    const connection = await connectClaude();
    setConnected(connection.connected);
  }, [track]);

  const disconnect = useCallback(async () => {
    track(USAGE_EVENT.AGENTS.DISCONNECT);
    const connection = await disconnectClaude();
    setConnected(connection.connected);
  }, [track]);

  const list = [...sessions.values()].sort((a, b) => b.startedAt - a.startedAt);
  const byTerminal = new Map<number, AgentSession>();
  for (const session of list) {
    if (session.terminal !== null && !byTerminal.has(session.terminal)) {
      byTerminal.set(session.terminal, session);
    }
  }

  return { sessions: list, byTerminal, connected, now, connect, disconnect };
};
