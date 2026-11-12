// Tab drag geometry, taken from sito-file-browser's TabBar (src/features/tabs/utils.ts).

/** Pixels the pointer must travel before a press lifts the tab into a drag. */
export const TAB_DRAG_THRESHOLD_PX = 6;

/** A tab's viewport geometry, snapshotted at drag start. */
export type TabGeom = {
  left: number;
  right: number;
  center: number;
  width: number;
};

/**
 * In-progress drag: which tab, its clamped render offset (`dx`), the raw
 * pointer offset (`mx`) and the layout snapshot taken at drag start.
 */
export type TabDragState = {
  index: number;
  dx: number;
  mx: number;
  geom: TabGeom[] | null;
};

/** Keeps the dragged tab inside the strip. */
export const clampDx = (
  geom: TabGeom[] | null,
  index: number,
  mx: number,
): number => {
  if (!geom) return mx;
  const tab = geom[index];
  const minDx = geom[0].left - tab.left;
  const maxDx = geom[geom.length - 1].right - tab.right;
  return Math.max(minDx, Math.min(maxDx, mx));
};

/**
 * Where the dragged tab lands: the count of other tabs whose center sits left
 * of the pointer-projected center. Uses the RAW offset (not clamped) so a wide
 * tab can still reach a slot taken by a narrower one.
 */
export const dropIndex = (
  geom: TabGeom[] | null,
  index: number,
  mx: number,
): number => {
  if (!geom) return index;
  const draggedCenter = geom[index].center + mx;
  let target = 0;
  geom.forEach((tab, tabIndex) => {
    if (tabIndex !== index && tab.center < draggedCenter) target += 1;
  });
  return target;
};
