import type { WorkspaceEntry } from "@/shared/services/workspace";

export type WorkspaceTreeState = {
  rootPath: string | null;
  rootName: string | null;
  childrenByPath: Readonly<Record<string, WorkspaceEntry[]>>;
  expandedPaths: ReadonlySet<string>;
  loadingPaths: ReadonlySet<string>;
  error: string | null;
  chooseWorkspace: () => Promise<string | null>;
  openWorkspace: (path: string) => Promise<void>;
  collapseAll: () => void;
  refreshDirectory: (path: string) => Promise<void>;
  refreshRoot: () => Promise<void>;
  toggleDirectory: (path: string) => Promise<void>;
  /** Expands `path` (loading it if needed); no-op when already expanded. */
  expandDirectory: (path: string) => Promise<void>;
};

export type NameEditMode = "file" | "folder" | "rename";

/** An inline name being typed in the tree (new entry or rename). */
export type NameEdit = {
  mode: NameEditMode;
  /** Folder the new entry goes into, or the renamed entry's folder. */
  parentPath: string;
  /** The entry being renamed. */
  entry?: WorkspaceEntry;
};

export type ExplorerProps = {
  tree: WorkspaceTreeState;
  activePath: string | null;
};
