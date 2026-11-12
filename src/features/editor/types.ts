import type { TextDocumentSnapshot } from "@/shared/services/workspace";

export type OpenDocument = Omit<TextDocumentSnapshot, "content"> & {
  source: string;
  draft: string;
  editable: boolean;
  dirty: boolean;
  saving: boolean;
  conflict: boolean;
  saveError: string | null;
  /** Changed on disk while it had unsaved edits. */
  changedOnDisk: boolean;
  /** Deleted or moved away on disk. */
  missing: boolean;
};

/** A position to select and scroll to once its document is shown. */
export type RevealTarget = {
  path: string;
  /** 1-based line. */
  line: number;
  /** 0-based UTF-16 column. */
  column: number;
  /** UTF-16 length to select from `column`. */
  length: number;
};

export type DocumentsState = {
  documents: OpenDocument[];
  hasDirtyDocuments: boolean;
  hasSavingDocuments: boolean;
  activePath: string | null;
  activeDocument: OpenDocument | null;
  loadingPath: string | null;
  error: string | null;
  revealTarget: RevealTarget | null;
  openDocument: (path: string) => Promise<void>;
  /** Opens `path` and selects `length` units at `line`/`column`. */
  openDocumentAt: (
    path: string,
    line: number,
    column: number,
    length?: number,
  ) => Promise<void>;
  clearReveal: () => void;
  selectDocument: (path: string) => void;
  /** Activates the tab `delta` positions away, wrapping around. */
  selectRelative: (delta: number) => void;
  /** Moves the tab for `path` to `toIndex`. */
  moveDocument: (path: string, toIndex: number) => void;
  closeDocument: (path: string) => void;
  updateDocument: (path: string, draft: string) => void;
  saveDocument: (path: string) => Promise<void>;
  reloadDocument: (path: string) => Promise<void>;
  resetDocuments: () => void;
  /**
   * Re-reads `path` after an external change: clean documents take the new
   * content, edited ones are flagged `changedOnDisk`, deleted ones `missing`.
   */
  syncFromDisk: (path: string) => Promise<void>;
  /** Keeps the draft of a document flagged `changedOnDisk`. */
  keepDraft: (path: string) => void;
  /** Follows a rename/move of `from` (a file or a folder) to `to`. */
  renameDocuments: (from: string, to: string) => void;
  /** Closes `path` and anything under it without asking (e.g. after trashing). */
  forgetDocuments: (path: string) => void;
};

export type EditorSurfaceProps = {
  state: DocumentsState;
};

export type CodeEditorProps = {
  path: string;
  label: string;
  value: string;
  readonly: boolean;
  /** Selected and scrolled into view once, then `onRevealed` is called. */
  reveal?: Omit<RevealTarget, "path"> | null;
  onRevealed?: () => void;
  onChange: (value: string) => void;
};
