import { t } from "@/lang";

import { useWorkbenchLayout } from "../hooks/useWorkbenchLayout";
import type { WorkbenchProps } from "../types";

import "@/styles/components/Workbench.css";

export const Workbench = ({
  explorer,
  editor,
  agents,
  terminal,
}: WorkbenchProps) => {
  const layout = useWorkbenchLayout();
  const explorerLimits = layout.limitsFor("explorer");
  const agentsLimits = layout.limitsFor("agents");
  const terminalLimits = layout.limitsFor("terminal");

  return (
    <main
      className="Workbench"
      ref={layout.containerRef}
      style={layout.style}
    >
      <div className="Workbench_explorer">{explorer}</div>
      <div
        className="Workbench_resizer Workbench_explorerResizer"
        role="separator"
        tabIndex={0}
        aria-label={t.workbench.resizeExplorer}
        aria-orientation="vertical"
        aria-valuemin={explorerLimits.min}
        aria-valuemax={explorerLimits.max}
        aria-valuenow={layout.sizes.explorer}
        onDoubleClick={() => layout.resetPane("explorer")}
        onKeyDown={(event) =>
          layout.resizeWithKeyboard("explorer", event)
        }
        onPointerDown={(event) =>
          layout.startResize("explorer", event)
        }
        onPointerMove={layout.moveResize}
        onPointerUp={layout.finishResize}
        onPointerCancel={layout.finishResize}
        onLostPointerCapture={layout.finishResize}
      />
      <div className="Workbench_editor">{editor}</div>
      <div
        className="Workbench_resizer Workbench_agentsResizer"
        role="separator"
        tabIndex={0}
        aria-label={t.workbench.resizeAgents}
        aria-orientation="vertical"
        aria-valuemin={agentsLimits.min}
        aria-valuemax={agentsLimits.max}
        aria-valuenow={layout.sizes.agents}
        onDoubleClick={() => layout.resetPane("agents")}
        onKeyDown={(event) =>
          layout.resizeWithKeyboard("agents", event)
        }
        onPointerDown={(event) =>
          layout.startResize("agents", event)
        }
        onPointerMove={layout.moveResize}
        onPointerUp={layout.finishResize}
        onPointerCancel={layout.finishResize}
        onLostPointerCapture={layout.finishResize}
      />
      <div className="Workbench_agents">{agents}</div>
      <div
        className="Workbench_resizer Workbench_terminalResizer"
        role="separator"
        tabIndex={0}
        aria-label={t.workbench.resizeTerminal}
        aria-orientation="horizontal"
        aria-valuemin={terminalLimits.min}
        aria-valuemax={terminalLimits.max}
        aria-valuenow={layout.sizes.terminal}
        onDoubleClick={() => layout.resetPane("terminal")}
        onKeyDown={(event) =>
          layout.resizeWithKeyboard("terminal", event)
        }
        onPointerDown={(event) =>
          layout.startResize("terminal", event)
        }
        onPointerMove={layout.moveResize}
        onPointerUp={layout.finishResize}
        onPointerCancel={layout.finishResize}
        onLostPointerCapture={layout.finishResize}
      />
      <div className="Workbench_terminal">{terminal}</div>
    </main>
  );
};
