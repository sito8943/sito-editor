# Sito Editor

Lightweight agentic programming workbench built with Tauri and React.

The current scaffold establishes four independent surfaces:

- workspace Explorer;
- text/code editor;
- structured agent dashboard;
- native terminal host reserved for `libghostty`.

Filesystem access comes from the sibling `tauri-plugin-sito-workspace` project. Existing UTF-8
documents can be edited and saved through atomic replacement with content-version conflict
detection. File creation/deletion, watching and workspace-root permission scopes remain separate
milestones.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
