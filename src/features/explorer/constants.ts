/** Explorer header buttons, counted as `explorer.toolbar.<id>`. */
export const EXPLORER_TOOLBAR_ACTION = {
  NEW_FILE: "new_file",
  NEW_FOLDER: "new_folder",
  REFRESH: "refresh",
  COLLAPSE_ALL: "collapse_all",
} as const;

/** Explorer context-menu items, counted as `explorer.menu.<id>`. */
export const EXPLORER_MENU_ACTION = {
  OPEN: "open",
  TOGGLE_FOLDER: "toggle_folder",
  REFRESH_FOLDER: "refresh_folder",
  NEW_FILE: "new_file",
  NEW_FOLDER: "new_folder",
  RENAME: "rename",
  MOVE_TO_TRASH: "move_to_trash",
  REFRESH: "refresh",
  COLLAPSE_ALL: "collapse_all",
} as const;
