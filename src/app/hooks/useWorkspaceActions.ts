import { useCallback } from "react";
import { confirm, message, open } from "@tauri-apps/plugin-dialog";
import { useCommand, useHotkey } from "@sito/commands/react";

import { APP_COMMAND, type AppCommandContext } from "@/app/commands";
import type { DocumentsState } from "@/features/editor";
import type { WorkspaceTreeState } from "@/features/explorer";
import { t } from "@/lang";
import { parentPath } from "@/shared/utils";

export type WorkspaceActions = {
  openFolder: () => Promise<void>;
  openFile: () => Promise<void>;
};

/**
 * Opening folders/files touches both the tree and the documents, so it is
 * orchestrated here instead of inside either feature.
 */
export const useWorkspaceActions = (
  tree: WorkspaceTreeState,
  documents: DocumentsState,
): WorkspaceActions => {
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
    await tree.chooseWorkspace();
  }, [canLeaveWorkspace, tree]);

  const openFile = useCallback(async (): Promise<void> => {
    const selected = await open({
      directory: false,
      multiple: false,
      title: t.app.openFileTitle,
    });
    if (typeof selected !== "string") return;

    // Without a workspace, the file's folder becomes the workspace.
    if (!tree.rootPath) await tree.openWorkspace(parentPath(selected));
    await documents.openDocument(selected);
  }, [documents, tree]);

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

  useHotkey(
    APP_COMMAND.OPEN_FOLDER,
    () => {
      void openFolder();
    },
    { allowInInput: true },
  );

  useHotkey(
    APP_COMMAND.OPEN_FILE,
    () => {
      void openFile();
    },
    { allowInInput: true },
  );

  return { openFolder, openFile };
};
