import { Button } from "@sito/ui";

import { t } from "@/lang";
import {
  WORKSPACE_ENTRY_KIND,
  type WorkspaceEntry,
} from "@/shared/services/workspace";

import type { ExplorerProps, WorkspaceTreeState } from "../types";

import "@/styles/components/Explorer.css";

type TreeLevelProps = {
  parentPath: string;
  tree: WorkspaceTreeState;
  activePath: string | null;
  onOpenDocument: (path: string) => void;
};

const TreeLevel = ({
  parentPath,
  tree,
  activePath,
  onOpenDocument,
}: TreeLevelProps) => {
  const entries = tree.childrenByPath[parentPath] ?? [];

  return entries.map((entry: WorkspaceEntry) => {
    const directory =
      entry.kind === WORKSPACE_ENTRY_KIND.DIRECTORY && !entry.isSymlink;
    const file = entry.kind === WORKSPACE_ENTRY_KIND.FILE && !entry.isSymlink;
    const expanded = directory && tree.expandedPaths.has(entry.path);
    const loading = tree.loadingPaths.has(entry.path);

    return (
      <div className="Explorer_node" key={entry.path}>
        <button
          className={
            entry.path === activePath
              ? "Explorer_row active"
              : "Explorer_row"
          }
          type="button"
          aria-expanded={directory ? expanded : undefined}
          aria-current={entry.path === activePath ? "page" : undefined}
          title={entry.path}
          onClick={() => {
            if (directory) void tree.toggleDirectory(entry.path);
            else if (file) onOpenDocument(entry.path);
          }}
        >
          <span className="Explorer_chevron" aria-hidden="true">
            {directory ? (expanded ? "▾" : "▸") : ""}
          </span>
          <span className="Explorer_name">{entry.name}</span>
          {loading && <span className="Explorer_loading">…</span>}
        </button>
        {expanded && (
          <div className="Explorer_children">
            <TreeLevel
              parentPath={entry.path}
              tree={tree}
              activePath={activePath}
              onOpenDocument={onOpenDocument}
            />
          </div>
        )}
      </div>
    );
  });
};

export const Explorer = ({
  tree,
  activePath,
  onOpenDocument,
}: ExplorerProps) => {
  const rootEntries = tree.rootPath
    ? (tree.childrenByPath[tree.rootPath] ?? [])
    : [];
  const rootLoading = tree.rootPath
    ? tree.loadingPaths.has(tree.rootPath)
    : false;

  return (
    <aside className="Explorer" aria-label={t.explorer.title}>
      <header className="Explorer_header">
        <div>
          <span className="Explorer_eyebrow">{t.explorer.title}</span>
          <h2>{tree.rootName ?? t.app.name}</h2>
        </div>
        {tree.rootPath && (
          <Button
            className="Explorer_refresh"
            size="sm"
            onClick={() => void tree.refreshRoot()}
          >
            {t.explorer.refresh}
          </Button>
        )}
      </header>

      <div className="Explorer_tree">
        {!tree.rootPath && <p>{t.explorer.noWorkspace}</p>}
        {tree.rootPath && rootLoading && <p>{t.explorer.loading}</p>}
        {tree.rootPath && !rootLoading && rootEntries.length === 0 && (
          <p>{t.explorer.empty}</p>
        )}
        {tree.rootPath && (
          <TreeLevel
            parentPath={tree.rootPath}
            tree={tree}
            activePath={activePath}
            onOpenDocument={onOpenDocument}
          />
        )}
      </div>

      {tree.error && <p className="Explorer_error">{tree.error}</p>}
    </aside>
  );
};
