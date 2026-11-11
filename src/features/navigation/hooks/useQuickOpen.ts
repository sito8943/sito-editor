import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCommand, useHotkey } from "@sito/commands/react";

import { APP_COMMAND, type AppCommandContext } from "@/app/commands";
import { t } from "@/lang";
import {
  listWorkspaceFiles,
  workspaceErrorMessage,
} from "@/shared/services/workspace";
import { joinPath } from "@/shared/utils";

import type { QuickOpenState, UseQuickOpenOptions } from "../types";
import { rankPaths } from "../utils/fuzzy";

const RESULT_LIMIT = 50;

export const useQuickOpen = ({
  rootPath,
  onOpenFile,
}: UseQuickOpenOptions): QuickOpenState => {
  const [open, setOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [filesRoot, setFilesRoot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => rankPaths(deferredQuery, files, RESULT_LIMIT),
    [deferredQuery, files],
  );

  // Drop the cached list when the workspace changes.
  useEffect(() => {
    setFiles([]);
    setFilesRoot(null);
    setTruncated(false);
    setError(null);
    setOpen(false);
  }, [rootPath]);

  const refreshFiles = useCallback(async (root: string): Promise<void> => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const list = await listWorkspaceFiles(root);
      if (request !== requestRef.current) return;
      setFiles(list.files);
      setFilesRoot(root);
      setTruncated(list.truncated);
    } catch (reason) {
      if (request === requestRef.current) {
        setError(workspaceErrorMessage(reason));
      }
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  const show = useCallback(
    (initialQuery = ""): void => {
      if (!rootPath) return;
      setQueryState(initialQuery);
      setSelectedIndex(0);
      setOpen(true);
      // Show the cached list immediately and refresh it in the background.
      void refreshFiles(rootPath);
    },
    [refreshFiles, rootPath],
  );

  const close = useCallback((): void => setOpen(false), []);

  const setQuery = useCallback((value: string): void => {
    setQueryState(value);
    setSelectedIndex(0);
  }, []);

  const moveSelection = useCallback(
    (delta: number): void => {
      if (results.length === 0) return;
      setSelectedIndex(
        (current) => (current + delta + results.length) % results.length,
      );
    },
    [results.length],
  );

  const openSelected = useCallback(
    (index?: number): void => {
      const match = results[index ?? selectedIndex];
      if (!match || !filesRoot) return;
      setOpen(false);
      void onOpenFile(joinPath(filesRoot, match.path));
    },
    [filesRoot, onOpenFile, results, selectedIndex],
  );

  useCommand<AppCommandContext>({
    id: APP_COMMAND.QUICK_OPEN,
    title: () => t.quickOpen.title,
    isEnabled: () => Boolean(rootPath),
    execute: () => show(),
  });

  useHotkey(
    APP_COMMAND.QUICK_OPEN,
    () => {
      if (!rootPath) return false;
      if (open) {
        close();
      } else {
        show();
      }
    },
    { allowInInput: true },
  );

  return useMemo(
    () => ({
      open,
      query,
      results,
      selectedIndex,
      loading,
      truncated,
      error,
      show,
      close,
      setQuery,
      setSelectedIndex,
      moveSelection,
      openSelected,
    }),
    [
      close,
      error,
      loading,
      moveSelection,
      open,
      openSelected,
      query,
      results,
      selectedIndex,
      setQuery,
      show,
      truncated,
    ],
  );
};
