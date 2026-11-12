import { useEffect, useRef } from "react";
import { EditorView, minimalSetup } from "codemirror";
import { Compartment, Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { gotoLine, searchPanelOpen } from "@codemirror/search";

import { USAGE_EVENT, useUsage } from "@/shared/usage";

import { EDITOR_EXTENSIONS } from "./constants";
import { loadLanguage } from "./language";
import type { CodeEditorProps } from "../../types";

import "@/styles/components/CodeEditor.css";

export const CodeEditor = ({
  path,
  label,
  value,
  readonly,
  reveal,
  onRevealed,
  onChange,
}: CodeEditorProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRevealedRef = useRef(onRevealed);
  const { track } = useUsage();
  const trackRef = useRef(track);
  trackRef.current = track;

  onChangeRef.current = onChange;
  onRevealedRef.current = onRevealed;

  useEffect(() => {
    if (!hostRef.current) return;

    const languageCompartment = new Compartment();
    let disposed = false;

    const view = new EditorView({
      doc: value,
      extensions: [
        minimalSetup,
        ...EDITOR_EXTENSIONS,
        languageCompartment.of([]),
        // Counts Go to line (same binding as searchKeymap, which it precedes).
        Prec.high(
          keymap.of([
            {
              key: "Mod-Alt-g",
              run: (view) => {
                trackRef.current(USAGE_EVENT.EDITOR.GO_TO_LINE);
                return gotoLine(view);
              },
            },
          ]),
        ),
        EditorView.editable.of(!readonly),
        EditorView.updateListener.of((update) => {
          if (
            searchPanelOpen(update.state) &&
            !searchPanelOpen(update.startState)
          ) {
            trackRef.current(USAGE_EVENT.EDITOR.FIND);
          }
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.contentAttributes.of({ "aria-label": label }),
      ],
      parent: hostRef.current,
    });
    viewRef.current = view;

    void loadLanguage(path).then((language) => {
      if (disposed || !language) return;
      view.dispatch({ effects: languageCompartment.reconfigure(language) });
    });

    return () => {
      disposed = true;
      view.destroy();
      viewRef.current = null;
    };
  }, [path, label, readonly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    });
  }, [value]);

  // Declared after the view is created, so it also runs on mount.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !reveal) return;

    const { doc } = view.state;
    const line = doc.line(Math.min(Math.max(reveal.line, 1), doc.lines));
    const anchor = Math.min(line.from + reveal.column, line.to);
    const head = Math.min(anchor + reveal.length, line.to);
    view.dispatch({
      selection: { anchor, head },
      effects: EditorView.scrollIntoView(anchor, { y: "center" }),
    });
    view.focus();
    onRevealedRef.current?.();
  }, [reveal]);

  return <div className="CodeEditor" ref={hostRef} />;
};
