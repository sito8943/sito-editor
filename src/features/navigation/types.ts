export type FuzzyMatch = {
  /** Path relative to the workspace root, `/`-separated. */
  path: string;
  score: number;
  /** Indices in `path` that matched the query, ascending. */
  indices: number[];
};

export type QuickOpenState = {
  open: boolean;
  query: string;
  results: FuzzyMatch[];
  selectedIndex: number;
  loading: boolean;
  truncated: boolean;
  error: string | null;
  /** Opens the search, optionally prefilled (e.g. with a folder path). */
  show: (initialQuery?: string) => void;
  close: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  moveSelection: (delta: number) => void;
  openSelected: (index?: number) => void;
};

export type UseQuickOpenOptions = {
  rootPath: string | null;
  /** Absolute paths, newest first; listed first while the query is empty. */
  recentPaths?: readonly string[];
  /** Receives the absolute path of the chosen file. */
  onOpenFile: (path: string) => void | Promise<void>;
};

export type FileHistoryState = {
  canGoBack: boolean;
  canGoForward: boolean;
  back: () => void;
  forward: () => void;
};

export type UseFileHistoryOptions = {
  rootPath: string | null;
  activePath: string | null;
  /** Receives the absolute path to re-activate. */
  onOpenFile: (path: string) => void | Promise<void>;
};

export type BreadcrumbSegment = {
  name: string;
  /** `/`-separated path relative to the root; empty for the root itself. */
  relativePath: string;
  isFile: boolean;
};

export type PathBarProps = {
  rootPath: string | null;
  activePath: string | null;
  history: FileHistoryState;
  quickOpen: QuickOpenState;
  /** Trigger shown in place of the breadcrumb while no workspace is open. */
  onOpenFolder: () => void;
};
