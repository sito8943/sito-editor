import { IconButton, Tooltip } from "@sito/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import type { SurfaceButtonProps } from "./types";

import "@/styles/components/SurfaceButton.css";

const isIconDefinition = (icon: unknown): icon is IconDefinition =>
  typeof icon === "object" && icon !== null && "iconName" in icon;

/**
 * The app's one button look: @sito/ui's IconButton on a small raised surface
 * with a subtle border (toolbar actions, toggles, tab close…), with @sito/ui's
 * Tooltip (label + optional hotkey). `icon` takes a FontAwesome definition or
 * any node (e.g. "Aa").
 */
export const SurfaceButton = ({
  icon,
  label,
  hotkey,
  tooltipSide,
  size = "sm",
  pressed,
  className,
  ...rest
}: SurfaceButtonProps) => (
  <Tooltip label={label} hotkey={hotkey} side={tooltipSide}>
    <IconButton
      {...rest}
      variant="text"
      aria-label={label}
      aria-pressed={pressed}
      className={["SurfaceButton", `SurfaceButton--${size}`, className]
        .filter(Boolean)
        .join(" ")}
      icon={isIconDefinition(icon) ? <FontAwesomeIcon icon={icon} /> : icon}
    />
  </Tooltip>
);
