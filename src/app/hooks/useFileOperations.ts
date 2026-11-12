import { confirm, message } from "@tauri-apps/plugin-dialog";
import { useCommand } from "@sito/commands/react";

import { APP_COMMAND, type AppCommandContext } from "@/app/commands";
import type { DocumentsState } from "@/features/editor";
import type { WorkspaceTreeState } from "@/features/explorer";
import { t } from "@/lang";
import {
  createDirectory,
  createFile,
  renameEntry,
  trashEntry,
  workspaceErrorMessage,
} from "@/shared/services/workspace";
import { USAGE_EVENT, useUsage } from "@/shared/usage";
import { parentPath, pathName } from "@/shared/utils";

const isAtOrUnder = (path: string, base: string): boolean =>
  path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}\\`);

/**
 * Create/rename/trash commands. They touch both the Explorer tree and the
 * open documents, so they are orchestrated here. The Explorer collects names
 * and runs the commands with `path` (and `targetPath` for renames).
 */
export const useFileOperations = (
  tree: WorkspaceTreeState,
  documents: DocumentsState,
): void => {
  const { track } = useUsage();
  const report = async (reason: unknown) => {
    await message(workspaceErrorMessage(reason), {
      title: t.app.name,
      kind: "error",
    });
  };

  useCommand<AppCommandContext>({
    id: APP_COMMAND.CREATE_FILE,
    title: () => t.explorer.newFile,
    isEnabled: (context) => Boolean(tree.rootPath && context.path),
    execute: async (context) => {
      if (!context.path) return;
      try {
        await createFile(context.path);
        track(USAGE_EVENT.EXPLORER.CREATE_FILE);
        await tree.refreshDirectory(parentPath(context.path));
        await documents.openDocument(context.path);
      } catch (reason) {
        await report(reason);
      }
    },
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.CREATE_FOLDER,
    title: () => t.explorer.newFolder,
    isEnabled: (context) => Boolean(tree.rootPath && context.path),
    execute: async (context) => {
      if (!context.path) return;
      try {
        await createDirectory(context.path);
        track(USAGE_EVENT.EXPLORER.CREATE_FOLDER);
        await tree.refreshDirectory(parentPath(context.path));
        await tree.expandDirectory(context.path);
      } catch (reason) {
        await report(reason);
      }
    },
  });

  /** Rename and move share the plugin's non-overwriting rename. */
  const relocate = async (
    path: string,
    targetPath: string,
    feature: string,
  ): Promise<void> => {
    try {
      await renameEntry(path, targetPath);
      track(feature);
      documents.renameDocuments(path, targetPath);
      await tree.refreshDirectory(parentPath(path));
      if (parentPath(targetPath) !== parentPath(path)) {
        await tree.expandDirectory(parentPath(targetPath));
      }
    } catch (reason) {
      await report(reason);
    }
  };

  useCommand<AppCommandContext>({
    id: APP_COMMAND.RENAME_ENTRY,
    title: () => t.explorer.rename,
    isEnabled: (context) => Boolean(context.path && context.targetPath),
    execute: async ({ path, targetPath }) => {
      if (!path || !targetPath || path === targetPath) return;
      await relocate(path, targetPath, USAGE_EVENT.EXPLORER.RENAME);
    },
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.MOVE_ENTRY,
    title: () => t.explorer.move,
    isEnabled: (context) => Boolean(context.path && context.targetPath),
    execute: async ({ path, targetPath }) => {
      if (!path || !targetPath || path === targetPath) return;
      await relocate(path, targetPath, USAGE_EVENT.EXPLORER.MOVE);
    },
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.TRASH_ENTRY,
    title: () => t.explorer.moveToTrash,
    isEnabled: (context) =>
      Boolean(context.path && context.path !== tree.rootPath),
    execute: async ({ path }) => {
      if (!path) return;
      const hasUnsaved = documents.documents.some(
        (document) => document.dirty && isAtOrUnder(document.path, path),
      );
      const confirmed = await confirm(
        hasUnsaved
          ? t.explorer.trashUnsavedConfirm(pathName(path))
          : t.explorer.trashConfirm(pathName(path)),
        { title: t.app.name, kind: "warning", okLabel: t.explorer.moveToTrash },
      );
      if (!confirmed) return;

      try {
        await trashEntry(path);
        track(USAGE_EVENT.EXPLORER.TRASH);
        documents.forgetDocuments(path);
        await tree.refreshDirectory(parentPath(path));
      } catch (reason) {
        await report(reason);
      }
    },
  });
};
