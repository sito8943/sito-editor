import { useEffect } from "react";
import { Tooltip } from "@sito/ui";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { SurfaceButton } from "../SurfaceButton";
import type { TabStripProps } from "./types";
import { useTabDrag } from "./useTabDrag";

import "@/styles/components/TabStrip.css";

/**
 * Browser-style tabs shared by the editor and the terminal: drag to reorder
 * (useTabDrag, from sito-file-browser), middle click to close, and a close
 * button shown on the active or hovered tab like VS Code.
 */
export const TabStrip = ({
  items,
  activeId,
  ariaLabel,
  closeLabel,
  onSelect,
  onClose,
  onMiddleClose,
  onMove,
}: TabStripProps) => {
  const tabDrag = useTabDrag(
    items.map((item) => item.id),
    onSelect,
    onMove,
  );

  // Keep the active tab visible when it changes (Ctrl+Tab, quick open…).
  useEffect(() => {
    tabDrag.listRef.current
      ?.querySelector<HTMLElement>(".TabStrip_tab.active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, tabDrag.listRef]);

  return (
    <div
      className={tabDrag.snapping ? "TabStrip snapping" : "TabStrip"}
      role="tablist"
      aria-label={ariaLabel}
      ref={tabDrag.listRef}
    >
      {items.map((item, index) => {
        const offset = tabDrag.translateFor(index);
        const label = (
          <button
            className="TabStrip_select"
            // Only the label drags: use-gesture swallows clicks it didn't see
            // start as a tap, which would break the close button.
            {...tabDrag.bind(index)}
            type="button"
            onClick={() => onSelect(item.id)}
          >
            {item.icon}
            <span className="TabStrip_label">{item.label}</span>
            {item.decoration}
          </button>
        );
        return (
          <div
            key={item.id}
            className={[
              "TabStrip_tab",
              item.id === activeId && "active",
              tabDrag.draggingIndex === index && "dragging",
              item.struck && "struck",
            ]
              .filter(Boolean)
              .join(" ")}
            role="tab"
            aria-selected={item.id === activeId}
            style={offset ? { transform: `translateX(${offset}px)` } : undefined}
            onMouseDown={(event) => {
              if (event.button === 1) event.preventDefault();
            }}
            onAuxClick={(event) => {
              if (event.button === 1 && !item.closeDisabled) {
                onMiddleClose?.(item.id);
                onClose(item.id);
              }
            }}
          >
            {item.tooltip ? (
              <Tooltip
                className="TabStrip_tooltip"
                label={item.tooltip}
                side="bottom"
                align="start"
              >
                {label}
              </Tooltip>
            ) : (
              label
            )}
            <SurfaceButton
              size="xs"
              className="TabStrip_close"
              icon={faXmark}
              label={closeLabel(item)}
              disabled={item.closeDisabled}
              onClick={() => onClose(item.id)}
            />
          </div>
        );
      })}
    </div>
  );
};
