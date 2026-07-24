export const en = {
  app: {
    name: "Sito Editor",
    openWorkspace: "Open workspace",
    readOnlyMilestone: "Read-only workspace milestone",
  },
  explorer: {
    title: "Explorer",
    openTitle: "Open a workspace folder",
    noWorkspace: "Open a folder to start navigating.",
    empty: "This folder is empty.",
    loading: "Loading folder…",
    refresh: "Refresh",
  },
  editor: {
    title: "Editor",
    emptyTitle: "No document open",
    emptyBody: "Choose a text file from the Explorer.",
    loading: "Opening document…",
    close: "Close document",
    readonlyLabel: "Read-only text editor",
  },
  agents: {
    title: "Agents",
    emptyTitle: "No agent sessions",
    emptyBody:
      "Structured agent adapters will appear here without scraping terminal output.",
  },
  terminal: {
    title: "Terminal",
    pendingTitle: "Native terminal host",
    pendingBody:
      "This pane is reserved for the libghostty surface and PTY lifecycle.",
  },
} as const;
