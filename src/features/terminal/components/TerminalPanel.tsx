import { useEffect, useRef, useState } from "react";
import { Button } from "@sito/ui";

import { APP_COMMAND } from "@/app/commands";
import { t } from "@/lang";
import { USAGE_EVENT, useTrackedHotkey, useUsage } from "@/shared/usage";
import { pathName } from "@/shared/utils";

import type { TerminalPanelProps } from "../types";
import { TerminalView } from "./TerminalView";

import "@/styles/components/TerminalPanel.css";

/**
 * Terminal pane chrome. The session restarts in the new folder when the
 * workspace changes, and on demand after the shell exits.
 */
export const TerminalPanel = ({ cwd }: TerminalPanelProps) => {
  const { track } = useUsage();
  const [session, setSession] = useState(0);
  const [exited, setExited] = useState(false);
  const focusRef = useRef<(() => void) | null>(null);

  // A new workspace gets a fresh shell in its folder.
  const previousCwdRef = useRef(cwd);
  useEffect(() => {
    if (previousCwdRef.current === cwd) return;
    previousCwdRef.current = cwd;
    setExited(false);
    setSession((current) => current + 1);
  }, [cwd]);

  const restart = () => {
    track(USAGE_EVENT.TERMINAL.RESTART);
    setExited(false);
    setSession((current) => current + 1);
  };

  useTrackedHotkey(
    APP_COMMAND.FOCUS_TERMINAL,
    () => {
      if (!focusRef.current) return false;
      focusRef.current();
    },
    { allowInInput: true },
  );

  return (
    <section className="TerminalPanel" aria-label={t.terminal.title}>
      <header>
        <span className="TerminalPanel_title">{t.terminal.title}</span>
        <span className="TerminalPanel_cwd" title={cwd ?? undefined}>
          {cwd ? pathName(cwd) : "~"}
        </span>
        <Button
          className="TerminalPanel_restart"
          size="sm"
          variant={exited ? "outlined" : "text"}
          onClick={restart}
        >
          {exited ? t.terminal.restart : t.terminal.newSession}
        </Button>
      </header>
      <TerminalView
        key={session}
        cwd={cwd}
        focusRef={focusRef}
        onSpawn={() => track(USAGE_EVENT.TERMINAL.OPEN)}
        onExit={() => setExited(true)}
      />
    </section>
  );
};
