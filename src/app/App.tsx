import { Button } from "@sito/ui";
import { confirm, message } from "@tauri-apps/plugin-dialog";

import { AgentDashboard } from "@/features/agents";
import {
  EditorSurface,
  useDocuments,
  useEditorCommands,
} from "@/features/editor";
import {
  Explorer,
  useExplorerCommands,
  useWorkspaceTree,
} from "@/features/explorer";
import { PathBar, useFileHistory, useQuickOpen } from "@/features/navigation";
import { TerminalPanel } from "@/features/terminal";
import { Workbench } from "@/features/workbench";
import { t } from "@/lang";

import "@/styles/views/App.css";

const App = () => {
  const workspaceTree = useWorkspaceTree();
  const documents = useDocuments();
  useEditorCommands(documents);
  useExplorerCommands(workspaceTree);
  const quickOpen = useQuickOpen({
    rootPath: workspaceTree.rootPath,
    onOpenFile: documents.openDocument,
  });
  const fileHistory = useFileHistory({
    rootPath: workspaceTree.rootPath,
    activePath: documents.activePath,
    onOpenFile: documents.openDocument,
  });

  const chooseWorkspace = async () => {
    if (documents.hasSavingDocuments) {
      await message(t.editor.waitForSave, {
        title: t.app.name,
        kind: "warning",
      });
      return;
    }

    if (
      documents.hasDirtyDocuments &&
      !(await confirm(t.editor.discardWorkspaceChanges, {
        title: t.app.name,
        kind: "warning",
      }))
    ) {
      return;
    }

    const selected = await workspaceTree.chooseWorkspace();
    if (selected) documents.resetDocuments();
  };

  return (
    <div className="App">
      <header className="App_header">
        <div className="App_identity">
          <strong>{t.app.name}</strong>
        </div>
        <PathBar
          rootPath={workspaceTree.rootPath}
          activePath={documents.activePath}
          history={fileHistory}
          quickOpen={quickOpen}
        />
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
            activePath={documents.activePath}
          />
        }
        editor={<EditorSurface state={documents} />}
        agents={<AgentDashboard />}
        terminal={<TerminalPanel />}
      />

      <footer className="App_status">
        <span>{t.app.editingMilestone}</span>
        <span>{workspaceTree.rootName ?? t.explorer.noWorkspace}</span>
      </footer>
    </div>
  );
};

export default App;
