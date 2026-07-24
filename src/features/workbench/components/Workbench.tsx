import type { WorkbenchProps } from "../types";

import "@/styles/components/Workbench.css";

export const Workbench = ({
  explorer,
  editor,
  agents,
  terminal,
}: WorkbenchProps) => (
  <main className="Workbench">
    <div className="Workbench_explorer">{explorer}</div>
    <div className="Workbench_editor">{editor}</div>
    <div className="Workbench_agents">{agents}</div>
    <div className="Workbench_terminal">{terminal}</div>
  </main>
);
