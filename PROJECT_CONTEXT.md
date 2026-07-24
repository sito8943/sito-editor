# Sito Editor - Project Context

Last reviewed: 2026-07-24

## Product

Sito Editor is a lightweight agentic programming workbench:

- a lazy workspace file tree;
- a small text/code editor;
- embedded native terminal surfaces powered by `libghostty`;
- structured agent sessions and activity;
- resizable panes and document/terminal tabs.

The terminal and agent workflow are primary product surfaces. The editor exists to inspect and make
focused changes without carrying the weight of a full IDE.

## Technology

- Tauri 2 desktop shell.
- React 19 + TypeScript + Vite.
- `@sito/ui` for shared UI primitives.
- CodeMirror 6 for the text editor.
- `@sito/plugin-workspace` + `tauri-plugin-sito-workspace` for filesystem/document access.
- Plain CSS with app-owned semantic tokens.
- pnpm is the package manager.

Validation is static unless the developer explicitly authorizes execution.

## Runtime composition

```text
src/main.tsx
  App
    useWorkspaceTree
    useDocuments
    Workbench
      Explorer
      EditorSurface
      AgentDashboard
      TerminalPanel
```

`App` is the composition root. Cross-feature orchestration stays there; features do not import one
another's internals.

## Native boundaries

Workspace access:

```text
Explorer / editor hook
  -> @sito/plugin-workspace
  -> plugin:sito-workspace command
  -> tauri-plugin-sito-workspace
  -> blocking filesystem worker
```

The workspace API lists, stats and reads UTF-8 text. Existing regular files can be saved through
atomic replacement when their content hash still matches the opened snapshot. Write access uses an
explicit non-default capability. File events, creation/deletion and workspace-root scopes are
separate milestones.

Terminal integration is not implemented by the workspace plugin. `libghostty`, PTY lifecycle,
focus/input, renderer hosting and terminal processes belong to a dedicated native terminal plugin.

Agent state must use a structured adapter API for status, permissions, file changes and lifecycle.
A visible terminal can be attached to the same run, but the dashboard must not infer state by
scraping terminal output.

## Frontend ownership

- `src/app`: composition root and app-level constants.
- `src/features/explorer`: workspace selection and lazy file tree.
- `src/features/editor`: open documents, tabs and CodeMirror host.
- `src/features/agents`: agent-session dashboard.
- `src/features/terminal`: native terminal surface host/chrome.
- `src/features/workbench`: pane composition and layout.
- `src/shared`: cross-feature services and genuinely generic helpers.
- `src/lang`: user-facing copy.
- `src/styles`: global tokens plus component/view styles.

## Task routing

| Request | Start here |
| --- | --- |
| Open folder, tree nodes, refresh | `src/features/explorer` |
| Open document, tabs, CodeMirror | `src/features/editor` |
| Agent runs/status/permissions | `src/features/agents` |
| Ghostty, PTY, terminal focus | `src/features/terminal` and the future terminal plugin |
| Pane layout and resizing | `src/features/workbench` |
| Native filesystem contract | `tauri-plugin-sito-workspace` sibling repository |
| Shared primitive | `@sito/ui` first |

## Explicit non-goals for the scaffold

- Markdown rendering or preview.
- LSP, debugger, extension marketplace or Git workbench.
- Fake terminal emulation in React.
- Parsing agent status from terminal presentation.
- Writing files before version conflicts and atomic replacement are implemented.
