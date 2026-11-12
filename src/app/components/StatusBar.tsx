import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "@sito/ui";

import type { EditorStatus } from "@/features/editor";
import { t } from "@/lang";
import { USAGE_EVENT, useUsage } from "@/shared/usage";

import "@/styles/components/StatusBar.css";

type StatusBarProps = {
  rootName: string | null;
  branch: string | null;
  /** Null when no document is open. */
  editor: EditorStatus | null;
};

/** Bottom bar: workspace and branch on the left; cursor, language and usage choice on the right. */
export const StatusBar = ({ rootName, branch, editor }: StatusBarProps) => {
  const usage = useUsage();

  return (
    <footer className="StatusBar">
      <div className="StatusBar_group">
        <span>{rootName ?? t.explorer.noWorkspace}</span>
        {branch && (
          <Tooltip label={t.status.branch}>
            <span className="StatusBar_branch">
              <FontAwesomeIcon icon={faCodeBranch} />
              {branch}
            </span>
          </Tooltip>
        )}
      </div>
      <div className="StatusBar_group">
        {editor && (
          <>
            <span>{t.status.position(editor.line, editor.column)}</span>
            <span>{editor.language ?? t.status.plainText}</span>
          </>
        )}
        <button
          type="button"
          className="StatusBar_button"
          onClick={() => {
            usage.track(USAGE_EVENT.PRIVACY.OPEN_CHOICES);
            usage.openNotice();
          }}
        >
          {t.privacy.status(usage.analytics)}
        </button>
      </div>
    </footer>
  );
};
