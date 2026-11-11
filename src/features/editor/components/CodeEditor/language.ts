import { LanguageDescription, type LanguageSupport } from "@codemirror/language";
import { languages } from "@codemirror/language-data";

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

/**
 * Resolves the CodeMirror language for a document path by filename/extension.
 * Language packages are lazy-loaded chunks, so only the languages actually
 * opened are downloaded.
 */
export const loadLanguage = async (
  path: string,
): Promise<LanguageSupport | null> => {
  const description = LanguageDescription.matchFilename(
    languages,
    fileName(path),
  );
  if (!description) return null;

  try {
    return await description.load();
  } catch {
    return null;
  }
};
