import type { TextDocumentSnapshot } from "@/shared/services/workspace";

export type OpenDocument = Omit<TextDocumentSnapshot, "content"> & {
  source: string;
  draft: string;
  editable: boolean;
  dirty: boolean;
  saving: boolean;
  conflict: boolean;
  saveError: string | null;
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
