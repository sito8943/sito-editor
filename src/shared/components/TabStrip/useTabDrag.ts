import { useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";

import {
  TAB_DRAG_THRESHOLD_PX,
  clampDx,
  dropIndex,
  type TabDragState,
  type TabGeom,
} from "./tabDrag";

/**
 * Horizontal drag-to-reorder for the tab strip, same behavior as
 * sito-file-browser's TabBar. Tabs need the `TabStrip_tab` class.
 */
export const useTabDrag = (
  paths: readonly string[],
  onSelect: (path: string) => void,
  onMove: (path: string, toIndex: number) => void,
) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<TabDragState | null>(null);
  // True for the frame after a drop: tabs already sit in their new slots, so
  // their offset resets without animating back from the stale shift.
  const [snapping, setSnapping] = useState(false);
  // Snapshot at drag start; re-measuring mid-drag would read shifted rects.
  const geomRef = useRef<TabGeom[] | null>(null);

  const bind = useDrag(
    ({ args: [index], movement: [mx], first, last }) => {
      const tabIndex = index as number;
      if (first) {
        // Grabbing a tab activates it, like a browser.
        onSelect(paths[tabIndex]);
        const items = Array.from(
          listRef.current?.querySelectorAll<HTMLElement>(".TabStrip_tab") ??
            [],
        );
        geomRef.current =
          items.length === paths.length
            ? items.map((item) => {
                const rect = item.getBoundingClientRect();
                return {
                  left: rect.left,
                  right: rect.right,
                  center: rect.left + rect.width / 2,
                  width: rect.width,
                };
              })
            : null;
      }
      // Gate on real movement so a plain click never lifts the tab.
      const moved = Math.abs(mx) > TAB_DRAG_THRESHOLD_PX;
      if (last) {
        if (moved) {
          const target = dropIndex(geomRef.current, tabIndex, mx);
          if (target !== tabIndex) onMove(paths[tabIndex], target);
          setSnapping(true);
        }
        geomRef.current = null;
        setDrag(null);
      } else if (moved) {
        setDrag({
          index: tabIndex,
          dx: clampDx(geomRef.current, tabIndex, mx),
          mx,
          geom: geomRef.current,
        });
      }
    },
    { axis: "x", filterTaps: true, pointer: { keys: false } },
  );

  // While a tab is lifted, show `grabbing` everywhere: the pointer often
  // leaves the tab (and the strip) mid-drag.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const root = document.documentElement;
    root.classList.add("is-dragging-tab");
    return () => root.classList.remove("is-dragging-tab");
  }, [dragging]);

  useEffect(() => {
    if (!snapping) return;
    const frame = requestAnimationFrame(() => setSnapping(false));
    return () => cancelAnimationFrame(frame);
  }, [snapping]);

  const geom = drag?.geom ?? null;
  const target = drag ? dropIndex(geom, drag.index, drag.mx) : null;
  const gap = geom && geom.length > 1 ? geom[1].left - geom[0].right : 0;
  const shift = drag && geom ? geom[drag.index].width + gap : 0;

  /** Live x-offset: the dragged tab follows the pointer, others open the gap. */
  const translateFor = (index: number): number => {
    if (!drag || target === null) return 0;
    const from = drag.index;
    if (index === from) return drag.dx;
    if (target > from && index > from && index <= target) return -shift;
    if (target < from && index >= target && index < from) return shift;
    return 0;
  };

  return {
    listRef,
    bind,
    snapping,
    draggingIndex: drag?.index ?? null,
    translateFor,
  };
};
