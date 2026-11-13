# Sito Editor - MVP

Defined: 2026-11-11

## Goal

Personal daily use: **read code and make focused edits**, lighter than VS Code.
The agent dashboard and the terminal stay in the product, but this MVP is about reading and editing.

## Already in place

- Lazy explorer (`list_directory`).
- Open and save UTF-8 files (`read_text_file` / `write_text_file`) with atomic replace and
  version-conflict detection.
- CodeMirror 6, with no language packages yet.

## Scope (in priority order)

| # | Feature | Approach | Effort |
|---|---------|----------|--------|
| 1 | Syntax highlighting | `@codemirror/lang-*` (ts/js, json, css, html, rust, md, python) picked by file extension, lazy-loaded | low |
| 2 | Quick open (Cmd+P) | Rust command listing files that respects `.gitignore` (`ignore` crate) + fuzzy matching in the front end | medium |
| 3 | Project search (Cmd+Shift+F) | Rust command using the ripgrep crates (`grep-searcher`, `grep-regex`) returning file/line/snippet; click opens the file at that line | medium |
| 4 | Find/replace in the file, go to line | `@codemirror/search` | low |
| 5 | Tabs + recent files | front-end state, persisted per workspace | low |
| 6 | Open from the terminal (`sito-editor .`) | Tauri CLI args / single-instance | low |

Done when items 1-3 work: the editor is usable day to day.

## Status

- [x] 1. Syntax highlighting: `CodeEditor/language.ts` (lazy `@codemirror/language-data`) +
  `HighlightStyle` with `--color-syntax-*` tokens. Verified at runtime 2026-11-11.
- [x] 2. Quick open: path bar (`features/navigation`) turns into a fuzzy search on Cmd+P, backed by
  `list_workspace_files` in the plugin. Also back/forward history and Cmd+O / Cmd+Shift+O.
  Verified at runtime 2026-11-11.
- [x] 3. Project search: "Search in project" box next to the path bar (Cmd+Shift+F, `features/search`),
  backed by `search_text` in the plugin; opens the match selected. Verified at runtime 2026-11-12.
- [x] 4. Find/replace, go to line: `@codemirror/search` + line numbers in `CodeEditor/constants.ts`. Verified at runtime 2026-11-11 (incl. high-contrast caret + I-beam pointer).
- [x] 5. Tabs + recent files: drag to reorder, middle-click close, Ctrl+Tab; open tabs, active tab and
  recent files remembered per workspace (localStorage), last workspace reopened on launch; recent
  files first in Cmd+P. Verified at runtime 2026-11-12.
- [x] 6. Open from the terminal: `scripts/sito-editor [path]` + `tauri-plugin-single-instance`; the
  path reaches the frontend via `get_launch_path` or the `sito-editor://open-path` event.
  Verified at runtime 2026-11-12.

## Reuse from `sito-file-browser`

Items 1, 3, 4 and 6 have nothing to reuse and must be built new.

| Need | Source in file-browser | Path |
|------|------------------------|------|
| Quick open | `fs.rs` `search_directory_core` (jwalk, name `contains`) | Reference only; rewrite in the plugin with the `ignore` crate |
| Tabs | `features/tabs/TabBar.tsx` (drag-reorder), `useTabsShortcuts` | Copy and adapt; new tab model (path, dirty, view state) |
| Recent files | `shared/search/recentSearches.ts` | Copy |
| Open from the terminal | `window.rs` `startPath` pattern | Copy the pattern; use `tauri-plugin-single-instance` instead of `sfb`/`control.rs` |
| File ops (create/rename/move/trash/delete) | `fs.rs` `*_core` + `trash` crate | Move into `tauri-plugin-sito-workspace` |
| File watching | `watcher.rs` (`notify`), debounce in `useDirectoryContents` | New `watch_workspace` in the plugin; copy the debounce |
| Open terminal | `functions/terminal.rs` | Copy into the plugin or editor Rust |
| Context menu, dialogs, toasts | `shared/components/patterns/*`, `useContextMenuState`, `ConfirmProvider` | Extract into `lib/ui` |
| Shortcuts | `shared/keymap/*`, `ShortcutsDialog` | Extract into `@sito/commands`; copy the dialog |
| Settings, i18n, typeahead | `settings/schema`, `src/lang`, `useTypeahead` | Copy the patterns |
| Usage tracking | `shared/usage/*` | Copy; later extract into `@sito/feature-usage` |

Not worth reusing: `index.rs` (a size cache), `remote/`, sftp/smb/archive/tags/tray, `api.ts`, the
file-name search filters, the DnD/marquee hooks.

## Out of scope

- LSP (go-to-definition moved to `ROADMAP.md`: a light heuristic first, an optional language
  server later).
- Debugger, extensions, Git workbench.
- Markdown preview (see `AGENTS.md`).
