# Sito Editor - Project Context

Last reviewed: 2026-07-24

## Product

Sito Editor is a lightweight agentic programming workbench:

- a lazy workspace file tree;
- a small text/code editor;
- an embedded terminal: a native PTY host rendered with xterm.js today, `libghostty` later;
- structured agent sessions and activity;
- resizable panes and document/terminal tabs.

The terminal and agent workflow are primary product surfaces. The editor exists to inspect and make
focused changes without carrying the weight of a full IDE.

## Technology

- Tauri 2 desktop shell.
- React 19 + TypeScript + Vite.
- `@sito/ui` for shared UI primitives.
- `@sito/commands` for command registration and scoped hotkeys.
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

Terminal integration is not implemented by the workspace plugin. The PTY host lives in
`src-tauri/src/terminal.rs` (`portable-pty`, the user's login shell) behind a narrow contract:
`terminal_spawn` streams output/exit events over a channel; `terminal_write`, `terminal_resize`
and `terminal_kill` drive the session. The webview renders it with xterm.js
(`src/features/terminal`). That renderer is interim: `libghostty` can replace it behind the same
contract, and the host can move to a dedicated terminal plugin.

Git is read-only and lives in `src-tauri/src/git.rs`: `git_branch` reads `.git/HEAD` directly;
`git_status` (changed files + HEAD commit) and `git_head_file` (a file at HEAD) run the system
`git` with `GIT_OPTIONAL_LOCKS=0`, only inside a repository. The app polls them
(`src/app/hooks/useGitStatus.ts`) for the Explorer colors and the editor change marks
(`CodeEditor/gitGutter.ts`, diffed with `@codemirror/merge`). No staging or commits: that stays a
non-goal.

Agent state must use a structured adapter API for status, permissions, file changes and lifecycle.
A visible terminal can be attached to the same run, but the dashboard must not infer state by
scraping terminal output.

## Frontend ownership

- `src/app`: composition root and app-level constants.
- `src/features/explorer`: workspace selection and lazy file tree.
- `src/features/editor`: open documents, tabs and CodeMirror host.
- `src/features/agents`: agent-session dashboard.
- `src/features/terminal`: terminal pane chrome and the xterm.js renderer.
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
| PTY, shell, terminal rendering/focus | `src-tauri/src/terminal.rs`, `src/features/terminal` |
| Pane layout and resizing | `src/features/workbench` |
| Native filesystem contract | `tauri-plugin-sito-workspace` sibling repository |
| Shared primitive | `@sito/ui` first |

## Explicit non-goals for the scaffold

- Markdown rendering or preview.
- LSP, debugger, extension marketplace or Git workbench (status colors and change marks only).
- Hand-rolled terminal emulation (use xterm.js now, `libghostty` later).
- Parsing agent status from terminal presentation.
- Writing files before version conflicts and atomic replacement are implemented.
