# Sito Editor

Lightweight agentic programming workbench built with Tauri and React.

The current scaffold establishes four independent surfaces:

- workspace Explorer;
- text/code editor;
- structured agent dashboard;
- native terminal host (PTY) rendered with xterm.js or ghostty-web (beta).

Filesystem access comes from the sibling `tauri-plugin-sito-workspace` project. Existing UTF-8
documents can be edited and saved through atomic replacement with content-version conflict
detection. File creation/deletion, watching and workspace-root permission scopes remain separate
milestones.

## Install

```sh
brew install --cask sito8943/tap/sito-editor
```

This installs `Sito Editor.app` and puts the `sito-editor` launcher on your PATH. The `.dmg`s for
Apple Silicon and Intel are also attached to each [GitHub release](https://github.com/sito8943/sito-editor/releases).
The app is not signed: on first launch, right-click it in Applications and choose Open.

## Command line

Open a folder or file from the terminal (macOS). Homebrew installs the launcher; from a clone, link it
once:

```sh
ln -s "$PWD/scripts/sito-editor" /usr/local/bin/sito-editor   # without Homebrew
sito-editor .            # current folder
sito-editor src/main.ts  # a file; its folder becomes the workspace if none is open
```

If the editor is already running, the path opens in that window. Set `SITO_EDITOR_APP` when the
app is not in `/Applications`. In development: `pnpm tauri dev -- -- /absolute/path`.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
