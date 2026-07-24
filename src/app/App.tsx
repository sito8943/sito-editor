import { Button } from "@sito/ui";

import { AgentDashboard } from "@/features/agents";
import { EditorSurface, useDocuments } from "@/features/editor";
import { Explorer, useWorkspaceTree } from "@/features/explorer";
import { TerminalPanel } from "@/features/terminal";
import { Workbench } from "@/features/workbench";
import { t } from "@/lang";

import "@/styles/views/App.css";

const App = () => {
  const workspaceTree = useWorkspaceTree();
  const documents = useDocuments();

  const chooseWorkspace = async () => {
    const selected = await workspaceTree.chooseWorkspace();
    if (selected) documents.resetDocuments();
  };

  return (
    <div className="App">
      <header className="App_header">
        <div className="App_identity">
          <strong>{t.app.name}</strong>
          <span>{workspaceTree.rootPath ?? t.app.readOnlyMilestone}</span>
        </div>
        <Button
          color="primary"
          size="sm"
          variant="outlined"
          onClick={() => void chooseWorkspace()}
        >
          {t.app.openWorkspace}
        </Button>
      </header>

      <Workbench
        explorer={
          <Explorer
            tree={workspaceTree}
            onOpenDocument={(path) => void documents.openDocument(path)}
          />
        }
        editor={<EditorSurface state={documents} />}
        agents={<AgentDashboard />}
        terminal={<TerminalPanel />}
      />

      <footer className="App_status">
        <span>{t.app.readOnlyMilestone}</span>
        <span>{workspaceTree.rootName ?? t.explorer.noWorkspace}</span>
      </footer>
    </div>
  );
};

export default App;
