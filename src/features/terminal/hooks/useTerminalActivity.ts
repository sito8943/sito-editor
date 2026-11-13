import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { t } from "@/lang";
import { notify } from "@/shared/services/notify";
import { getTerminalStatus } from "@/shared/services/terminal";
import { USAGE_EVENT, useUsage } from "@/shared/usage";

import type { TerminalSession } from "../types";

/** How often the foreground commands are read from the native host. */
const POLL_MS = 1000;
/** A command that ran at least this long earns a badge (and a notification when away). */
const LONG_COMMAND_MS = 10_000;
/**
 * CPU share of the foreground group that counts as working (a build, an agent
 * thinking). Below it the program waits for input (vim, an idle prompt).
 */
const WORKING_CPU_SHARE = 0.03;

/** "12 s", "3 min 05 s", "1 h 02 min". */
export const formatElapsed = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${String(seconds % 60).padStart(2, "0")} s`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
};

type Options = {
  sessions: TerminalSession[];
  setSessions: Dispatch<SetStateAction<TerminalSession[]>>;
  activeId: number;
  /** Folder name, for notifications. */
  folder: string;
};

/**
 * Keeps each session's foreground command up to date (from the pty, never the
 * screen) and flags the ones that need a look: a long command that finished
 * or a bell, in a tab you are not watching. Returns the current time (ticks
 * with the poll, for elapsed times) and the bell handler.
 */
export const useTerminalActivity = ({
  sessions,
  setSessions,
  activeId,
  folder,
}: Options) => {
  const { track } = useUsage();
  const [now, setNow] = useState(() => Date.now());
  const sessionsRef = useRef(sessions);
  const activeIdRef = useRef(activeId);
  const folderRef = useRef(folder);
  const lastPollRef = useRef(Date.now());
  sessionsRef.current = sessions;
  activeIdRef.current = activeId;
  folderRef.current = folder;

  /** You are not looking at this session: another tab, or another app. */
  const away = (id: number) =>
    id !== activeIdRef.current || !document.hasFocus();

  const patch = (updates: Map<number, Partial<TerminalSession>>) => {
    if (updates.size === 0) return;
    setSessions((current) =>
      current.map((session) => {
        const update = updates.get(session.id);
        return update ? { ...session, ...update } : session;
      }),
    );
  };

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const statuses = await getTerminalStatus().catch(() => null);
      if (!active || !statuses) return;
      const at = Date.now();
      setNow(at);
      const elapsed = at - lastPollRef.current;
      lastPollRef.current = at;
      const byId = new Map(statuses.map((status) => [status.id, status]));
      const updates = new Map<number, Partial<TerminalSession>>();
      for (const session of sessionsRef.current) {
        if (session.nativeId === undefined || session.exited) continue;
        const status = byId.get(session.nativeId);
        const command = status?.command ?? null;
        if (command !== null) {
          const cpuMs = status?.cpuMs ?? null;
          const used =
            cpuMs !== null && session.cpuMs !== null ? cpuMs - session.cpuMs : 0;
          const working =
            session.command === command &&
            elapsed > 0 &&
            used / elapsed >= WORKING_CPU_SHARE;
          const next: Partial<TerminalSession> = {
            command,
            detail: status?.detail ?? null,
            cpuMs,
            working,
            // Idle → busy starts the clock; busy → another command keeps it.
            since: session.command === null ? at : session.since,
          };
          const changed = (Object.keys(next) as (keyof TerminalSession)[]).some(
            (key) => next[key] !== session[key],
          );
          if (changed) updates.set(session.id, next);
          continue;
        }
        if (session.command === null) continue;
        const ran = session.since === null ? 0 : at - session.since;
        const flagged = ran >= LONG_COMMAND_MS && away(session.id);
        updates.set(session.id, {
          command: null,
          detail: null,
          cpuMs: null,
          working: false,
          since: null,
          attention: session.attention || flagged,
        });
        if (flagged) {
          track(USAGE_EVENT.TERMINAL.COMMAND_FINISHED_NOTICE);
          if (!document.hasFocus() && session.command) {
            void notify(
              t.terminal.finished(session.command),
              `${folderRef.current} · ${formatElapsed(ran)}`,
            );
          }
        }
      }
      patch(updates);
    };
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
    // Reads the latest sessions through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coming back to the window clears the badge of the tab you are on.
  useEffect(() => {
    const clear = () => {
      const current = sessionsRef.current.find(
        (session) => session.id === activeIdRef.current,
      );
      if (current?.attention) {
        patch(new Map([[current.id, { attention: false }]]));
      }
    };
    window.addEventListener("focus", clear);
    return () => window.removeEventListener("focus", clear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBell = (id: number) => {
    if (!away(id)) return;
    track(USAGE_EVENT.TERMINAL.BELL_NOTICE);
    patch(new Map([[id, { attention: true }]]));
    if (!document.hasFocus()) {
      const session = sessionsRef.current.find((item) => item.id === id);
      void notify(
        t.terminal.bell(session?.command ?? folderRef.current),
        folderRef.current,
      );
    }
  };

  return { now, onBell };
};
