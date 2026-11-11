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
    open: "Open",
    toggleFolder: "Expand or collapse folder",
    expandFolder: "Expand folder",
    collapseFolder: "Collapse folder",
    refreshFolder: "Refresh folder",
    collapseAll: "Collapse all folders",
    contextMenu: "Explorer actions",
  },
  workbench: {
    resizeExplorer: "Resize Explorer",
    resizeAgents: "Resize Agents",
    resizeTerminal: "Resize Terminal",
  },
  editor: {
    title: "Editor",
    open: "Open document",
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
  navigation: {
    label: "File path",
    back: "Go back",
    forward: "Go forward",
    noWorkspace: "Open a folder to start",
    quickOpenHint: "Search files (⌘P)",
  },
  quickOpen: {
    title: "Go to file",
    placeholder: "Search files by name",
    loading: "Listing files…",
    empty: "No matching files.",
    truncated: "Showing the first files only; the workspace is very large.",
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
