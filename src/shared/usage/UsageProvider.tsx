import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTracker,
  fetchTransport,
  noopTracker,
  type Tracker,
} from "@sito/feature-usage";

import {
  CONSENT_STORAGE_KEY,
  USAGE_APP,
  USAGE_KEY,
  USAGE_URL,
} from "./constants";
import type { UsageContextValue, UsageProviderProps } from "./types";
import { persistConsent, readStoredConsent } from "./utils";
import { UsageContext } from "./UsageContext";

// Copied from sito-file-browser. Owns the consent choice and the tracker:
// nothing is sent until the user accepts; withdrawing stops the tracker and
// forgets the events it still held.
export const UsageProvider = ({ features, children }: UsageProviderProps) => {
  const [analytics, setAnalyticsState] = useState<boolean | null>(
    () => readStoredConsent(CONSENT_STORAGE_KEY)?.analytics ?? null,
  );
  const [reopened, setReopened] = useState(false);
  const allowed = analytics === true;

  // fetch, not sendBeacon: the Tauri webview has no reliable beacon on close,
  // and queued events survive in storage until the next launch anyway.
  const tracker = useMemo<Tracker<string>>(
    () =>
      allowed && USAGE_URL
        ? createTracker({
            app: USAGE_APP,
            key: USAGE_KEY,
            endpoint: USAGE_URL,
            features,
            transport: fetchTransport(),
            onError: (error: Error) => console.warn("[usage]", error.message),
          })
        : noopTracker<string>(),
    [allowed, features],
  );

  // Stop the replaced tracker and, on withdrawal, clear what it kept. Not an
  // effect cleanup: StrictMode's extra run would stop the live tracker.
  const previous = useRef<Tracker<string> | null>(null);
  useEffect(() => {
    const replaced = previous.current;
    previous.current = tracker;
    if (!replaced || replaced === tracker) return;
    replaced.stop();
    if (!allowed) replaced.clear();
  }, [tracker, allowed]);

  const setAnalytics = useCallback((next: boolean) => {
    persistConsent(CONSENT_STORAGE_KEY, next);
    setAnalyticsState(next);
    setReopened(false);
  }, []);

  const openNotice = useCallback(() => setReopened(true), []);

  const value = useMemo<UsageContextValue>(
    () => ({
      analytics,
      isNoticeOpen: analytics === null || reopened,
      setAnalytics,
      openNotice,
      track: tracker.track,
    }),
    [analytics, openNotice, reopened, setAnalytics, tracker],
  );

  return (
    <UsageContext.Provider value={value}>{children}</UsageContext.Provider>
  );
};
