import { useCallback } from "react";
import { confirm, message, open } from "@tauri-apps/plugin-dialog";
import { useCommand } from "@sito/commands/react";

import { APP_COMMAND, type AppCommandContext } from "@/app/commands";
import type { DocumentsState } from "@/features/editor";
import type { WorkspaceTreeState } from "@/features/explorer";
import { t } from "@/lang";
import { useTrackedHotkey } from "@/shared/usage";
import {
  WORKSPACE_ENTRY_KIND,
  statEntry,
  workspaceErrorMessage,
} from "@/shared/services/workspace";
import { USAGE_EVENT, useUsage } from "@/shared/usage";
import { parentPath } from "@/shared/utils";

export type WorkspaceActions = {
  openFolder: () => Promise<void>;
  openFile: () => Promise<void>;
  /** Opens a folder as the workspace, or a file (see `sito-editor <path>`). */
  openPath: (path: string) => Promise<void>;
};

/**
 * Opening folders/files touches both the tree and the documents, so it is
 * orchestrated here instead of inside either feature.
 */
export const useWorkspaceActions = (
  tree: WorkspaceTreeState,
  documents: DocumentsState,
): WorkspaceActions => {
  const { track } = useUsage();
  const canLeaveWorkspace = useCallback(async (): Promise<boolean> => {
    if (documents.hasSavingDocuments) {
      await message(t.editor.waitForSave, {
        title: t.app.name,
        kind: "warning",
      });
      return false;
    }
    if (!documents.hasDirtyDocuments) return true;
    return await confirm(t.editor.discardWorkspaceChanges, {
      title: t.app.name,
      kind: "warning",
    });
  }, [documents.hasDirtyDocuments, documents.hasSavingDocuments]);

  const openFolder = useCallback(async (): Promise<void> => {
    if (!(await canLeaveWorkspace())) return;
    // Swapping the open tabs is handled by the workspace session.
    if (await tree.chooseWorkspace()) track(USAGE_EVENT.WORKSPACE.OPEN_FOLDER);
  }, [canLeaveWorkspace, track, tree]);

  const openFile = useCallback(async (): Promise<void> => {
    const selected = await open({
      directory: false,
      multiple: false,
      title: t.app.openFileTitle,
    });
    if (typeof selected !== "string") return;
    track(USAGE_EVENT.WORKSPACE.OPEN_FILE);

    // Without a workspace, the file's folder becomes the workspace.
    if (!tree.rootPath) await tree.openWorkspace(parentPath(selected));
    await documents.openDocument(selected);
  }, [documents, track, tree]);

  const openPath = useCallback(
    async (path: string): Promise<void> => {
      let isDirectory: boolean;
      try {
        isDirectory =
          (await statEntry(path)).kind === WORKSPACE_ENTRY_KIND.DIRECTORY;
      } catch (reason) {
        await message(workspaceErrorMessage(reason), {
          title: t.app.name,
          kind: "error",
        });
        return;
      }

      if (isDirectory) {
        if (path === tree.rootPath || !(await canLeaveWorkspace())) return;
        await tree.openWorkspace(path);
        return;
      }

      // Without a workspace, the file's folder becomes the workspace. A file
      // outside the current workspace opens as a tab without switching.
      if (!tree.rootPath) await tree.openWorkspace(parentPath(path));
      await documents.openDocument(path);
    },
    [canLeaveWorkspace, documents, tree],
  );

  useCommand<AppCommandContext>({
    id: APP_COMMAND.OPEN_FOLDER,
    title: () => t.app.openFolder,
    execute: openFolder,
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.OPEN_FILE,
    title: () => t.app.openFile,
    execute: openFile,
  });

  useTrackedHotkey(
    APP_COMMAND.OPEN_FOLDER,
    () => {
      void openFolder();
    },
    { allowInInput: true },
  );

  useTrackedHotkey(
    APP_COMMAND.OPEN_FILE,
    () => {
      void openFile();
    },
    { allowInInput: true },
  );

  return { openFolder, openFile, openPath };
};
