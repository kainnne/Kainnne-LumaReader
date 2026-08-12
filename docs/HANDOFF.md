# Project Handoff

## Current boundary

Kainnne LumaReader 1.0.0 is the first public desktop release baseline. The repository stores source, tests, packaging configuration, release automation, and documentation. macOS and Windows binaries are published as GitHub Release assets and remain excluded from Git history.

## Validated baseline

The following behavior was validated locally on macOS during Phase 1:

- Native library-folder selection and persisted folder preference.
- Recursive discovery of Markdown, MDX, MKD, and Markdown-alias files.
- Search results automatically expand their ancestor folders without permanently changing the user's collapsed-folder state.
- CJK bold labels using adjacent `**…**文字` syntax are normalized before CommonMark rendering while code spans and fenced code remain untouched.
- Local images, media, includes, KaTeX mathematics, Mermaid diagrams, tables, alerts, task lists, and syntax highlighting.
- Raw Markdown editing for files inside the selected library, with in-place Saved confirmation, explicit exit from editing, `Command+S` / `Ctrl+S`, and external-change conflict protection.
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

## Repository policy

Do not commit any of the following:

- `node_modules/`
- `dist/`, `release/`, DMG, ZIP, APP, EXE, MSI, NSIS, or portable build artifacts
- Signing certificates, notarization credentials, API keys, or environment files
- Private Markdown libraries or user documents

The existing `.gitignore` enforces the main build and dependency exclusions.

## Release order

1. Run `npm ci`, `npm run check`, and `npm test`.
2. Run the Windows build workflow and inspect its smoke-test evidence.
3. Run the `macOS signed release build` workflow on `macos-15` after its five repository secrets are configured.
4. Inspect its signature, Universal architecture, staple, Gatekeeper, folder scan/open, and shutdown evidence; then install the downloaded DMG on the release Mac for the final visual/editing pass.
5. Generate SHA-256 checksums from the final artifacts.
6. Publish the matching `v1.0.0` tag and GitHub Release assets.
7. Deploy the website and verify both direct-download buttons from the public site.

The release Mac currently runs macOS 26.5.2 (25F84), where local package rehearsals reproduced an operating-system regression that synthesizes `com.apple.provenance` / Finder metadata during signing and makes `codesign` reject Electron bundles. Do not weaken signing or entitlements to bypass it. The target acceptance build therefore runs on GitHub's isolated `macos-15` runner; the resulting notarized artifact is downloaded back to the release Mac for final install and UI verification.

## Product intent

The application should remain a polished, intuitive, local-first Markdown reader. Interface text may be localized, but Markdown content must never be translated automatically. The selected library remains under user control, and the local service must continue to bind only to the loopback interface.

The future desktop releases should preserve one shared codebase and produce separate macOS and Windows download artifacts from that source. Those artifacts belong in GitHub Releases, not in the Git repository.
