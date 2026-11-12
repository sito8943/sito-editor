import { EXPLORER_MENU_ACTION } from "@/features/explorer";
import { USAGE_EVENT, USAGE_PREFIX, usageFeature } from "@/shared/usage";

import { APP_KEYMAP } from "./commands";

/**
 * Every countable feature, sent to the usage service so it can report the
 * ones never used. Built from the registries that define them (keymap,
 * Explorer menu), plus the USAGE_EVENT features counted at their choke points.
 */
export const USAGE_FEATURES: readonly string[] = [
  ...Object.keys(APP_KEYMAP).map((command) =>
    usageFeature(USAGE_PREFIX.HOTKEY, command),
  ),
  ...Object.values(EXPLORER_MENU_ACTION).map((action) =>
    usageFeature(USAGE_PREFIX.EXPLORER_MENU, action),
  ),
  ...Object.values(USAGE_EVENT).flatMap((group) => Object.values(group)),
];
