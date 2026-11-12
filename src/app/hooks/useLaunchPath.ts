import { useEffect, useRef, useState } from "react";

import { getLaunchPath, onOpenPathRequest } from "@/shared/services/launch";
import { USAGE_EVENT, useUsage } from "@/shared/usage";

export type LaunchPathState = {
  /** False until the startup path has been checked. */
  ready: boolean;
  /** True when the app was started with `sito-editor <path>`. */
  hasLaunchPath: boolean;
};

/**
 * Opens the path given on the command line at startup, and any path from a
 * later `sito-editor <path>` call (forwarded by the single-instance plugin).
 */
export const useLaunchPath = (
  openPath: (path: string) => Promise<void>,
): LaunchPathState => {
  const [state, setState] = useState<LaunchPathState>({
    ready: false,
    hasLaunchPath: false,
  });
  const { track } = useUsage();
  // Read through a ref: the startup effect and the listener run once.
  const openPathRef = useRef(openPath);
  openPathRef.current = (path: string) => {
    track(USAGE_EVENT.WORKSPACE.LAUNCH_PATH);
    return openPath(path);
  };

  useEffect(() => {
    let active = true;

    getLaunchPath()
      .then((path) => {
        if (!active) return;
        setState({ ready: true, hasLaunchPath: Boolean(path) });
        if (path) void openPathRef.current(path);
      })
      .catch(() => {
        if (active) setState({ ready: true, hasLaunchPath: false });
      });

    const unlisten = onOpenPathRequest((path) => {
      void openPathRef.current(path);
    });

    return () => {
      active = false;
      void unlisten.then((stop) => stop());
    };
  }, []);

  return state;
};
