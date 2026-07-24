import { confirm } from "@tauri-apps/plugin-dialog";
import {
  useCommand,
  useCommandRegistry,
  useHotkey,
} from "@sito/commands/react";

import {
  EDITOR_COMMAND,
  type EditorCommandContext,
} from "@/app/commands";
import { t } from "@/lang";

import type { DocumentsState } from "../types";

const findDocument = (
  state: DocumentsState,
  context: EditorCommandContext,
) => {
  const path = context.path ?? state.activePath;
  return state.documents.find((document) => document.path === path);
};

export const useEditorCommands = (state: DocumentsState): void => {
  const registry = useCommandRegistry<EditorCommandContext>();

  useCommand<EditorCommandContext>({
    id: EDITOR_COMMAND.SAVE_DOCUMENT,
    title: () => t.editor.save,
    isEnabled: (context) => {
      const document = findDocument(state, context);
      return Boolean(
        document?.editable && document.dirty && !document.saving,
      );
    },
    execute: async (context) => {
      const document = findDocument(state, context);
      if (document) await state.saveDocument(document.path);
    },
  });

  useCommand<EditorCommandContext>({
    id: EDITOR_COMMAND.CLOSE_DOCUMENT,
    title: () => t.editor.close,
    isEnabled: (context) => {
      const document = findDocument(state, context);
      return Boolean(document && !document.saving);
    },
    execute: async (context) => {
      const document = findDocument(state, context);
      if (!document) return;

      if (
        document.dirty &&
        !(await confirm(t.editor.discardChanges, {
          title: t.app.name,
          kind: "warning",
        }))
      ) {
        return;
      }

      state.closeDocument(document.path);
    },
  });

  useHotkey(
    EDITOR_COMMAND.SAVE_DOCUMENT,
    () => {
      void registry.execute(EDITOR_COMMAND.SAVE_DOCUMENT, {});
    },
    { allowInInput: true },
  );

  useHotkey(
    EDITOR_COMMAND.CLOSE_DOCUMENT,
    () => {
      const context: EditorCommandContext = {};
      const document = findDocument(state, context);
      if (!document) return false;

      if (
        registry.getState(EDITOR_COMMAND.CLOSE_DOCUMENT, context).enabled
      ) {
        void registry.execute(EDITOR_COMMAND.CLOSE_DOCUMENT, context);
      }
    },
    { allowInInput: true },
  );
};
