import { t } from "@/lang";
import { pathName } from "@/shared/utils";

import { CodeEditor } from "./CodeEditor/CodeEditor";
import type { EditorSurfaceProps } from "../types";

import "@/styles/components/EditorSurface.css";

export const EditorSurface = ({ state }: EditorSurfaceProps) => (
  <section className="EditorSurface" aria-label={t.editor.title}>
    <div className="EditorSurface_tabs" role="tablist">
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
          </button>
          <button
            className="EditorSurface_tabClose"
            type="button"
            aria-label={`${t.editor.close}: ${pathName(document.path)}`}
            onClick={() => state.closeDocument(document.path)}
          >
            ×
          </button>
        </div>
      ))}
    </div>

    <div className="EditorSurface_body">
      {state.loadingPath && <p>{t.editor.loading}</p>}
      {!state.loadingPath && !state.activeDocument && (
        <div className="EditorSurface_empty">
          <h2>{t.editor.emptyTitle}</h2>
          <p>{t.editor.emptyBody}</p>
        </div>
      )}
      {!state.loadingPath && state.activeDocument && (
        <CodeEditor
          key={state.activeDocument.path}
          label={`${t.editor.readonlyLabel}: ${pathName(
            state.activeDocument.path,
          )}`}
          value={state.activeDocument.content}
        />
      )}
      {state.error && <p className="EditorSurface_error">{state.error}</p>}
    </div>
  </section>
);
