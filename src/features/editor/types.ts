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

export type DocumentsState = {
  documents: OpenDocument[];
  hasDirtyDocuments: boolean;
  hasSavingDocuments: boolean;
  activePath: string | null;
  activeDocument: OpenDocument | null;
  loadingPath: string | null;
  error: string | null;
  openDocument: (path: string) => Promise<void>;
  selectDocument: (path: string) => void;
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
  onChange: (value: string) => void;
};
