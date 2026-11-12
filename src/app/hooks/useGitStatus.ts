import { useEffect, useState } from "react";

import {
  getGitHeadFile,
  getGitStatus,
  type GitStatus,
} from "@/shared/services/git";
import { onWorkspaceChange } from "@/shared/services/workspace";

/** Commits, staging and checkouts touch only .git, which the watcher ignores. */
const REFRESH_MS = 5000;
/** Lets a burst of file events (save, git checkout) settle into one status read. */
const SETTLE_MS = 300;

const sameStatus = (a: GitStatus | null, b: GitStatus | null): boolean => {
  if (a === b) return true;
  if (!a || !b || a.head !== b.head) return false;
  const aPaths = Object.keys(a.files);
  if (aPaths.length !== Object.keys(b.files).length) return false;
  return aPaths.every((path) => a.files[path] === b.files[path]);
};

/**
 * Changed files of the workspace's repository, re-read after file changes, on
 * window focus and every few seconds. Null outside Git.
 */
export const useGitStatus = (rootPath: string | null): GitStatus | null => {
  const [status, setStatus] = useState<GitStatus | null>(null);

  useEffect(() => {
    if (!rootPath) {
      setStatus(null);
      return;
    }
    let active = true;
    let running = false;
    let queued = false;
    let settle = 0;

    const refresh = () => {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      void getGitStatus(rootPath)
        .catch(() => null)
        .then((next) => {
          if (active) {
            setStatus((previous) =>
              sameStatus(previous, next) ? previous : next,
            );
          }
        })
        .finally(() => {
          running = false;
          if (queued && active) {
            queued = false;
            refresh();
          }
        });
    };
    const refreshSoon = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(refresh, SETTLE_MS);
    };

    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    const unlisten = onWorkspaceChange((event) => {
      if (event.root === rootPath) refreshSoon();
    });
    return () => {
      active = false;
      window.clearInterval(timer);
      window.clearTimeout(settle);
      window.removeEventListener("focus", refresh);
      void unlisten.then((stop) => stop());
    };
  }, [rootPath]);

  return status;
};

export type GitBaseline = { path: string; content: string | null };

/**
 * The active file at HEAD, for the editor's change marks. Re-read when the
 * file or the HEAD commit changes.
 */
export const useGitBaseline = (
  activePath: string | null,
  status: GitStatus | null,
): GitBaseline | null => {
  const [baseline, setBaseline] = useState<GitBaseline | null>(null);
  const inRepository = status !== null;
  const head = status?.head ?? null;

  useEffect(() => {
    if (!activePath || !inRepository) {
      setBaseline(null);
      return;
    }
    let active = true;
    void getGitHeadFile(activePath)
      .catch(() => null)
      .then((content) => {
        if (active) setBaseline({ path: activePath, content });
      });
    return () => {
      active = false;
    };
  }, [activePath, inRepository, head]);

  return baseline;
};
