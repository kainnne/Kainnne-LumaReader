# Kainnne LumaReader 1.0.0

Kainnne LumaReader 1.0.0 is the first public desktop release of the local-first Markdown reader for macOS and Windows.

## Download options

- **macOS:** Universal DMG for Apple silicon and Intel Macs. The application is signed with Developer ID, notarized by Apple, and distributed outside the Mac App Store.
- **Windows:** x64 Setup and Portable executables. These builds are intentionally unsigned, so Microsoft Defender SmartScreen may show an unrecognized-publisher warning.

Download only from [lumareader.kainnne.com](https://lumareader.kainnne.com/) or the official [GitHub Release](https://github.com/kainnne/Kainnne-LumaReader/releases/tag/v1.0.0). Verify the supplied SHA-256 checksums before running a downloaded file when provenance is uncertain.

## Highlights

- Turn a local folder into a recursive Markdown library without creating an account or uploading documents.
- Search filenames and paths with automatic ancestor-folder expansion.
- Read in full-width Vertical, Horizontal, Paged left/right, or Paged up/down layouts.
- Render tables, task lists, alerts, highlighted code, KaTeX mathematics, Mermaid diagrams, footnotes, emoji, abbreviations, local includes, and local media.
- Edit Markdown in place and save with `Command+S` on macOS or `Ctrl+S` on Windows without leaving the editor.
- Open an optional live comparison preview while editing, resize the split, and keep source-led scrolling synchronized through long documents.
- Choose a destination folder before creating a new `.md`; the library refreshes immediately and existing files are never overwritten.
- Resize or collapse the document sidebar, adjust reading and editor text with `Command` / `Ctrl` plus `+` or `-`, and keep preferences between launches.
- Choose from eleven interface languages, light or dark appearance, and twenty-two palettes while the reading surface stays neutral and legible.
- Enable `.txt` and `.log` when needed; Markdown formats remain selected by default.

## Privacy and security

LumaReader reads files locally. Its document service listens only on `127.0.0.1`, exposes no mutating HTTP route, and performs Markdown create/save operations through a restricted Electron bridge. Local images and media are resolved relative to the selected library so portable folders continue to work after moving to another computer.

## Files

```text
Kainnne-LumaReader-1.0.0-macOS-universal.dmg
Kainnne-LumaReader-1.0.0-macOS-universal.zip
Kainnne-LumaReader-1.0.0-Windows-x64-Setup.exe
Kainnne-LumaReader-1.0.0-Windows-x64-Portable.exe
Kainnne-LumaReader-1.0.0-SHA256SUMS.txt
```

The source code is available under the MIT License.
