import { confirm } from "@tauri-apps/plugin-dialog";
import {
  useCommand,
  useCommandRegistry,
} from "@sito/commands/react";

import {
  APP_COMMAND,
  type AppCommandContext,
} from "@/app/commands";
import { t } from "@/lang";
import { useTrackedHotkey } from "@/shared/usage";

import type { DocumentsState } from "../types";

const findDocument = (
  state: DocumentsState,
  context: AppCommandContext,
) => {
  const path = context.path ?? state.activePath;
  return state.documents.find((document) => document.path === path);
};

export const useEditorCommands = (state: DocumentsState): void => {
  const registry = useCommandRegistry<AppCommandContext>();

  useCommand<AppCommandContext>({
    id: APP_COMMAND.OPEN_DOCUMENT,
    title: () => t.editor.open,
    isEnabled: (context) => Boolean(context.path),
    execute: async (context) => {
      if (context.path) await state.openDocument(context.path);
    },
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.SAVE_DOCUMENT,
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

  useCommand<AppCommandContext>({
    id: APP_COMMAND.CLOSE_DOCUMENT,
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

  useCommand<AppCommandContext>({
    id: APP_COMMAND.NEXT_DOCUMENT,
    title: () => t.editor.nextDocument,
    isEnabled: () => state.documents.length > 1,
    execute: () => state.selectRelative(1),
  });

  useCommand<AppCommandContext>({
    id: APP_COMMAND.PREVIOUS_DOCUMENT,
    title: () => t.editor.previousDocument,
    isEnabled: () => state.documents.length > 1,
    execute: () => state.selectRelative(-1),
  });

  useTrackedHotkey(
    APP_COMMAND.NEXT_DOCUMENT,
    () => {
      if (state.documents.length < 2) return false;
      state.selectRelative(1);
    },
    { allowInInput: true },
  );

  useTrackedHotkey(
    APP_COMMAND.PREVIOUS_DOCUMENT,
    () => {
      if (state.documents.length < 2) return false;
      state.selectRelative(-1);
    },
    { allowInInput: true },
  );

  useTrackedHotkey(
    APP_COMMAND.SAVE_DOCUMENT,
    () => {
      void registry.execute(APP_COMMAND.SAVE_DOCUMENT, {});
    },
    { allowInInput: true },
  );

  useTrackedHotkey(
    APP_COMMAND.CLOSE_DOCUMENT,
    () => {
      const context: AppCommandContext = {};
      const document = findDocument(state, context);
      if (!document) return false;

      if (
        registry.getState(APP_COMMAND.CLOSE_DOCUMENT, context).enabled
      ) {
        void registry.execute(APP_COMMAND.CLOSE_DOCUMENT, context);
      }
    },
    { allowInInput: true },
  );
};
