import { useEffect, useMemo, useRef, useState } from "react";

import type { DocumentsState } from "@/features/editor";
import type { WorkspaceTreeState } from "@/features/explorer";
import {
  STORAGE_KEY,
  readJson,
  removeKey,
  writeJson,
} from "@/shared/services/storage";
import { WORKSPACE_ENTRY_KIND, statEntry } from "@/shared/services/workspace";

const RECENT_LIMIT = 30;

/** What is remembered per workspace folder. Paths are absolute. */
type WorkspaceSession = {
  open: string[];
  active: string | null;
  recent: string[];
};

const EMPTY_SESSION: WorkspaceSession = { open: [], active: null, recent: [] };

const readSession = (rootPath: string): WorkspaceSession => ({
  ...EMPTY_SESSION,
  ...readJson<Partial<WorkspaceSession>>(STORAGE_KEY.session(rootPath), {}),
});

export type WorkspaceSessionState = {
  /** Recently activated files of the current workspace, newest first. */
  recentPaths: string[];
};

type UseWorkspaceSessionOptions = {
  tree: WorkspaceTreeState;
  documents: DocumentsState;
  /**
   * Whether to reopen the last workspace on launch; `null` while undecided
   * (e.g. until the command-line path is known). Acted on once.
   */
  restoreLastWorkspace: boolean | null;
};

/**
 * Remembers the last workspace and, per workspace, its open tabs, active tab
 * and recent files. Switching workspace swaps the open tabs for the new one's.
 */
export const useWorkspaceSession = ({
  tree,
  documents,
  restoreLastWorkspace,
}: UseWorkspaceSessionOptions): WorkspaceSessionState => {
  const { rootPath } = tree;
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const restoringRef = useRef(false);
  const activePathRef = useRef(documents.activePath);
  activePathRef.current = documents.activePath;

  // Reopen the last workspace once, if it still exists.
  const launchedRef = useRef(false);
  useEffect(() => {
    if (launchedRef.current || restoreLastWorkspace === null) return;
    launchedRef.current = true;
    if (!restoreLastWorkspace) return;

    const last = readJson<string | null>(STORAGE_KEY.LAST_WORKSPACE, null);
    if (!last) return;
    statEntry(last)
      .then((entry) => {
        if (entry.kind === WORKSPACE_ENTRY_KIND.DIRECTORY) {
          void tree.openWorkspace(last);
        }
      })
      .catch(() => removeKey(STORAGE_KEY.LAST_WORKSPACE));
    // Launch-only: later workspace changes come from the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreLastWorkspace]);

  // Workspace switch: swap the open tabs for the new workspace's session.
  // Must stay above the save effect so `restoringRef` is set before it runs.
  useEffect(() => {
    if (!rootPath) return;
    writeJson(STORAGE_KEY.LAST_WORKSPACE, rootPath);

    const session = readSession(rootPath);
    setRecentPaths(session.recent);
    restoringRef.current = true;
    documents.resetDocuments();

    let cancelled = false;
    void (async () => {
      for (const path of session.open) {
        if (cancelled) return;
        // Missing files are skipped; openDocument reports the error.
        await documents.openDocument(path);
      }
      if (cancelled) return;
      // Re-select the remembered tab unless the user opened another file meanwhile.
      const current = activePathRef.current;
      if (
        session.active &&
        session.open.includes(session.active) &&
        (!current || session.open.includes(current))
      ) {
        documents.selectDocument(session.active);
      }
      restoringRef.current = false;
    })();

    return () => {
      cancelled = true;
      restoringRef.current = false;
    };
    // Only a new root triggers a restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPath]);

  // Track recent files.
  useEffect(() => {
    const activePath = documents.activePath;
    if (!rootPath || !activePath || restoringRef.current) return;
    setRecentPaths((current) =>
      [activePath, ...current.filter((path) => path !== activePath)].slice(
        0,
        RECENT_LIMIT,
      ),
    );
  }, [documents.activePath, rootPath]);

  // Persist the session of the current workspace.
  const openPaths = useMemo(
    () => documents.documents.map((document) => document.path),
    [documents.documents],
  );
  useEffect(() => {
    if (!rootPath || restoringRef.current) return;
    writeJson(STORAGE_KEY.session(rootPath), {
      open: openPaths,
      active: documents.activePath,
      recent: recentPaths,
    } satisfies WorkspaceSession);
  }, [documents.activePath, openPaths, recentPaths, rootPath]);

  return { recentPaths };
};
