import type { ReactNode } from "react";

export type TabStripItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Tooltip on the label (e.g. the full path). */
  tooltip?: string;
  /** Shown after the label (e.g. an unsaved-changes dot). */
  decoration?: ReactNode;
  /** Struck through: deleted file, exited shell… */
  struck?: boolean;
  closeDisabled?: boolean;
};

export type TabStripProps = {
  items: readonly TabStripItem[];
  activeId: string | null;
  ariaLabel?: string;
  /** Accessible name and tooltip of an item's close button. */
  closeLabel: (item: TabStripItem) => string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  /** Called (before onClose) when a middle click closes a tab. */
  onMiddleClose?: (id: string) => void;
  onMove: (id: string, toIndex: number) => void;
};
