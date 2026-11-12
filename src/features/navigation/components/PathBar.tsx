import { Fragment, type KeyboardEvent } from "react";
import { IconButton } from "@sito/ui";

import { t } from "@/lang";

import type { PathBarProps, QuickOpenState } from "../types";
import { breadcrumbSegments } from "../utils/breadcrumb";
import {
  QUICK_OPEN_LIST_ID,
  QuickOpenResults,
  quickOpenOptionId,
} from "./QuickOpenResults";

import "@/styles/components/PathBar.css";

const Chevron = ({ direction }: { direction: "left" | "right" }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path
      d={direction === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const QuickOpenInput = ({ state }: { state: QuickOpenState }) => {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        state.moveSelection(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        state.moveSelection(-1);
        break;
      case "Enter":
        event.preventDefault();
        state.openSelected();
        break;
      case "Escape":
        event.preventDefault();
        state.close();
        break;
    }
  };

  return (
    <>
      <input
        className="PathBar_input"
        type="text"
        value={state.query}
        placeholder={t.quickOpen.placeholder}
        aria-label={t.quickOpen.title}
        role="combobox"
        aria-expanded="true"
        aria-controls={QUICK_OPEN_LIST_ID}
        aria-activedescendant={
          state.results.length > 0
            ? quickOpenOptionId(state.selectedIndex)
            : undefined
        }
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        onChange={(event) => state.setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={state.close}
      />
      <QuickOpenResults state={state} />
    </>
  );
};

export const PathBar = ({
  rootPath,
  activePath,
  history,
  quickOpen,
  onOpenFolder,
}: PathBarProps) => {
  const segments = rootPath ? breadcrumbSegments(rootPath, activePath) : [];

  return (
    <nav className="PathBar" aria-label={t.navigation.label}>
      <div className="PathBar_history">
        <IconButton
          size="sm"
          variant="text"
          className="PathBar_historyButton"
          aria-label={t.navigation.back}
          title={`${t.navigation.back} (⌃-)`}
          icon={<Chevron direction="left" />}
          disabled={!history.canGoBack}
          onClick={history.back}
        />
        <IconButton
          size="sm"
          variant="text"
          className="PathBar_historyButton"
          aria-label={t.navigation.forward}
          title={`${t.navigation.forward} (⌃⇧-)`}
          icon={<Chevron direction="right" />}
          disabled={!history.canGoForward}
          onClick={history.forward}
        />
      </div>

      <div className="PathBar_field">
        {!rootPath ? (
          <button
            type="button"
            className="PathBar_breadcrumb PathBar_openFolder"
            onClick={onOpenFolder}
          >
            <span>{t.navigation.noWorkspace}</span>
            <kbd className="PathBar_shortcut">{t.navigation.openShortcuts}</kbd>
          </button>
        ) : quickOpen.open ? (
          <QuickOpenInput state={quickOpen} />
        ) : (
          <div
            className="PathBar_breadcrumb"
            role="button"
            tabIndex={0}
            title={t.navigation.quickOpenHint}
            onClick={() => quickOpen.show()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                quickOpen.show();
              }
            }}
          >
            {segments.map((segment, index) => (
              <Fragment key={segment.relativePath || "root"}>
                {index > 0 && (
                  <span className="PathBar_separator" aria-hidden="true">
                    ›
                  </span>
                )}
                <button
                  type="button"
                  className={
                    segment.isFile
                      ? "PathBar_segment current"
                      : "PathBar_segment"
                  }
                  tabIndex={-1}
                  onClick={(event) => {
                    // Folders open the search scoped to that folder.
                    if (segment.isFile) return;
                    event.stopPropagation();
                    quickOpen.show(
                      segment.relativePath ? `${segment.relativePath}/` : "",
                    );
                  }}
                >
                  {segment.name}
                </button>
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};
