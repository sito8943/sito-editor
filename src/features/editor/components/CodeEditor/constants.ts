import { EditorView } from "codemirror";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

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
