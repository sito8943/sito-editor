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

Ordered by value for reading code and making focused edits. Effort: S small, M medium, L large.

| # | Item | Why | Effort | Notes |
|---|---|---|---|---|
| 1 | **Go to definition** | Jump from a symbol to where it is declared: the biggest gap left for reading code | M → L | See the plan below |
| 2 | Changes list + diff view | See which files you touched and review the diff before committing | M | `@codemirror/merge` (already a dependency); still no staging/commits |
| 3 | +/- line counts per changed file in the Explorer | Size of each change at a glance | S | `git diff --numstat` next to `git_status` |
| 4 | Split editor (two files side by side) | Compare or read two files at once | M | Second CodeMirror view in the editor area |
| 5 | Toggle panels: Explorer (Cmd+B), terminal (Cmd+J) | More room to read | S | Workbench state + hotkeys |
| 6 | Filter the Explorer by name | Narrow a big tree without leaving it | S | Cmd+P already covers opening by name |
| 7 | Light theme + follow system | Daylight reading | M | Tokens are already centralized in `theme.css` |
| 8 | Minimap | Overview of long files | S | `@replit/codemirror-minimap`; off by default |
| 9 | Accent bar on the active line | Easier to find the cursor | S | CSS only |
| 10 | Benchmark: large file + project search | Complete the comparison with VS Code | S | Needs Accessibility permission for keystrokes |

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

From reference designs, out of scope for this editor: AI chat panel (the Agents pane is a
separate track), debugger/breakpoints, Run button, collaboration avatars, publish flows, Git
branch switching/staging, Markdown preview.
