import { useCallback, useMemo, useRef, useState } from "react";

import {
  LINE_ENDING,
  readTextFile,
  writeTextFile,
  workspaceErrorCode,
  workspaceErrorMessage,
  type TextDocumentSnapshot,
} from "@/shared/services/workspace";
import { USAGE_EVENT, useUsage } from "@/shared/usage";

import type {
  DocumentsState,
  EditorStatus,
  OpenDocument,
  RevealTarget,
} from "../types";

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
    changedOnDisk: false,
    missing: false,
  };
};

/** `path` itself or anything inside it, for files and folders alike. */
const isAtOrUnder = (path: string, base: string): boolean =>
  path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}\\`);

const serializeDraft = (document: OpenDocument): string =>
  document.lineEnding === LINE_ENDING.CRLF
    ? document.draft.replace(/\n/g, "\r\n")
    : document.draft;

export const useDocuments = (): DocumentsState => {
  const { track } = useUsage();
  const [documents, setDocuments] = useState<OpenDocument[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealTarget, setRevealTarget] = useState<RevealTarget | null>(
    null,
  );
  const [editorStatus, setEditorStatus] = useState<EditorStatus | null>(
    null,
  );

  // Latest documents for async callbacks that must decide outside a state updater.
  const documentsRef = useRef<OpenDocument[]>([]);
  documentsRef.current = documents;

  const openDocument = useCallback(
    async (path: string): Promise<void> => {
      if (documents.some((document) => document.path === path)) {
        setActivePath(path);
        track(USAGE_EVENT.EDITOR.OPEN_DOCUMENT);
        return;
      }

      setLoadingPath(path);
      setError(null);
      try {
        const document = toOpenDocument(await readTextFile(path));
        setDocuments((current) => [...current, document]);
        setActivePath(path);
        track(USAGE_EVENT.EDITOR.OPEN_DOCUMENT);
      } catch (reason) {
        setError(workspaceErrorMessage(reason));
      } finally {
        setLoadingPath(null);
      }
    },
    [documents, track],
  );

  const openDocumentAt = useCallback(
    async (
      path: string,
      line: number,
      column: number,
      length = 0,
    ): Promise<void> => {
      await openDocument(path);
      setRevealTarget({ path, line, column, length });
      track(USAGE_EVENT.EDITOR.REVEAL);
    },
    [openDocument, track],
  );

  const clearReveal = useCallback(() => setRevealTarget(null), []);

  const selectDocument = useCallback((path: string) => {
    setActivePath(path);
  }, []);

  const selectRelative = useCallback(
    (delta: number) => {
      if (documents.length === 0) return;
      const index = documents.findIndex(
        (document) => document.path === activePath,
      );
      const next =
        (Math.max(index, 0) + delta + documents.length) % documents.length;
      setActivePath(documents[next].path);
      track(USAGE_EVENT.EDITOR.CYCLE_TAB);
    },
    [activePath, documents, track],
  );

  const moveDocument = useCallback((path: string, toIndex: number) => {
    track(USAGE_EVENT.EDITOR.REORDER_TAB);
    setDocuments((current) => {
      const from = current.findIndex((document) => document.path === path);
      if (from < 0) return current;
      const target = Math.min(Math.max(toIndex, 0), current.length - 1);
      if (from === target) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }, [track]);

  const closeDocument = useCallback(
    (path: string) => {
      const index = documents.findIndex((document) => document.path === path);
      const remaining = documents.filter((document) => document.path !== path);
      setDocuments(remaining);
      track(USAGE_EVENT.EDITOR.CLOSE_TAB);
      if (activePath === path) {
        const next = remaining[Math.min(index, remaining.length - 1)];
        setActivePath(next?.path ?? null);
      }
    },
    [activePath, documents, track],
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
        track(USAGE_EVENT.EDITOR.SAVE);
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
    [documents, track],
  );

  const reloadDocument = useCallback(async (path: string): Promise<void> => {
    track(USAGE_EVENT.EDITOR.RELOAD_DISCARD);
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
  }, [track]);

  const syncFromDisk = useCallback(async (path: string): Promise<void> => {
    let snapshot: TextDocumentSnapshot;
    try {
      snapshot = await readTextFile(path);
    } catch (reason) {
      if (workspaceErrorCode(reason) !== "not_found") return;
      const known = documentsRef.current.find((item) => item.path === path);
      if (known && !known.missing) track(USAGE_EVENT.DISK.EXTERNAL_DELETE);
      setDocuments((current) =>
        current.map((document) =>
          document.path === path ? { ...document, missing: true } : document,
        ),
      );
      return;
    }

    const known = documentsRef.current.find((item) => item.path === path);
    if (known && known.version !== snapshot.version && !known.saving) {
      track(
        known.dirty
          ? USAGE_EVENT.DISK.EXTERNAL_CONFLICT
          : USAGE_EVENT.DISK.EXTERNAL_RELOAD,
      );
    }

    setDocuments((current) =>
      current.map((document) => {
        if (document.path !== path) return document;
        // Our own saves also produce change events: same version, nothing to do.
        if (document.version === snapshot.version) {
          return document.missing ? { ...document, missing: false } : document;
        }
        if (document.saving) return document;
        if (document.dirty) {
          return { ...document, changedOnDisk: true, missing: false };
        }
        return toOpenDocument(snapshot);
      }),
    );
  }, [track]);

  const keepDraft = useCallback((path: string) => {
    track(USAGE_EVENT.EDITOR.KEEP_DRAFT);
    setDocuments((current) =>
      current.map((document) =>
        document.path === path
          ? { ...document, changedOnDisk: false }
          : document,
      ),
    );
  }, [track]);

  const renameDocuments = useCallback((from: string, to: string) => {
    const move = (path: string) =>
      isAtOrUnder(path, from) ? `${to}${path.slice(from.length)}` : path;
    setDocuments((current) =>
      current.map((document) =>
        isAtOrUnder(document.path, from)
          ? { ...document, path: move(document.path), missing: false }
          : document,
      ),
    );
    setActivePath((current) => (current ? move(current) : current));
  }, []);

  const forgetDocuments = useCallback(
    (path: string) => {
      const remaining = documents.filter(
        (document) => !isAtOrUnder(document.path, path),
      );
      setDocuments(remaining);
      if (activePath && isAtOrUnder(activePath, path)) {
        setActivePath(remaining[remaining.length - 1]?.path ?? null);
      }
    },
    [activePath, documents],
  );

  const resetDocuments = useCallback(() => {
    setDocuments([]);
    setActivePath(null);
    setLoadingPath(null);
    setError(null);
    setRevealTarget(null);
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
      revealTarget,
      editorStatus,
      setEditorStatus,
      openDocument,
      openDocumentAt,
      clearReveal,
      selectDocument,
      selectRelative,
      moveDocument,
      closeDocument,
      updateDocument,
      saveDocument,
      reloadDocument,
      resetDocuments,
      syncFromDisk,
      keepDraft,
      renameDocuments,
      forgetDocuments,
    }),
    [
      activeDocument,
      activePath,
      clearReveal,
      closeDocument,
      documents,
      editorStatus,
      error,
      forgetDocuments,
      hasDirtyDocuments,
      hasSavingDocuments,
      keepDraft,
      loadingPath,
      moveDocument,
      openDocument,
      openDocumentAt,
      reloadDocument,
      renameDocuments,
      resetDocuments,
      revealTarget,
      saveDocument,
      selectDocument,
      selectRelative,
      syncFromDisk,
      updateDocument,
    ],
  );
};
