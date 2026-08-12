# Release Guide

This is the operator sequence for LumaReader desktop releases. Public binaries are produced from a reviewed commit, stored in GitHub Releases, and never committed to the repository.

## Platform policy

- macOS: Universal (`arm64` + `x86_64`), Developer ID Application signed, Hardened Runtime enabled, notarized, and stapled.
- Windows: x64 Setup and Portable packages, intentionally unsigned. The website and release notes must disclose the possible SmartScreen warning.
- Both platforms: run the packaged application, select the release fixture, scan and open Markdown, and terminate cleanly before publication.

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
5. Download both workflow artifacts. Install the macOS DMG and Windows Setup/Portable build on the available test environments for the final visual interaction pass.
6. Create the matching Git tag and draft GitHub Release. Upload the exact verified assets plus final SHA-256 checksums.
7. Publish the Release only after both platform gates pass. Publishing triggers the Pages workflow.
8. Verify both direct download buttons at desktop and mobile widths in a signed-out session.

## Local packaging commands

```bash
npm run pack:mac
npm run dist:mac
npm run dist:win
```

`dist:win` is intended for a Windows environment or CI runner. Cross-compiling from macOS is not the acceptance path.

`pack:mac:unsigned` exists only for local development rehearsals. It is never a releasable artifact. On the current macOS 26.5.2 release machine, use the `macos-15` CI workflow for the formal signing path because a system-level extended-attribute regression can make local `codesign` fail even after metadata cleanup.
