import { invoke } from "@tauri-apps/api/core";

/** Branch (or short hash when detached) of the repo containing `root`; null outside Git. */
export const getGitBranch = async (root: string): Promise<string | null> =>
  await invoke<string | null>("git_branch", { root });
