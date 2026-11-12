import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommand } from "@sito/commands/react";

import { APP_COMMAND, type AppCommandContext } from "@/app/commands";
import { t } from "@/lang";
import {
  USAGE_EVENT,
  useTrackBurst,
  useTrackedHotkey,
  useUsage,
} from "@/shared/usage";
import {
  searchText,
  workspaceErrorMessage,
  type TextSearchResult,
} from "@/shared/services/workspace";
import { joinPath } from "@/shared/utils";

import type {
  ProjectSearchState,
  SearchFileGroup,
  UseProjectSearchOptions,
} from "../types";

const SEARCH_DEBOUNCE_MS = 250;

const groupByFile = (result: TextSearchResult | null): SearchFileGroup[] => {
  if (!result) return [];
  const groups: SearchFileGroup[] = [];
  result.matches.forEach((match, index) => {
    const last = groups[groups.length - 1];
    if (last?.path === match.path) {
      last.matches.push({ match, index });
    } else {
      groups.push({ path: match.path, matches: [{ match, index }] });
    }
  });
  return groups;
};

export const useProjectSearch = ({
  rootPath,
  onOpenMatch,
}: UseProjectSearchOptions): ProjectSearchState => {
  const [open, setOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [result, setResult] = useState<TextSearchResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const { track } = useUsage();
  const trackQuery = useTrackBurst(USAGE_EVENT.SEARCH.PROJECT);

  useEffect(() => {
    setQueryState("");
    setResult(null);
    setError(null);
    setOpen(false);
  }, [rootPath]);

  // Debounced search; stale responses are dropped by request id.
  useEffect(() => {
    const request = ++requestRef.current;
    if (!rootPath || !query) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      searchText(rootPath, query, { isRegex, caseSensitive })
        .then((next) => {
          if (request !== requestRef.current) return;
          setResult(next);
          setError(null);
          setSelectedIndex(0);
        })
        .catch((reason) => {
          if (request !== requestRef.current) return;
          setResult(null);
          setError(workspaceErrorMessage(reason));
        })
        .finally(() => {
          if (request === requestRef.current) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [caseSensitive, isRegex, query, rootPath]);

  const groups = useMemo(() => groupByFile(result), [result]);
  const resultCount = result?.matches.length ?? 0;

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      setOpen(true);
      if (value) trackQuery();
    },
    [trackQuery],
  );

  const moveSelection = useCallback(
    (delta: number) => {
      if (resultCount === 0) return;
      setSelectedIndex(
        (current) => (current + delta + resultCount) % resultCount,
      );
    },
    [resultCount],
  );

  const openSelected = useCallback(
    (index?: number) => {
      const match = result?.matches[index ?? selectedIndex];
      if (!result || !match) return;
      const [start, end] = match.ranges[0] ?? [0, 0];
      setOpen(false);
      track(USAGE_EVENT.SEARCH.OPEN_MATCH);
      void onOpenMatch(
        joinPath(result.root, match.path),
        match.line,
        match.column,
        end - start,
      );
    },
    [onOpenMatch, result, selectedIndex, track],
  );

  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    setOpen(true);
  }, []);

  useCommand<AppCommandContext>({
    id: APP_COMMAND.PROJECT_SEARCH,
    title: () => t.search.label,
    isEnabled: () => Boolean(rootPath),
    execute: focusInput,
  });

  useTrackedHotkey(
    APP_COMMAND.PROJECT_SEARCH,
    () => {
      if (!rootPath) return false;
      focusInput();
    },
    { allowInInput: true },
  );

  return useMemo(
    () => ({
      enabled: Boolean(rootPath),
      open,
      query,
      isRegex,
      caseSensitive,
      groups,
      resultCount,
      fileCount: groups.length,
      selectedIndex,
      loading,
      truncated: result?.truncated ?? false,
      error,
      inputRef,
      setOpen,
      setQuery,
      toggleRegex: () => {
        track(USAGE_EVENT.SEARCH.REGEX);
        setIsRegex((value) => !value);
      },
      toggleCaseSensitive: () => {
        track(USAGE_EVENT.SEARCH.MATCH_CASE);
        setCaseSensitive((value) => !value);
      },
      setSelectedIndex,
      moveSelection,
      openSelected,
    }),
    [
      caseSensitive,
      error,
      groups,
      isRegex,
      loading,
      moveSelection,
      open,
      openSelected,
      query,
      result?.truncated,
      resultCount,
      rootPath,
      selectedIndex,
      setQuery,
      track,
    ],
  );
};
