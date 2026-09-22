# Project Handoff

## Current boundary

This branch contains the Kainnne LumaReader 1.4.0 release source. Check GitHub Releases for the currently published version. The repository stores source, tests, packaging configuration, release automation, and documentation. macOS, Windows, and Linux binaries are published as GitHub Release assets and remain excluded from Git history.

## Direct editor and 1.4.0 release

The 1.4.0 production release uses the existing pink icon and production bundle ID. Blue Preview remains a separate local testing channel. The editor starts in direct mode; a single **Show Markdown** toggle opens source with comparison preview and returns to direct editing when disabled. This editing-mode toggle resets off each time editing starts, while other appearance preferences remain persistent. The Web edition receives the same editing controls, retaining its session/share behavior; code-file editing remains desktop-only.

`renderer/direct-editor.mjs` uses ProseMirror with native rich-text history and Markdown serialization. Direct editing is the new default; source editing retains the existing comparison preview. Tables support cell editing and row/column operations. Math renders through the vendored KaTeX and opens a LaTeX dialog on double-click; images use the existing import service and double-click viewer. Untouched blocks retain their original Markdown bytes, and unsupported blocks provide a source-editing entry point. Documents above 500,000 characters fall back to the established source editor. Editing a supported block may normalize that block's Markdown syntax.

Preview 2 adds a compact Direct/Source switch, detailed formatting labels with an optional persisted compact view, and an asynchronous native image panel with visible pending status and single-flight protection. Its explicit Pictures start folder avoids reopening a previously slow cloud folder; OS panel latency can still vary. Imports stay on the main-process side, at most 8 supported images and 32 MB each. Reading and editing use centered display mathematics; the reader restores math placeholders with a replacement callback so JavaScript does not collapse `$$` to `$`.

CodeMirror provides opt-in local code editing for `.py`, `.c`, `.h`, `.cpp`, `.hpp`, `.js`, and `.ts`. These formats start unchecked in the library filter; opening a code file explicitly still works. Each file opens read-only and requires the per-document “Enable code editing” checkbox. Permission is not persisted and the native save endpoint requires the enabled path. No code execution is provided. Files are limited to 1 MB; syntax parsing is skipped above 200,000 characters. Atomic saves retain BOM/CRLF and executable permissions, and reject stale revisions. Existing Markdown saves remain restricted to Markdown. Source modules must be bundled before packaging.

Run `npm run build:editor` after changing the source module, `npm test`, and `npm run check`. Run the isolated Chromium fixture with `PLAYWRIGHT_BROWSERS_PATH=<browser-cache> npm run test:direct-editor`; it also exercises the previous source-editor smoke checks. `npm run pack:preview` builds a locally Developer-ID-signed arm64 app without uploading it for notarization. The preview after-pack hook removes only unused permission descriptions; it never strips extended attributes. Strict deep signature verification must pass outside the restricted shell before launching. A sandboxed `codesign --verify` can incorrectly report an invalid signature on this machine.

Local validation (preview 1): 132 unit tests passed, plus isolated Chromium tests for direct-mode selection/formatting Undo, table operations, Chinese IME composition, image import/zoom/Undo, formula editing, two- and three-level fraction bounds, real disk saves, mode switching and reopening. The previous source-mode formatting and unequal-pane scroll tests also passed. The installed preview passed strict code-signature verification and normal-launch checks; its API remains loopback-only and rejects unauthenticated requests. The production application hash remained unchanged. Local reports are under the ignored `dist-preview/qa-results/` directory.

Preview 2 validation: 140 unit tests passed. `scripts/preview-usability-smoke.cjs` checks detailed/compact labels, explicit-file behavior independent of sidebar filters, visible progress while a native-panel promise is pending, cancellation/import/undo, formula centers and nested-fraction bounds, code editing opt-in/reset, syntax coloring, BOM/CRLF saves and narrow layouts. `scripts/direct-editor-smoke.cjs` retains the full direct/source editing regressions. The OS-native Finder panel itself still needs normal user testing; an isolated browser cannot measure its cold-start delay.

## Validated baseline

The following behavior was validated locally on macOS during Phase 1:

