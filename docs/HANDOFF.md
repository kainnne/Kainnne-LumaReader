# Project Handoff

## Current boundary

Kainnne LumaReader is paused at a source-only handoff milestone. The repository contains the Electron application source, renderer assets, tests, browser-extension source, packaging configuration, and English documentation. It does not contain compiled desktop applications.

The intended final product is a downloadable Markdown reader for macOS and Windows. Producing, signing, testing, and publishing those executables is reserved for a future development session with enough context and time for platform-specific validation.

## Validated baseline

The following behavior was validated locally on macOS during Phase 1:

- Native library-folder selection and persisted folder preference.
- Recursive discovery of Markdown, MDX, MKD, and Markdown-alias files.
- Local images, media, includes, KaTeX mathematics, Mermaid diagrams, tables, alerts, task lists, and syntax highlighting.
- English as the default interface language with eleven interface languages available.
- Twenty visual palettes with light and dark appearances.
- Collapsed folders by default and a persistent sidebar toggle.
- Responsive controls in desktop and narrow portrait layouts.
- Clean application shutdown without a lingering local service.
- Six automated document-service and path-boundary tests.
- A locally packaged Apple-silicon macOS application was launched successfully, but that build is deliberately excluded from Git.

## Repository policy

Do not commit any of the following:

- `node_modules/`
- `dist/`, `release/`, DMG, ZIP, APP, EXE, MSI, NSIS, or portable build artifacts
- Signing certificates, notarization credentials, API keys, or environment files
- Private Markdown libraries or user documents

The existing `.gitignore` enforces the main build and dependency exclusions.

## Recommended next session

Continue from this order:

1. Clone or pull the repository and run `npm install`.
2. Run `npm run check` and `npm test`.
3. Review the existing interface and folder workflow before changing architecture.
4. Add GitHub Actions for macOS and Windows without publishing release artifacts yet.
5. Build and test the Windows NSIS and portable targets on a Windows runner.
6. Rebuild and test the macOS DMG and ZIP targets on macOS.
7. Decide the repository license and signing/notarization policy.
8. Publish downloadable executables only after both platforms pass launch, folder-selection, persistence, rendering, and shutdown tests.

## Product intent

The application should remain a polished, intuitive, local-first Markdown reader. Interface text may be localized, but Markdown content must never be translated automatically. The selected library remains under user control, and the local service must continue to bind only to the loopback interface.

The future desktop releases should preserve one shared codebase and produce separate macOS and Windows download artifacts from that source. Those artifacts belong in GitHub Releases, not in the Git repository.
