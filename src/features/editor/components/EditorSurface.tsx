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

  return (
    <section className="EditorSurface" aria-label={t.editor.title}>
      <header className="EditorSurface_tabs">
        <div className="EditorSurface_tabList" role="tablist">
          {state.documents.map((document) => (
            <div
              className={
                document.path === state.activePath
                  ? "EditorSurface_tab active"
                  : "EditorSurface_tab"
              }
              key={document.path}
              role="tab"
              aria-selected={document.path === state.activePath}
            >
              <button
                className="EditorSurface_tabSelect"
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
                onClick={() =>
                  void commands.execute(APP_COMMAND.CLOSE_DOCUMENT, {
                    path: document.path,
                  })
                }
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
