# LumaReader Web

LumaReader Web is the static, account-free browser edition served from `/web/`. It exists to make the complete reading interface immediately usable while keeping durable library management and export in the desktop product.

## Product rules

- A browser tab may hold at most three user documents at one time.
- Markdown, MDX, plain text, and log files are accepted through the local file picker.
- Markdown and plain-text files can also be dragged directly onto the reader; the drop path reuses the same import and capacity checks.
- Opened content stays in memory for the current tab. Reloading or closing the tab clears it.
- Each file row has a remove action. Removal requires confirmation and does not delete the original local file.
- No document content is uploaded during ordinary reading or editing.
- Folder-library import, durable cloud libraries, document download, and PDF export are desktop-only.
- The rest of the reading and editing interface should stay aligned with the desktop renderer, including Settings, toolbar visibility, Markdown insertion, image insertion, and unsaved-change confirmation.
- The built-in sample begins with a practical English and Traditional Chinese explanation of why the local-first Desktop edition is the primary product. Its Desktop download action is also placed directly beside **Share this Markdown** in the reader toolbar.
- **Share this Markdown** compresses the current Markdown into a reader URL, then asks the LumaReader share Worker for an eight-character short link. The Worker retains the target, title, and excerpt in KV for 30 days so link-preview crawlers can receive document-specific Open Graph metadata.
- Sharing the unchanged built-in `LumaReader Web.md` sample always returns `/web/` and never writes a KV entry. If the short-link service is unavailable, the browser falls back to the complete `#share=` URL so sharing still works.

## Implementation

`site/web/index.html` loads `web-bridge.js` before the shared renderer scripts. The bridge stores documents and inserted image assets in memory, exposes file records through intercepted same-origin `/api/` requests, and implements the small `window.lumaDesktop` surface used for preferences, create, save, and image-insert operations. The main site remains a static GitHub Pages deployment. Temporary share records are the only server-side document state and live in the separately deployed Cloudflare Worker and KV namespace under `cloudflare/lumareader-share/`.

The Web entry page publishes generic Open Graph and Twitter Card metadata. Short share pages are rendered by the Worker before redirecting into `/web/#share=…`, so social crawlers receive the shared document title, excerpt, and LumaReader image. The long fallback URL continues to receive the generic Web metadata because URL fragments are not sent to GitHub Pages.

The first sample document does not count toward the three-document limit and is removed when a user document is added. Additional files trigger the capacity dialog, which lists the current session documents so the user can remove one before continuing the import.

If `showOpenFilePicker` returns a writable file handle, the bridge requests write permission when saving and can update the original local file. Browsers without that capability keep edits only in the session. The app must not offer a fallback document download, because durable output is intentionally reserved for the desktop edition.

Interface preferences use local storage. Document names, paths, and content do not.

## Acceptance checks

1. Open one to three supported documents and confirm all appear in the sidebar.
2. Attempt to open a fourth document and confirm the capacity dialog appears instead of silently replacing a file.
3. Remove one document, confirm the original local file still exists, and continue importing the pending document.
4. Enter editing and confirm the preview is open by default, the split is draggable, synchronized scrolling works, and **Show bottom** appears only when needed.
5. Open **Settings**, compare several palettes without the panel closing, change toolbar visibility, and confirm Source and Media begin hidden for a fresh profile.
6. Use **Insert** and drop an image into the editor; confirm the source viewport stays in place and the preview updates. Close with unsaved edits and confirm the discard dialog appears.
7. Reload the page and confirm user documents and edits are gone while visual preferences may remain.
8. Confirm PDF export and document-download controls are absent and the desktop call to action reaches `/#download`.
9. Share the current Markdown, confirm the dialog shows a short `workers.dev/s/…` link, then open it in a clean tab and confirm the same filename and content render.
10. Share the unchanged built-in sample and confirm the result is the permanent `/web/` URL with no new KV record.
11. Confirm the built-in sample is bilingual and both its inline download link and the highlighted toolbar action reach `/#download`.
