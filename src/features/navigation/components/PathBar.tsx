import { Fragment, type KeyboardEvent } from "react";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import { Tooltip } from "@sito/ui";

import { t } from "@/lang";
import { SurfaceButton } from "@/shared/components";

import type { PathBarProps, QuickOpenState } from "../types";
import { breadcrumbSegments } from "../utils/breadcrumb";
import {
  QUICK_OPEN_LIST_ID,
  QuickOpenResults,
  quickOpenOptionId,
} from "./QuickOpenResults";

import "@/styles/components/PathBar.css";

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
        <SurfaceButton
          size="md"
          icon={faChevronLeft}
          label={t.navigation.back}
          hotkey="⌃-"
          tooltipSide="bottom"
          disabled={!history.canGoBack}
          onClick={history.back}
        />
        <SurfaceButton
          size="md"
          icon={faChevronRight}
          label={t.navigation.forward}
          hotkey="⌃⇧-"
          tooltipSide="bottom"
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
          <Tooltip
            className="PathBar_tooltip"
            label={t.navigation.quickOpenHint}
            hotkey={t.navigation.quickOpenShortcut}
            side="bottom"
          >
            <div
              className="PathBar_breadcrumb"
              role="button"
              tabIndex={0}
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
          </Tooltip>
        )}
      </div>
    </nav>
  );
};
