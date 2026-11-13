#!/usr/bin/env bash
# Rough performance comparison: Sito Editor vs VS Code on the same project.
#
#   scripts/bench.sh [project-folder] [runs]
#
# For each app it measures, per run: launch → first window (ms), memory once
# settled (all of the app's processes, physical footprint like Activity
# Monitor), idle CPU over a quiet window, and memory after opening 10 files.
# VS Code runs twice: a clean profile with no extensions (like for like) and
# your own profile (as you use it; it may restore other windows).
#
# Quit both apps before running. Nothing is clicked or typed: files are opened
# with each app's CLI. Results go to stdout and a Markdown file.
set -euo pipefail

PROJECT="${1:-$HOME/Documents/sito-app/tauri-utilities/sito-file-browser}"
RUNS="${2:-3}"
SETTLE_S=8      # wait after the window appears before measuring
IDLE_S=20       # idle CPU sampling window
FILES_SETTLE_S=5

SITO_APP="/Applications/Sito Editor.app"
SITO_CLI="$SITO_APP/Contents/Resources/sito-editor"
CODE_APP="/Applications/Visual Studio Code.app"
CODE_CLI="$CODE_APP/Contents/Resources/app/bin/code"

STAMP="$(date +%Y%m%d-%H%M)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/sito-bench.XXXXXX")"
OUT="${OUT:-$WORK/../sito-bench-$STAMP.md}"
trap 'rm -rf "$WORK"' EXIT

die() { echo "bench: $*" >&2; exit 1; }
[ -d "$PROJECT" ] || die "no such folder: $PROJECT"
[ -d "$SITO_APP" ] || die "Sito Editor not installed"
[ -d "$CODE_APP" ] || die "VS Code not installed"
pgrep -f "$SITO_APP/Contents/MacOS" >/dev/null && die "quit Sito Editor first"
pgrep -f "$CODE_APP/Contents/MacOS" >/dev/null && die "quit VS Code first"

# Ten tracked source files to open.
FILES=()
while IFS= read -r file; do FILES+=("$PROJECT/$file"); done < <(
  git -C "$PROJECT" ls-files '*.ts' '*.tsx' '*.rs' '*.css' | head -n 10
)
[ "${#FILES[@]}" -gt 0 ] || die "no source files found in $PROJECT"

# --- helpers ---------------------------------------------------------------

# Runs a launch command, then polls on-screen windows for the owner name.
# Prints the milliseconds until the first normal window appears.
launch_ms() { # owner, command...
  local owner="$1"; shift
  osascript -l JavaScript - "$owner" "$*" <<'JXA'
ObjC.import("CoreGraphics");
function run(argv) {
  const owner = argv[0];
  const app = Application.currentApplication();
  app.includeStandardAdditions = true;
  const hasWindow = () => {
    const list = ObjC.castRefToObject(
      $.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly, 0));
    for (let i = 0; i < list.count; i++) {
      const w = list.objectAtIndex(i);
      if (ObjC.unwrap(w.objectForKey("kCGWindowOwnerName")) === owner &&
          ObjC.unwrap(w.objectForKey("kCGWindowLayer")) === 0) return true;
    }
    return false;
  };
  const start = Date.now();
  app.doShellScript(argv[1] + " >/dev/null 2>&1 &");
  while (!hasWindow()) {
    if (Date.now() - start > 60000) return "timeout";
    delay(0.02);
  }
  return String(Date.now() - start);
}
JXA
}

# A pid and all its descendants.
with_descendants() {
  local pid
  for pid in "$@"; do
    echo "$pid"
    with_descendants $(pgrep -P "$pid" || true)
  done
}

webkit_pids() { pgrep -f "com.apple.WebKit" || true; }

# Physical footprint (MB) summed over the given pids.
footprint_mb() {
  [ "$#" -gt 0 ] || { echo 0; return; }
  local args=() pid
  for pid in "$@"; do args+=(-p "$pid"); done
  footprint -f bytes "${args[@]}" 2>/dev/null |
    awk '/Footprint:/ { for (i = 1; i <= NF; i++) if ($i == "Footprint:") sum += $(i + 1) }
         END { printf "%.0f", sum / 1048576 }'
}

# Total CPU seconds used so far by the given pids.
cpu_seconds() {
  [ "$#" -gt 0 ] || { echo 0; return; }
  ps -o time= -p "$(IFS=,; echo "$*")" 2>/dev/null |
    awk '{ n = split($1, p, ":"); s = 0; for (i = 1; i <= n; i++) s = s * 60 + p[i]; t += s }
         END { printf "%.2f", t }'
}

idle_cpu_pct() { # pids...
  local before after
  before="$(cpu_seconds "$@")"
  sleep "$IDLE_S"
  after="$(cpu_seconds "$@")"
  awk -v a="$before" -v b="$after" -v s="$IDLE_S" 'BEGIN { printf "%.1f", (b - a) / s * 100 }'
}

wait_gone() { # pattern
  local i
  for i in $(seq 1 100); do pgrep -f "$1" >/dev/null || return 0; sleep 0.2; done
  pkill -f "$1" || true
}

median() { sort -n | awk '{ v[NR] = $1 } END { print (NR % 2) ? v[(NR + 1) / 2] : (v[NR / 2] + v[NR / 2 + 1]) / 2 }'; }

