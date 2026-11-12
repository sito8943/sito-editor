import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCommand } from "@sito/commands/react";

import { APP_COMMAND, type AppCommandContext } from "@/app/commands";
import { t } from "@/lang";
import { USAGE_EVENT, useTrackedHotkey, useUsage } from "@/shared/usage";
import {
  listWorkspaceFiles,
  workspaceErrorMessage,
} from "@/shared/services/workspace";
import { joinPath } from "@/shared/utils";

import type { QuickOpenState, UseQuickOpenOptions } from "../types";
import { rankPaths } from "../utils/fuzzy";

const RESULT_LIMIT = 50;

const toRelative = (rootPath: string, path: string): string | null => {
  const base = rootPath.replace(/[\\/]+$/, "");
  if (!path.startsWith(base) || !/^[\\/]/.test(path.slice(base.length))) {
    return null;
  }
  return path
    .slice(base.length)
    .split(/[\\/]/)
    .filter(Boolean)
    .join("/");
};

export const useQuickOpen = ({
  rootPath,
  recentPaths = [],
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
  const { track } = useUsage();

  const deferredQuery = useDeferredValue(query);
  // With an empty query, recent files come first.
  const orderedFiles = useMemo(() => {
    if (!filesRoot || recentPaths.length === 0) return files;
    const known = new Set(files);
    const recent = recentPaths
      .map((path) => toRelative(filesRoot, path))
      .filter((path): path is string => path !== null && known.has(path));
    if (recent.length === 0) return files;
    const recentSet = new Set(recent);
    return [...recent, ...files.filter((path) => !recentSet.has(path))];
  }, [files, filesRoot, recentPaths]);

  const results = useMemo(
    () =>
      rankPaths(
        deferredQuery,
        deferredQuery.trim() ? files : orderedFiles,
        RESULT_LIMIT,
      ),
    [deferredQuery, files, orderedFiles],
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
      track(
        initialQuery
          ? USAGE_EVENT.NAVIGATION.BREADCRUMB_FOLDER
          : USAGE_EVENT.NAVIGATION.QUICK_OPEN,
      );
      setQueryState(initialQuery);
      setSelectedIndex(0);
      setOpen(true);
      // Show the cached list immediately and refresh it in the background.
      void refreshFiles(rootPath);
    },
    [refreshFiles, rootPath, track],
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
      track(USAGE_EVENT.NAVIGATION.QUICK_OPEN_FILE);
      const path = joinPath(filesRoot, match.path);
      if (!deferredQuery.trim() && recentPaths.includes(path)) {
        track(USAGE_EVENT.NAVIGATION.QUICK_OPEN_RECENT);
      }
      void onOpenFile(path);
    },
    [
      deferredQuery,
      filesRoot,
      onOpenFile,
      recentPaths,
      results,
      selectedIndex,
      track,
    ],
  );

  useCommand<AppCommandContext>({
    id: APP_COMMAND.QUICK_OPEN,
    title: () => t.quickOpen.title,
    isEnabled: () => Boolean(rootPath),
    execute: () => show(),
  });

  useTrackedHotkey(
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
