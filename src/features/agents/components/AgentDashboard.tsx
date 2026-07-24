import { t } from "@/lang";

import "@/styles/components/AgentDashboard.css";

export const AgentDashboard = () => (
  <aside className="AgentDashboard" aria-label={t.agents.title}>
    <header>
      <span>{t.agents.title}</span>
    </header>
    <div className="AgentDashboard_empty">
      <h2>{t.agents.emptyTitle}</h2>
      <p>{t.agents.emptyBody}</p>
    </div>
  </aside>
);
