import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/** Matches `OPEN_PATH_EVENT` in `src-tauri/src/lib.rs`. */
const OPEN_PATH_EVENT = "sito-editor://open-path";

/** Folder or file passed as `sito-editor <path>` on the first launch. */
export const getLaunchPath = async (): Promise<string | null> =>
  await invoke<string | null>("get_launch_path");

/** Paths from later `sito-editor <path>` launches, forwarded to this window. */
export const onOpenPathRequest = async (
  handler: (path: string) => void,
): Promise<UnlistenFn> =>
  await listen<string>(OPEN_PATH_EVENT, (event) => handler(event.payload));
