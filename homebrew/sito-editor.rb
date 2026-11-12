# Homebrew Cask for Sito Editor (template; same setup as sito-file-browser).
#
# On each GitHub Release, .github/workflows/update-homebrew-cask.yml regenerates this cask with the
# new version and real sha256 sums and pushes it to sito8943/homebrew-tap, so users install with:
#
#   brew install --cask sito8943/tap/sito-editor
#
# `app` installs Sito Editor.app to /Applications; `binary` puts the bundled `sito-editor` launcher
# on PATH, so `sito-editor .` opens the current folder.
cask "sito-editor" do
  arch arm: "aarch64", intel: "x64"

  version "0.3.1"
  sha256 arm:   :no_check, # replaced by CI with the real .dmg sums on release
         intel: :no_check

  url "https://github.com/sito8943/sito-editor/releases/download/v#{version}/Sito.Editor_#{version}_#{arch}.dmg"
  name "Sito Editor"
  desc "Lightweight code editor for reading code and making focused edits"
  homepage "https://github.com/sito8943/sito-editor"

  depends_on macos: :sonoma

  app "Sito Editor.app"
  binary "#{appdir}/Sito Editor.app/Contents/Resources/sito-editor", target: "sito-editor"

  zap trash: [
    "~/Library/Application Support/com.sito8943.editor",
    "~/Library/Caches/com.sito8943.editor",
    "~/Library/WebKit/com.sito8943.editor",
  ]
end
