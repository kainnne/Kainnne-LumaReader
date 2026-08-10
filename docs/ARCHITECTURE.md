# Architecture

## Overview

Kainnne LumaReader uses Electron so the same application code can run on macOS and Windows without requiring Python, a system web server, or a separately installed runtime.

The application has four boundaries:

1. **Electron main process** — owns the window, native folder dialog, persisted settings, menu, and application lifecycle.
2. **Preload bridge** — exposes only the folder-selection methods needed by the renderer. Node integration remains disabled.
3. **Loopback document service** — scans and reads the selected library, expands includes, serves local media, and hosts the renderer on a random `127.0.0.1` port.
4. **Renderer** — renders Markdown, manages reading modes, and owns visual preferences stored in browser local storage.

## Library selection

The main process opens the operating system's native directory picker. A successful selection is validated as a directory, passed to the document service, and saved to `settings.json` inside Electron's `userData` directory. The renderer receives a `library:changed` event and reloads only the file index.

No HTTP route can change the library root. This prevents an unrelated web page from redirecting the local reader to an arbitrary directory.

## Document service

The service binds to the loopback interface on an operating-system-assigned port. It supports:

- recursive scanning of the selected root;
- `.md`, `.mkd`, `.mdx`, and `.markdown` documents;
- explicit `file://`, `http://`, and `https://` document sources;
- local relative image, audio, and video paths;
- bounded document and media sizes;
- include expansion with depth, loop, and boundary protection;
- live-refresh metadata;
- static renderer assets.

Generated folders, hidden folders, application bundles, dependency folders, and version-control internals are excluded from library scanning.

## Renderer safety

The BrowserWindow uses `contextIsolation`, disables Node integration, enables the Chromium sandbox, and prevents navigation away from the reader origin. Ordinary external links open in the system browser.

Markdown output is sanitized with an explicit element and attribute allowlist. MDX imports are displayed as code. Unknown JSX elements are unwrapped or removed and are never executed. Mermaid uses strict security mode.

## Persistence

The selected library path is stored by the main process. Reading mode, palette, theme, font size, interface language, and desktop sidebar state are stored by the renderer. Users can therefore change the library without losing visual preferences.
