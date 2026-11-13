import { useEffect, useRef, useState } from "react";
import { confirm, message } from "@tauri-apps/plugin-dialog";

import {
  AGENT_STATUS,
  AgentDashboard,
  useAgentSessions,
} from "@/features/agents";
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
import { getClaudeConnection } from "@/shared/services/agents";
import { readJson, STORAGE_KEY, writeJson } from "@/shared/services/storage";
import { DataChoices, USAGE_EVENT, useUsage } from "@/shared/usage";

import { StatusBar } from "./components/StatusBar";
import { useFileOperations } from "./hooks/useFileOperations";
import { useGitBranch } from "./hooks/useGitBranch";
import { useGitBaseline, useGitStatus } from "./hooks/useGitStatus";
import { useLaunchPath } from "./hooks/useLaunchPath";
import { useSettingsHotkeys } from "./hooks/useSettingsHotkeys";
import { useWorkspaceActions } from "./hooks/useWorkspaceActions";
import { useWorkspaceSession } from "./hooks/useWorkspaceSession";
import { useWorkspaceWatcher } from "./hooks/useWorkspaceWatcher";

import "@/styles/views/App.css";

const App = () => {
  const workspaceTree = useWorkspaceTree();
  const documents = useDocuments();
  useEditorCommands(documents);
  useExplorerCommands(workspaceTree);
  useFileOperations(workspaceTree, documents);
  useWorkspaceWatcher(workspaceTree, documents);
  useSettingsHotkeys();
  const gitBranch = useGitBranch(workspaceTree.rootPath);
  const gitStatus = useGitStatus(workspaceTree.rootPath);
  const gitBaseline = useGitBaseline(documents.activePath, gitStatus);
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

  const { track } = useUsage();
  const agents = useAgentSessions();
  const [agentsOpen, setAgentsOpenState] = useState(() =>
    readJson<boolean>(STORAGE_KEY.AGENTS_OPEN, false),
  );
  const setAgentsOpen = (open: boolean) => {
    setAgentsOpenState(open);
    writeJson(STORAGE_KEY.AGENTS_OPEN, open);
  };
  const [terminalFocus, setTerminalFocus] = useState<{
    terminal: number;
    at: number;
  } | null>(null);
  const liveAgents = agents.sessions.filter(
    (session) => session.status !== AGENT_STATUS.ENDED,
  );

  // A new agent session opens the pane.
  const seenAgentsRef = useRef(0);
  useEffect(() => {
    if (agents.sessions.length > seenAgentsRef.current) setAgentsOpen(true);
    seenAgentsRef.current = agents.sessions.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents.sessions.length]);

  const connectAgents = async () => {
    const { settingsPath } = await getClaudeConnection();
    const ok = await confirm(t.agents.connectConfirm(settingsPath), {
      title: t.agents.connect,
      kind: "info",
      okLabel: t.agents.connect,
    });
    if (!ok) return;
    await agents.connect().catch((reason: unknown) =>
      message(t.agents.connectFailed(String(reason)), {
        title: t.app.name,
        kind: "error",
      }),
    );
  };

  const disconnectAgents = async () => {
    const ok = await confirm(t.agents.disconnectConfirm, {
      title: t.agents.disconnect,
      kind: "warning",
      okLabel: t.agents.disconnect,
    });
    if (!ok) return;
    await agents.disconnect().catch((reason: unknown) =>
      message(t.agents.connectFailed(String(reason)), {
        title: t.app.name,
        kind: "error",
      }),
    );
  };

  const agentStatus = new Map(
    [...agents.byTerminal].map(([terminal, session]) => [terminal, session.status]),
  );

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
            gitFiles={gitStatus?.files ?? null}
          />
        }
        editor={<EditorSurface state={documents} gitBaseline={gitBaseline} />}
        agents={
          agentsOpen ? (
            <AgentDashboard
              sessions={agents.sessions}
              connected={agents.connected}
              now={agents.now}
              onConnect={() => void connectAgents()}
              onDisconnect={() => void disconnectAgents()}
              onOpenFile={(path) => {
                track(USAGE_EVENT.AGENTS.OPEN_FILE);
                void documents.openDocument(path);
              }}
              onGoToTerminal={(terminal) => {
                track(USAGE_EVENT.AGENTS.GO_TO_TERMINAL);
                setTerminalFocus({ terminal, at: Date.now() });
              }}
              onClose={() => {
                track(USAGE_EVENT.AGENTS.TOGGLE_PANE);
                setAgentsOpen(false);
              }}
            />
          ) : undefined
        }
        terminal={
          <TerminalPanel
            cwd={workspaceTree.rootPath}
            focusRequest={terminalFocus}
            agentStatus={agentStatus}
          />
        }
      />

      <StatusBar
        rootName={workspaceTree.rootName}
        branch={gitBranch}
        editor={documents.activeDocument ? documents.editorStatus : null}
        agents={{
          count: liveAgents.length,
          needsYou: liveAgents.some(
            (session) => session.status === AGENT_STATUS.PERMISSION,
          ),
          open: agentsOpen,
          onToggle: () => {
            track(USAGE_EVENT.AGENTS.TOGGLE_PANE);
            setAgentsOpen(!agentsOpen);
          },
        }}
      />

      <DataChoices />
    </div>
  );
};

export default App;