- Native library-folder selection and persisted folder preference.
- Recursive discovery of Markdown, MDX, MKD, and Markdown-alias files.
- Search results automatically expand their ancestor folders without permanently changing the user's collapsed-folder state.
- CJK bold labels using adjacent `**…**文字` syntax are normalized before CommonMark rendering while code spans and fenced code remain untouched.
- Local images, media, includes, KaTeX mathematics, Mermaid diagrams, tables, alerts, task lists, and syntax highlighting.
- Raw Markdown editing for files inside the selected library, with in-place Saved confirmation, explicit exit from editing, `Command+S` / `Ctrl+S`, and external-change conflict protection.
- Optional live comparison preview while editing, with a draggable split, source-led block-aware synchronized scrolling, and a single visible scrollbar at the far right.
- Desktop PDF export through the native save dialog, with an A4 print layout that waits for fonts and images and removes application chrome from the exported document.
- A compact Settings gear combines appearance, all 22 palettes, language, and individual toolbar visibility. Source and Media begin hidden, palette selection stays open for comparison, and onboarding explicitly introduces Settings.
- Markdown authoring tools insert common syntax or portable document-adjacent images without moving the editor viewport. Unsaved edits require confirmation before they are discarded.
- Packaged macOS and Windows builds register Markdown file associations so the operating system can offer LumaReader in **Open With** without silently replacing the user's current default.
- New Markdown creation begins with a native destination-folder picker, followed by an explicit name/destination confirmation, no-overwrite behavior, immediate library refresh, and transition into editing. Choosing a destination outside the current library intentionally makes that folder the new library root.
- Reader, source, and editor text use the same size preference and `Command` / `Ctrl` with `+` and `-` shortcuts.
- Matching custom reading-mode, palette, and language menus ordered after Edit, Source, and Media; Paged includes left/right and up/down navigation with visible previous/next controls.
- English as the default interface language with eleven interface languages available.
- Twenty-two visual palettes with light and dark appearances, including neutral Studio White and Graphite business themes.
- Palette color is intentionally concentrated in navigation, controls, borders, and accents; the central document, source, and editor surfaces stay neutral for legibility.
- Collapsed folders by default and a persistent sidebar toggle.
- Responsive controls in desktop and narrow portrait layouts.
- Clean application shutdown without a lingering local service.
- Automated document-service, editing, format, media, and path-boundary tests.
- macOS production output is a Universal DMG and ZIP. Direct distribution requires Developer ID signing, Hardened Runtime, Apple notarization, a stapled ticket, Gatekeeper acceptance, and a final launch test.
- Windows production output is an unsigned x64 Setup and Portable executable. A genuine Windows runner builds them and performs runtime/API smoke tests; SmartScreen disclosure remains visible on the website and release notes.
- The static web edition reuses the reader under `/web/`, keeps at most three user documents in tab memory, provides a confirmed per-document remove action, and clears document state on reload or close. It has no folder library, cloud persistence, document download, or PDF export. See `docs/WEB-EDITION.md` for the maintained boundary and acceptance checks.

## Repository policy

Do not commit any of the following:

- `node_modules/`
- `dist/`, `release/`, DMG, ZIP, APP, EXE, MSI, NSIS, or portable build artifacts
- Signing certificates, notarization credentials, API keys, or environment files
- Private Markdown libraries or user documents

The existing `.gitignore` enforces the main build and dependency exclusions.

## Release order

Follow [Release Guide](RELEASE-GUIDE.md) for the maintained sequence. All three platform build workflows must pass on the same source SHA before the publish workflow receives their run IDs. Linux includes AppImage and installed `.deb` checks on Ubuntu 22.04, plus the exact same `.deb` on Ubuntu 24.04. Publish validated release assets before deploying the download Worker and GitHub Pages, then verify download redirects with `HEAD` to avoid adding test counts.

For 1.3.1, [PDF Export](PDF-EXPORT.md) defines the remembered footer and standalone `<!-- lumareader:pagebreak -->` syntax; [Linux](LINUX.md) defines supported formats and sandbox requirements. The library index scans incrementally with a shared four-operation I/O pool and explicit incomplete-scan status. Search covers normalized filenames and folder paths and renders results in batches.

The release Mac currently runs macOS 26.5.2 (25F84), where local package rehearsals reproduced an operating-system regression that synthesizes `com.apple.provenance` / Finder metadata during signing and makes `codesign` reject Electron bundles. Do not weaken signing or entitlements to bypass it. The target acceptance build therefore runs on GitHub's isolated `macos-15` runner; the resulting notarized artifact is downloaded back to the release Mac for final install and UI verification.

The four local crash reports from 2026-08-12 23:42–23:45 came from failed `/private/tmp` signing-rehearsal bundles launched by Codex, not from a user document. Two were explicitly terminated by macOS with `CODESIGNING / Invalid Page`; the other two trapped while reading modified Electron fuses. `scripts/macos-smoke.js` now performs strict deep signature verification before spawning a packaged app, so an incomplete rehearsal bundle is rejected without launching or creating another crash report.

## Product intent

The application should remain a polished, intuitive, local-first Markdown reader. Interface text may be localized, but Markdown content must never be translated automatically. The selected library remains under user control, and the local service must continue to bind only to the loopback interface.

Future desktop releases should preserve one shared codebase and produce separate macOS, Windows, and Linux download artifacts from that source. Those artifacts belong in GitHub Releases, not in the Git repository. Browser work should continue to reuse the renderer while keeping the intentionally narrower persistence and export boundary documented in `docs/WEB-EDITION.md`.

The account-free Web share and download-counter service is maintained in `cloudflare/lumareader-share/`. Deploy it with Wrangler after tests pass; its production `SHARE_LINKS` binding points to the `lumareader-share-links` KV namespace and `DOWNLOADS_DB` points to the download-count D1 database. Do not remove the 30-day share TTL or the exact reader-origin validation. The unchanged built-in sample must continue to bypass KV, and client-side sharing must retain the self-contained long-link fallback so a Worker outage does not disable sharing. Download redirects increment macOS, Windows, or Linux AppImage totals atomically and expose only their combined total to the website; no user identity or document data belongs in that database.
