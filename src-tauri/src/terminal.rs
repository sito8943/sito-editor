//! Native terminal host: one pseudo-terminal per session, running the user's login shell.
//!
//! The webview only renders (xterm.js today, libghostty later). It talks to this module through
//! a narrow contract: `terminal_spawn` streams [`TerminalEvent`]s over a channel, and
//! `terminal_write` / `terminal_resize` / `terminal_kill` drive the session. Kept in its own
//! module (not the workspace plugin) so it can move to a dedicated terminal plugin later.

use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::ipc::Channel;

/// Bytes read from the pty per chunk.
const READ_CHUNK: usize = 16 * 1024;

/// Streamed to the webview for one session.
#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TerminalEvent {
    /// Shell output, already decoded as UTF-8 (never splits a character).
    Output { data: String },
    /// The shell exited; `code` is None when it was killed by a signal.
    Exit { code: Option<u32> },
}

struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
    /// The login shell; when it owns the foreground the terminal is idle.
    shell_pid: Option<u32>,
}

/// What a session is running, for the tab and the Agents pane.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalStatus {
    id: u32,
    /// The foreground program, short (`npm run dev`, `claude`, `vim README.md`); None at the prompt.
    command: Option<String>,
    /// The full foreground command line, for a tooltip.
    detail: Option<String>,
    /// CPU time used so far by the foreground process group, in ms. Its growth between two reads
    /// tells working (a build, an agent thinking) from waiting for input (vim, an idle agent).
    cpu_ms: Option<u64>,
}

/// Live sessions by id.
#[derive(Default)]
pub struct TerminalRegistry {
    next_id: AtomicU32,
    sessions: Arc<Mutex<HashMap<u32, Session>>>,
}

fn size(cols: u16, rows: u16) -> PtySize {
    PtySize {
        rows: rows.max(1),
        cols: cols.max(1),
        pixel_width: 0,
        pixel_height: 0,
    }
}

/// The user's shell (`$SHELL`), falling back to zsh (macOS) or sh.
fn user_shell() -> String {
    std::env::var("SHELL")
        .ok()
        .filter(|shell| !shell.is_empty())
        .unwrap_or_else(|| {
            if cfg!(target_os = "macos") {
                "/bin/zsh".to_string()
            } else {
                "/bin/sh".to_string()
            }
        })
}

/// Decodes a byte stream as UTF-8 across chunk boundaries: an incomplete trailing sequence is
/// kept for the next chunk; truly invalid bytes become U+FFFD.
#[derive(Default)]
struct Utf8Stream {
    pending: Vec<u8>,
}

impl Utf8Stream {
    fn push(&mut self, bytes: &[u8]) -> String {
        self.pending.extend_from_slice(bytes);
        let mut output = String::new();
        loop {
            match std::str::from_utf8(&self.pending) {
                Ok(text) => {
                    output.push_str(text);
                    self.pending.clear();
                    return output;
                }
                Err(error) => {
                    let valid = error.valid_up_to();
                    // The first `valid` bytes were just validated.
                    output.push_str(std::str::from_utf8(&self.pending[..valid]).unwrap_or(""));
                    match error.error_len() {
                        // Incomplete sequence at the end: wait for more bytes.
                        None => {
                            self.pending.drain(..valid);
                            return output;
                        }
                        Some(length) => {
                            output.push('\u{FFFD}');
                            self.pending.drain(..valid + length);
                        }
                    }
                }
            }
        }
    }
}

/// Starts a login shell in `cwd` and streams its output. Returns the session id.
#[tauri::command]
pub async fn terminal_spawn(
    registry: tauri::State<'_, TerminalRegistry>,
    agents: tauri::State<'_, crate::agents::AgentHub>,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
    on_event: Channel<TerminalEvent>,
) -> Result<u32, String> {
    let pair = native_pty_system()
        .openpty(size(cols, rows))
        .map_err(|error| error.to_string())?;

    let mut command = CommandBuilder::new(user_shell());
    command.arg("-l");
    if let Some(directory) = cwd.filter(|directory| std::path::Path::new(directory).is_dir()) {
        command.cwd(directory);
    } else if let Some(home) = std::env::var_os("HOME") {
        command.cwd(home);
    }
    command.env("TERM", "xterm-256color");
    command.env("COLORTERM", "truecolor");
    command.env("TERM_PROGRAM", "SitoEditor");
    // Lets tools started here (agent hooks) say which terminal they run in.
    let id = registry.next_id.fetch_add(1, Ordering::Relaxed) + 1;
    command.env("SITO_TERMINAL_ID", id.to_string());
    // Where agent hooks drop their events (see agents.rs).
    command.env("SITO_AGENT_EVENTS", &agents.events_dir);

    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| error.to_string())?;
    let shell_pid = child.process_id();
    // The child holds its own handle to the slave side.
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| error.to_string())?;
    let writer = pair.master.take_writer().map_err(|error| error.to_string())?;

    registry
        .sessions
        .lock()
        .map_err(|error| error.to_string())?
        .insert(
            id,
            Session {
                master: pair.master,
                writer,
                child,
                shell_pid,
            },
        );

    // Blocking reads on a plain thread; EOF means the shell is gone.
    let sessions = Arc::clone(&registry.sessions);
    std::thread::spawn(move || {
        let mut decoder = Utf8Stream::default();
        let mut buffer = vec![0u8; READ_CHUNK];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(read) => {
                    let data = decoder.push(&buffer[..read]);
                    if !data.is_empty() && on_event.send(TerminalEvent::Output { data }).is_err() {
                        break;
                    }
                }
            }
        }
        let session = sessions.lock().ok().and_then(|mut map| map.remove(&id));
        let code = session
            .and_then(|mut session| session.child.wait().ok())
            .map(|status| status.exit_code());
        let _ = on_event.send(TerminalEvent::Exit { code });
    });

    Ok(id)
}

