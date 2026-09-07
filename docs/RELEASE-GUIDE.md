# Release Guide

This is the operator sequence for LumaReader desktop releases. Public binaries are produced from a reviewed commit, stored in GitHub Releases, and never committed to the repository.

## Platform policy

- macOS: Universal (`arm64` + `x86_64`), Developer ID Application signed, Hardened Runtime enabled, notarized, and stapled.
- Windows: x64 Setup and Portable packages, intentionally unsigned. The website and release notes must disclose the possible SmartScreen warning.
- Linux: x64 AppImage and `.deb`; build on Ubuntu 22.04 and verify the same `.deb` on Ubuntu 24.04. Preserve Chromium sandboxing and existing MIME defaults.
- All platforms: run the packaged application, select the release fixture, scan and open Markdown, and terminate cleanly before publication.

## GitHub Actions credentials

The manual `macOS signed release build` workflow follows electron-builder's documented CI variables. Configure these as repository Actions secrets only after the Apple Developer Program membership is active:

- `MAC_CSC_LINK`: Base64-encoded Developer ID Application `.p12` containing its private key.
- `MAC_CSC_KEY_PASSWORD`: Export password for that `.p12`.
- `APPLE_ID`: Apple Account email used for notarization.
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password; never use the normal Apple Account password.
- `APPLE_TEAM_ID`: The ten-character Apple Developer Team ID.

Do not paste secret values into issues, pull requests, documentation, release notes, or chat. GitHub-hosted runners are ephemeral; the workflow receives only the named secrets required by electron-builder.

## Release sequence

1. Merge the reviewed source and confirm `package.json`, release notes, website URLs, and artifact names use the same version.
2. Run `npm ci`, `npm run check`, and `npm test` from a clean checkout.
3. Dispatch `Windows release build`; inspect the unpacked, installed, Portable, API, unsigned-signature, and checksum evidence.
4. Dispatch `macOS signed release build`; inspect the Developer ID, Universal architecture, strict signature, staple, Gatekeeper, API, and checksum evidence.
5. Dispatch `Linux release build`; inspect both package UI checks, renderer sandbox checks, default preservation, and the Ubuntu 24.04 compatibility job.
6. Dispatch `Publish validated release` with the version, exact source SHA, and all three successful run IDs. It verifies the source commit and expected assets, creates final checksums, and publishes the tag and release without overwriting an existing release.
7. Apply pending D1 migrations for download counters before deploying the download Worker. For 1.3.0, `0002_linux_download_counts.sql` preserves the existing totals and adds Linux. Export the database before applying it.
8. Deploy the Worker, then dispatch the Pages workflow if the release event did not trigger it. Verify the live page and use `HEAD /d/{platform}` to inspect download redirects without incrementing counters.
9. Verify desktop and mobile layout, public assets, and SHA-256 hashes. Local app replacement is a separate, backed-up operation after packaged validation; do not reset OS association databases or terminate unrelated processes.

## Local packaging commands

```bash
npm run pack:mac
npm run dist:mac
npm run dist:win
```

`dist:win` is intended for a Windows environment or CI runner. Cross-compiling from macOS is not the acceptance path.

`pack:mac:unsigned` exists only for local development rehearsals. It is never a releasable artifact. On the current macOS 26.5.2 release machine, use the `macos-15` CI workflow for the formal signing path because a system-level extended-attribute regression can make local `codesign` fail even after metadata cleanup.
