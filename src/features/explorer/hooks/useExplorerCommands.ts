import { useCommand } from "@sito/commands/react";

import {
  APP_COMMAND,
  type AppCommandContext,
} from "@/app/commands";
import { t } from "@/lang";

import type { WorkspaceTreeState } from "../types";

export const useExplorerCommands = (
  tree: WorkspaceTreeState,
): void => {
  useCommand<AppCommandContext>({
    id: APP_COMMAND.TOGGLE_DIRECTORY,
    title: () => t.explorer.toggleFolder,
    isEnabled: (context) => Boolean(context.path),
    execute: async (context) => {
      if (context.path) await tree.toggleDirectory(context.path);
    },
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.REFRESH_DIRECTORY,
    title: () => t.explorer.refreshFolder,
    isEnabled: (context) => Boolean(context.path ?? tree.rootPath),
    execute: async (context) => {
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
    execute: () => tree.collapseAll(),
  });
};
