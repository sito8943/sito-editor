import type { MouseEvent } from "react";
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  useContextMenu,
} from "@sito/ui";
import {
  useCommandRegistry,
  useCommandState,
} from "@sito/commands/react";

import {
  APP_COMMAND,
  type AppCommandContext,
  type AppCommandId,
} from "@/app/commands";
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
  onActivate: (entry: WorkspaceEntry) => void;
  onOpenContextMenu: (
    event: MouseEvent<HTMLButtonElement>,
    entry: WorkspaceEntry,
  ) => void;
};

const TreeLevel = ({
  parentPath,
  tree,
  activePath,
  onActivate,
  onOpenContextMenu,
}: TreeLevelProps) => {
  const entries = tree.childrenByPath[parentPath] ?? [];

  return entries.map((entry: WorkspaceEntry) => {
    const directory =
      entry.kind === WORKSPACE_ENTRY_KIND.DIRECTORY && !entry.isSymlink;
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
          onClick={() => onActivate(entry)}
          onContextMenu={(event) => onOpenContextMenu(event, entry)}
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
              onActivate={onActivate}
              onOpenContextMenu={onOpenContextMenu}
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
}: ExplorerProps) => {
  const commands = useCommandRegistry<AppCommandContext>();
  const menu = useContextMenu<WorkspaceEntry | null>();
  const rootEntries = tree.rootPath
    ? (tree.childrenByPath[tree.rootPath] ?? [])
    : [];
  const rootLoading = tree.rootPath
    ? tree.loadingPaths.has(tree.rootPath)
    : false;
  const target = menu.payload;
  const targetDirectory =
    target?.kind === WORKSPACE_ENTRY_KIND.DIRECTORY &&
    !target.isSymlink;
  const targetFile =
    target?.kind === WORKSPACE_ENTRY_KIND.FILE && !target.isSymlink;
  const targetExpanded = Boolean(
    targetDirectory &&
      target &&
      tree.expandedPaths.has(target.path),
  );
  const collapseAllState = useCommandState<AppCommandContext>(
    APP_COMMAND.COLLAPSE_EXPLORER,
    {},
  );

  const execute = (
    command: AppCommandId,
    context: AppCommandContext,
  ) => {
    void commands.execute(command, context);
  };

  const executeFromMenu = (
    command: AppCommandId,
    context: AppCommandContext,
  ) => {
    menu.close();
    execute(command, context);
  };

  const activate = (entry: WorkspaceEntry) => {
    const context = { path: entry.path };
    if (
      entry.kind === WORKSPACE_ENTRY_KIND.DIRECTORY &&
      !entry.isSymlink
    ) {
      execute(APP_COMMAND.TOGGLE_DIRECTORY, context);
    } else if (
      entry.kind === WORKSPACE_ENTRY_KIND.FILE &&
      !entry.isSymlink
    ) {
      execute(APP_COMMAND.OPEN_DOCUMENT, context);
    }
  };

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
            onClick={() =>
              execute(APP_COMMAND.REFRESH_DIRECTORY, {})
            }
          >
            {t.explorer.refresh}
          </Button>
        )}
      </header>

      <div
        className="Explorer_tree"
        onContextMenu={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(".Explorer_row")
          ) {
            return;
          }
          event.preventDefault();
          menu.openAt(event.clientX, event.clientY, null);
        }}
      >
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
            onActivate={activate}
            onOpenContextMenu={(event, entry) => {
              event.preventDefault();
              event.currentTarget.focus();
              menu.openAt(event.clientX, event.clientY, entry);
            }}
          />
        )}
      </div>

      {tree.error && <p className="Explorer_error">{tree.error}</p>}

      <ContextMenu
        open={menu.open}
        position={menu.position}
        onClose={menu.close}
        ariaLabel={t.explorer.contextMenu}
      >
        {targetFile && target ? (
          <ContextMenuItem
            onClick={() =>
              executeFromMenu(APP_COMMAND.OPEN_DOCUMENT, {
                path: target.path,
              })
            }
          >
            {t.explorer.open}
          </ContextMenuItem>
        ) : null}
        {targetDirectory && target ? (
          <>
            <ContextMenuItem
              onClick={() =>
                executeFromMenu(APP_COMMAND.TOGGLE_DIRECTORY, {
                  path: target.path,
                })
              }
            >
              {targetExpanded
                ? t.explorer.collapseFolder
                : t.explorer.expandFolder}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                executeFromMenu(APP_COMMAND.REFRESH_DIRECTORY, {
                  path: target.path,
                })
              }
            >
              {t.explorer.refreshFolder}
            </ContextMenuItem>
          </>
        ) : null}
        {targetFile || targetDirectory ? (
          <ContextMenuSeparator />
        ) : null}
        <ContextMenuItem
          disabled={!tree.rootPath}
          onClick={() =>
            executeFromMenu(APP_COMMAND.REFRESH_DIRECTORY, {})
          }
        >
          {t.explorer.refresh}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!collapseAllState.enabled}
          onClick={() =>
            executeFromMenu(APP_COMMAND.COLLAPSE_EXPLORER, {})
          }
        >
          {t.explorer.collapseAll}
        </ContextMenuItem>
      </ContextMenu>
    </aside>
  );
};
