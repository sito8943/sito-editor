//! Agent events, structured: Claude Code hooks drop each event into a folder this app owns, and
//! the webview collects them. Nothing is read from the terminal screen.
//!
//! - Every terminal exports `SITO_AGENT_EVENTS` (that folder) and `SITO_TERMINAL_ID`.
//! - `scripts/agent-hook` (installed to `~/.sito-editor/bin/agent-hook`) writes
//!   `{"terminal": "<id>", "event": <hook JSON>}` there, and does nothing outside our terminals.
//! - "Connect Claude Code" adds that hook to `~/.claude/settings.json` (backup first), and
//!   "Disconnect" removes only ours.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::{json, Map, Value};

/// The hook script, bundled into the binary and copied out on connect.
const HOOK_SCRIPT: &str = include_str!("../../scripts/agent-hook");

/// Claude Code events we listen to. Tool events take a matcher; the others do not.
const HOOK_EVENTS: [(&str, bool); 8] = [
    ("SessionStart", false),
    ("UserPromptSubmit", false),
    ("PreToolUse", true),
    ("PostToolUse", true),
    ("PermissionRequest", true),
    ("Notification", false),
    ("Stop", false),
    ("SessionEnd", false),
];

/// Seconds Claude Code gives the hook; it runs async, so it never waits for it anyway.
const HOOK_TIMEOUT_S: u64 = 10;

/// The folder this app instance reads agent events from.
pub struct AgentHub {
    pub events_dir: PathBuf,
}

impl Default for AgentHub {
    fn default() -> Self {
        let events_dir = std::env::temp_dir()
            .join(format!("sito-editor-{}", std::process::id()))
            .join("agent-events");
        let _ = fs::create_dir_all(&events_dir);
        Self { events_dir }
    }
}

/// One event as the hook wrote it.
#[derive(Debug, Serialize, PartialEq)]
pub struct AgentEvent {
    /// Native terminal id the agent runs in, when it runs in one of ours.
    terminal: Option<u32>,
    /// The Claude Code hook input, as is.
    event: Value,
}

fn parse_event(text: &str) -> Option<AgentEvent> {
    let mut value: Value = serde_json::from_str(text).ok()?;
    let event = value.get_mut("event")?.take();
    if !event.is_object() {
        return None;
    }
    let terminal = value
        .get("terminal")
        .and_then(Value::as_str)
        .and_then(|id| id.parse().ok());
    Some(AgentEvent { terminal, event })
}

/// Reads and removes the waiting events, oldest first. Broken files are dropped.
fn drain_events(dir: &Path) -> Vec<AgentEvent> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };
    let mut files: Vec<(SystemTime, PathBuf)> = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension().is_some_and(|extension| extension == "json")
                && !path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with('.'))
        })
        .map(|path| {
            let modified = fs::metadata(&path)
                .and_then(|metadata| metadata.modified())
                .unwrap_or(UNIX_EPOCH);
            (modified, path)
        })
        .collect();
    files.sort();
    files
        .into_iter()
        .filter_map(|(_, path)| {
            let text = fs::read_to_string(&path).ok();
            let _ = fs::remove_file(&path);
            text.as_deref().and_then(parse_event)
        })
        .collect()
}

/// Agent events since the last call (the webview polls this).
#[tauri::command]
pub async fn agent_events(hub: tauri::State<'_, AgentHub>) -> Result<Vec<AgentEvent>, String> {
    let dir = hub.events_dir.clone();
    tauri::async_runtime::spawn_blocking(move || drain_events(&dir))
        .await
        .map_err(|error| error.to_string())
}

fn home() -> Result<PathBuf, String> {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "HOME is not set".to_string())
}

fn hook_path(home: &Path) -> PathBuf {
    home.join(".sito-editor/bin/agent-hook")
}

fn settings_path(home: &Path) -> PathBuf {
    home.join(".claude/settings.json")
}

/// True when a hook group runs our script.
fn is_ours(group: &Value, hook: &str) -> bool {
    group
        .get("hooks")
        .and_then(Value::as_array)
        .is_some_and(|hooks| {
            hooks.iter().any(|entry| {
                entry.get("command").and_then(Value::as_str) == Some(hook)
            })
        })
}

