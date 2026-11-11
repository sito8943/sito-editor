import { useEffect, useRef } from "react";
import { EditorView, minimalSetup } from "codemirror";
import { Compartment } from "@codemirror/state";

import { EDITOR_EXTENSIONS } from "./constants";
import { loadLanguage } from "./language";
import type { CodeEditorProps } from "../../types";

import "@/styles/components/CodeEditor.css";

export const CodeEditor = ({
  path,
  label,
  value,
  readonly,
  onChange,
}: CodeEditorProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

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
        EditorView.editable.of(!readonly),
        EditorView.updateListener.of((update) => {
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

  return <div className="CodeEditor" ref={hostRef} />;
};
