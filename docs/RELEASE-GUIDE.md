# Release Guide

Public releases are outside the Phase 1 boundary. This document records the intended release sequence so packaging decisions remain explicit.

## Before the first public release

1. Approve the local interface and folder-selection workflow.
2. Confirm that release notices include the existing MIT License.
3. Add GitHub Actions jobs for macOS and Windows.
4. Build and test macOS DMG and ZIP artifacts.
5. Build and test Windows NSIS and portable artifacts on Windows.
6. Decide whether releases are unsigned, self-signed, or signed with platform developer certificates.
7. Add checksums and release notes.
8. Publish only after both platform artifacts pass launch and library-selection tests.

## Local packaging commands

```bash
npm run pack:mac
npm run dist:mac
npm run dist:win
```

`dist:win` is intended for a Windows environment or CI runner. Cross-compiling from macOS is not the acceptance path.
