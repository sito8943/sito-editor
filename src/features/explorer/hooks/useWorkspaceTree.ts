import { useCallback, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";

import { t } from "@/lang";
import {
  listDirectory,
  workspaceErrorMessage,
  type WorkspaceEntry,
} from "@/shared/services/workspace";
import { pathName } from "@/shared/utils";

import type { WorkspaceTreeState } from "../types";

export const useWorkspaceTree = (): WorkspaceTreeState => {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [childrenByPath, setChildrenByPath] = useState<
    Record<string, WorkspaceEntry[]>
  >({});
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(async (path: string): Promise<void> => {
    setLoadingPaths((current) => new Set(current).add(path));
    setError(null);
    try {
      const entries = await listDirectory(path);
      setChildrenByPath((current) => ({ ...current, [path]: entries }));
    } catch (reason) {
      setError(workspaceErrorMessage(reason));
    } finally {
      setLoadingPaths((current) => {
        const next = new Set(current);
        next.delete(path);
        return next;
      });
    }
  }, []);

  const chooseWorkspace = useCallback(async (): Promise<string | null> => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t.explorer.openTitle,
    });
    if (typeof selected !== "string") return null;

    setRootPath(selected);
    setChildrenByPath({});
    setExpandedPaths(new Set([selected]));
    await loadDirectory(selected);
    return selected;
  }, [loadDirectory]);

  const refreshRoot = useCallback(async (): Promise<void> => {
    if (rootPath) await loadDirectory(rootPath);
  }, [loadDirectory, rootPath]);

  const toggleDirectory = useCallback(
    async (path: string): Promise<void> => {
      if (expandedPaths.has(path)) {
        setExpandedPaths((current) => {
          const next = new Set(current);
          next.delete(path);
          return next;
        });
        return;
      }

      setExpandedPaths((current) => new Set(current).add(path));
      if (!childrenByPath[path]) await loadDirectory(path);
    },
    [childrenByPath, expandedPaths, loadDirectory],
  );

  return useMemo(
    () => ({
      rootPath,
      rootName: rootPath ? pathName(rootPath) : null,
      childrenByPath,
      expandedPaths,
      loadingPaths,
      error,
      chooseWorkspace,
      refreshRoot,
      toggleDirectory,
    }),
    [
      childrenByPath,
      chooseWorkspace,
      error,
      expandedPaths,
      loadingPaths,
      refreshRoot,
      rootPath,
      toggleDirectory,
    ],
  );
};
