# Sito Editor - Agent Instructions

These instructions apply to the entire repository.

## Required context

Before analyzing or changing code:

1. Read `PROJECT_CONTEXT.md` completely.
2. Read `ARCHITECTURE_RULES.md` completely before any code change.
3. Start from the owner named in the task-routing table.
4. If the owner is not documented, tell the developer:
   `No conozco este proyecto lo estudio primero?`

## Execution policy

- Do not execute project scripts, builds, tests, lint, formatters, package installs, Cargo commands
  or development servers unless the developer explicitly authorizes that exact command.
- Static inspection, `git status`, `git diff` and `git diff --check` are allowed.
- Give the developer exact pnpm or Cargo commands when execution would be useful.
- Always distinguish static inspection from runtime verification.

## Existing work

- Ask before editing, staging, moving or building on any pre-existing Git change.
- Never discard or overwrite another person's changes.
- Keep patches narrow and do not commit unless explicitly requested.

## Product boundaries

- This is an agentic programming workbench with a lightweight text editor and file tree.
- It is not a Markdown editor and must not grow a rendered-preview architecture.
- Reuse `@sito/ui`, `@sito/plugin-workspace` and established Tauri plugins.
- Keep `libghostty` behind a native terminal contract; never simulate it with a fake terminal.
- Keep agent process protocols behind adapters instead of parsing terminal pixels or rendered text.
