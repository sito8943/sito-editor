import type { WorkspaceErrorCode } from "@sito/plugin-workspace";

export {
  LINE_ENDING,
  WORKSPACE_CHANGED_EVENT,
  createDirectory,
  createFile,
  WORKSPACE_ENTRY_KIND,
  listDirectory,
  listWorkspaceFiles,
  onWorkspaceChange,
  searchText,
  readTextFile,
  renameEntry,
  statEntry,
  trashEntry,
  unwatchWorkspace,
  watchWorkspace,
  writeTextFile,
} from "@sito/plugin-workspace";

export type {
  LineEnding,
  TextDocumentSnapshot,
  WorkspaceEntry,
  WorkspaceEntryKind,
  WorkspaceChangeEvent,
  WorkspaceError,
  SearchTextOptions,
  TextSearchMatch,
  TextSearchResult,
  WorkspaceFileList,
} from "@sito/plugin-workspace";

export type { WorkspaceErrorCode };

export const workspaceErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
};

export const workspaceErrorCode = (
  error: unknown,
): WorkspaceErrorCode | null => {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code as WorkspaceErrorCode;
  }
  return null;
};
