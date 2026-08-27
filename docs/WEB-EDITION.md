# LumaReader Web

LumaReader Web is the static, account-free browser edition served from `/web/`. It exists to make the complete reading interface immediately usable while keeping durable library management and export in the desktop product.

## Product rules

- A browser tab may hold at most three user documents at one time.
- Markdown, MDX, plain text, and log files are accepted through the local file picker.
- Markdown and plain-text files can also be dragged directly onto the reader; the drop path reuses the same import and capacity checks.
- Opened content stays in memory for the current tab. Reloading or closing the tab clears it.
- Each file row has a remove action. Removal requires confirmation and does not delete the original local file.
- No document content is uploaded during ordinary reading or editing.
- Folder-library import, cloud persistence, document download, and PDF export are desktop-only.
- The rest of the reading and editing interface should stay aligned with the desktop renderer.
- **Share this Markdown** creates a compressed `#share=` URL fragment containing the current Markdown name and text. The fragment is decoded locally and is not sent to the static host.

## Implementation

`site/web/index.html` loads `web-bridge.js` before the shared renderer scripts. The bridge stores documents in a `Map`, exposes file records through intercepted same-origin `/api/` requests, and implements the small `window.lumaDesktop` surface used for preferences, create, and save operations. The host remains a static GitHub Pages deployment; no document database or upload API is involved.

The first sample document does not count toward the three-document limit and is removed when a user document is added. Additional files trigger the capacity dialog, which lists the current session documents so the user can remove one before continuing the import.

If `showOpenFilePicker` returns a writable file handle, the bridge requests write permission when saving and can update the original local file. Browsers without that capability keep edits only in the session. The app must not offer a fallback document download, because durable output is intentionally reserved for the desktop edition.

Interface preferences use local storage. Document names, paths, and content do not.

## Acceptance checks

1. Open one to three supported documents and confirm all appear in the sidebar.
2. Attempt to open a fourth document and confirm the capacity dialog appears instead of silently replacing a file.
3. Remove one document, confirm the original local file still exists, and continue importing the pending document.
4. Enter editing and confirm the preview is open by default, the split is draggable, synchronized scrolling works, and **Show bottom** appears only when needed.
5. Reload the page and confirm user documents and edits are gone while visual preferences may remain.
6. Confirm PDF export and document-download controls are absent and the desktop call to action reaches `/#download`.
7. Share the current Markdown, open the generated link in a clean tab, and confirm the same filename and content render without a server upload.