# --- one run per app variant ------------------------------------------------

# Prints: startup_ms mem_mb cpu_pct mem10_mb processes
run_sito() {
  local before after main pids ms mem cpu mem10 file
  before="$(webkit_pids)"
  ms="$(launch_ms "Sito Editor" "open -a \"$SITO_APP\" --args \"$PROJECT\"")"
  sleep "$SETTLE_S"
  main="$(pgrep -f "$SITO_APP/Contents/MacOS" | head -n 1)"
  # WebKit runs the page in XPC processes that are not our children: count
  # the ones that appeared with the app.
  after="$(comm -13 <(echo "$before" | sort) <(webkit_pids | sort))"
  pids=($(with_descendants "$main") $after)
  mem="$(footprint_mb "${pids[@]}")"
  cpu="$(idle_cpu_pct "${pids[@]}")"
  for file in "${FILES[@]}"; do "$SITO_CLI" "$file"; sleep 0.3; done
  sleep "$FILES_SETTLE_S"
  pids=($(with_descendants "$main") $after)
  mem10="$(footprint_mb "${pids[@]}")"
  echo "$ms $mem $cpu $mem10 ${#pids[@]}"
  osascript -e 'quit app "Sito Editor"' >/dev/null 2>&1 || true
  wait_gone "$SITO_APP/Contents/MacOS"
  sleep 2
}

run_code() { # extra CLI flags...
  local flags="$*" pids ms mem cpu mem10 file
  ms="$(launch_ms "Code" "open -na \"$CODE_APP\" --args $flags \"$PROJECT\"")"
  sleep "$SETTLE_S"
  pids=($(pgrep -f "$CODE_APP" || true))
  pids=($(with_descendants "${pids[@]}" | sort -u))
  mem="$(footprint_mb "${pids[@]}")"
  cpu="$(idle_cpu_pct "${pids[@]}")"
  for file in "${FILES[@]}"; do "$CODE_CLI" $flags -r "$file"; done
  sleep "$FILES_SETTLE_S"
  pids=($(pgrep -f "$CODE_APP" || true))
  pids=($(with_descendants "${pids[@]}" | sort -u))
  mem10="$(footprint_mb "${pids[@]}")"
  echo "$ms $mem $cpu $mem10 ${#pids[@]}"
  osascript -e 'quit app "Visual Studio Code"' >/dev/null 2>&1 || true
  wait_gone "$CODE_APP/Contents/MacOS"
  sleep 2
}

# --- main --------------------------------------------------------------------

CLEAN="--user-data-dir $WORK/code-data --extensions-dir $WORK/code-ext --disable-workspace-trust --skip-welcome --skip-release-notes"

declare -a VARIANTS=("Sito Editor" "VS Code (clean, no extensions)" "VS Code (your profile)")
RESULTS="$WORK/results"
: >"$RESULTS"

for run in $(seq 1 "$RUNS"); do
  echo "run $run/$RUNS: Sito Editor" >&2
  echo "0 $(run_sito)" >>"$RESULTS"
  echo "run $run/$RUNS: VS Code clean" >&2
  echo "1 $(run_code $CLEAN)" >>"$RESULTS"
  echo "run $run/$RUNS: VS Code (your profile)" >&2
  echo "2 $(run_code)" >>"$RESULTS"
done

col() { # variant column
  awk -v v="$1" -v c="$2" '$1 == v { print $(c + 1) }' "$RESULTS" | median
}

{
  echo "# Sito Editor vs VS Code"
  echo
  echo "- Date: $(date '+%Y-%m-%d %H:%M')"
  echo "- Machine: $(sysctl -n machdep.cpu.brand_string), $(( $(sysctl -n hw.memsize) / 1073741824 )) GB, macOS $(sw_vers -productVersion)"
  echo "- Sito Editor $(defaults read "$SITO_APP/Contents/Info" CFBundleShortVersionString), VS Code $(defaults read "$CODE_APP/Contents/Info" CFBundleShortVersionString)"
  echo "- Project: \`$PROJECT\` ($(git -C "$PROJECT" ls-files | wc -l | tr -d ' ') tracked files); median of $RUNS runs"
  echo
  echo "| | Sito Editor | VS Code (clean) | VS Code (your profile) |"
  echo "|---|---|---|---|"
  echo "| App size | $(du -sh "$SITO_APP" | cut -f1) | $(du -sh "$CODE_APP" | cut -f1) | same |"
  echo "| Launch → window (ms) | $(col 0 1) | $(col 1 1) | $(col 2 1) |"
  echo "| Memory, project open (MB) | $(col 0 2) | $(col 1 2) | $(col 2 2) |"
  echo "| Idle CPU over ${IDLE_S} s (%) | $(col 0 3) | $(col 1 3) | $(col 2 3) |"
  echo "| Memory, 10 files open (MB) | $(col 0 4) | $(col 1 4) | $(col 2 4) |"
  echo "| Processes | $(col 0 5) | $(col 1 5) | $(col 2 5) |"
  echo
  echo "Memory is the physical footprint summed over every process of the app (Sito"
  echo "Editor: app, its shell and its WebKit processes; VS Code: all Electron helpers)."
  echo "Sito Editor opens a terminal (login shell) by default, which is included."
} | tee "$OUT"

echo >&2
echo "saved: $(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")" >&2
