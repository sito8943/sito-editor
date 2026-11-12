import { useRef } from "react";
import { useDrag } from "@use-gesture/react";

import { parentPath, pathName } from "@/shared/utils";

// Drag-to-move for Explorer entries, adapted from sito-file-browser's
// useEntryDragMove (in-app mode only): a ghost follows the pointer, the folder
// under it highlights, and release moves the entry there. Feedback is applied
// imperatively so a drag never re-renders the tree.

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 4;
/** Offset of the ghost from the pointer, so it doesn't sit under the cursor. */
const GHOST_OFFSET = 14;
/** On the highlighted drop target. */
export const DRAG_OVER_CLASS = "drag_over";
/** On <html> while an entry drag is in flight (cursor + ghost). */
const DRAGGING_CLASS = "is-entry-dragging";
/** On <html> while the pointer is over no valid destination. */
const NO_DROP_CLASS = "is-entry-no-drop";

const isAtOrUnder = (path: string, base: string): boolean =>
  path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}\\`);

type UseEntryDragMoveOptions = {
  rootPath: string | null;
  /** Moves `source` into the folder `destination`. */
  onMove: (source: string, destination: string) => void;
};

export const useEntryDragMove = ({
  rootPath,
  onMove,
}: UseEntryDragMoveOptions) => {
  const ghostRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const highlightRef = useRef<HTMLElement | null>(null);
  const destinationRef = useRef<string | null>(null);

  const clearHighlight = () => {
    highlightRef.current?.classList.remove(DRAG_OVER_CLASS);
    highlightRef.current = null;
  };

  /**
   * The folder a drop at (x, y) would move `source` into: a folder row, the
   * folder of a file row (like VS Code), or the workspace root on empty tree
   * space. Null when that is not a valid move.
   */
  const resolveDestination = (source: string, x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    const row = element?.closest<HTMLElement>(".Explorer_row[data-path]");
    let folder: string | null = null;
    if (row?.dataset.path) {
      folder =
        row.dataset.directory === "true"
          ? row.dataset.path
          : parentPath(row.dataset.path);
    } else if (element && treeRef.current?.contains(element)) {
      folder = rootPath;
    }
    if (
      !folder ||
      isAtOrUnder(folder, source) ||
      folder === parentPath(source)
    ) {
      return null;
    }
    return folder;
  };

  const highlightFor = (folder: string): HTMLElement | null =>
    folder === rootPath
      ? treeRef.current
      : document.querySelector<HTMLElement>(
          `.Explorer_row[data-path="${CSS.escape(folder)}"]`,
        );

  const endDrag = () => {
    clearHighlight();
    draggingRef.current = false;
    destinationRef.current = null;
    document.documentElement.classList.remove(DRAGGING_CLASS, NO_DROP_CLASS);
  };

  const bind = useDrag(
    ({ args: [source], movement: [mx, my], xy: [x, y], last }) => {
      const sourcePath = source as string;
      // Gate on real movement so a click still opens/toggles the entry.
      if (!draggingRef.current) {
        if (last || Math.hypot(mx, my) < DRAG_THRESHOLD_PX) return;
        draggingRef.current = true;
        if (ghostRef.current) {
          ghostRef.current.textContent = pathName(sourcePath);
        }
        document.documentElement.classList.add(DRAGGING_CLASS);
      }

      if (last) {
        const destination = destinationRef.current;
        endDrag();
        if (destination) onMove(sourcePath, destination);
        return;
      }

      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${x + GHOST_OFFSET}px, ${
          y + GHOST_OFFSET
        }px, 0)`;
      }
      const destination = resolveDestination(sourcePath, x, y);
      destinationRef.current = destination;
      document.documentElement.classList.toggle(NO_DROP_CLASS, !destination);
      const highlight = destination ? highlightFor(destination) : null;
      if (highlight !== highlightRef.current) {
        clearHighlight();
        if (highlight) {
          highlight.classList.add(DRAG_OVER_CLASS);
          highlightRef.current = highlight;
        }
      }
    },
    // filterTaps keeps clicks working; keys:false disables arrow-key dragging.
    { filterTaps: true, pointer: { keys: false } },
  );

  return { bind, ghostRef, treeRef };
};
