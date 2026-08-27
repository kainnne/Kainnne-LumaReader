# LumaReader Release Checklist

This checklist is the evidence gate for public desktop releases. A checkbox must correspond to a recorded command, test result, or manual observation; do not mark an item by assumption.

## Shared source

- [ ] `package.json`, Git tag, release title, installer metadata, website URLs, and release notes use the same version.
- [ ] `npm ci`, `npm run check`, and `npm test` pass from a clean checkout.
- [ ] Only `.md`, `.markdown`, `.mkd`, `.mdx`, `.txt`, and `.log` are exposed; TXT and LOG default to disabled.
- [ ] First launch defaults to English, Dream Rose, light appearance, and full-width Vertical reading.
- [ ] Folder selection, search ancestor expansion, reading modes, New md. destination/no-overwrite behavior, edit/save/exit, palette persistence, and normal shutdown are tested.

## macOS direct distribution

- [ ] A valid `Developer ID Application` certificate and private key are stored only in the release operator's Keychain and protected GitHub repository secrets.
- [ ] The `macOS signed release build` job runs on `macos-15` from the same reviewed commit used for the Windows artifact.
- [ ] The build is Universal (`arm64` and `x86_64`) and uses Hardened Runtime with production entitlements.
- [ ] All nested executable code passes strict `codesign` verification.
- [ ] Apple notarization returns `Accepted`; its log has been reviewed.
- [ ] The notarization ticket is stapled and validates on the `.app` packaged inside the final DMG.
- [ ] `spctl` accepts the app as `Developer ID` source.
- [ ] CI launches the packaged app, scans and opens Markdown through its loopback API, and quits without a lingering process.
- [ ] A final app copied from the downloaded DMG launches, selects a folder, reads and edits Markdown, persists preferences, and quits without a lingering process.

## Windows x64

- [ ] GitHub Actions builds on a genuine `windows-2022` x64 runner.
- [ ] The unpacked, NSIS-installed, and Portable applications each start their loopback service, scan the release fixture, open Markdown, and shut down.
- [ ] A CrossOver visual pass confirms first launch, folder selection, rendering, editing, menus, and window resizing.
- [ ] Release notes and website state that the Windows build is unsigned and may trigger SmartScreen.

## Publication

- [ ] SHA-256 hashes are generated only from final signed/notarized macOS and final Windows assets.
- [ ] The GitHub Release matching `package.json` contains the exact documented filenames and checksum file.
- [ ] Both public website buttons return successful direct downloads in a signed-out session.
- [ ] The website is inspected at desktop and mobile widths after GitHub Pages deploys.
