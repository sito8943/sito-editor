import { Button, Tooltip } from "@sito/ui";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import {
  useCommandRegistry,
  useCommandState,
} from "@sito/commands/react";

import {
  APP_COMMAND,
  type AppCommandContext,
} from "@/app/commands";
import { t } from "@/lang";
import { FileIcon, SurfaceButton, TabStrip } from "@/shared/components";
import { USAGE_EVENT, useUsage } from "@/shared/usage";
import { pathName } from "@/shared/utils";

import { CodeEditor } from "./CodeEditor/CodeEditor";
import type { EditorSurfaceProps } from "../types";

import "@/styles/components/EditorSurface.css";

export const EditorSurface = ({ state, gitBaseline }: EditorSurfaceProps) => {
  const activeDocument = state.activeDocument;
  const commands = useCommandRegistry<AppCommandContext>();
  const { track } = useUsage();
  const saveContext: AppCommandContext = {
    path: activeDocument?.path,
  };
  const saveState = useCommandState(
    APP_COMMAND.SAVE_DOCUMENT,
    saveContext,
  );
  const closeTab = (path: string) =>
    void commands.execute(APP_COMMAND.CLOSE_DOCUMENT, { path });

  return (
    <section className="EditorSurface" aria-label={t.editor.title}>
      <header className="EditorSurface_tabs">
        <TabStrip
          ariaLabel={t.editor.title}
          activeId={state.activePath}
          items={state.documents.map((document) => ({
            id: document.path,
            label: pathName(document.path),
            icon: <FileIcon name={pathName(document.path)} />,
            tooltip: document.path,
            struck: document.missing,
            closeDisabled: document.saving,
            decoration: document.dirty ? (
              <Tooltip label={t.editor.unsaved} side="bottom">
                <span
                  className="EditorSurface_dirty"
                  aria-label={t.editor.unsaved}
                >
                  ●
                </span>
              </Tooltip>
            ) : undefined,
          }))}
          closeLabel={(item) => `${t.editor.close}: ${item.label}`}
          onSelect={(path) => {
            if (path !== state.activePath) {
              track(USAGE_EVENT.EDITOR.SWITCH_TAB);
            }
            state.selectDocument(path);
          }}
          onClose={closeTab}
          onMiddleClose={() =>
            track(USAGE_EVENT.EDITOR.CLOSE_TAB_MIDDLE_CLICK)
          }
          onMove={state.moveDocument}
        />
        <div className="EditorSurface_actions">
          <SurfaceButton
            icon={faFloppyDisk}
            label={t.editor.save}
            hotkey={t.editor.saveShortcut}
            tooltipSide="bottom"
            loading={saveState.running || activeDocument?.saving}
            disabled={!saveState.enabled}
            onClick={() => {
              void commands.execute(
                APP_COMMAND.SAVE_DOCUMENT,
                saveContext,
              );
            }}
          />
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
            baseline={
              gitBaseline?.path === activeDocument.path
                ? gitBaseline.content
                : null
            }
            reveal={
              state.revealTarget?.path === activeDocument.path
                ? state.revealTarget
                : null
            }
            onRevealed={state.clearReveal}
            onStatus={state.setEditorStatus}
            onChange={(draft) =>
              state.updateDocument(activeDocument.path, draft)
            }
          />
        )}
        {activeDocument?.changedOnDisk && (
          <div className="EditorSurface_error" role="alert">
            <span>{t.editor.changedOnDisk}</span>
            <span className="EditorSurface_errorActions">
              <Button
                size="sm"
                onClick={() => void state.reloadDocument(activeDocument.path)}
              >
                {t.editor.reloadDiscard}
              </Button>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => state.keepDraft(activeDocument.path)}
              >
                {t.editor.keepDraft}
              </Button>
            </span>
          </div>
        )}
        {activeDocument?.missing && !activeDocument.changedOnDisk && (
          <p className="EditorSurface_notice">{t.editor.missingOnDisk}</p>
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
