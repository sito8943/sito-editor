import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

/** Asked once per launch, the first time something wants to notify. */
let permission: Promise<boolean> | null = null;

const allowed = () => {
  permission ??= (async () =>
    (await isPermissionGranted()) ||
    (await requestPermission()) === "granted")().catch(() => false);
  return permission;
};

/** A native macOS notification; silently skipped when not allowed. */
export const notify = async (title: string, body?: string): Promise<void> => {
  if (await allowed()) sendNotification({ title, body });
};
