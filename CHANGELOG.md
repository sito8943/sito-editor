# Changelog

All notable changes to this project are documented in this file.

## [0.2.0]

### Added

- Open from the terminal: `sito-editor .` opens the current folder, `sito-editor path/to/file` opens a file. If the editor is already running, the path opens in that window (`deb419e`)
- The editor remembers each workspace: its open tabs, the active tab and your recent files come back when you reopen it, and the last workspace opens on launch (`2e0f226`)
- Go to file (Cmd+P) lists your recent files first before you type (`2e0f226`)
- Drag tabs to reorder them, close a tab with a middle click, and switch tabs with Ctrl+Tab / Ctrl+Shift+Tab. The close button shows on the active tab and on hover, like VS Code (`1f71914`)
- Search in project (Cmd+Shift+F, or the box next to the path bar): finds text in every file of the workspace as you type, grouped by file with the line and the match highlighted. Match case and regular expressions are toggles; files ignored by `.gitignore` are left out. Opening a result jumps to its line with the match selected (`77f20b1`, `34940a4`)
- Path bar at the top: shows where the open file lives, from the workspace folder down (`193a9ba`)
- Go to file (Cmd+P, or click the path bar): type part of a name to find any file in the workspace; files ignored by `.gitignore` are left out. Clicking a folder in the path searches inside it (`193a9ba`)
- Back and forward between the files you opened, with the arrows or Ctrl+- / Ctrl+Shift+- (`193a9ba`, `23b5d98`)
- Open a folder with Cmd+O, or by clicking "Open a folder to start"; open a single file with Cmd+Shift+O (`4ce3094`)
- Syntax highlighting picked from the file name or extension, for about 100 languages (`aec81a1`)
- Find and replace in the open file (Cmd+F), next/previous match (Cmd+G / Cmd+Shift+G), go to line (Cmd+Alt+G), select next occurrence (Cmd+D) and highlighting of the selected text elsewhere in the file (`fbd99a0`)
- Line numbers and active-line highlight (`fbd99a0`)
- Development builds show uncaught errors on a full-screen overlay with Reload, and Close while the app still works (`28d4371`)

### Changed

- The "Open workspace" button is gone; opening a folder lives in the path bar and Cmd+O (`4ce3094`)

### Fixed

- The text caret and selection are clearly visible on the dark theme, and the mouse shows a text cursor over editable files (`809d5b0`)
- The app starts in development again: linked sibling packages now resolve `@tauri-apps/api` and React from the app (`87a1d12`)

## [0.1.0]

### Added

- Initial scaffold: workspace explorer, CodeMirror editor that saves files with conflict detection, resizable panes, agent dashboard and terminal placeholders
