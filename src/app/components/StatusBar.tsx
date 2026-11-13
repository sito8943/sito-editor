import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeBranch, faRobot } from "@fortawesome/free-solid-svg-icons";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSubmenu,
  Tooltip,
  useContextMenu,
} from "@sito/ui";
import { formatBinding } from "@sito/commands";

import type { EditorStatus } from "@/features/editor";
import { t } from "@/lang";
import {
  FONT_SIZES,
  FONT_TARGET,
  TAB_SIZES,
  TERMINAL_ENGINE,
  useSettings,
} from "@/shared/settings";
import { USAGE_EVENT, useUsage } from "@/shared/usage";

import { APP_COMMAND, APP_KEYMAP, type AppCommandId } from "../commands";

import "@/styles/components/StatusBar.css";

/** One text-size submenu per area; the hotkeys act on the focused one. */
const FONT_MENUS = [
  { target: FONT_TARGET.EDITOR, label: t.settings.editorFontSize },
  { target: FONT_TARGET.TERMINAL, label: t.settings.terminalFontSize },
] as const;

/** Switching restarts the open terminals (see TerminalPanel). */
const TERMINAL_ENGINES = [
  { engine: TERMINAL_ENGINE.XTERM, label: t.settings.engineXterm },
  { engine: TERMINAL_ENGINE.GHOSTTY, label: t.settings.engineGhostty },
] as const;

type StatusBarProps = {
  rootName: string | null;
  branch: string | null;
  /** Null when no document is open. */
  editor: EditorStatus | null;
  /** The Agents pane toggle: live sessions and whether one needs you. */
  agents: {
    count: number;
    needsYou: boolean;
    open: boolean;
    onToggle: () => void;
  };
};

/** Bottom bar: workspace and branch on the left; cursor, language and usage choice on the right. */
export const StatusBar = ({
  rootName,
  branch,
  editor,
  agents,
}: StatusBarProps) => {
  const usage = useUsage();
  const editorSettings = useSettings();
  const { settings } = editorSettings;
  const menu = useContextMenu<null>();
  const shortcutOf = (command: AppCommandId) =>
    formatBinding(APP_KEYMAP[command]);
  // Each menu action runs, then the menu closes.
  const pick = (action: () => void) => () => {
    action();
    menu.close();
  };

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
            <Tooltip label={t.settings.menu}>
              <button
                type="button"
                className="StatusBar_button"
                aria-haspopup="menu"
                aria-expanded={menu.open}
                onClick={(event) => {
                  usage.track(USAGE_EVENT.SETTINGS.OPEN_MENU);
                  const rect = event.currentTarget.getBoundingClientRect();
                  menu.openAt(rect.left, rect.top, null);
                }}
              >
                {t.settings.spaces(settings.tabSize)}
              </button>
            </Tooltip>
            <span>{editor.language ?? t.status.plainText}</span>
          </>
        )}
        <button
          type="button"
          className={
            agents.needsYou
              ? "StatusBar_button StatusBar_agents StatusBar_agents--needsYou"
              : "StatusBar_button StatusBar_agents"
          }
          aria-pressed={agents.open}
          onClick={agents.onToggle}
        >
          <FontAwesomeIcon icon={faRobot} />
          {t.agents.statusCount(agents.count)}
        </button>
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

      <ContextMenu
        open={menu.open}
        position={menu.position}
        onClose={menu.close}
        ariaLabel={t.settings.menu}
      >
        {FONT_MENUS.map(({ target, label }) => (
          <ContextMenuSubmenu key={target} label={label}>
            <ContextMenuItem
              shortcut={shortcutOf(APP_COMMAND.FONT_BIGGER)}
              onClick={pick(() => editorSettings.changeFontSize(target, 1))}
            >
              {t.settings.bigger}
            </ContextMenuItem>
            <ContextMenuItem
              shortcut={shortcutOf(APP_COMMAND.FONT_SMALLER)}
              onClick={pick(() => editorSettings.changeFontSize(target, -1))}
            >
              {t.settings.smaller}
            </ContextMenuItem>
            <ContextMenuItem
              shortcut={shortcutOf(APP_COMMAND.FONT_RESET)}
              onClick={pick(() => editorSettings.resetFontSize(target))}
            >
              {t.settings.resetSize}
            </ContextMenuItem>
            <ContextMenuSeparator />
            {FONT_SIZES.map((size) => (
              <ContextMenuItem
                key={size}
                checked={settings.fontSize[target] === size}
                onClick={pick(() => editorSettings.setFontSize(target, size))}
              >
                {t.settings.fontSizeValue(size)}
              </ContextMenuItem>
            ))}
          </ContextMenuSubmenu>
        ))}
        <ContextMenuSubmenu label={t.settings.terminalEngine}>
          {TERMINAL_ENGINES.map(({ engine, label }) => (
            <ContextMenuItem
              key={engine}
              checked={settings.terminalEngine === engine}
              onClick={pick(() => editorSettings.setTerminalEngine(engine))}
            >
              {label}
            </ContextMenuItem>
          ))}
        </ContextMenuSubmenu>
        <ContextMenuSeparator />
        <ContextMenuSubmenu label={t.settings.tabSize}>
          {TAB_SIZES.map((size) => (
            <ContextMenuItem
              key={size}
              checked={settings.tabSize === size}
              onClick={pick(() => editorSettings.setTabSize(size))}
            >
              {t.settings.tabSizeValue(size)}
            </ContextMenuItem>
          ))}
        </ContextMenuSubmenu>
        <ContextMenuItem
          checked={settings.wordWrap}
          shortcut={shortcutOf(APP_COMMAND.TOGGLE_WORD_WRAP)}
          onClick={pick(editorSettings.toggleWordWrap)}
        >
          {t.settings.wordWrap}
        </ContextMenuItem>
      </ContextMenu>
    </footer>
  );
};
