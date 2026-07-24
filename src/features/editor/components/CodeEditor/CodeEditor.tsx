import { useEffect, useRef } from "react";
import { EditorView, minimalSetup } from "codemirror";

import { READONLY_EDITOR_EXTENSIONS } from "./constants";
import type { CodeEditorProps } from "../../types";

import "@/styles/components/CodeEditor.css";

export const CodeEditor = ({ label, value }: CodeEditorProps) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const view = new EditorView({
      doc: value,
      extensions: [
        minimalSetup,
        ...READONLY_EDITOR_EXTENSIONS,
        EditorView.contentAttributes.of({ "aria-label": label }),
      ],
      parent: hostRef.current,
    });

    return () => view.destroy();
  }, [label, value]);

  return <div className="CodeEditor" ref={hostRef} />;
};
