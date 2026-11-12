export type FileIconProps = {
  /** File or folder name (the extension picks the glyph). */
  name: string;
  directory?: boolean;
  /** Expanded folder. */
  open?: boolean;
  className?: string;
};
