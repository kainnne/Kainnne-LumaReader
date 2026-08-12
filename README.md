# Kainnne LumaReader

Kainnne LumaReader is a local-first Markdown desktop app focused on calm typography, clear navigation, and a more visual reading experience. It turns an ordinary folder of Markdown files into a polished document library without uploading the library or translating its content.

## Project status

Version 1.0.0 is the first public desktop release. The same local-first Electron codebase produces a signed and notarized Universal macOS build and an unsigned Windows x64 build. Public installers belong in [GitHub Releases](https://github.com/kainnne/Kainnne-LumaReader/releases); generated binaries are not committed to the repository.

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
- Matching custom menus for reading mode, palette, and interface language; Vertical remains the default, while Paged supports both left/right and up/down navigation.
- Twenty-two visual palettes with light and dark appearances, including neutral Studio White and Graphite business themes.
- Every palette colors the application frame and accents while keeping the central reading paper neutral white in light mode and neutral charcoal in dark mode for clear text contrast.
- Eleven interface languages. Document content is never translated automatically.
- Compact responsive controls and a persistent sidebar toggle.

## Privacy model

The desktop app starts an internal HTTP service on a random loopback port. It binds only to `127.0.0.1`, accepts no remote connections, and exposes no mutating HTTP endpoint. Folder selection and Markdown saves use restricted Electron IPC. Saves are limited to Markdown files inside the selected library and reject stale versions instead of silently overwriting external changes. Settings are stored in the application-specific user-data directory.

## First launch

1. Start Kainnne LumaReader.
2. Choose the folder that contains your Markdown library.
3. Approve operating-system access if the folder is protected.
4. Read from the collapsed folder tree or choose a different library with the **Library** button.

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

See [Development](docs/DEVELOPMENT.md), [Architecture](docs/ARCHITECTURE.md), [User Guide](docs/USER-GUIDE.md), and [Project Handoff](docs/HANDOFF.md) for details.

## Downloads

- macOS: Universal DMG for Apple silicon and Intel Macs, signed with Developer ID and notarized by Apple.
- Windows: x64 Setup and Portable builds. The Windows executables are intentionally unsigned, so Microsoft Defender SmartScreen may show an unrecognized-publisher notice.

Release filenames, checksums, signing requirements, and the direct-download URL contract are documented in [Release Assets and Download Links](docs/RELEASE-ASSETS-AND-DOWNLOAD-LINKS.md).

## License

Kainnne LumaReader is free and open-source software released under the [MIT License](LICENSE). You may use, modify, fork, and redistribute it under the license terms.
