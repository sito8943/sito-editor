import type { WorkspaceEntry } from "@/shared/services/workspace";

export type WorkspaceTreeState = {
  rootPath: string | null;
  rootName: string | null;
  childrenByPath: Readonly<Record<string, WorkspaceEntry[]>>;
  expandedPaths: ReadonlySet<string>;
  loadingPaths: ReadonlySet<string>;
  error: string | null;
  chooseWorkspace: () => Promise<string | null>;
  refreshRoot: () => Promise<void>;
  toggleDirectory: (path: string) => Promise<void>;
};

export type ExplorerProps = {
  tree: WorkspaceTreeState;
  onOpenDocument: (path: string) => void;
};
