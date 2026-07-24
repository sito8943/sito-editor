import { t } from "@/lang";

import "@/styles/components/TerminalPanel.css";

export const TerminalPanel = () => (
  <section className="TerminalPanel" aria-label={t.terminal.title}>
    <header>
      <span>{t.terminal.title}</span>
    </header>
    <div className="TerminalPanel_pending">
      <strong>{t.terminal.pendingTitle}</strong>
      <span>{t.terminal.pendingBody}</span>
    </div>
  </section>
);
