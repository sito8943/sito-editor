import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type SurfaceButtonSize = "xs" | "sm" | "md";

export type SurfaceButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "color" | "aria-pressed" | "title"
> & {
  icon: IconDefinition | ReactNode;
  /** Accessible name and tooltip. */
  label: string;
  /** Shortcut shown in the tooltip, e.g. "⌘S". */
  hotkey?: string;
  tooltipSide?: "top" | "bottom";
  /** xs: inside tabs · sm: toolbars and fields · md: next to the path bar. */
  size?: SurfaceButtonSize;
  /** Makes it a toggle. */
  pressed?: boolean;
  /** Shows @sito/ui's spinner instead of the icon. */
  loading?: boolean;
};
