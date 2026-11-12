import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommand, useHotkey } from "@sito/commands/react";

import { APP_COMMAND, type AppCommandContext } from "@/app/commands";
import { t } from "@/lang";

import type { FileHistoryState, UseFileHistoryOptions } from "../types";

const HISTORY_LIMIT = 100;

type History = {
  entries: string[];
  index: number;
};

const EMPTY_HISTORY: History = { entries: [], index: -1 };

/**
 * Back/forward over the files that became active, like a browser history.
 * Activations caused by back/forward move the cursor instead of pushing.
 */
export const useFileHistory = ({
  rootPath,
  activePath,
  onOpenFile,
}: UseFileHistoryOptions): FileHistoryState => {
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const pendingPathRef = useRef<string | null>(null);

  useEffect(() => {
    setHistory(EMPTY_HISTORY);
    pendingPathRef.current = null;
  }, [rootPath]);

  useEffect(() => {
    if (!activePath) return;
    if (pendingPathRef.current === activePath) {
      pendingPathRef.current = null;
      return;
    }
    pendingPathRef.current = null;

    setHistory(({ entries, index }) => {
      if (entries[index] === activePath) return { entries, index };
      const next = [...entries.slice(0, index + 1), activePath].slice(
        -HISTORY_LIMIT,
      );
      return { entries: next, index: next.length - 1 };
    });
  }, [activePath]);

  const canGoBack = history.index > 0;
  const canGoForward = history.index < history.entries.length - 1;

  const go = useCallback(
    (delta: number): void => {
      const target = history.index + delta;
      const path = history.entries[target];
      if (!path) return;

      setHistory((current) => ({ ...current, index: target }));
      if (path === activePath) return;
      pendingPathRef.current = path;
      void onOpenFile(path);
    },
    [activePath, history, onOpenFile],
  );

  const back = useCallback(() => go(-1), [go]);
  const forward = useCallback(() => go(1), [go]);

  useCommand<AppCommandContext>({
    id: APP_COMMAND.GO_BACK,
    title: () => t.navigation.back,
    isEnabled: () => canGoBack,
    execute: back,
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.GO_FORWARD,
    title: () => t.navigation.forward,
    isEnabled: () => canGoForward,
    execute: forward,
  });

  useHotkey(
    APP_COMMAND.GO_BACK,
    () => {
      if (!canGoBack) return false;
      back();
    },
    { allowInInput: true },
  );

  useHotkey(
    APP_COMMAND.GO_FORWARD,
    () => {
      if (!canGoForward) return false;
      forward();
    },
    { allowInInput: true },
  );

  return useMemo(
    () => ({ canGoBack, canGoForward, back, forward }),
    [back, canGoBack, canGoForward, forward],
  );
};
