//! Minimal Git info for the status bar, read straight from `.git` (no `git` binary needed).

use std::fs;
use std::path::{Path, PathBuf};

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_branches_and_detached_heads() {
        assert_eq!(branch_from_head("ref: refs/heads/main\n").as_deref(), Some("main"));
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
}
