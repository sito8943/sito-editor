import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTerminal,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";

import { APP_COMMAND } from "@/app/commands";
import { t } from "@/lang";
import { SurfaceButton, TabStrip } from "@/shared/components";
import { USAGE_EVENT, useTrackedHotkey, useUsage } from "@/shared/usage";
import { pathName } from "@/shared/utils";

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
  });
  const [sessions, setSessions] = useState<TerminalSession[]>(() => [
    newSession(),
  ]);
  const [activeId, setActiveId] = useState(1);
  const focusers = useRef(new Map<number, () => void>());

  const previousCwdRef = useRef(cwd);
  useEffect(() => {
    if (previousCwdRef.current === cwd) return;
    previousCwdRef.current = cwd;
    const session = newSession();
    setSessions([session]);
    setActiveId(session.id);
    // newSession only reads a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd]);

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

  return (
    <section className="TerminalPanel" aria-label={t.terminal.title}>
      <header>
        <TabStrip
          ariaLabel={t.terminal.title}
          activeId={String(activeId)}
          items={sessions.map((session, index) => ({
            id: String(session.id),
            label: sessions.length > 1 ? `${folder} ${index + 1}` : folder,
            icon: <FontAwesomeIcon icon={faTerminal} fixedWidth />,
            tooltip: cwd ?? "~",
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
              onFocusReady={(focus) => {
                if (focus) focusers.current.set(session.id, focus);
                else focusers.current.delete(session.id);
              }}
              onSpawn={() => track(USAGE_EVENT.TERMINAL.OPEN)}
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
