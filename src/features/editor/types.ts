import type { TextDocumentSnapshot } from "@/shared/services/workspace";

export type OpenDocument = TextDocumentSnapshot;

export type DocumentsState = {
  documents: OpenDocument[];
  activePath: string | null;
  activeDocument: OpenDocument | null;
  loadingPath: string | null;
  error: string | null;
  openDocument: (path: string) => Promise<void>;
  selectDocument: (path: string) => void;
  closeDocument: (path: string) => void;
  resetDocuments: () => void;
};

export type EditorSurfaceProps = {
  state: DocumentsState;
};

export type CodeEditorProps = {
  label: string;
  value: string;
};
