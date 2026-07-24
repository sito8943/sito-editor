import { useCallback, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  RefObject,
} from "react";

type WorkbenchPane = "explorer" | "agents" | "terminal";

type WorkbenchSizes = {
  explorer: number;
  agents: number;
  terminal: number;
};

type ActiveResize = {
  pane: WorkbenchPane;
  pointerId: number;
  startPosition: number;
  startSize: number;
};

const DEFAULT_SIZES: WorkbenchSizes = {
  explorer: 256,
  agents: 272,
  terminal: 208,
};

const PANE_LIMITS: Record<
  WorkbenchPane,
  { min: number; max: number }
> = {
  explorer: { min: 184, max: 480 },
  agents: { min: 220, max: 480 },
  terminal: { min: 112, max: 420 },
};

const CENTER_MIN_WIDTH = 320;
const EDITOR_MIN_HEIGHT = 180;
const RESIZER_SIZE = 6;
const KEYBOARD_STEP = 16;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const pointerPosition = (
  pane: WorkbenchPane,
  event: PointerEvent<HTMLDivElement>,
): number => (pane === "terminal" ? event.clientY : event.clientX);

export type WorkbenchLayoutController = {
  containerRef: RefObject<HTMLElement | null>;
  sizes: WorkbenchSizes;
  style: CSSProperties;
  limitsFor: (pane: WorkbenchPane) => { min: number; max: number };
  startResize: (
    pane: WorkbenchPane,
    event: PointerEvent<HTMLDivElement>,
  ) => void;
  moveResize: (event: PointerEvent<HTMLDivElement>) => void;
  finishResize: (event: PointerEvent<HTMLDivElement>) => void;
  resizeWithKeyboard: (
    pane: WorkbenchPane,
    event: KeyboardEvent<HTMLDivElement>,
  ) => void;
  resetPane: (pane: WorkbenchPane) => void;
};

export const useWorkbenchLayout = (): WorkbenchLayoutController => {
  const containerRef = useRef<HTMLElement>(null);
  const activeResize = useRef<ActiveResize | null>(null);
  const [sizes, setSizes] = useState<WorkbenchSizes>(DEFAULT_SIZES);

  const limitsFor = useCallback(
    (pane: WorkbenchPane) => {
      const limits = PANE_LIMITS[pane];
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return limits;

      if (pane === "explorer") {
        return {
          min: limits.min,
          max: Math.max(
            limits.min,
            Math.min(
              limits.max,
              bounds.width -
                sizes.agents -
                CENTER_MIN_WIDTH -
                RESIZER_SIZE * 2,
            ),
          ),
        };
      }

      if (pane === "agents") {
        return {
          min: limits.min,
          max: Math.max(
            limits.min,
            Math.min(
              limits.max,
              bounds.width -
                sizes.explorer -
                CENTER_MIN_WIDTH -
                RESIZER_SIZE * 2,
            ),
          ),
        };
      }

      return {
        min: limits.min,
        max: Math.max(
          limits.min,
          Math.min(
            limits.max,
            bounds.height - EDITOR_MIN_HEIGHT - RESIZER_SIZE,
          ),
        ),
      };
    },
    [sizes.agents, sizes.explorer],
  );

  const setPaneSize = useCallback(
    (pane: WorkbenchPane, value: number) => {
      const limits = limitsFor(pane);
      setSizes((current) => ({
        ...current,
        [pane]: clamp(value, limits.min, limits.max),
      }));
    },
    [limitsFor],
  );

  const startResize = useCallback(
    (
      pane: WorkbenchPane,
      event: PointerEvent<HTMLDivElement>,
    ) => {
      if (event.button !== 0) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      activeResize.current = {
        pane,
        pointerId: event.pointerId,
        startPosition: pointerPosition(pane, event),
        startSize: sizes[pane],
      };
    },
    [sizes],
  );

  const moveResize = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = activeResize.current;
      if (!active || active.pointerId !== event.pointerId) return;

      const delta =
        pointerPosition(active.pane, event) - active.startPosition;
      const direction = active.pane === "explorer" ? 1 : -1;
      setPaneSize(
        active.pane,
        active.startSize + delta * direction,
      );
    },
    [setPaneSize],
  );

  const finishResize = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (activeResize.current?.pointerId !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activeResize.current = null;
    },
    [],
  );

  const resizeWithKeyboard = useCallback(
    (
      pane: WorkbenchPane,
      event: KeyboardEvent<HTMLDivElement>,
    ) => {
      const limits = limitsFor(pane);
      let nextSize: number | null = null;

      if (event.key === "Home") nextSize = limits.min;
      if (event.key === "End") nextSize = limits.max;

      if (pane === "explorer") {
        if (event.key === "ArrowLeft") {
          nextSize = sizes[pane] - KEYBOARD_STEP;
        }
        if (event.key === "ArrowRight") {
          nextSize = sizes[pane] + KEYBOARD_STEP;
        }
      } else if (pane === "agents") {
        if (event.key === "ArrowLeft") {
          nextSize = sizes[pane] + KEYBOARD_STEP;
        }
        if (event.key === "ArrowRight") {
          nextSize = sizes[pane] - KEYBOARD_STEP;
        }
      } else {
        if (event.key === "ArrowUp") {
          nextSize = sizes[pane] + KEYBOARD_STEP;
        }
        if (event.key === "ArrowDown") {
          nextSize = sizes[pane] - KEYBOARD_STEP;
        }
      }

      if (nextSize === null) return;
      event.preventDefault();
      setPaneSize(pane, nextSize);
    },
    [limitsFor, setPaneSize, sizes],
  );

  const resetPane = useCallback(
    (pane: WorkbenchPane) => {
      setPaneSize(pane, DEFAULT_SIZES[pane]);
    },
    [setPaneSize],
  );

  const style = useMemo(
    () =>
      ({
        "--workbench-explorer-width": `${sizes.explorer}px`,
        "--workbench-agents-width": `${sizes.agents}px`,
        "--workbench-terminal-height": `${sizes.terminal}px`,
      }) as CSSProperties,
    [sizes],
  );

  return {
    containerRef,
    sizes,
    style,
    limitsFor,
    startResize,
    moveResize,
    finishResize,
    resizeWithKeyboard,
    resetPane,
  };
};