/// Interpreters whose script name says more than their own (`node …/claude` → `claude`).
const INTERPRETERS: [&str; 8] = [
    "node", "bun", "deno", "python", "python3", "ruby", "perl", "php",
];

fn file_name(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or(path)
}

/// Short, readable form of a command line: the program without its path (the script instead of
/// the interpreter running it) and its words up to the first flag: `node …/claude --settings x`
/// → `claude`, `/usr/local/bin/npm run dev` → `npm run dev`.
fn display_command(args: &str) -> Option<String> {
    let mut words: Vec<&str> = args.split_whitespace().collect();
    if words.is_empty() {
        return None;
    }
    let program = file_name(words[0]).trim_start_matches('-');
    if INTERPRETERS.contains(&program) && words.len() > 1 && !words[1].starts_with('-') {
        words.remove(0);
    }
    let mut shown = vec![file_name(words[0]).trim_start_matches('-').to_string()];
    shown.extend(
        words[1..]
            .iter()
            .take_while(|word| !word.starts_with('-'))
            .map(|word| word.to_string()),
    );
    Some(truncate(&shown.join(" "), 40))
}

fn truncate(text: &str, max: usize) -> String {
    if text.chars().count() > max {
        format!("{}…", text.chars().take(max - 1).collect::<String>())
    } else {
        text.to_string()
    }
}

/// `ps` cputime (`0:01.23`, `12:03.45`, `1:02:03`) in milliseconds.
fn parse_cpu_time(time: &str) -> Option<u64> {
    let mut seconds = 0.0_f64;
    for part in time.split(':') {
        seconds = seconds * 60.0 + part.parse::<f64>().ok()?;
    }
    Some((seconds * 1000.0).round() as u64)
}

/// For each process group: CPU time summed over its processes, and its leader's command line.
#[derive(Debug, Default, PartialEq)]
struct GroupInfo {
    cpu_ms: u64,
    leader_args: Option<String>,
}

/// One `ps` call over all processes (`pid pgid cputime args`), grouped by the given groups.
fn group_info(groups: &[i32]) -> HashMap<i32, GroupInfo> {
    if groups.is_empty() {
        return HashMap::new();
    }
    let Ok(output) = std::process::Command::new("ps")
        .args(["-A", "-o", "pid=,pgid=,time=,args="])
        .output()
    else {
        return HashMap::new();
    };
    parse_group_info(&String::from_utf8_lossy(&output.stdout), groups)
}

fn parse_group_info(listing: &str, groups: &[i32]) -> HashMap<i32, GroupInfo> {
    let mut info: HashMap<i32, GroupInfo> = HashMap::new();
    for line in listing.lines() {
        let mut fields = line.split_whitespace();
        let (Some(pid), Some(pgid), Some(time)) = (fields.next(), fields.next(), fields.next())
        else {
            continue;
        };
        let (Ok(pid), Ok(pgid)) = (pid.parse::<i32>(), pgid.parse::<i32>()) else {
            continue;
        };
        if !groups.contains(&pgid) {
            continue;
        }
        let entry = info.entry(pgid).or_default();
        entry.cpu_ms += parse_cpu_time(time).unwrap_or(0);
        if pid == pgid {
            entry.leader_args = Some(fields.collect::<Vec<_>>().join(" "));
        }
    }
    info
}

