import { useEffect } from "react";
import { Button } from "@sito/ui";
import {
  useCommandRegistry,
  useCommandState,
} from "@sito/commands/react";

import {
  APP_COMMAND,
  type AppCommandContext,
} from "@/app/commands";
import { t } from "@/lang";
import { pathName } from "@/shared/utils";

import { CodeEditor } from "./CodeEditor/CodeEditor";
import { useTabDrag } from "../hooks/useTabDrag";
import type { EditorSurfaceProps } from "../types";

import "@/styles/components/EditorSurface.css";

export const EditorSurface = ({ state }: EditorSurfaceProps) => {
  const activeDocument = state.activeDocument;
  const commands = useCommandRegistry<AppCommandContext>();
  const saveContext: AppCommandContext = {
    path: activeDocument?.path,
  };
  const saveState = useCommandState(
    APP_COMMAND.SAVE_DOCUMENT,
    saveContext,
  );
  const tabDrag = useTabDrag(
    state.documents.map((document) => document.path),
    state.selectDocument,
    state.moveDocument,
  );

  // Keep the active tab visible when it changes (Ctrl+Tab, quick open…).
  useEffect(() => {
    tabDrag.listRef.current
      ?.querySelector<HTMLElement>(".EditorSurface_tab.active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [state.activePath, tabDrag.listRef]);

  const closeTab = (path: string) =>
    void commands.execute(APP_COMMAND.CLOSE_DOCUMENT, { path });

  return (
    <section className="EditorSurface" aria-label={t.editor.title}>
      <header className="EditorSurface_tabs">
        <div
          className={
            tabDrag.snapping
              ? "EditorSurface_tabList snapping"
              : "EditorSurface_tabList"
          }
          role="tablist"
          ref={tabDrag.listRef}
        >
          {state.documents.map((document, index) => (
            <div
              className={[
                "EditorSurface_tab",
                document.path === state.activePath && "active",
                tabDrag.draggingIndex === index && "dragging",
              ]
                .filter(Boolean)
                .join(" ")}
              key={document.path}
              role="tab"
              aria-selected={document.path === state.activePath}
              style={
                tabDrag.translateFor(index)
                  ? {
                      transform: `translateX(${tabDrag.translateFor(index)}px)`,
                    }
                  : undefined
              }
              // Middle click closes, like a browser tab.
              onMouseDown={(event) => {
                if (event.button === 1) event.preventDefault();
              }}
              onAuxClick={(event) => {
                if (event.button === 1 && !document.saving) {
                  closeTab(document.path);
                }
              }}
            >
              <button
                className="EditorSurface_tabSelect"
                // Only the label drags: use-gesture swallows clicks it didn't
                // see start as a tap, which would break the close button.
                {...tabDrag.bind(index)}
                type="button"
                onClick={() => state.selectDocument(document.path)}
              >
                {pathName(document.path)}
                {document.dirty && (
                  <span
                    className="EditorSurface_dirty"
                    aria-label={t.editor.unsaved}
                    title={t.editor.unsaved}
                  >
                    ●
                  </span>
                )}
              </button>
              <button
                className="EditorSurface_tabClose"
                type="button"
                disabled={document.saving}
                aria-label={`${t.editor.close}: ${pathName(document.path)}`}
                onClick={() => closeTab(document.path)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="EditorSurface_actions">
          <span>{t.editor.saveShortcut}</span>
          <Button
            size="sm"
            disabled={!saveState.enabled}
            onClick={() => {
              void commands.execute(
                APP_COMMAND.SAVE_DOCUMENT,
                saveContext,
              );
            }}
          >
            {saveState.running || activeDocument?.saving
              ? t.editor.saving
              : t.editor.save}
          </Button>
        </div>
      </header>

      <div className="EditorSurface_body">
        {state.loadingPath && <p>{t.editor.loading}</p>}
        {!state.loadingPath && !activeDocument && (
          <div className="EditorSurface_empty">
            <h2>{t.editor.emptyTitle}</h2>
            <p>{t.editor.emptyBody}</p>
          </div>
        )}
        {!state.loadingPath && activeDocument && (
          <CodeEditor
            key={activeDocument.path}
            path={activeDocument.path}
            label={`${t.editor.editorLabel}: ${pathName(
              activeDocument.path,
            )}`}
            value={activeDocument.draft}
            readonly={!activeDocument.editable}
            reveal={
              state.revealTarget?.path === activeDocument.path
                ? state.revealTarget
                : null
            }
            onRevealed={state.clearReveal}
            onChange={(draft) =>
              state.updateDocument(activeDocument.path, draft)
            }
          />
        )}
        {activeDocument && !activeDocument.editable && (
          <p className="EditorSurface_notice">
            {activeDocument.readonly
              ? t.editor.fileReadonly
              : t.editor.mixedLineEndings}
          </p>
        )}
        {activeDocument?.saveError && (
          <div className="EditorSurface_error" role="alert">
            <span>{activeDocument.saveError}</span>
            {activeDocument.conflict && (
              <Button
                size="sm"
                onClick={() =>
                  void state.reloadDocument(activeDocument.path)
                }
              >
                {t.editor.reloadDiscard}
              </Button>
            )}
          </div>
        )}
        {state.error && <p className="EditorSurface_error">{state.error}</p>}
      </div>
    </section>
  );
};
