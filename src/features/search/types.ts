import type { RefObject } from "react";

import type { TextSearchMatch } from "@/shared/services/workspace";

export type SearchFileGroup = {
  /** Relative to the workspace root, `/`-separated. */
  path: string;
  /** Matches with their index in the flat, keyboard-selectable list. */
  matches: { match: TextSearchMatch; index: number }[];
};

export type ProjectSearchState = {
  enabled: boolean;
  open: boolean;
  query: string;
  isRegex: boolean;
  caseSensitive: boolean;
  groups: SearchFileGroup[];
  resultCount: number;
  fileCount: number;
  selectedIndex: number;
  loading: boolean;
  truncated: boolean;
  error: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  toggleRegex: () => void;
  toggleCaseSensitive: () => void;
  setSelectedIndex: (index: number) => void;
  moveSelection: (delta: number) => void;
  openSelected: (index?: number) => void;
};

export type UseProjectSearchOptions = {
  rootPath: string | null;
  /** Opens the absolute `path` selecting `length` UTF-16 units at `line`/`column`. */
  onOpenMatch: (
    path: string,
    line: number,
    column: number,
    length: number,
  ) => void | Promise<void>;
};

export type ProjectSearchProps = {
  state: ProjectSearchState;
};
