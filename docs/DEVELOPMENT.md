# Development

## Requirements

- Node.js 22 or newer.
- npm.
- macOS for local macOS packaging.
- Windows or a Windows CI runner for Windows installer verification.

## Install and run

```bash
npm install
npm test
npm run check
npm start
```

For a predictable development library, pass an explicit path:

```bash
npm start -- --library=/absolute/path/to/markdown-library
```

The `LUMAREADER_LIBRARY_ROOT` environment variable provides the same override for automation. A command-line or environment override takes precedence over the saved setting for that launch.

## Repository layout

```text
build/       Application icons and packaging resources
docs/        English product and technical documentation
renderer/    HTML, CSS, client-side rendering, and offline libraries
src/         Electron main process, preload bridge, and local service
tests/       Local service tests and Markdown fixtures
```

## Validation order

1. Run `npm run check` for JavaScript syntax.
2. Run `npm test` for document service behavior and path boundaries.
3. Run the Electron application against `tests/fixtures`.
4. Inspect desktop and narrow responsive layouts.
5. Build the unpacked application with `npm run pack:mac`.
6. Launch the packaged application and verify that folder persistence survives a restart.

Windows packaging is configured but is not considered verified until it runs on a Windows runner.
