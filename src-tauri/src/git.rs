//! Git info for the status bar, the Explorer and the editor gutter. The branch is read straight
//! from `.git`; file status and HEAD contents come from the `git` binary, which only runs inside a
//! repository.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;

/// The `.git` directory for `start` or its nearest ancestor. Handles worktrees and submodules,
/// where `.git` is a file containing `gitdir: <path>`.
fn git_dir(start: &Path) -> Option<PathBuf> {
    for directory in start.ancestors() {
        let candidate = directory.join(".git");
        if candidate.is_dir() {
            return Some(candidate);
        }
        if candidate.is_file() {
            let content = fs::read_to_string(&candidate).ok()?;
            let target = content.trim().strip_prefix("gitdir:")?.trim();
            let path = Path::new(target);
            return Some(if path.is_absolute() {
                path.to_path_buf()
            } else {
                directory.join(path)
            });
        }
    }
    None
}

/// The branch name, or the short commit hash when HEAD is detached.
fn branch_from_head(head: &str) -> Option<String> {
    let head = head.trim();
    if let Some(reference) = head.strip_prefix("ref:") {
        let reference = reference.trim();
        return Some(
            reference
                .strip_prefix("refs/heads/")
                .unwrap_or(reference)
                .to_string(),
        );
    }
    (head.len() >= 7).then(|| head[..7].to_string())
}

/// Current branch of the repository containing `root`, or None outside Git.
#[tauri::command]
pub async fn git_branch(root: String) -> Option<String> {
    let head = fs::read_to_string(git_dir(Path::new(&root))?.join("HEAD")).ok()?;
    branch_from_head(&head)
}

/// How a changed file differs, in the order VS Code ranks them.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FileStatus {
    Conflicted,
    Deleted,
    Added,
    Untracked,
    Modified,
    Renamed,
}

/// Changed files of a repository, by absolute path, plus the HEAD commit so the frontend knows
/// when HEAD contents must be re-read.
#[derive(Debug, Serialize)]
pub struct GitStatus {
    head: Option<String>,
    files: HashMap<String, FileStatus>,
}

/// Runs `git` in `directory` without taking the index lock (like VS Code), so a status poll never
/// blocks a commit in the terminal. None when git fails or is missing.
fn run_git(directory: &Path, args: &[&str]) -> Option<Vec<u8>> {
    let output = Command::new("git")
        .args(args)
        .current_dir(directory)
        .env("GIT_OPTIONAL_LOCKS", "0")
        .output()
        .ok()?;
    output.status.success().then_some(output.stdout)
}

fn status_from_code(index: u8, worktree: u8) -> FileStatus {
    match (index, worktree) {
        (b'?', b'?') => FileStatus::Untracked,
        (b'U', _) | (_, b'U') | (b'A', b'A') | (b'D', b'D') => FileStatus::Conflicted,
        (b'D', _) | (_, b'D') => FileStatus::Deleted,
        (b'A', _) => FileStatus::Added,
        (b'R', _) | (b'C', _) => FileStatus::Renamed,
        _ => FileStatus::Modified,
    }
}

/// Parses `git status --porcelain=v1 -z` (paths relative to `top`).
fn parse_porcelain(output: &[u8], top: &Path) -> HashMap<String, FileStatus> {
    let mut files = HashMap::new();
    let mut entries = output
        .split(|byte| *byte == 0)
        .filter(|entry| !entry.is_empty());
    while let Some(entry) = entries.next() {
        if entry.len() < 4 {
            continue;
        }
        let status = status_from_code(entry[0], entry[1]);
        if matches!(entry[0], b'R' | b'C') {
            // A rename is followed by its original path.
            entries.next();
        }
        let relative = String::from_utf8_lossy(&entry[3..]);
        let path = top.join(relative.trim_end_matches('/'));
        files.insert(path.to_string_lossy().into_owned(), status);
    }
    files
}

