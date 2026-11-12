import { createContext, useContext } from "react";

import type { UsageContextValue } from "./types";

// Outside the provider nothing is counted and no notice is shown, so useUsage
// never throws.
const NO_USAGE: UsageContextValue = {
  analytics: null,
  isNoticeOpen: false,
  setAnalytics: () => {},
  openNotice: () => {},
  track: () => {},
};

export const UsageContext = createContext<UsageContextValue>(NO_USAGE);

export const useUsage = () => useContext(UsageContext);
