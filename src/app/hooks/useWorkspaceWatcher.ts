import { useEffect, useRef } from "react";

import type { DocumentsState } from "@/features/editor";
import type { WorkspaceTreeState } from "@/features/explorer";
import {
  onWorkspaceChange,
  unwatchWorkspace,
  watchWorkspace,
} from "@/shared/services/workspace";
import { parentPath } from "@/shared/utils";

/**
 * Watches the workspace folder and keeps the app in step with changes made
 * elsewhere (git, other editors, the terminal): loaded Explorer folders are
 * refreshed and open documents re-read (see `syncFromDisk`).
 */
export const useWorkspaceWatcher = (
  tree: WorkspaceTreeState,
  documents: DocumentsState,
): void => {
  const { rootPath } = tree;
  // The listener is registered once; it reads the latest state through refs.
  const treeRef = useRef(tree);
  const documentsRef = useRef(documents);
  treeRef.current = tree;
  documentsRef.current = documents;

  // The plugin keeps one watcher and replaces it on a new root, so there is no
  // unwatch on cleanup (StrictMode's extra cleanup would race the next watch).
  useEffect(() => {
    if (!rootPath) return;
    void watchWorkspace(rootPath).catch(() => {
      // Without a watcher the app still works; changes show on refresh.
    });
  }, [rootPath]);

  // Stop watching when the app unmounts.
  useEffect(
    () => () => {
      const root = treeRef.current.rootPath;
      if (root) void unwatchWorkspace(root).catch(() => undefined);
    },
    [],
  );

  useEffect(() => {
    const unlisten = onWorkspaceChange((event) => {
      const currentTree = treeRef.current;
      if (event.root !== currentTree.rootPath) return;

      // Refresh each loaded folder that gained, lost or renamed an entry.
      const folders = new Set<string>();
      for (const path of event.paths) {
        const parent = parentPath(path);
        if (currentTree.childrenByPath[parent]) folders.add(parent);
      }
      for (const folder of folders) void currentTree.refreshDirectory(folder);

      const openPaths = new Set(
        documentsRef.current.documents.map((document) => document.path),
      );
      for (const path of event.paths) {
        if (openPaths.has(path)) void documentsRef.current.syncFromDisk(path);
      }
    });

    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);
};
