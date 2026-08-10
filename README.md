# Kainnne LumaReader

Kainnne LumaReader is a local-first Markdown desktop app focused on calm typography, clear navigation, and a more visual reading experience. It turns an ordinary folder of Markdown files into a polished document library without uploading the library or translating its content.

## Project status

Phase 1 provides a working Electron application for macOS and a shared codebase prepared for Windows packaging. The macOS build was validated locally. This repository currently stores source code and documentation only; compiled macOS and Windows applications are intentionally deferred to a future development session.

## Highlights

- Native folder selection on first launch.
- The selected library is remembered between launches.
- A compact **Library** button changes the folder at any time.
- Recursive discovery of `.md`, `.mkd`, `.mdx`, and `.markdown` files.
- Safe static MDX preview without executing JSX or imported JavaScript.
- Local images, audio, video, includes, tables, task lists, abbreviations, footnotes, alerts, and emoji shortcodes.
- KaTeX mathematics and Mermaid diagrams, including flowcharts and Gantt charts.
- Syntax highlighting, raw source preview, document outline, media preview, and live refresh.
- Vertical, horizontal, and paged reading modes.
- Twenty visual palettes with light and dark appearances.
- Eleven interface languages. Document content is never translated automatically.
- Compact responsive controls and a persistent sidebar toggle.

## Privacy model

The desktop app starts an internal HTTP service on a random loopback port. It binds only to `127.0.0.1`, accepts no remote connections, and exposes no HTTP endpoint that can change the selected library. Folder selection is performed by the operating system through Electron IPC. Settings are stored in the application-specific user-data directory.

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

## Current release boundary

This is a source-only handoff snapshot. No `.app`, `.exe`, installer, portable build, or other compiled release artifact belongs in the repository at this stage. A public license, Windows CI build, code-signing policy, and GitHub Release workflow remain future decisions.