fn read_status(root: &Path) -> Option<GitStatus> {
    git_dir(root)?;
    let top = run_git(root, &["rev-parse", "--show-toplevel"])?;
    let top = PathBuf::from(String::from_utf8_lossy(&top).trim());
    let head = run_git(root, &["rev-parse", "--verify", "--quiet", "HEAD"])
        .map(|hash| String::from_utf8_lossy(&hash).trim().to_string());
    let output = run_git(
        root,
        &["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    )?;
    Some(GitStatus {
        head,
        files: parse_porcelain(&output, &top),
    })
}

/// Changed files of the repository containing `root`, or None outside Git.
#[tauri::command]
pub async fn git_status(root: String) -> Option<GitStatus> {
    tauri::async_runtime::spawn_blocking(move || read_status(Path::new(&root)))
        .await
        .ok()
        .flatten()
}

fn read_head_file(path: &Path) -> Option<String> {
    let directory = path.parent()?;
    git_dir(directory)?;
    let name = path.file_name()?.to_str()?;
    let content = run_git(directory, &["show", &format!("HEAD:./{name}")])?;
    String::from_utf8(content).ok()
}

/// The file's contents at HEAD, or None when it is new, untracked, binary or outside Git.
#[tauri::command]
pub async fn git_head_file(path: String) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || read_head_file(Path::new(&path)))
        .await
        .ok()
        .flatten()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_branches_and_detached_heads() {
        assert_eq!(
            branch_from_head("ref: refs/heads/main\n").as_deref(),
            Some("main")
        );
        assert_eq!(
            branch_from_head("ref: refs/heads/feat/x\n").as_deref(),
            Some("feat/x"),
        );
        assert_eq!(
            branch_from_head("85a206f1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7\n").as_deref(),
            Some("85a206f"),
        );
        assert_eq!(branch_from_head(""), None);
    }

    #[test]
    fn finds_the_git_dir_from_a_subfolder_and_a_worktree_file() {
        let directory = tempfile::tempdir().expect("creates a temporary directory");
        let repo = directory.path().join("repo");
        fs::create_dir_all(repo.join(".git")).unwrap();
        fs::create_dir_all(repo.join("src/deep")).unwrap();
        assert_eq!(git_dir(&repo.join("src/deep")), Some(repo.join(".git")));

        let worktree = directory.path().join("worktree");
        fs::create_dir_all(&worktree).unwrap();
        fs::write(worktree.join(".git"), "gitdir: ../repo/.git/worktrees/w\n").unwrap();
        assert_eq!(
            git_dir(&worktree),
            Some(worktree.join("../repo/.git/worktrees/w")),
        );
    }

    #[test]
    fn parses_porcelain_statuses() {
        let top = Path::new("/repo");
        let output = b" M src/a.ts\0A  b.ts\0?? new dir/c.ts\0R  d.ts\0old.ts\0UU e.ts\0 D f.ts\0";
        let files = parse_porcelain(output, top);
        let status = |path: &str| files.get(path).copied();
        assert_eq!(status("/repo/src/a.ts"), Some(FileStatus::Modified));
        assert_eq!(status("/repo/b.ts"), Some(FileStatus::Added));
        assert_eq!(status("/repo/new dir/c.ts"), Some(FileStatus::Untracked));
        assert_eq!(status("/repo/d.ts"), Some(FileStatus::Renamed));
        assert_eq!(status("/repo/old.ts"), None);
        assert_eq!(status("/repo/e.ts"), Some(FileStatus::Conflicted));
        assert_eq!(status("/repo/f.ts"), Some(FileStatus::Deleted));
    }

    #[test]
    fn reads_status_and_head_contents_of_a_real_repo() {
        let directory = tempfile::tempdir().expect("creates a temporary directory");
        let repo = directory.path();
        let git = |args: &[&str]| run_git(repo, args).expect("git runs");
        git(&["init", "-q"]);
        git(&["config", "user.email", "test@example.com"]);
        git(&["config", "user.name", "Test"]);
        fs::write(repo.join("a.txt"), "one\n").unwrap();
        git(&["add", "a.txt"]);
        git(&["commit", "-q", "-m", "init"]);
        fs::write(repo.join("a.txt"), "two\n").unwrap();
        fs::write(repo.join("b.txt"), "new\n").unwrap();

        let status = read_status(repo).expect("reads the status");
        assert!(status.head.is_some());
        let top =
            PathBuf::from(String::from_utf8_lossy(&git(&["rev-parse", "--show-toplevel"])).trim());
        let path = |name: &str| top.join(name).to_string_lossy().into_owned();
        assert_eq!(
            status.files.get(&path("a.txt")),
            Some(&FileStatus::Modified)
        );
        assert_eq!(
            status.files.get(&path("b.txt")),
            Some(&FileStatus::Untracked)
        );

        assert_eq!(
            read_head_file(&repo.join("a.txt")).as_deref(),
            Some("one\n")
        );
        assert_eq!(read_head_file(&repo.join("b.txt")), None);
    }
}
