import { EditorView } from "codemirror";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import {
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import {
  highlightSelectionMatches,
  search,
  searchKeymap,
} from "@codemirror/search";

const SYNTAX_HIGHLIGHT_STYLE = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.modifier, tags.controlKeyword, tags.moduleKeyword],
    color: "var(--color-syntax-keyword)",
  },
  {
    tag: [tags.string, tags.special(tags.string), tags.regexp],
    color: "var(--color-syntax-string)",
  },
  {
    tag: [tags.number, tags.bool, tags.null, tags.atom],
    color: "var(--color-syntax-number)",
  },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
    color: "var(--color-syntax-comment)",
    fontStyle: "italic",
  },
  {
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.macroName,
    ],
    color: "var(--color-syntax-function)",
  },
  {
    tag: [tags.typeName, tags.className, tags.namespace],
    color: "var(--color-syntax-type)",
  },
  {
    tag: [tags.propertyName, tags.attributeName],
    color: "var(--color-syntax-property)",
  },
  {
    tag: [tags.operator, tags.punctuation, tags.separator],
    color: "var(--color-syntax-operator)",
  },
  { tag: [tags.tagName, tags.angleBracket], color: "var(--color-syntax-tag)" },
  {
    tag: [tags.heading, tags.strong],
    color: "var(--color-syntax-heading)",
    fontWeight: "bold",
  },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.link, color: "var(--color-accent)", textDecoration: "underline" },
  { tag: tags.invalid, color: "var(--color-danger)" },
]);

export const EDITOR_EXTENSIONS = [
  syntaxHighlighting(SYNTAX_HIGHLIGHT_STYLE),
  lineNumbers(),
  highlightActiveLine(),
  highlightActiveLineGutter(),
  // Cmd/Ctrl+F find, Cmd/Ctrl+Alt+F replace (via panel), Cmd/Ctrl+G next match,
  // Cmd/Ctrl+Alt+G go to line, Cmd/Ctrl+D select next occurrence.
  search({ top: true }),
  highlightSelectionMatches(),
  keymap.of(searchKeymap),
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
    ".cm-panels": {
      backgroundColor: "var(--color-panel)",
      color: "var(--color-text)",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "1px solid var(--color-border)",
    },
    ".cm-panel input[type=text], .cm-textfield": {
      backgroundColor: "var(--color-editor)",
      color: "var(--color-text)",
      border: "1px solid var(--color-border-strong)",
      borderRadius: "4px",
    },
    ".cm-panel button, .cm-button": {
      backgroundImage: "none",
      backgroundColor: "var(--color-panel-raised)",
      color: "var(--color-text)",
      border: "1px solid var(--color-border-strong)",
      borderRadius: "4px",
    },
    ".cm-searchMatch": {
      backgroundColor: "rgb(224 175 104 / 0.25)",
      outline: "1px solid rgb(224 175 104 / 0.5)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgb(122 162 247 / 0.35)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "rgb(122 162 247 / 0.15)",
    },
    // The drawn caret itself is styled in CodeEditor.css (--color-editor-caret).
    ".cm-content": {
      caretColor: "var(--color-editor-caret)",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgb(122 162 247 / 0.3)",
      },
  }, { dark: true }),
];
