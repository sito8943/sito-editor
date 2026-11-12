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

    let child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| error.to_string())?;
    // The child holds its own handle to the slave side.
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| error.to_string())?;
    let writer = pair.master.take_writer().map_err(|error| error.to_string())?;

    let id = registry.next_id.fetch_add(1, Ordering::Relaxed) + 1;
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
    fn falls_back_to_a_shell() {
        assert!(!user_shell().is_empty());
    }
}