/// Removes our hook groups; drops event lists and the `hooks` key left empty.
fn without_ours(settings: &mut Map<String, Value>, hook: &str) {
    let Some(hooks) = settings.get_mut("hooks").and_then(Value::as_object_mut) else {
        return;
    };
    for groups in hooks.values_mut() {
        if let Some(list) = groups.as_array_mut() {
            list.retain(|group| !is_ours(group, hook));
        }
    }
    hooks.retain(|_, groups| groups.as_array().is_none_or(|list| !list.is_empty()));
    if hooks.is_empty() {
        settings.remove("hooks");
    }
}

/// Adds our hook to every event we listen to, replacing any older copy of it.
fn with_ours(settings: &mut Map<String, Value>, hook: &str) {
    without_ours(settings, hook);
    let hooks = settings
        .entry("hooks")
        .or_insert_with(|| Value::Object(Map::new()));
    if !hooks.is_object() {
        *hooks = Value::Object(Map::new());
    }
    let hooks = hooks.as_object_mut().expect("hooks is an object");
    for (event, takes_matcher) in HOOK_EVENTS {
        let command = json!({
            "type": "command",
            "command": hook,
            "async": true,
            "timeout": HOOK_TIMEOUT_S,
        });
        let group = if takes_matcher {
            json!({ "matcher": "*", "hooks": [command] })
        } else {
            json!({ "hooks": [command] })
        };
        let list = hooks
            .entry(event)
            .or_insert_with(|| Value::Array(Vec::new()));
        if let Some(list) = list.as_array_mut() {
            list.push(group);
        } else {
            *list = Value::Array(vec![group]);
        }
    }
}

fn is_connected(settings: &Map<String, Value>, hook: &str) -> bool {
    let Some(hooks) = settings.get("hooks").and_then(Value::as_object) else {
        return false;
    };
    HOOK_EVENTS.iter().all(|(event, _)| {
        hooks
            .get(*event)
            .and_then(Value::as_array)
            .is_some_and(|groups| groups.iter().any(|group| is_ours(group, hook)))
    })
}

fn read_settings(path: &Path) -> Result<Map<String, Value>, String> {
    match fs::read_to_string(path) {
        Ok(text) if text.trim().is_empty() => Ok(Map::new()),
        Ok(text) => match serde_json::from_str::<Value>(&text) {
            Ok(Value::Object(map)) => Ok(map),
            _ => Err(format!("{} is not a JSON object; left untouched", path.display())),
        },
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(Map::new()),
        Err(error) => Err(error.to_string()),
    }
}

/// Backs up the current file, then replaces it atomically.
fn write_settings(path: &Path, settings: &Map<String, Value>) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    if path.exists() {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|elapsed| elapsed.as_secs())
            .unwrap_or(0);
        let backup = path.with_extension(format!("json.sito-editor-backup-{stamp}"));
        fs::copy(path, backup).map_err(|error| error.to_string())?;
    }
    let mut text = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    text.push('\n');
    let temporary = path.with_extension("json.sito-editor-tmp");
    fs::write(&temporary, text).map_err(|error| error.to_string())?;
    fs::rename(&temporary, path).map_err(|error| error.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeConnection {
    connected: bool,
    settings_path: String,
}

fn connection(home: &Path) -> Result<ClaudeConnection, String> {
    let settings = settings_path(home);
    let hook = hook_path(home);
    let connected = hook.exists()
        && is_connected(&read_settings(&settings)?, &hook.to_string_lossy());
    Ok(ClaudeConnection {
        connected,
        settings_path: settings.to_string_lossy().into_owned(),
    })
}

/// Whether our hooks are in `~/.claude/settings.json`.
#[tauri::command]
pub fn claude_connection() -> Result<ClaudeConnection, String> {
    connection(&home()?)
}

fn connect(home: &Path) -> Result<ClaudeConnection, String> {
    let hook = hook_path(home);
    if let Some(parent) = hook.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&hook, HOOK_SCRIPT).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&hook, fs::Permissions::from_mode(0o755))
            .map_err(|error| error.to_string())?;
    }
    let path = settings_path(home);
    let mut settings = read_settings(&path)?;
    with_ours(&mut settings, &hook.to_string_lossy());
    write_settings(&path, &settings)?;
    connection(home)
}

/// Installs the hook script and adds it to Claude Code's user settings.
#[tauri::command]
pub fn connect_claude() -> Result<ClaudeConnection, String> {
    connect(&home()?)
}

