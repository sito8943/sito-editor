import { useEffect, useRef, type ReactNode } from "react";

import { t } from "@/lang";

import type { FuzzyMatch, QuickOpenState } from "../types";

export const QUICK_OPEN_LIST_ID = "PathBar_results";
export const quickOpenOptionId = (index: number) => `PathBar_result_${index}`;

/** Renders `text` with the characters at `indices` (offset by `start`) marked. */
const highlight = (
  text: string,
  indices: readonly number[],
  start: number,
): ReactNode[] => {
  const marked = new Set(
    indices.filter((index) => index >= start).map((index) => index - start),
  );
  const nodes: ReactNode[] = [];
  let run = "";
  let runMarked = false;

  const flush = (key: number) => {
    if (!run) return;
    nodes.push(runMarked ? <mark key={key}>{run}</mark> : run);
    run = "";
  };

  for (let index = 0; index < text.length; index++) {
    const isMarked = marked.has(index);
    if (isMarked !== runMarked) {
      flush(index);
      runMarked = isMarked;
    }
    run += text[index];
  }
  flush(text.length);
  return nodes;
};

const ResultLabel = ({ match }: { match: FuzzyMatch }) => {
  const nameStart = match.path.lastIndexOf("/") + 1;
  const name = match.path.slice(nameStart);
  const directory = match.path.slice(0, Math.max(nameStart - 1, 0));

  return (
    <>
      <span className="PathBar_resultName">
        {highlight(name, match.indices, nameStart)}
      </span>
      {directory && (
        <span className="PathBar_resultDirectory">
          {highlight(
            directory,
            match.indices.filter((index) => index < nameStart),
            0,
          )}
        </span>
      )}
    </>
  );
};

export const QuickOpenResults = ({ state }: { state: QuickOpenState }) => {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${state.selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [state.selectedIndex, state.results]);

  const status = state.error
    ? state.error
    : state.loading && state.results.length === 0
      ? t.quickOpen.loading
      : state.results.length === 0
        ? t.quickOpen.empty
        : state.truncated
          ? t.quickOpen.truncated
          : null;

  return (
    // Keep focus in the input while clicking results.
    <div
      className="PathBar_dropdown"
      onMouseDown={(event) => event.preventDefault()}
    >
      {state.results.length > 0 && (
        <ul
          id={QUICK_OPEN_LIST_ID}
          className="PathBar_results"
          role="listbox"
          ref={listRef}
        >
          {state.results.map((match, index) => (
            <li
              key={match.path}
              id={quickOpenOptionId(index)}
              data-index={index}
              role="option"
              aria-selected={index === state.selectedIndex}
              className={
                index === state.selectedIndex
                  ? "PathBar_result active"
                  : "PathBar_result"
              }
              onMouseMove={() => {
                if (index !== state.selectedIndex) {
                  state.setSelectedIndex(index);
                }
              }}
              onClick={() => state.openSelected(index)}
            >
              <ResultLabel match={match} />
            </li>
          ))}
        </ul>
      )}
      {status && <p className="PathBar_status">{status}</p>}
    </div>
  );
};
