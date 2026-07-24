import { EditorView } from "codemirror";

export const EDITOR_EXTENSIONS = [
  EditorView.lineWrapping,
  EditorView.theme({
    "&": {
      height: "100%",
      backgroundColor: "var(--color-editor)",
      color: "var(--color-text)",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      lineHeight: "var(--line-height-editor)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-editor)",
      borderColor: "var(--color-border)",
      color: "var(--color-text-muted)",
    },
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "var(--color-editor-active-line)",
    },
  }),
];
