import { useState, type MouseEvent } from "react";
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

import {
  USAGE_EVENT,
  USAGE_PREFIX,
  usageFeature,
  useUsage,
} from "@/shared/usage";
import { joinPath, parentPath as parentOf, pathName } from "@/shared/utils";

import { EXPLORER_MENU_ACTION } from "../constants";
import { useEntryDragMove } from "../hooks/useEntryDragMove";

import { NameInput } from "./NameInput";
import type { NameEdit } from "../types";

import "@/styles/components/Explorer.css";

type TreeLevelProps = {
  parentPath: string;
  tree: WorkspaceTreeState;
  edit: NameEdit | null;
  bindDrag: ReturnType<typeof useEntryDragMove>["bind"];
  onCommitName: (name: string) => void;
  onCancelName: () => void;
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
  edit,
  bindDrag,
  onCommitName,
  onCancelName,
  activePath,
  onActivate,
  onOpenContextMenu,
}: TreeLevelProps) => {
  const entries = tree.childrenByPath[parentPath] ?? [];
  const creatingHere =
    edit && edit.mode !== "rename" && edit.parentPath === parentPath;

  const rows = entries.map((entry: WorkspaceEntry) => {
    const directory =
      entry.kind === WORKSPACE_ENTRY_KIND.DIRECTORY && !entry.isSymlink;
    const expanded = directory && tree.expandedPaths.has(entry.path);
    const loading = tree.loadingPaths.has(entry.path);

    const renaming = edit?.mode === "rename" && edit.entry?.path === entry.path;

    return (
      <div className="Explorer_node" key={entry.path}>
        {renaming ? (
          <NameInput
            mode="rename"
            initialName={entry.name}
            onCommit={onCommitName}
            onCancel={onCancelName}
          />
        ) : (
        <button
          className={
            entry.path === activePath
              ? "Explorer_row active"
              : "Explorer_row"
          }
          type="button"
          data-path={entry.path}
          data-directory={directory}
          {...bindDrag(entry.path)}
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
        )}
        {expanded && (
          <div className="Explorer_children">
            <TreeLevel
              parentPath={entry.path}
              tree={tree}
              edit={edit}
              bindDrag={bindDrag}
              onCommitName={onCommitName}
              onCancelName={onCancelName}
              activePath={activePath}
              onActivate={onActivate}
              onOpenContextMenu={onOpenContextMenu}
            />
          </div>
        )}
      </div>
    );
  });

  return (
    <>
      {creatingHere && edit && (
        <NameInput
          mode={edit.mode}
          onCommit={onCommitName}
          onCancel={onCancelName}
        />
      )}
      {rows}
    </>
  );
};

export const Explorer = ({
  tree,
  activePath,
}: ExplorerProps) => {
  const commands = useCommandRegistry<AppCommandContext>();
  const menu = useContextMenu<WorkspaceEntry | null>();
  const [edit, setEdit] = useState<NameEdit | null>(null);
  const { track } = useUsage();
  const drag = useEntryDragMove({
    rootPath: tree.rootPath,
    onMove: (source, destination) =>
      execute(APP_COMMAND.MOVE_ENTRY, {
        path: source,
        targetPath: joinPath(destination, pathName(source)),
      }),
  });
  type MenuAction =
    (typeof EXPLORER_MENU_ACTION)[keyof typeof EXPLORER_MENU_ACTION];
  const trackMenu = (action: MenuAction) =>
    track(usageFeature(USAGE_PREFIX.EXPLORER_MENU, action));
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
    action: MenuAction,
    command: AppCommandId,
    context: AppCommandContext,
  ) => {
    trackMenu(action);
    menu.close();
    execute(command, context);
  };

  /** Starts typing a new entry's name in the folder `target` belongs to. */
  const startCreate = (
    mode: "file" | "folder",
    target: WorkspaceEntry | null,
  ) => {
    menu.close();
    if (!tree.rootPath) return;
    const parent = !target
      ? tree.rootPath
      : target.kind === WORKSPACE_ENTRY_KIND.DIRECTORY && !target.isSymlink
        ? target.path
        : parentOf(target.path);
    if (parent !== tree.rootPath) void tree.expandDirectory(parent);
    // After the menu returns focus to its trigger, or the field would blur
    // (and cancel) right away.
    window.setTimeout(() => setEdit({ mode, parentPath: parent }), 0);
  };

  const startRename = (entry: WorkspaceEntry) => {
    menu.close();
    window.setTimeout(
      () => setEdit({ mode: "rename", parentPath: parentOf(entry.path), entry }),
      0,
    );
  };

  const commitName = (name: string) => {
    const current = edit;
    setEdit(null);
    if (!current) return;
    const path = joinPath(current.parentPath, name);
    if (current.mode === "rename" && current.entry) {
      execute(APP_COMMAND.RENAME_ENTRY, {
        path: current.entry.path,
        targetPath: path,
      });
    } else {
      execute(
        current.mode === "folder"
          ? APP_COMMAND.CREATE_FOLDER
          : APP_COMMAND.CREATE_FILE,
        { path },
      );
    }
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
      track(USAGE_EVENT.EXPLORER.OPEN_FILE);
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
        ref={drag.treeRef}
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
            edit={edit}
            bindDrag={drag.bind}
            onCommitName={commitName}
            onCancelName={() => setEdit(null)}
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

      <div className="Explorer_dragGhost" ref={drag.ghostRef} aria-hidden="true" />

      <ContextMenu
        open={menu.open}
        position={menu.position}
        onClose={menu.close}
        ariaLabel={t.explorer.contextMenu}
      >
        {targetFile && target ? (
          <ContextMenuItem
            onClick={() =>
              executeFromMenu(EXPLORER_MENU_ACTION.OPEN, APP_COMMAND.OPEN_DOCUMENT, {
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
                executeFromMenu(EXPLORER_MENU_ACTION.TOGGLE_FOLDER, APP_COMMAND.TOGGLE_DIRECTORY, {
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
                executeFromMenu(EXPLORER_MENU_ACTION.REFRESH_FOLDER, APP_COMMAND.REFRESH_DIRECTORY, {
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
          onClick={() => {
            trackMenu(EXPLORER_MENU_ACTION.NEW_FILE);
            startCreate("file", target);
          }}
        >
          {t.explorer.newFile}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!tree.rootPath}
          onClick={() => {
            trackMenu(EXPLORER_MENU_ACTION.NEW_FOLDER);
            startCreate("folder", target);
          }}
        >
          {t.explorer.newFolder}
        </ContextMenuItem>
        {target ? (
          <>
            <ContextMenuItem
              onClick={() => {
                trackMenu(EXPLORER_MENU_ACTION.RENAME);
                startRename(target);
              }}
            >
              {t.explorer.rename}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                executeFromMenu(EXPLORER_MENU_ACTION.MOVE_TO_TRASH, APP_COMMAND.TRASH_ENTRY, {
                  path: target.path,
                })
              }
            >
              {t.explorer.moveToTrash}
            </ContextMenuItem>
          </>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!tree.rootPath}
          onClick={() =>
            executeFromMenu(EXPLORER_MENU_ACTION.REFRESH, APP_COMMAND.REFRESH_DIRECTORY, {})
          }
        >
          {t.explorer.refresh}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!collapseAllState.enabled}
          onClick={() =>
            executeFromMenu(EXPLORER_MENU_ACTION.COLLAPSE_ALL, APP_COMMAND.COLLAPSE_EXPLORER, {})
          }
        >
          {t.explorer.collapseAll}
        </ContextMenuItem>
      </ContextMenu>
    </aside>
  );
};
