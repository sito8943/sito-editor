import { Button } from "@sito/ui";
import { confirm } from "@tauri-apps/plugin-dialog";

import { t } from "@/lang";
import { pathName } from "@/shared/utils";

import { CodeEditor } from "./CodeEditor/CodeEditor";
import type { EditorSurfaceProps } from "../types";

import "@/styles/components/EditorSurface.css";

export const EditorSurface = ({ state }: EditorSurfaceProps) => {
  const activeDocument = state.activeDocument;

  const closeDocument = async (path: string, dirty: boolean) => {
    if (
      dirty &&
      !(await confirm(t.editor.discardChanges, {
        title: t.app.name,
        kind: "warning",
      }))
    ) {
      return;
    }

    state.closeDocument(path);
  };

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
                  void closeDocument(document.path, document.dirty)
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
            disabled={
              !activeDocument?.editable ||
              !activeDocument.dirty ||
              activeDocument.saving
            }
            onClick={() => {
              if (activeDocument) {
                void state.saveDocument(activeDocument.path);
              }
            }}
          >
            {activeDocument?.saving ? t.editor.saving : t.editor.save}
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
            label={`${t.editor.editorLabel}: ${pathName(
              activeDocument.path,
            )}`}
            value={activeDocument.draft}
            readonly={!activeDocument.editable}
            onChange={(draft) =>
              state.updateDocument(activeDocument.path, draft)
            }
            onSave={() => void state.saveDocument(activeDocument.path)}
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
