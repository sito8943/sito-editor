import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import { t } from "@/lang";
import { FileIcon, SurfaceButton } from "@/shared/components";
import type { TextSearchMatch } from "@/shared/services/workspace";

import type { ProjectSearchProps } from "../types";

import "@/styles/components/ProjectSearch.css";

const LIST_ID = "ProjectSearch_results";
const optionId = (index: number) => `ProjectSearch_result_${index}`;

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <circle
      cx="7"
      cy="7"
      r="4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="m10.5 10.5 3.5 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/** Marks the `[start, end)` ranges of `match.preview`. */
const Preview = ({ match }: { match: TextSearchMatch }) => {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  match.ranges.forEach(([start, end], index) => {
    if (start > cursor) nodes.push(match.preview.slice(cursor, start));
    nodes.push(<mark key={index}>{match.preview.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < match.preview.length) nodes.push(match.preview.slice(cursor));
  return <span className="ProjectSearch_preview">{nodes}</span>;
};

const Toggle = ({
  label,
  text,
  pressed,
  onToggle,
}: {
  label: string;
  text: string;
  pressed: boolean;
  onToggle: () => void;
}) => (
  <SurfaceButton
    size="xs"
    className="ProjectSearch_toggle"
    icon={text}
    label={label}
    pressed={pressed}
    // Keep focus (and the dropdown) in the input.
    onMouseDown={(event) => event.preventDefault()}
    onClick={onToggle}
  />
);

export const ProjectSearch = ({ state }: ProjectSearchProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const showDropdown = state.open && state.query.length > 0;

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${state.selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [state.selectedIndex, state.groups]);

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
        state.setOpen(false);
        event.currentTarget.blur();
        break;
    }
  };

  const status = state.error
    ? state.error
    : state.loading && state.resultCount === 0
      ? t.search.searching
      : state.resultCount === 0
        ? t.search.empty
        : state.truncated
          ? t.search.truncated
          : t.search.summary(state.resultCount, state.fileCount);

  return (
    <div className="ProjectSearch">
      <div
        className={
          state.enabled ? "ProjectSearch_field" : "ProjectSearch_field disabled"
        }
      >
        <span className="ProjectSearch_icon">
          <SearchIcon />
        </span>
        <input
          ref={state.inputRef}
          className="ProjectSearch_input"
          type="text"
          value={state.query}
          placeholder={state.enabled ? t.search.placeholder : ""}
          aria-label={t.search.label}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={LIST_ID}
          aria-activedescendant={
            showDropdown && state.resultCount > 0
              ? optionId(state.selectedIndex)
              : undefined
          }
          disabled={!state.enabled}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          onChange={(event) => state.setQuery(event.target.value)}
          onFocus={() => state.setOpen(true)}
          onBlur={() => state.setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {!state.query && state.enabled && (
          <kbd className="ProjectSearch_shortcut">{t.search.shortcut}</kbd>
        )}
        {state.enabled && (
          <>
            <Toggle
              label={t.search.caseSensitive}
              text="Aa"
              pressed={state.caseSensitive}
              onToggle={state.toggleCaseSensitive}
            />
            <Toggle
              label={t.search.regex}
              text=".*"
              pressed={state.isRegex}
              onToggle={state.toggleRegex}
            />
          </>
        )}
      </div>

      {showDropdown && (
        <div
          className="ProjectSearch_dropdown"
          onMouseDown={(event) => event.preventDefault()}
        >
          <p
            className={
              state.error ? "ProjectSearch_status error" : "ProjectSearch_status"
            }
          >
            {status}
          </p>
          {state.groups.length > 0 && (
            <div
              id={LIST_ID}
              className="ProjectSearch_results"
              role="listbox"
              ref={listRef}
            >
              {state.groups.map((group) => {
                const nameStart = group.path.lastIndexOf("/") + 1;
                return (
                  <div
                    key={group.path}
                    className="ProjectSearch_group"
                    role="group"
                    aria-label={group.path}
                  >
                    <div className="ProjectSearch_file">
                      <FileIcon name={group.path.slice(nameStart)} />
                      <span className="ProjectSearch_fileName">
                        {group.path.slice(nameStart)}
                      </span>
                      <span className="ProjectSearch_fileDirectory">
                        {group.path.slice(0, Math.max(nameStart - 1, 0))}
                      </span>
                      <span className="ProjectSearch_count">
                        {group.matches.length}
                      </span>
                    </div>
                    {group.matches.map(({ match, index }) => (
                      <div
                        key={`${match.path}:${match.line}`}
                        id={optionId(index)}
                        data-index={index}
                        role="option"
                        aria-selected={index === state.selectedIndex}
                        className={
                          index === state.selectedIndex
                            ? "ProjectSearch_match active"
                            : "ProjectSearch_match"
                        }
                        onMouseMove={() => {
                          if (index !== state.selectedIndex) {
                            state.setSelectedIndex(index);
                          }
                        }}
                        onClick={() => state.openSelected(index)}
                      >
                        <span className="ProjectSearch_line">{match.line}</span>
                        <Preview match={match} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
