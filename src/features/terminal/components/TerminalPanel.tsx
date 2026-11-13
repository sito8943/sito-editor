import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleNotch,
  faPlus,
  faTerminal,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";

import { APP_COMMAND } from "@/app/commands";
import { t } from "@/lang";
import { SurfaceButton, TabStrip } from "@/shared/components";
import { useSettings } from "@/shared/settings";
import { USAGE_EVENT, useTrackedHotkey, useUsage } from "@/shared/usage";
import { pathName } from "@/shared/utils";

import { formatElapsed, useTerminalActivity } from "../hooks/useTerminalActivity";
import type { TerminalPanelProps, TerminalSession } from "../types";
import { TerminalView } from "./TerminalView";

import "@/styles/components/TerminalPanel.css";

/**
 * Terminal pane: one tab per shell session. Every session stays mounted (hidden
 * when inactive) so switching tabs keeps its shell and scrollback. A new
 * workspace replaces all sessions with one in its folder.
 */
export const TerminalPanel = ({ cwd }: TerminalPanelProps) => {
  const { track } = useUsage();
  const nextIdRef = useRef(1);
  const newSession = (): TerminalSession => ({
    id: nextIdRef.current++,
    exited: false,
    command: null,
    detail: null,
    working: false,
    cpuMs: null,
    since: null,
    attention: false,
  });
  const [sessions, setSessions] = useState<TerminalSession[]>(() => [
    newSession(),
  ]);
  const [activeId, setActiveId] = useState(1);
  const focusers = useRef(new Map<number, () => void>());

  const engine = useSettings().settings.terminalEngine;

  // A new workspace or terminal engine replaces every session with a fresh one.
  const previousRef = useRef({ cwd, engine });
  useEffect(() => {
    const previous = previousRef.current;
    if (previous.cwd === cwd && previous.engine === engine) return;
    previousRef.current = { cwd, engine };
    const session = newSession();
    setSessions([session]);
    setActiveId(session.id);
    // newSession only reads a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd, engine]);

  const addSession = () => {
    track(USAGE_EVENT.TERMINAL.NEW_SESSION);
    const session = newSession();
    setSessions((current) => [...current, session]);
    setActiveId(session.id);
  };

  const closeSession = (id: number) => {
    track(USAGE_EVENT.TERMINAL.CLOSE_SESSION);
    const index = sessions.findIndex((session) => session.id === id);
    const remaining = sessions.filter((session) => session.id !== id);
    if (remaining.length === 0) {
      // Never leave the pane empty: closing the last one starts a fresh shell.
      const session = newSession();
      setSessions([session]);
      setActiveId(session.id);
      return;
    }
    setSessions(remaining);
    if (id === activeId) {
      setActiveId(remaining[Math.min(index, remaining.length - 1)].id);
    }
  };

  const moveSession = (id: number, toIndex: number) => {
    track(USAGE_EVENT.TERMINAL.REORDER_SESSION);
    setSessions((current) => {
      const from = current.findIndex((session) => session.id === id);
      if (from < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(Math.min(Math.max(toIndex, 0), next.length), 0, moved);
      return next;
    });
  };

  const selectSession = (id: number) => {
    // Clicking the tab you are on still clears its badge.
    setSessions((current) =>
      current.map((session) =>
        session.id === id && session.attention
          ? { ...session, attention: false }
          : session,
      ),
    );
    if (id === activeId) return;
    track(USAGE_EVENT.TERMINAL.SWITCH_SESSION);
    setActiveId(id);
    requestAnimationFrame(() => focusers.current.get(id)?.());
  };

  useTrackedHotkey(
    APP_COMMAND.FOCUS_TERMINAL,
    () => {
      const focus = focusers.current.get(activeId);
      if (!focus) return false;
      focus();
    },
    { allowInInput: true },
  );

  const folder = cwd ? pathName(cwd) : "~";
  const activity = useTerminalActivity({
    sessions,
    setSessions,
    activeId,
    folder,
  });

  return (
    <section className="TerminalPanel" aria-label={t.terminal.title}>
      <header>
        <TabStrip
          ariaLabel={t.terminal.title}
          activeId={String(activeId)}
          items={sessions.map((session, index) => ({
            id: String(session.id),
            label:
              session.command ??
              (sessions.length > 1 ? `${folder} ${index + 1}` : folder),
            icon: session.working ? (
              <FontAwesomeIcon
                icon={faCircleNotch}
                spin
                fixedWidth
                className="TerminalPanel_busy"
              />
            ) : (
              <FontAwesomeIcon icon={faTerminal} fixedWidth />
            ),
            tooltip:
              session.command && session.since !== null
                ? (session.working ? t.terminal.running : t.terminal.waiting)(
                    session.detail ?? session.command,
                    formatElapsed(activity.now - session.since),
                  )
                : (cwd ?? "~"),
            decoration: session.attention ? (
              <span
                className="TerminalPanel_attention"
                role="status"
                aria-label={t.terminal.attention}
              />
            ) : undefined,
            struck: session.exited,
          }))}
          closeLabel={() => t.terminal.closeSession}
          onSelect={(id) => selectSession(Number(id))}
          onClose={(id) => closeSession(Number(id))}
          onMove={(id, toIndex) => moveSession(Number(id), toIndex)}
        />
        <div className="TerminalPanel_actions">
          <SurfaceButton
            icon={faPlus}
            label={t.terminal.newSession}
            onClick={addSession}
          />
          <SurfaceButton
            icon={faTrashCan}
            label={t.terminal.closeSession}
            onClick={() => closeSession(activeId)}
          />
        </div>
      </header>
      <div className="TerminalPanel_body">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="TerminalPanel_session"
            hidden={session.id !== activeId}
          >
            <TerminalView
              cwd={cwd}
              engine={engine}
              onFocusReady={(focus) => {
                if (focus) focusers.current.set(session.id, focus);
                else focusers.current.delete(session.id);
              }}
              onSpawn={(nativeId) => {
                track(USAGE_EVENT.TERMINAL.OPEN);
                setSessions((current) =>
                  current.map((item) =>
                    item.id === session.id ? { ...item, nativeId } : item,
                  ),
                );
              }}
              onBell={() => activity.onBell(session.id)}
              onExit={() =>
                setSessions((current) =>
                  current.map((item) =>
                    item.id === session.id ? { ...item, exited: true } : item,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
};
