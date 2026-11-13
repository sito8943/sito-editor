import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlugCircleXmark,
  faTerminal,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@sito/ui";

import { t } from "@/lang";
import { FileIcon, SurfaceButton } from "@/shared/components";
import { formatElapsed } from "@/features/terminal/hooks/useTerminalActivity";
import { pathName } from "@/shared/utils";

import { AGENT_STATUS, type AgentDashboardProps, type AgentSession } from "../types";

import "@/styles/components/AgentDashboard.css";

/** Changed files shown per card before "+N". */
const FILES_SHOWN = 5;

const AgentCard = ({
  session,
  now,
  onOpenFile,
  onGoToTerminal,
}: {
  session: AgentSession;
  now: number;
} & Pick<AgentDashboardProps, "onOpenFile" | "onGoToTerminal">) => {
  const extra = session.files.length - FILES_SHOWN;
  // The whole card leads to the agent's terminal while it runs.
  const terminal =
    session.terminal !== null && session.status !== AGENT_STATUS.ENDED
      ? session.terminal
      : null;
  const goToTerminal = () => {
    if (terminal !== null) onGoToTerminal(terminal);
  };
  return (
    <article
      className={`AgentCard AgentCard--${session.status}${terminal !== null ? " AgentCard--link" : ""}`}
      role={terminal !== null ? "button" : undefined}
      tabIndex={terminal !== null ? 0 : undefined}
      aria-label={terminal !== null ? t.agents.goToTerminal : undefined}
      onClick={goToTerminal}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToTerminal();
        }
      }}
    >
      <header className="AgentCard_header">
        <span className="AgentCard_status">
          <span className="AgentCard_dot" aria-hidden="true" />
          {t.agents.status[session.status]}
        </span>
        <span className="AgentCard_elapsed">
          {formatElapsed(now - session.statusSince)}
        </span>
      </header>
      <p className="AgentCard_where">
        {session.cwd ? pathName(session.cwd) : t.agents.claude}
        {session.terminal !== null && ` · ${t.agents.terminal(session.terminal)}`}
      </p>
      {session.prompt && <p className="AgentCard_prompt">{session.prompt}</p>}
      {session.activity && session.status !== AGENT_STATUS.WAITING && (
        <p className="AgentCard_activity">{session.activity}</p>
      )}
      {session.files.length > 0 && (
        <ul className="AgentCard_files" aria-label={t.agents.files}>
          {session.files.slice(0, FILES_SHOWN).map((file) => (
            <li key={file}>
              <button
                type="button"
                className="AgentCard_file"
                title={file}
                onClick={(event) => {
                  // Opens the file only, without also jumping to the terminal.
                  event.stopPropagation();
                  onOpenFile(file);
                }}
              >
                <FileIcon name={pathName(file)} />
                <span>{pathName(file)}</span>
              </button>
            </li>
          ))}
          {extra > 0 && <li className="AgentCard_more">+{extra}</li>}
        </ul>
      )}
      {terminal !== null && (
        <FontAwesomeIcon
          icon={faTerminal}
          className="AgentCard_terminal"
          aria-hidden="true"
        />
      )}
    </article>
  );
};

/** Control tower for the agents running in this app's terminals. */
export const AgentDashboard = ({
  sessions,
  connected,
  now,
  onConnect,
  onDisconnect,
  onOpenFile,
  onGoToTerminal,
  onClose,
}: AgentDashboardProps) => (
  <aside className="AgentDashboard" aria-label={t.agents.title}>
    <header>
      <span>{t.agents.title}</span>
      <div className="AgentDashboard_actions">
        {connected && (
          <SurfaceButton
            icon={faPlugCircleXmark}
            label={t.agents.disconnect}
            size="xs"
            onClick={onDisconnect}
          />
        )}
        <SurfaceButton icon={faXmark} label={t.agents.close} size="xs" onClick={onClose} />
      </div>
    </header>
    <div className="AgentDashboard_body">
      {connected === false && (
        <div className="AgentDashboard_empty">
          <h2>{t.agents.connectTitle}</h2>
          <p>{t.agents.connectBody}</p>
          <Button
            type="button"
            size="sm"
            color="primary"
            variant="submit"
            onClick={onConnect}
          >
            {t.agents.connect}
          </Button>
        </div>
      )}
      {connected && sessions.length === 0 && (
        <div className="AgentDashboard_empty">
          <h2>{t.agents.emptyTitle}</h2>
          <p>{t.agents.emptyBody}</p>
        </div>
      )}
      {sessions.map((session) => (
        <AgentCard
          key={session.id}
          session={session}
          now={now}
          onOpenFile={onOpenFile}
          onGoToTerminal={onGoToTerminal}
        />
      ))}
    </div>
  </aside>
);

