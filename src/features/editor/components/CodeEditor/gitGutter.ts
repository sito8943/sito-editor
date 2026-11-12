import { Chunk } from "@codemirror/merge";
import {
  RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  Text,
  type EditorState,
  type Extension,
} from "@codemirror/state";
import { EditorView, GutterMarker, gutter } from "@codemirror/view";

// Git change marks in the gutter, like VS Code: lines added (green), modified
// (blue) or removed (red triangle) against the file at HEAD. The diff is
// CodeMirror's own (@codemirror/merge) and is updated as you type.

class ChangeMarker extends GutterMarker {
  constructor(readonly elementClass: string) {
    super();
  }

  eq(other: GutterMarker): boolean {
    return other instanceof ChangeMarker && other.elementClass === this.elementClass;
  }
}

const ADDED = new ChangeMarker("cm-git-added");
const MODIFIED = new ChangeMarker("cm-git-modified");
const DELETED = new ChangeMarker("cm-git-deleted");

type GitDiff = {
  /** The file at HEAD; null when it has none (new, untracked, outside Git). */
  base: Text | null;
  chunks: readonly Chunk[];
  markers: RangeSet<GutterMarker>;
};

const EMPTY: GitDiff = { base: null, chunks: [], markers: RangeSet.empty };

const markersFor = (
  chunks: readonly Chunk[],
  doc: Text,
): RangeSet<GutterMarker> => {
  const builder = new RangeSetBuilder<GutterMarker>();
  for (const chunk of chunks) {
    if (chunk.fromB === chunk.toB) {
      // Lines removed: mark the line that now follows them.
      const line = doc.lineAt(Math.min(chunk.fromB, doc.length));
      builder.add(line.from, line.from, DELETED);
      continue;
    }
    const marker = chunk.fromA === chunk.toA ? ADDED : MODIFIED;
    const first = doc.lineAt(Math.min(chunk.fromB, doc.length)).number;
    const last = doc.lineAt(Math.min(chunk.endB, doc.length)).number;
    for (let number = first; number <= last; number += 1) {
      const line = doc.line(number);
      builder.add(line.from, line.from, marker);
    }
  }
  return builder.finish();
};

const diffAgainst = (base: Text | null, state: EditorState): GitDiff => {
  if (!base) return EMPTY;
  const chunks = Chunk.build(base, state.doc);
  return { base, chunks, markers: markersFor(chunks, state.doc) };
};

const setBaseline = StateEffect.define<string | null>();

const diffField = StateField.define<GitDiff>({
  create: () => EMPTY,
  update(diff, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setBaseline)) {
        const base =
          effect.value === null
            ? null
            : Text.of(effect.value.split(/\r\n?|\n/));
        return diffAgainst(base, transaction.state);
      }
    }
    if (!diff.base || !transaction.docChanged) return diff;
    const chunks = Chunk.updateB(
      diff.chunks,
      diff.base,
      transaction.state.doc,
      transaction.changes,
    );
    return {
      base: diff.base,
      chunks,
      markers: markersFor(chunks, transaction.state.doc),
    };
  },
});

/** The gutter; place it after line numbers so it sits next to the text. */
export const gitGutter = (): Extension => [
  diffField,
  gutter({
    class: "cm-gitGutter",
    markers: (view) => view.state.field(diffField).markers,
  }),
];

/** Sets the HEAD contents to compare against (null clears the marks). */
export const setGitBaseline = (view: EditorView, base: string | null): void => {
  const current = view.state.field(diffField).base;
  if (base === null && current === null) return;
  view.dispatch({ effects: setBaseline.of(base) });
};
