# Sito Editor

Lightweight agentic programming workbench built with Tauri and React.

The current scaffold establishes four independent surfaces:

- workspace Explorer;
- text/code editor;
- structured agent dashboard;
- native terminal host reserved for `libghostty`.

Filesystem access comes from the sibling `tauri-plugin-sito-workspace` project. The initial slice is
read-only while atomic saving, external-change conflicts and workspace permission scopes are
designed.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
