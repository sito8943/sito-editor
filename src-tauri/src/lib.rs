use std::path::Path;

mod git;
mod terminal;

use tauri::{Emitter, Manager};

/// Event emitted when another `sito-editor <path>` launch is forwarded to this instance.
const OPEN_PATH_EVENT: &str = "sito-editor://open-path";

/// Path passed on the command line of the first launch, already resolved.
struct LaunchPath(Option<String>);

/// First non-flag argument, resolved against `cwd`. Returns `None` when it doesn't exist.
/// Flags are skipped so macOS extras like `-psn_…` are ignored.
fn resolve_launch_path<I>(args: I, cwd: &Path) -> Option<String>
where
    I: IntoIterator<Item = String>,
{
    let raw = args.into_iter().find(|arg| !arg.starts_with('-'))?;
    let path = Path::new(&raw);
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        cwd.join(path)
    };
    let canonical = std::fs::canonicalize(absolute).ok()?;
    Some(canonical.to_string_lossy().into_owned())
}

/// Folder or file to open on startup (`sito-editor <path>`), if any.
#[tauri::command]
fn get_launch_path(launch: tauri::State<'_, LaunchPath>) -> Option<String> {
    launch.0.clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cwd = std::env::current_dir().unwrap_or_default();
    let launch_path = resolve_launch_path(std::env::args().skip(1), &cwd);

    tauri::Builder::default()
        // Must be the first plugin: a second launch hands its arguments to this
        // instance and exits.
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            if let Some(path) = resolve_launch_path(argv.into_iter().skip(1), Path::new(&cwd)) {
                let _ = app.emit(OPEN_PATH_EVENT, path);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sito_workspace::init())
        .manage(LaunchPath(launch_path))
        .manage(terminal::TerminalRegistry::default())
        .invoke_handler(tauri::generate_handler![
            get_launch_path,
            git::git_branch,
            terminal::terminal_spawn,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::terminal_kill,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_the_first_existing_non_flag_argument() {
        let directory = std::env::temp_dir();
        let resolved = resolve_launch_path(
            vec!["-psn_0_123".to_string(), ".".to_string()],
            &directory,
        );
        assert_eq!(
            resolved,
            Some(
                std::fs::canonicalize(&directory)
                    .unwrap()
                    .to_string_lossy()
                    .into_owned()
            ),
        );
    }

    #[test]
    fn ignores_missing_paths_and_empty_arguments() {
        let directory = std::env::temp_dir();
        assert_eq!(
            resolve_launch_path(vec!["does-not-exist-sito".to_string()], &directory),
            None,
        );
        assert_eq!(resolve_launch_path(Vec::<String>::new(), &directory), None);
    }
}
