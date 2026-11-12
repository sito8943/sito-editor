import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  DEFAULT_FILE_TYPE_EXTENSIONS,
  FOLDER_ICON,
  FOLDER_OPEN_ICON,
  categoryOf,
  extensionOf,
  fileCategoryColor,
  fileIconFor,
} from "@sito/file-icons";

import type { FileIconProps } from "./types";

import "@/styles/components/FileIcon.css";

/** Glyph for a file or folder, shared with sito-file-browser (@sito/file-icons). */
export const FileIcon = ({ name, directory, open, className }: FileIconProps) => {
  if (directory) {
    return (
      <FontAwesomeIcon
        className={["FileIcon", "FileIcon--folder", className]
          .filter(Boolean)
          .join(" ")}
        icon={open ? FOLDER_OPEN_ICON : FOLDER_ICON}
        fixedWidth
        aria-hidden
      />
    );
  }
  const category = categoryOf(DEFAULT_FILE_TYPE_EXTENSIONS, extensionOf(name));
  return (
    <FontAwesomeIcon
      className={["FileIcon", className].filter(Boolean).join(" ")}
      icon={fileIconFor(name)}
      style={category ? { color: fileCategoryColor(category) } : undefined}
      fixedWidth
      aria-hidden
    />
  );
};
