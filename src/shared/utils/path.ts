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

