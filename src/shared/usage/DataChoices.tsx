import { useEffect, useState } from "react";
import { Button } from "@sito/ui";

import { t } from "@/lang";

import { DATA_CHOICES_TITLE_ID } from "./constants";
import { useUsage } from "./UsageContext";

import "@/styles/components/DataChoices.css";

// Based on sito-file-browser's notice. Asks whether anonymous usage counts may
// be sent. Non-modal, never blocks. Slides in and out; it stays mounted while
// the exit animation plays.
export const DataChoices = () => {
  const { isNoticeOpen, setAnalytics } = useUsage();
  const [mounted, setMounted] = useState(isNoticeOpen);

  useEffect(() => {
    if (isNoticeOpen) setMounted(true);
  }, [isNoticeOpen]);

  if (!mounted) return null;

  return (
    <section
      className={isNoticeOpen ? "DataChoices" : "DataChoices leaving"}
      role="dialog"
      aria-live="polite"
      aria-labelledby={DATA_CHOICES_TITLE_ID}
      onAnimationEnd={() => {
        if (!isNoticeOpen) setMounted(false);
      }}
    >
      <h2 id={DATA_CHOICES_TITLE_ID} className="DataChoices_title">
        {t.privacy.notice.title}
      </h2>
      <p className="DataChoices_body">{t.privacy.notice.body}</p>
      <div className="DataChoices_actions">
        <Button
          size="sm"
          variant="outlined"
          onClick={() => setAnalytics(false)}
        >
          {t.privacy.notice.decline}
        </Button>
        <Button
          type="button"
          size="sm"
          color="primary"
          variant="submit"
          onClick={() => setAnalytics(true)}
        >
          {t.privacy.notice.accept}
        </Button>
      </div>
    </section>
  );
};
