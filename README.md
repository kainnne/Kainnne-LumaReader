# Kainnne LumaReader

Kainnne LumaReader is a local-first Markdown desktop app focused on calm typography, clear navigation, and a more visual reading experience. It turns an ordinary folder of Markdown files into a polished document library without uploading the library or translating its content.

## Project status

Version 1.1.0 is the current desktop release. The same local-first Electron codebase produces a signed and notarized Universal macOS build and an unsigned Windows x64 build. A session-based web edition is available at [lumareader.kainnne.com/web/](https://lumareader.kainnne.com/web/). Public installers belong in [GitHub Releases](https://github.com/kainnne/Kainnne-LumaReader/releases); generated binaries are not committed to the repository.

## Highlights

- Native folder selection on first launch.
- The selected library is remembered between launches.
- A compact **Library** button changes the folder at any time.
- Recursive discovery of `.md`, `.mkd`, `.mdx`, and `.markdown` files.
- Filename and path search automatically reveals every parent folder for each match, then restores the prior folder state when the search is cleared.
- Reader-friendly CJK bold labels render correctly even when `**…**` is followed immediately by Chinese, Japanese, or Korean text.
- Safe static MDX preview without executing JSX or imported JavaScript.
- Local images, audio, video, includes, tables, task lists, abbreviations, footnotes, alerts, and emoji shortcodes.
- KaTeX mathematics and Mermaid diagrams, including flowcharts and Gantt charts.
- Syntax highlighting, raw source preview, document outline, media preview, and live refresh.
- In-place raw Markdown editing with a compact toolbar action and native `Command+S` / `Ctrl+S` save. Saving confirms in place; the reader returns only when the user exits editing.
- An Insert menu adds headings, emphasis, links, quotes, code, tasks, tables, and images without moving the editor viewport. Dropped images are copied to a portable document-adjacent asset folder and appear in preview immediately.
- Optional live comparison preview while editing, with a draggable split, source-led synchronized scrolling, and one shared scrollbar at the far right.
- Editing opens with live preview enabled. If the rendered side extends past the source at the end of a highly styled document, a deliberate **Show bottom** action reveals the remaining preview without changing the normal synchronization behavior.
- Selecting another document during editing displays a palette-matched reminder to save or exit editing first.
- Exiting with unsaved edits opens a palette-matched confirmation before anything is discarded.
- Create a new `.md` by choosing its destination folder first. LumaReader confirms the name and destination, never overwrites an existing file, refreshes the library immediately, then opens the new document directly in the editor.
- Export the rendered reading view as an A4 PDF through the native save dialog. Print backgrounds, diagrams, mathematics, code, tables, and images are preserved.
- A compact Settings gear combines light/dark appearance, palette, interface language, and individual toolbar visibility. Palette selection stays open for side-by-side comparison; Vertical remains the default, while Paged supports both left/right and up/down navigation.
- Twenty-two visual palettes with light and dark appearances, including neutral Studio White and Graphite business themes.
- Every palette colors the application frame and accents while keeping the central reading paper neutral white in light mode and neutral charcoal in dark mode for clear text contrast.
- Eleven interface languages. Document content is never translated automatically.
- Reader text, Markdown source, and editor text share the same size control through the toolbar or `Command` / `Ctrl` with `+` and `-`.
- Compact responsive controls and a persistent sidebar toggle.
- Installed macOS and Windows builds register `.md`, `.markdown`, `.mkd`, and `.mdx` so LumaReader appears in the system **Open With** menu and can be chosen as the default Markdown app.

## Web edition

The web edition reuses the complete reader interface without requiring an account. It can open, drag in, or create up to three Markdown or plain-text documents, remove individual documents, and edit with the same preview, Settings, Insert, image, and synchronized-scrolling controls. Its bilingual built-in sample explains the local-first Desktop workflow, and a highlighted Desktop download action sits beside **Share this Markdown** in the toolbar. Sharing creates an eight-character Cloudflare short link with a document-specific social preview. Share records expire after 30 days; the unchanged built-in sample reuses the permanent `/web/` address without consuming storage. Ordinary document content stays in browser memory, and no durable cloud library, file download, folder library, or PDF export is provided. When the browser grants a writable file handle, saving can update the original local file directly.

Implementation boundaries and manual acceptance checks are documented in [Web Edition](docs/WEB-EDITION.md).

## Privacy model

The desktop app starts an internal HTTP service on a random loopback port. It binds only to `127.0.0.1`, accepts no remote connections, and exposes no mutating HTTP endpoint. Folder selection and Markdown create/save actions use restricted Electron IPC. New files are created exclusively inside the selected library without overwriting, while saves reject stale versions instead of silently replacing external changes. Settings are stored in the application-specific user-data directory.

## First launch

1. Start Kainnne LumaReader.
2. Choose the folder that contains your Markdown library.
3. Approve operating-system access if the folder is protected.
4. Read from the collapsed folder tree or choose a different library with the **Library** button.
5. Open the **Settings** gear to choose appearance, palette, language, and which toolbar controls remain visible.

Canceling the first folder dialog is safe. The app opens with an empty library and keeps the **Library** button available.

## Development

```bash
npm install
npm test
npm start
```

Create an unpacked macOS application:

```bash
npm run pack:mac
```

See [Development](docs/DEVELOPMENT.md), [Architecture](docs/ARCHITECTURE.md), [Web Edition](docs/WEB-EDITION.md), [User Guide](docs/USER-GUIDE.md), and [Project Handoff](docs/HANDOFF.md) for details.

## Downloads

- macOS: Universal DMG for Apple silicon and Intel Macs, signed with Developer ID and notarized by Apple.
- Windows: x64 Setup and Portable builds. The Windows executables are intentionally unsigned, so Microsoft Defender SmartScreen may show an unrecognized-publisher notice.

Release filenames, checksums, signing requirements, and the direct-download URL contract are documented in [Release Assets and Download Links](docs/RELEASE-ASSETS-AND-DOWNLOAD-LINKS.md).

## License

Kainnne LumaReader is free and open-source software released under the [MIT License](LICENSE). You may use, modify, fork, and redistribute it under the license terms.
