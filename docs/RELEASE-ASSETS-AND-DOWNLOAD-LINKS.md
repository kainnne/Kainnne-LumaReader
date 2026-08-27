# Release Assets and Download Links

This file tells future agents how to name, store, and link LumaReader installers.

## Current version

- Current version: `1.0.2`
- Source of truth: `package.json` → `version`
- Git tag: `v1.0.2`
- Release title: `Kainnne LumaReader 1.0.2`

Before every release, these values must match:

```text
package.json version = Git tag without "v" = installer version = release version
```

## Installer filenames

Every public installer filename must include the version, platform, architecture, and package type.

Use these names for version `1.0.2`:

```text
Kainnne-LumaReader-1.0.2-macOS-universal.dmg
Kainnne-LumaReader-1.0.2-macOS-universal.zip
Kainnne-LumaReader-1.0.2-Windows-x64-Setup.exe
Kainnne-LumaReader-1.0.2-Windows-x64-Portable.exe
Kainnne-LumaReader-1.0.2-SHA256SUMS.txt
```

Rules:

- Use `macOS`, not `mac` or `osx`.
- Use `Windows`, not `win`.
- Use `universal` for the combined Apple silicon and Intel macOS build; use `x64` for Windows.
- Use `Setup` for the Windows installer and `Portable` for the standalone build.
- Keep capitalization and separators exactly consistent.
- The build workflows read the version from `package.json`; update the release notes and website links for every new version.

## Where files belong

1. Build output is created locally in `dist/`.
2. Rename the validated output files using the rules above.
3. Create a GitHub Release in `kainnne/Kainnne-LumaReader` using the matching tag.
4. Upload the installers and checksum file as **GitHub Release assets**.
5. Publish the Release after installation and launch tests pass.

Do not commit `dist/`, `.dmg`, `.exe`, `.zip`, or portable builds into the Git repository. The repository stores source code; GitHub Releases stores downloadable executables.

## Apple Developer Program and macOS validation

The project owner enrolled in the Apple Developer Program for this release. LumaReader is distributed outside the Mac App Store through GitHub Releases, so every public macOS build must be signed, notarized, stapled, and verified.

### Required Apple setup

- Use a **Developer ID Application** certificate to sign the `.app` distributed inside the DMG outside the Mac App Store.
- Use a **Developer ID Installer** certificate only if a signed `.pkg` installer is added later.
- Enable Hardened Runtime and a secure timestamp.
- Do not ship a distribution build with `com.apple.security.get-task-allow` enabled.
- Use `notarytool`; do not use the retired `altool` workflow.

The certificate, private key, Apple Account credentials, app-specific password, App Store Connect API key, and keychain password must remain outside the repository. Never commit or print them in logs, documentation, release notes, or chat. The `macOS signed release build` workflow reads only `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` from GitHub repository secrets. A future agent may use credentials already configured in the local Keychain or CI secret store, but must stop and ask the owner to complete account-level setup when they are unavailable.

### Agent responsibilities

For every macOS release, the agent must:

1. Confirm that the Apple Developer Program membership is active.
2. Confirm that a valid `Developer ID Application` identity belongs to the correct Team ID and its protected CI secrets are configured.
3. Run the Universal macOS target on the pinned `macos-15` GitHub-hosted runner using the version from `package.json`.
4. Verify that the app and all nested executable code are signed with the expected identity.
5. Confirm Hardened Runtime, secure timestamp, and production entitlements.
6. Submit the final distribution artifact to Apple with `notarytool` and wait for an `Accepted` result.
7. Retrieve and review the notarization log. Warnings must not be ignored without recording why they are safe.
8. Confirm electron-builder staples the notarization ticket to the `.app` before creating the distributed DMG.
9. Validate the app staple and run Gatekeeper assessment in CI, then repeat Gatekeeper and launch checks after downloading the DMG.
10. Test installation and first launch on a clean macOS user account or clean test machine.
11. Generate the checksum only after signing and notarization are complete.
12. Upload exactly the verified artifact to GitHub Releases and test the public download again.

An agent must not describe a macOS artifact as signed, notarized, or release-ready unless every applicable check passes.

### Minimum verification commands

The workflow performs notarization through electron-builder. Use these commands on the generated app for independent verification:

```bash
security find-identity -v -p codesigning
codesign -vvv --deep --strict "dist/mac-universal/Kainnne LumaReader.app"
codesign -d --verbose=4 "dist/mac-universal/Kainnne LumaReader.app"
codesign -d --entitlements :- "dist/mac-universal/Kainnne LumaReader.app"
xcrun stapler validate "dist/mac-universal/Kainnne LumaReader.app"
spctl --assess --type execute --verbose=4 "dist/mac-universal/Kainnne LumaReader.app"
```

For local diagnostic submissions, notarization credentials may instead be stored in a named Keychain profile such as `LUMAREADER_NOTARY`. The profile name may be documented; its password or private key may not.

### macOS release acceptance

A macOS download is ready to publish only when:

- the code signature verifies successfully;
- the signing identity and Team ID are correct;
- notarization status is `Accepted`;
- the ticket is stapled and validates successfully;
- Gatekeeper accepts the app;
- the downloaded DMG opens, the app copies to Applications, launches normally, selects a Markdown library, renders a test document, and quits cleanly;
- the SHA-256 checksum matches the final uploaded file.

## Download link format

A version-specific direct-download link uses this pattern:

```text
https://github.com/kainnne/Kainnne-LumaReader/releases/download/{TAG}/{FILENAME}
```

Examples for version `1.0.2`:

```text
https://github.com/kainnne/Kainnne-LumaReader/releases/download/v1.0.2/Kainnne-LumaReader-1.0.2-macOS-universal.dmg
https://github.com/kainnne/Kainnne-LumaReader/releases/download/v1.0.2/Kainnne-LumaReader-1.0.2-Windows-x64-Setup.exe
```

Because filenames include the version, the website links must be updated for every release. Do not use an old filename with `/releases/latest/download/`; GitHub requires the filename to exactly match an asset in the latest Release.

The general latest-release page is always:

```text
https://github.com/kainnne/Kainnne-LumaReader/releases/latest
```

## Website button behavior

The download buttons are defined in `site/index.html`.

- macOS should download the primary macOS DMG directly.
- Windows should download the x64 Setup executable directly.
- Keep the GitHub button linked to the repository.
- Remove `Coming soon` only after the matching Release is public and both direct URLs return the files.
- The current macOS release is Universal, so the website needs only one macOS button.

Example:

```html
<a href="https://github.com/kainnne/Kainnne-LumaReader/releases/download/v1.0.2/Kainnne-LumaReader-1.0.2-macOS-universal.dmg">
  Download for macOS
</a>
```

## Agent release checklist

1. Read the version from `package.json`; never guess it.
2. Confirm the Git tag and Release use the same version.
3. Build and test each installer on its target operating system.
4. Rename the artifacts consistently and generate SHA-256 checksums.
5. Upload assets to GitHub Releases, not to the repository tree.
6. Verify every direct-download URL in a signed-out browser.
7. Update the website URLs and visible version text.
8. Test the download buttons on desktop and mobile before deployment.
9. For macOS, complete the Apple signing, notarization, stapling, Gatekeeper, and clean-install checks above.

## Official references

- [Apple Developer ID certificates](https://developer.apple.com/help/account/certificates/create-developer-id-certificates/)
- [Notarizing macOS software before distribution](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- [Resolving common notarization issues](https://developer.apple.com/documentation/security/resolving-common-notarization-issues)
- [Customizing the notarization workflow](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow)