/// What each live session runs in the foreground. The pty knows its foreground process group
/// (`tcgetpgrp`); when that is not the shell, a command is running. Nothing is read from the
/// rendered terminal.
#[tauri::command]
pub async fn terminal_status(
    registry: tauri::State<'_, TerminalRegistry>,
) -> Result<Vec<TerminalStatus>, String> {
    let foreground: Vec<(u32, Option<i32>)> = {
        let sessions = registry.sessions.lock().map_err(|error| error.to_string())?;
        sessions
            .iter()
            .map(|(id, session)| {
                let leader = session.master.process_group_leader();
                let busy = leader.filter(|pid| Some(*pid as u32) != session.shell_pid);
                (*id, busy)
            })
            .collect()
    };
    let groups: Vec<i32> = foreground.iter().filter_map(|(_, pid)| *pid).collect();
    let info = tauri::async_runtime::spawn_blocking(move || group_info(&groups))
        .await
        .map_err(|error| error.to_string())?;
    Ok(foreground
        .into_iter()
        .map(|(id, group)| {
            let found = group.and_then(|group| info.get(&group));
            let args = found.and_then(|found| found.leader_args.clone());
            TerminalStatus {
                id,
                command: group.map(|group| {
                    args.as_deref()
                        .and_then(display_command)
                        .unwrap_or_else(|| format!("pid {group}"))
                }),
                detail: args.map(|args| truncate(&args, 200)),
                cpu_ms: found.map(|found| found.cpu_ms),
            }
        })
        .collect())
}

/// Sends keyboard input (or pasted text) to the shell.
#[tauri::command]
pub fn terminal_write(
    registry: tauri::State<'_, TerminalRegistry>,
    id: u32,
    data: String,
) -> Result<(), String> {
    let mut sessions = registry.sessions.lock().map_err(|error| error.to_string())?;
    let session = sessions.get_mut(&id).ok_or("terminal session not found")?;
    session
        .writer
        .write_all(data.as_bytes())
        .and_then(|_| session.writer.flush())
        .map_err(|error| error.to_string())
}

/// Resizes the pty to the rendered grid.
#[tauri::command]
pub fn terminal_resize(
    registry: tauri::State<'_, TerminalRegistry>,
    id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = registry.sessions.lock().map_err(|error| error.to_string())?;
    let session = sessions.get(&id).ok_or("terminal session not found")?;
    session
        .master
        .resize(size(cols, rows))
        .map_err(|error| error.to_string())
}

/// Ends the shell. The reader thread then reports `Exit` and drops the session.
#[tauri::command]
pub fn terminal_kill(registry: tauri::State<'_, TerminalRegistry>, id: u32) -> Result<(), String> {
    let mut sessions = registry.sessions.lock().map_err(|error| error.to_string())?;
    if let Some(session) = sessions.get_mut(&id) {
        session.child.kill().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_split_characters_for_the_next_chunk() {
        let mut stream = Utf8Stream::default();
        let crab = "🦀".as_bytes();
        assert_eq!(stream.push(&[b'a', crab[0], crab[1]]), "a");
        assert_eq!(stream.push(&[crab[2], crab[3], b'b']), "🦀b");
    }

    #[test]
    fn replaces_invalid_bytes() {
        let mut stream = Utf8Stream::default();
        assert_eq!(stream.push(&[b'a', 0xFF, b'b']), "a\u{FFFD}b");
    }

    #[test]
    fn shows_the_program_up_to_its_first_flag() {
        assert_eq!(
            display_command("node /opt/homebrew/bin/claude --settings /Users/me/x.json").as_deref(),
            Some("claude"),
        );
        assert_eq!(
            display_command("/usr/local/bin/npm run dev").as_deref(),
            Some("npm run dev"),
        );
        assert_eq!(display_command("vim README.md").as_deref(), Some("vim README.md"));
        assert_eq!(display_command("-zsh").as_deref(), Some("zsh"));
        assert_eq!(display_command("node --inspect app.js").as_deref(), Some("node"));
        assert_eq!(display_command("   "), None);
    }

    #[test]
    fn parses_cpu_times() {
        assert_eq!(parse_cpu_time("0:01.23"), Some(1230));
        assert_eq!(parse_cpu_time("12:03.45"), Some(723_450));
        assert_eq!(parse_cpu_time("1:02:03"), Some(3_723_000));
        assert_eq!(parse_cpu_time("x"), None);
    }

    #[test]
    fn groups_cpu_and_leader_args() {
        let listing = "  100   100   0:01.00 node /bin/claude --x\n  101   100   0:00.50 rg foo\n  200   200   0:09.00 other\n";
        let info = parse_group_info(listing, &[100]);
        assert_eq!(
            info.get(&100),
            Some(&GroupInfo {
                cpu_ms: 1500,
                leader_args: Some("node /bin/claude --x".to_string()),
            }),
        );
        assert!(info.get(&200).is_none());
    }

    #[test]
    fn reads_the_process_table() {
        let own = std::process::id();
        let output = std::process::Command::new("ps")
            .args(["-o", "pgid=", "-p", &own.to_string()])
            .output()
            .expect("runs ps");
        let group: i32 = String::from_utf8_lossy(&output.stdout).trim().parse().expect("a pgid");
        let info = group_info(&[group]);
        assert!(info.contains_key(&group), "own group {group} (pid {own}) not found");
    }

    #[test]
    fn falls_back_to_a_shell() {
        assert!(!user_shell().is_empty());
    }
}
