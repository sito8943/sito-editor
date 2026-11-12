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
import { ProjectSearch, useProjectSearch } from "@/features/search";
import { TerminalPanel } from "@/features/terminal";
import { Workbench } from "@/features/workbench";
import { t } from "@/lang";
import { DataChoices, USAGE_EVENT, useUsage } from "@/shared/usage";

import { useFileOperations } from "./hooks/useFileOperations";
import { useLaunchPath } from "./hooks/useLaunchPath";
import { useWorkspaceActions } from "./hooks/useWorkspaceActions";
import { useWorkspaceSession } from "./hooks/useWorkspaceSession";
import { useWorkspaceWatcher } from "./hooks/useWorkspaceWatcher";

import "@/styles/views/App.css";

const App = () => {
  const usage = useUsage();
  const workspaceTree = useWorkspaceTree();
  const documents = useDocuments();
  useEditorCommands(documents);
  useExplorerCommands(workspaceTree);
  useFileOperations(workspaceTree, documents);
  useWorkspaceWatcher(workspaceTree, documents);
  const workspaceActions = useWorkspaceActions(workspaceTree, documents);
  const launch = useLaunchPath(workspaceActions.openPath);
  const session = useWorkspaceSession({
    tree: workspaceTree,
    documents,
    // A `sito-editor <path>` launch wins over reopening the last workspace.
    restoreLastWorkspace: launch.ready ? !launch.hasLaunchPath : null,
  });
  const quickOpen = useQuickOpen({
    rootPath: workspaceTree.rootPath,
    recentPaths: session.recentPaths,
    onOpenFile: documents.openDocument,
  });
  const fileHistory = useFileHistory({
    rootPath: workspaceTree.rootPath,
    activePath: documents.activePath,
    onOpenFile: documents.openDocument,
  });

  const projectSearch = useProjectSearch({
    rootPath: workspaceTree.rootPath,
    onOpenMatch: documents.openDocumentAt,
  });

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
          onOpenFolder={() => void workspaceActions.openFolder()}
        />
        <ProjectSearch state={projectSearch} />
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
        <button
          type="button"
          className="App_statusButton"
          onClick={() => {
            usage.track(USAGE_EVENT.PRIVACY.OPEN_CHOICES);
            usage.openNotice();
          }}
        >
          {t.privacy.status(usage.analytics)}
        </button>
      </footer>

      <DataChoices />
    </div>
  );
};

export default App;
