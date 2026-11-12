import { invoke } from "@tauri-apps/api/core";

/** Branch (or short hash when detached) of the repo containing `root`; null outside Git. */
export const getGitBranch = async (root: string): Promise<string | null> =>
  await invoke<string | null>("git_branch", { root });

export type GitFileStatus =
  | "conflicted"
  | "deleted"
  | "added"
  | "untracked"
  | "modified"
  | "renamed";

export type GitStatus = {
  /** HEAD commit; null in a repository without commits. */
  head: string | null;
  /** Changed files by absolute path. */
  files: Record<string, GitFileStatus>;
};

/** Changed files of the repo containing `root`; null outside Git. */
export const getGitStatus = async (root: string): Promise<GitStatus | null> =>
  await invoke<GitStatus | null>("git_status", { root });

/** The file at HEAD; null when it is new, untracked, binary or outside Git. */
export const getGitHeadFile = async (path: string): Promise<string | null> =>
  await invoke<string | null>("git_head_file", { path });
