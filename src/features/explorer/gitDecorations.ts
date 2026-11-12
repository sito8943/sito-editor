import type { GitFileStatus } from "@/shared/services/git";
import { parentPath } from "@/shared/utils";

/** Strongest first: a folder shows the strongest status inside it. */
const STATUS_RANK: readonly GitFileStatus[] = [
  "conflicted",
  "deleted",
  "modified",
  "renamed",
  "added",
  "untracked",
];

/** Letter shown at the end of a changed file's row, like VS Code. */
export const GIT_STATUS_LETTER: Record<GitFileStatus, string> = {
  conflicted: "C",
  deleted: "D",
  modified: "M",
  renamed: "R",
  added: "A",
  untracked: "U",
};

export type GitDecorations = {
  files: Record<string, GitFileStatus>;
  folders: Map<string, GitFileStatus>;
};

const stronger = (a: GitFileStatus | undefined, b: GitFileStatus) =>
  a === undefined || STATUS_RANK.indexOf(b) < STATUS_RANK.indexOf(a) ? b : a;

/** Marks every folder between a changed file and the workspace root. */
export const gitDecorationsFor = (
  files: Record<string, GitFileStatus>,
  rootPath: string,
): GitDecorations => {
  const folders = new Map<string, GitFileStatus>();
  for (const [path, status] of Object.entries(files)) {
    let folder = parentPath(path);
    while (folder.length > rootPath.length && folder.startsWith(rootPath)) {
      const current = folders.get(folder);
      const next = stronger(current, status);
      if (next === current) break;
      folders.set(folder, next);
      const parent = parentPath(folder);
      if (parent === folder) break;
      folder = parent;
    }
  }
  return { files, folders };
};
