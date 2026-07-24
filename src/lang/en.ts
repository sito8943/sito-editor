export const en = {
  app: {
    name: "Sito Editor",
    openWorkspace: "Open workspace",
    editingMilestone: "Safe workspace editing",
  },
  explorer: {
    title: "Explorer",
    openTitle: "Open a workspace folder",
    noWorkspace: "Open a folder to start navigating.",
    empty: "This folder is empty.",
    loading: "Loading folder…",
    refresh: "Refresh",
  },
  workbench: {
    resizeExplorer: "Resize Explorer",
    resizeAgents: "Resize Agents",
    resizeTerminal: "Resize Terminal",
  },
  editor: {
    title: "Editor",
    emptyTitle: "No document open",
    emptyBody: "Choose a text file from the Explorer.",
    loading: "Opening document…",
    close: "Close document",
    editorLabel: "Text editor",
    save: "Save",
    saving: "Saving…",
    saveShortcut: "⌘/Ctrl S",
    unsaved: "Unsaved changes",
    discardChanges: "Discard the unsaved changes in this document?",
    discardWorkspaceChanges:
      "Discard all unsaved changes and open another workspace?",
    waitForSave: "Wait for the current save to finish.",
    fileReadonly: "This file is read-only.",
    mixedLineEndings:
      "Files with mixed line endings are read-only until preservation is supported.",
    reloadDiscard: "Reload and discard draft",
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
