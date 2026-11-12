/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Usage service endpoint (https://api.usage.sito8943.com); empty turns counting off. */
  readonly VITE_USAGE_URL?: string;
  /** Public app key for `editor` in the usage service. */
  readonly VITE_USAGE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
