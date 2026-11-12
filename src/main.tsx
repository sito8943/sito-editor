import React from "react";
import ReactDOM from "react-dom/client";
import {
  CommandProvider,
  HotkeyProvider,
} from "@sito/commands/react";

import App from "./app/App";
import { USAGE_FEATURES } from "./app/usage";
import { UsageProvider } from "./shared/usage";
import {
  APP_HOTKEY_CONFIG,
  APP_KEYMAP,
  createAppCommandRegistry,
} from "./app/commands";

import "@sito/ui/styles.css";
import "./styles/theme.css";
import "./styles/index.css";

import { installDevErrorOverlay } from "./app/devErrorOverlay";

// Dev-only full-screen error overlay (see devErrorOverlay); no-op in production builds.
installDevErrorOverlay();

const commandRegistry = createAppCommandRegistry();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CommandProvider registry={commandRegistry}>
      <HotkeyProvider
        keymap={APP_KEYMAP}
        config={APP_HOTKEY_CONFIG}
      >
        <UsageProvider features={USAGE_FEATURES}>
          <App />
        </UsageProvider>
      </HotkeyProvider>
    </CommandProvider>
  </React.StrictMode>,
);
