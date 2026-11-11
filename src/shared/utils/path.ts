export const pathName = (path: string): string => {
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? path;
};

/**
 * Joins a native root with a `/`-separated relative path, keeping the root's
 * separator style (backslashes on Windows roots).
 */
export const joinPath = (root: string, relative: string): string => {
  const separator = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  const base = root.replace(/[\\/]+$/, "");
  return `${base}${separator}${relative.split("/").join(separator)}`;
};

/** Parent directory of a native path (the path itself when it has none). */
export const parentPath = (path: string): string => {
  const trimmed = path.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  if (index < 0) return path;
  if (index === 0) return trimmed[0];
  return trimmed.slice(0, index);
};
