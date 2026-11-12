# Sito Editor Architecture Rules

## 1. Feature ownership

- Organize product behavior under `src/features/<feature>`.
- Keep app wiring under `src/app`.
- Put code in `src/shared` only when it is used across features or is infrastructure.
- Features expose public APIs through `index.ts`.
- A feature must not import another feature's internals.

## 2. Data flow

- Hooks/providers own orchestration and asynchronous work.
- Components receive typed state and actions.
- UI leaves do not call Tauri directly.
- Native calls go through `@sito/plugin-workspace` or another explicit plugin binding.

## 3. UI

- Reuse `@sito/ui` before creating a new primitive.
- Product-specific compositions and layouts stay local.
- Use plain CSS and semantic tokens from `src/styles/theme.css`.
- Keep one stylesheet per meaningful component/view and scope selectors by root class.
- User-facing strings belong in `src/lang`.

## 4. Editor

- CodeMirror owns text editing; do not build a parallel textarea editor.
- Document state is keyed by resource path/URI.
- Keep source snapshot, draft, version and dirty state explicit once writes are enabled.
- Never overwrite a file whose version changed externally without a user-visible conflict flow.

## 5. Filesystem

- Blocking filesystem work runs outside Tauri's main/async executor thread.
- Commands return structured errors.
- Destructive operations require explicit plugin permissions and UI confirmation.
- Remote resources and local paths must not be hidden behind ambiguous string behavior.

## 6. Terminal and agents

- Keep PTY (and future `libghostty`) code out of the workspace plugin.
- The native terminal host (`src-tauri/src/terminal.rs`) owns the process, the PTY and its
  lifecycle; the webview only renders and forwards input and size through its contract.
- Rendering uses xterm.js for now; `libghostty` may replace it behind the same contract. Never
  write terminal emulation by hand.
- Agent integrations implement a typed adapter with structured events.
- Do not infer agent status by scraping terminal rendering.

## 7. Verification

- Static inspection is not runtime verification.
- Do not run scripts unless the developer authorizes the exact command.
- Report unexecuted build, lint, test and runtime checks explicitly.
