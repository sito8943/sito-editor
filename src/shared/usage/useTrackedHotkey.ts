import type { HotkeyHandler, HotkeyOptions } from "@sito/commands";
import { useHotkey } from "@sito/commands/react";

import { USAGE_PREFIX } from "./constants";
import { useUsage } from "./UsageContext";
import { usageFeature, withUsage } from "./utils";

/** `useHotkey` for a keymap command that also counts `hotkey.<command id>`. */
export const useTrackedHotkey = <TCommandId extends string>(
  command: TCommandId,
  handler: HotkeyHandler,
  options?: HotkeyOptions,
): void => {
  const { track } = useUsage();
  useHotkey(
    command,
    withUsage(handler, usageFeature(USAGE_PREFIX.HOTKEY, command), track),
    options,
  );
};
