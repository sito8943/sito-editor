/**
 * Small JSON wrapper over localStorage. Storage can be unavailable or full,
 * so every access falls back silently: this only holds conveniences
 * (last workspace, open tabs, recent files) that the app can live without.
 */
export const STORAGE_KEY = {
  LAST_WORKSPACE: "sito-editor:last-workspace",
  session: (rootPath: string) => `sito-editor:session:${rootPath}`,
} as const;

export const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

export const writeJson = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/availability errors.
  }
};

export const removeKey = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore availability errors.
  }
};
