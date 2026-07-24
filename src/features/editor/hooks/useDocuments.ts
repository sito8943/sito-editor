import { useCallback, useMemo, useState } from "react";

import {
  LINE_ENDING,
  readTextFile,
  writeTextFile,
  workspaceErrorCode,
  workspaceErrorMessage,
  type TextDocumentSnapshot,
} from "@/shared/services/workspace";

import type { DocumentsState, OpenDocument } from "../types";

const normalizeEditorContent = (content: string): string =>
  content.replace(/\r\n/g, "\n");

const toOpenDocument = (
  snapshot: TextDocumentSnapshot,
): OpenDocument => {
  const { content, ...metadata } = snapshot;
  const source = normalizeEditorContent(content);

  return {
    ...metadata,
    source,
    draft: source,
    editable:
      !snapshot.readonly && snapshot.lineEnding !== LINE_ENDING.MIXED,
    dirty: false,
    saving: false,
    conflict: false,
    saveError: null,
  };
};

const serializeDraft = (document: OpenDocument): string =>
  document.lineEnding === LINE_ENDING.CRLF
    ? document.draft.replace(/\n/g, "\r\n")
    : document.draft;

export const useDocuments = (): DocumentsState => {
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openDocument = useCallback(
    async (path: string): Promise<void> => {
      if (documents.some((document) => document.path === path)) {
        setActivePath(path);
        return;
      }

      setLoadingPath(path);
      setError(null);
      try {
        const document = toOpenDocument(await readTextFile(path));
        setDocuments((current) => [...current, document]);
        setActivePath(path);
      } catch (reason) {
        setError(workspaceErrorMessage(reason));
      } finally {
        setLoadingPath(null);
      }
    },
    [documents],
  );

  const selectDocument = useCallback((path: string) => {
    setActivePath(path);
  }, []);

  const closeDocument = useCallback(
    (path: string) => {
      const index = documents.findIndex((document) => document.path === path);
      const remaining = documents.filter((document) => document.path !== path);
      setDocuments(remaining);
      if (activePath === path) {
        const next = remaining[Math.min(index, remaining.length - 1)];
        setActivePath(next?.path ?? null);
      }
    },
    [activePath, documents],
  );

  const updateDocument = useCallback((path: string, draft: string) => {
    setDocuments((current) =>
      current.map((document) =>
        document.path === path
          ? {
              ...document,
              draft,
              dirty: draft !== document.source,
            }
          : document,
      ),
    );
  }, []);

  const saveDocument = useCallback(
    async (path: string): Promise<void> => {
      const document = documents.find((candidate) => candidate.path === path);
      if (
        !document ||
        !document.editable ||
        !document.dirty ||
        document.saving
      ) {
        return;
      }

      const draftBeingSaved = document.draft;
      setDocuments((current) =>
        current.map((candidate) =>
          candidate.path === path
            ? {
                ...candidate,
                saving: true,
                conflict: false,
                saveError: null,
              }
            : candidate,
        ),
      );

      try {
        const saved = toOpenDocument(
          await writeTextFile(
            path,
            serializeDraft(document),
            document.version,
          ),
        );
        setDocuments((current) =>
          current.map((candidate) => {
            if (candidate.path !== path) return candidate;
            if (candidate.draft === draftBeingSaved) return saved;

            return {
              ...saved,
              draft: candidate.draft,
              dirty: candidate.draft !== saved.source,
            };
          }),
        );
      } catch (reason) {
        const message = workspaceErrorMessage(reason);
        setDocuments((current) =>
          current.map((candidate) =>
            candidate.path === path
              ? {
                  ...candidate,
                  saving: false,
                  conflict:
                    workspaceErrorCode(reason) === "version_conflict",
                  saveError: message,
                }
              : candidate,
          ),
        );
      }
    },
    [documents],
  );

  const reloadDocument = useCallback(async (path: string): Promise<void> => {
    setLoadingPath(path);
    setError(null);
    try {
      const reloaded = toOpenDocument(await readTextFile(path));
      setDocuments((current) =>
        current.map((document) =>
          document.path === path ? reloaded : document,
        ),
      );
    } catch (reason) {
      setError(workspaceErrorMessage(reason));
    } finally {
      setLoadingPath(null);
    }
  }, []);

  const resetDocuments = useCallback(() => {
    setDocuments([]);
    setActivePath(null);
    setLoadingPath(null);
    setError(null);
  }, []);

  const activeDocument =
    documents.find((document) => document.path === activePath) ?? null;
  const hasDirtyDocuments = documents.some((document) => document.dirty);
  const hasSavingDocuments = documents.some((document) => document.saving);

  return useMemo(
    () => ({
      documents,
      hasDirtyDocuments,
      hasSavingDocuments,
      activePath,
      activeDocument,
      loadingPath,
      error,
      openDocument,
      selectDocument,
      closeDocument,
      updateDocument,
      saveDocument,
      reloadDocument,
      resetDocuments,
    }),
    [
      activeDocument,
      activePath,
      closeDocument,
      documents,
      error,
      hasDirtyDocuments,
      hasSavingDocuments,
      loadingPath,
      openDocument,
      reloadDocument,
      resetDocuments,
      saveDocument,
      selectDocument,
      updateDocument,
    ],
  );
};
