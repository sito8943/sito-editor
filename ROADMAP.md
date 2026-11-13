# Sito Editor - Roadmap

Updated: 2026-11-13. Goal unchanged (see `MVP.md`): **read code and make focused edits**, lighter
than VS Code. Every item is QA'd by hand in `pnpm tauri dev` before it is committed.

## Shipped

| Version | What |
|---|---|
| 0.2.0 | MVP: highlighting, Cmd+P, project search, find/replace, tabs + recents, `sito-editor <path>` |
| 0.3.x | File operations, disk watcher, drag-to-move, anonymous usage, DMG + Homebrew cask |
| 0.4.x | Terminal (native PTY + xterm.js), status bar, file icons, tooltips |
| 0.5.0 | Read-only Git: gutter change marks, Explorer colors and letters |
| 0.6.0 | Settings: text size per area, word wrap, tab width |
| 0.7.x | Ghostty terminal engine (beta, ghostty-web) |

Benchmark (`scripts/bench.sh`, `BENCHMARK.md`): 5-12x less memory than VS Code, similar launch.

## Next

The editor is an agentic workbench (see `PROJECT_CONTEXT.md`): agents run in the terminals and the
Agents pane is their control tower, fed by structured events, never by reading the screen.
Effort: S small, M medium, L large.

### Agents and terminals (first)

| Phase | What | Effort |
|---|---|---|
| A | **Terminal status**: each tab shows what runs in the foreground (idle shell, `npm run dev`, `claude`, `vim`) from the native pty (foreground process group), a busy indicator, elapsed time, and a badge + notification when a long command or a bell happens in a tab you are not looking at | S-M |
| B | **Claude Code adapter** via its hooks: our terminals export `SITO_TERMINAL_ID`, a hook sends each event (prompt, tool + files, permission request, stop) to the editor. The Agents pane lists sessions with status (working / needs permission / waiting / done), current tool, touched files (open, diff), elapsed time and "go to terminal"; native notification when an agent needs you. "Connect Claude Code" installs the hooks with consent | M |
| C | **Actions and more agents**: start an agent from the pane (new terminal running it), Codex adapter (`notify`). Permission answers stay in the terminal (the pane jumps there) | M-L |

### Reading and editing

| # | Item | Why | Effort | Notes |
|---|---|---|---|---|
| 1 | Changes list + diff view | See which files you touched and review the diff before committing | M | `@codemirror/merge` (already a dependency); still no staging/commits |
| 2 | +/- line counts per changed file in the Explorer | Size of each change at a glance | S | `git diff --numstat` next to `git_status` |
| 3 | Toggle panels: Explorer (Cmd+B), terminal (Cmd+J) | More room to read | S | Workbench state + hotkeys |
| 4 | Split editor (two files side by side) | Compare or read two files at once | M | Second CodeMirror view in the editor area |
| 5 | Filter the Explorer by name | Narrow a big tree without leaving it | S | Cmd+P already covers opening by name |
| 6 | Light theme + follow system | Daylight reading | M | Tokens are already centralized in `theme.css` |
| 7 | Minimap | Overview of long files | S | `@replit/codemirror-minimap`; off by default |
| 8 | Accent bar on the active line | Easier to find the cursor | S | CSS only |
| 9 | Benchmark: large file + project search | Complete the comparison with VS Code | S | Needs Accessibility permission for keystrokes |
| 10 | **Go to definition** (last, it is the largest) | Jump from a symbol to its declaration | M → L | See the plan below |

### Go to definition (plan)

Keep the editor light: no language server running all the time.

1. **Heuristic, every language (M).** Cmd+click / F12 on a word searches the workspace for its
   declaration with the existing search engine (`search_text`, ripgrep crates): patterns such as
   `function X`, `const X`, `class X`, `type X`, `interface X`, `fn X`, `struct X`, `def X`,
   plus `export { X }` and import paths. One hit opens it; several open a picker (like Cmd+P).
   Imports (`from "./x"`) jump to the file. No new processes, no memory cost.
2. **Optional language server (L), later.** For TS/JS (typescript-language-server) and Rust
   (rust-analyzer), started on demand for the open project only, off by default, stopped when
   idle. Gives exact results, hover types and "find references", at VS Code-like memory cost
   while it runs. Decide after living with step 1.

## Not planned

From reference designs, out of scope for this editor: a chat-with-a-model panel (agents run in
the terminals; the Agents pane watches them), debugger/breakpoints, Run button, collaboration avatars, publish flows, Git
branch switching/staging, Markdown preview.
