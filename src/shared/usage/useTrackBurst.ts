import { useCallback, useRef } from "react";

import { USAGE_BURST_GAP_MS } from "./constants";
import { useUsage } from "./UsageContext";

/**
 * Counts `feature` once per burst of calls (e.g. one typed query): a call
 * counts only when the previous one was more than USAGE_BURST_GAP_MS ago.
 */
export const useTrackBurst = (feature: string) => {
  const { track } = useUsage();
  const lastCallAt = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastCallAt.current > USAGE_BURST_GAP_MS) track(feature);
    lastCallAt.current = now;
  }, [feature, track]);
};
