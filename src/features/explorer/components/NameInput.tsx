import { useRef, useState, type KeyboardEvent } from "react";

import { t } from "@/lang";

import type { NameEditMode } from "../types";

export const isValidName = (name: string): boolean =>
  name.length > 0 && name !== "." && name !== ".." && !/[\\/]/.test(name);

type NameInputProps = {
  mode: NameEditMode;
  initialName?: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
};

/**
 * Inline name field for new files/folders and renames, VS Code-style:
 * Enter or blur commits, Escape cancels. Renames preselect the name without
 * its extension.
 */
export const NameInput = ({
  mode,
  initialName = "",
  onCommit,
  onCancel,
}: NameInputProps) => {
  const [name, setName] = useState(initialName);
  const doneRef = useRef(false);
  const trimmed = name.trim();
  const invalid = name.length > 0 && !isValidName(trimmed);

  const finish = (commit: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (commit && isValidName(trimmed) && trimmed !== initialName) {
      onCommit(trimmed);
    } else {
      onCancel();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (invalid) return;
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  };

  return (
    <div className="Explorer_row Explorer_editRow">
      <span className="Explorer_chevron" aria-hidden="true">
        {mode === "folder" ? "▸" : ""}
      </span>
      <input
        className={invalid ? "Explorer_nameInput invalid" : "Explorer_nameInput"}
        type="text"
        value={name}
        aria-label={t.explorer.nameLabel}
        aria-invalid={invalid}
        title={invalid ? t.explorer.invalidName : undefined}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        onFocus={(event) => {
          const dot = initialName.lastIndexOf(".");
          event.currentTarget.setSelectionRange(
            0,
            mode === "rename" && dot > 0 ? dot : initialName.length,
          );
        }}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => finish(true)}
      />
    </div>
  );
};