fn disconnect(home: &Path) -> Result<ClaudeConnection, String> {
    let path = settings_path(home);
    let mut settings = read_settings(&path)?;
    let hook = hook_path(home);
    if is_connected(&settings, &hook.to_string_lossy())
        || settings.get("hooks").is_some_and(|hooks| hooks.to_string().contains(".sito-editor/bin/agent-hook"))
    {
        without_ours(&mut settings, &hook.to_string_lossy());
        write_settings(&path, &settings)?;
    }
    connection(home)
}

/// Removes our hooks from Claude Code's settings (the rest is left as it was).
#[tauri::command]
pub fn disconnect_claude() -> Result<ClaudeConnection, String> {
    disconnect(&home()?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_hook_files() {
        let event = parse_event(r#"{"terminal":"4","event":{"hook_event_name":"Stop"}}"#);
        assert_eq!(
            event,
            Some(AgentEvent {
                terminal: Some(4),
                event: json!({ "hook_event_name": "Stop" }),
            }),
        );
        let outside = parse_event(r#"{"terminal":"","event":{"hook_event_name":"Stop"}}"#);
        assert_eq!(outside.map(|event| event.terminal), Some(None));
        assert_eq!(parse_event(r#"{"terminal":"4","event":}"#), None);
    }

    #[test]
    fn drains_events_oldest_first() {
        let dir = tempfile::tempdir().expect("creates a temporary directory");
        fs::write(dir.path().join("a.json"), r#"{"terminal":"1","event":{"n":1}}"#).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(20));
        fs::write(dir.path().join("b.json"), r#"{"terminal":"1","event":{"n":2}}"#).unwrap();
        fs::write(dir.path().join(".event.tmp"), "partial").unwrap();
        fs::write(dir.path().join("broken.json"), "{").unwrap();
        let events = drain_events(dir.path());
        let numbers: Vec<_> = events.iter().map(|event| event.event["n"].clone()).collect();
        assert_eq!(numbers, vec![json!(1), json!(2)]);
        assert!(!dir.path().join("a.json").exists());
        assert!(!dir.path().join("broken.json").exists());
        assert!(dir.path().join(".event.tmp").exists(), "files still being written stay");
    }

    #[test]
    fn connects_and_disconnects_without_touching_other_settings() {
        let home = tempfile::tempdir().expect("creates a temporary directory");
        let settings = settings_path(home.path());
        fs::create_dir_all(settings.parent().unwrap()).unwrap();
        fs::write(
            &settings,
            r#"{"model":"opus","hooks":{"Stop":[{"hooks":[{"type":"command","command":"say done"}]}]}}"#,
        )
        .unwrap();

        assert!(connect(home.path()).unwrap().connected);
        let after: Value = serde_json::from_str(&fs::read_to_string(&settings).unwrap()).unwrap();
        assert_eq!(after["model"], "opus");
        assert_eq!(after["hooks"]["Stop"].as_array().unwrap().len(), 2);
        assert_eq!(after["hooks"]["Stop"][0]["hooks"][0]["command"], "say done");
        assert_eq!(after["hooks"]["PreToolUse"][0]["matcher"], "*");
        assert!(hook_path(home.path()).exists());

        // Connecting twice does not duplicate.
        connect(home.path()).unwrap();
        let again: Value = serde_json::from_str(&fs::read_to_string(&settings).unwrap()).unwrap();
        assert_eq!(again["hooks"]["Stop"].as_array().unwrap().len(), 2);

        assert!(!disconnect(home.path()).unwrap().connected);
        let back: Value = serde_json::from_str(&fs::read_to_string(&settings).unwrap()).unwrap();
        assert_eq!(
            back,
            json!({"model":"opus","hooks":{"Stop":[{"hooks":[{"type":"command","command":"say done"}]}]}}),
        );
    }

    #[test]
    fn refuses_to_rewrite_settings_that_are_not_json() {
        let home = tempfile::tempdir().expect("creates a temporary directory");
        let settings = settings_path(home.path());
        fs::create_dir_all(settings.parent().unwrap()).unwrap();
        fs::write(&settings, "{ not json").unwrap();
        assert!(connect(home.path()).is_err());
        assert_eq!(fs::read_to_string(&settings).unwrap(), "{ not json");
    }
}
