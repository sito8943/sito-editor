import { useEffect, useState } from "react";

import { getGitBranch } from "@/shared/services/git";

/** How often the branch is re-read (the workspace watcher ignores .git). */
const REFRESH_MS = 5000;

/** Current Git branch of the workspace, kept fresh while the window is used. */
export const useGitBranch = (rootPath: string | null): string | null => {
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    if (!rootPath) {
      setBranch(null);
      return;
    }
    let active = true;
    const refresh = () => {
      void getGitBranch(rootPath)
        .then((next) => {
          if (active) setBranch(next);
        })
        .catch(() => {
          if (active) setBranch(null);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [rootPath]);

  return branch;
};
