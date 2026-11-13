# Sito Editor vs VS Code

- Date: 2026-11-13 11:16
- Machine: Apple M4, 16 GB, macOS 15.8.1
- Sito Editor 0.7.1, VS Code 1.133.0
- Project: `sito-file-browser` (918 tracked files); median of 3 runs

| | Sito Editor | VS Code (clean) | VS Code (your profile) |
|---|---|---|---|
| App size |  14M | 1.5G | same |
| Launch → window (ms) | 1338 | 7256 | 1237 |
| Memory, project open (MB) | 452 | 2599 | 3372 |
| Idle CPU over 20 s (%) | 4.3 | 14.0 | 72.8 |
| Memory, 10 files open (MB) | 546 | 2249 | 6921 |
| Processes | 5 | 12 | 36 |

Memory is the physical footprint summed over every process of the app (Sito
Editor: app, its shell and its WebKit processes; VS Code: all Electron helpers).
Sito Editor opens a terminal (login shell) by default, which is included.

Run it again with `scripts/bench.sh [project] [runs]` (quit both apps first; ~7 min).
