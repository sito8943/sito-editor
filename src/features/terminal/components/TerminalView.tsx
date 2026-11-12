import { useEffect, useRef } from "react";
import { Terminal, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

import {
  killTerminal,
  resizeTerminal,
  spawnTerminal,
  writeTerminal,
} from "@/shared/services/terminal";
import { t } from "@/lang";

import type { TerminalViewProps } from "../types";

import "@xterm/xterm/css/xterm.css";

/** Reads a theme token from :root so the terminal follows the app palette. */
const token = (name: string, fallback: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
  fallback;

const appTheme = (): ITheme => ({
  background: token("--color-editor", "#12151a"),
  foreground: token("--color-text", "#e7eaf0"),
  cursor: token("--color-editor-caret", "#ffffff"),
  cursorAccent: token("--color-editor", "#12151a"),
  selectionBackground: "rgba(122, 162, 247, 0.3)",
  // Tokyo Night ANSI palette, matching the syntax colors.
  black: "#15161e",
  red: "#f7768e",
  green: "#9ece6a",
  yellow: "#e0af68",
  blue: "#7aa2f7",
  magenta: "#bb9af7",
  cyan: "#7dcfff",
  white: "#a9b1d6",
  brightBlack: "#414868",
  brightRed: "#f7768e",
  brightGreen: "#9ece6a",
  brightYellow: "#e0af68",
  brightBlue: "#7aa2f7",
  brightMagenta: "#bb9af7",
  brightCyan: "#7dcfff",
  brightWhite: "#c0caf5",
});

/**
 * One shell session rendered with xterm.js. The pty lives in the native host
 * (src-tauri/src/terminal.rs); this view only renders and forwards input and
 * size. Remount it (key) to start a new session.
 */
export const TerminalView = ({
  cwd,
  focusRef,
  onSpawn,
  onExit,
}: TerminalViewProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const onSpawnRef = useRef(onSpawn);
  const onExitRef = useRef(onExit);
  onSpawnRef.current = onSpawn;
  onExitRef.current = onExit;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const terminal = new Terminal({
      theme: appTheme(),
      fontFamily: token("--font-mono", "Menlo, monospace"),
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      allowProposedApi: false,
      macOptionIsMeta: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(host);
    fit.fit();
    if (focusRef) focusRef.current = () => terminal.focus();

    let disposed = false;
    let sessionId: number | null = null;

    void spawnTerminal(
      { cwd, cols: terminal.cols, rows: terminal.rows },
      (event) => {
        if (event.type === "output") {
          terminal.write(event.data);
        } else {
          terminal.write(
            `\r\n\x1b[2m${t.terminal.exited(event.code)}\x1b[0m\r\n`,
          );
          sessionId = null;
          onExitRef.current?.(event.code);
        }
      },
    )
      .then((id) => {
        // Unmounted while spawning (e.g. StrictMode): end that shell.
        if (disposed) {
          void killTerminal(id);
          return;
        }
        sessionId = id;
        onSpawnRef.current?.();
        // The size may have changed while the shell started.
        void resizeTerminal(id, terminal.cols, terminal.rows);
      })
      .catch((reason: unknown) => {
        terminal.write(`\x1b[31m${String(reason)}\x1b[0m\r\n`);
      });

    const input = terminal.onData((data) => {
      if (sessionId !== null) void writeTerminal(sessionId, data);
    });

    // Refit to the pane and tell the pty about the new grid.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { cols, rows } = terminal;
        fit.fit();
        if (
          sessionId !== null &&
          (cols !== terminal.cols || rows !== terminal.rows)
        ) {
          void resizeTerminal(sessionId, terminal.cols, terminal.rows);
        }
      });
    });
    observer.observe(host);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      input.dispose();
      if (sessionId !== null) void killTerminal(sessionId);
      if (focusRef) focusRef.current = null;
      terminal.dispose();
    };
    // A new cwd means a new session: the parent remounts with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="TerminalView" ref={hostRef} />;
};
