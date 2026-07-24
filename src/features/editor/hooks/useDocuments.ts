import { useCallback, useMemo, useState } from "react";

import {
  readTextFile,
  workspaceErrorMessage,
  type TextDocumentSnapshot,
} from "@/shared/services/workspace";

import type { DocumentsState } from "../types";

export const useDocuments = (): DocumentsState => {
  const [documents, setDocuments] = useState<TextDocumentSnapshot[]>([]);
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
        const document = await readTextFile(path);
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

  const resetDocuments = useCallback(() => {
    setDocuments([]);
    setActivePath(null);
    setLoadingPath(null);
    setError(null);
  }, []);

  const activeDocument =
    documents.find((document) => document.path === activePath) ?? null;

  return useMemo(
    () => ({
      documents,
      activePath,
      activeDocument,
      loadingPath,
      error,
      openDocument,
      selectDocument,
      closeDocument,
      resetDocuments,
    }),
    [
      activeDocument,
      activePath,
      closeDocument,
      documents,
      error,
      loadingPath,
      openDocument,
      resetDocuments,
      selectDocument,
    ],
  );
};
