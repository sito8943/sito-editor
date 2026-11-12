import type { ReactNode } from "react";

export type WorkbenchProps = {
  explorer: ReactNode;
  editor: ReactNode;
  /** Omitted while there are no agent sessions: the pane and its resizer hide. */
  agents?: ReactNode;
  terminal: ReactNode;
};
