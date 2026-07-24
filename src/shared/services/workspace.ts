export {
  LINE_ENDING,
  WORKSPACE_ENTRY_KIND,
  listDirectory,
  readTextFile,
  statEntry,
} from "@sito/plugin-workspace";

export type {
  LineEnding,
  TextDocumentSnapshot,
  WorkspaceEntry,
  WorkspaceEntryKind,
  WorkspaceError,
  WorkspaceErrorCode,
} from "@sito/plugin-workspace";

export const workspaceErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
};
