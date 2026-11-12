import { useCommand } from "@sito/commands/react";

import {
  APP_COMMAND,
  type AppCommandContext,
} from "@/app/commands";
import { t } from "@/lang";
import { USAGE_EVENT, useUsage } from "@/shared/usage";

import type { WorkspaceTreeState } from "../types";

export const useExplorerCommands = (
  tree: WorkspaceTreeState,
): void => {
  const { track } = useUsage();

  useCommand<AppCommandContext>({
    id: APP_COMMAND.TOGGLE_DIRECTORY,
    title: () => t.explorer.toggleFolder,
    isEnabled: (context) => Boolean(context.path),
    execute: async (context) => {
      if (!context.path) return;
      track(USAGE_EVENT.EXPLORER.TOGGLE_FOLDER);
      await tree.toggleDirectory(context.path);
    },
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.REFRESH_DIRECTORY,
    title: () => t.explorer.refreshFolder,
    isEnabled: (context) => Boolean(context.path ?? tree.rootPath),
    execute: async (context) => {
      track(USAGE_EVENT.EXPLORER.REFRESH);
      if (context.path) {
        await tree.refreshDirectory(context.path);
      } else {
        await tree.refreshRoot();
      }
    },
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.COLLAPSE_EXPLORER,
    title: () => t.explorer.collapseAll,
    isEnabled: () =>
      Array.from(tree.expandedPaths).some(
        (path) => path !== tree.rootPath,
      ),
    execute: () => {
      track(USAGE_EVENT.EXPLORER.COLLAPSE_ALL);
      tree.collapseAll();
    },
  });
};
