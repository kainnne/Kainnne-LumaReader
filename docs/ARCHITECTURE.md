# Architecture

## Overview

Kainnne LumaReader uses Electron so the same application code can run on macOS and Windows without requiring Python, a system web server, or a separately installed runtime.

The application has four boundaries:

1. **Electron main process** — owns the window, native folder dialog, persisted settings, menu, and application lifecycle.
2. **Preload bridge** — exposes folder selection, preferences, and restricted Markdown create/save methods. Node integration remains disabled.
3. **Loopback document service** — scans and reads the selected library, expands includes, serves local media, and hosts the renderer on a random `127.0.0.1` port.
4. **Renderer** — selects a document adapter, renders the supported preview type, manages editing and reading modes, and owns visual and toolbar preferences stored in browser local storage.

## Library selection

The main process opens the operating system's native directory picker. A successful selection is validated as a directory, passed to the document service, and saved to `settings.json` inside Electron's `userData` directory. The renderer receives a `library:changed` event and reloads only the file index.

No HTTP route can change the library root. This prevents an unrelated web page from redirecting the local reader to an arbitrary directory.

## Document service

The service binds to the loopback interface on an operating-system-assigned port. It supports:

- recursive scanning of the selected root;
- Markdown (`.md`, `.markdown`, `.mkd`, `.mdx`), plain text (`.txt`), and logs (`.log`);
- one-off local files chosen through the native file picker without changing the saved library;
- local relative image, audio, and video paths;
- per-format document limits and bounded media sizes;
- include expansion with depth, loop, and boundary protection;
- live-refresh metadata;
- static renderer assets.

Generated folders, hidden folders, application bundles, dependency folders, and version-control internals are excluded from library scanning.

`src/document-types.js` is the canonical extension, MIME, capability, and limit registry. `/api/files` and `/api/types` expose its public records. Text payloads include both the exact source in `text` and the include-expanded reading form in `renderText`. Retired document, archive, and image formats are explicitly rejected.

## File boundary and archive safety

Library roots and requested files are resolved through their real paths. A lexical path check is followed by a real-path boundary check, blocking traversal and symlinks that escape the selected library. Scanning does not follow symlinks. The HTTP listener binds only to `127.0.0.1`, accepts loopback host headers, and serves read-only `GET`/`HEAD` routes.

Document writes exist only through the context-isolated Electron bridge. New-document creation first uses a native directory picker and stores the verified destination behind a short-lived, single-use token. `document:create` accepts that token plus a simple Markdown filename and uses exclusive creation so it can never replace an existing file. If the chosen destination is outside the current library, the destination becomes the new library root before the new file is revealed. `document:save` accepts only Markdown inside the library, enforces the Markdown size limit, and compares the last-known modification timestamp before writing. Both requests must originate from the reader window. Plain text, logs, uploads, external paths, and remote sources remain read-only.

## Renderer safety

The BrowserWindow uses `contextIsolation`, disables Node integration, enables the Chromium sandbox, and prevents navigation away from the reader origin. Production packaging also disables Electron's Run-as-Node, Node options, command-line inspector, and privileged `file://` fuses; it validates the embedded ASAR before loading it. Ordinary external links open in the system browser.

Markdown output is sanitized with an explicit element and attribute allowlist. MDX imports are displayed as code. Unknown JSX elements are unwrapped or removed and are never executed. Mermaid uses strict security mode.

## System file associations

Electron Builder declares `.md`, `.markdown`, `.mkd`, and `.mdx` as editable document types in packaged macOS and Windows builds. Launch arguments and macOS `open-file` events are normalized into explicit `file://` sources, then opened through the same bounded document-service path as a file chosen from the app. Registration makes LumaReader available in **Open With**; the operating system and user retain control of the default application.

## Persistence

The selected library path is stored by the main process. Reading mode, palette, theme, font size, interface language, toolbar visibility, desktop sidebar state, editing-preview visibility, and editor split ratio are stored by the renderer. Users can therefore change the library without losing visual preferences.

## Web edition boundary

The static web edition lives under `site/web/` and reuses the renderer interface without Electron or the loopback document service. `web-bridge.js` loads before the renderer and provides a browser implementation of the small desktop bridge plus the read-only `/api/files`, `/api/file`, and `/api/meta` responses the renderer expects.

Opened and newly created documents are held in a JavaScript `Map` for the lifetime of the tab. The bridge admits at most three non-sample Markdown or plain-text documents. Reloading or closing the tab discards the map; document content is never written to local storage or sent to the static site host. Visual preferences may remain in local storage because they contain no document text.

Users can remove a document from the session through the sidebar after a confirmation dialog. This only deletes the in-memory entry and never deletes the source file. When the File System Access API supplies a writable handle and the browser grants permission, saving may write back to that selected local file. Otherwise, saving updates only the in-memory session. The web edition intentionally omits folder-library access, cloud persistence, document downloads, and PDF export.

Drag-and-drop feeds the same in-memory import path as the file picker and therefore preserves the three-document limit. Images dropped specifically onto the editor remain browser-local assets and are referenced through portable relative Markdown paths. Sharing serializes the current Markdown name and text, compresses it when the browser supports `CompressionStream`, and first builds a complete `#share=` reader URL. The browser sends that URL plus a derived title and excerpt to the isolated `lumareader-share` Cloudflare Worker. The Worker validates the exact LumaReader origin and path, stores the record in KV with a 30-day TTL, and returns an eight-character short path. Its public GET page emits document-specific Open Graph metadata before redirecting to the complete reader URL. If the Worker fails, the browser exposes the complete fragment URL directly; opening either form reconstructs and sanitizes the Markdown locally. The unchanged built-in sample bypasses the Worker and reuses `/web/`.

The same Worker owns two versioned download redirect routes. Each route performs one atomic D1 increment for `macos` or `windows` before redirecting to the corresponding GitHub Release asset. The public count endpoint sums those two rows and returns no visitor identifier, request history, or document information.
