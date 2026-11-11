import { pathName } from "@/shared/utils";

import type { BreadcrumbSegment } from "../types";

/**
 * Builds breadcrumb segments for `activePath` starting at the workspace root.
 * Without an active file inside the root, only the root segment is returned.
 */
export const breadcrumbSegments = (
  rootPath: string,
  activePath: string | null,
): BreadcrumbSegment[] => {
  const root: BreadcrumbSegment = {
    name: pathName(rootPath),
    relativePath: "",
    isFile: false,
  };
  const base = rootPath.replace(/[\\/]+$/, "");
  const insideRoot =
    activePath?.startsWith(base) && /^[\\/]/.test(activePath.slice(base.length));
  if (!activePath || !insideRoot) return [root];

  const parts = activePath
    .slice(base.length)
    .split(/[\\/]/)
    .filter(Boolean);

  return [
    root,
    ...parts.map((name, index) => ({
      name,
      relativePath: parts.slice(0, index + 1).join("/"),
      isFile: index === parts.length - 1,
    })),
  ];
};
