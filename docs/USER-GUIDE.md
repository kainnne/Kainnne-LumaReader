# User Guide

## Choose a library

The first launch opens a native folder picker at the Desktop. Choose a main folder that should act as the root of the reading library. Kainnne LumaReader remembers the selection.

To change it later, select **Library** in the sidebar or use **File → Change Library Folder**. The new folder replaces the previous root; it does not copy, move, rename, or edit any document.

If the first dialog is canceled, the app remains usable. Select **Library** whenever you are ready.

## Permissions

macOS may request permission when a selected folder is inside Desktop, Documents, or Downloads. Windows normally grants access through the folder picker itself. The reader requests access only after the user chooses a location.

## Read documents

- Expand a folder in the sidebar and select a document.
- Use **Files** for the library tree and **Outline** for headings in the open document.
- Use the search field to filter by filename or path. Matching results automatically reveal their parent folders; clearing search restores the previous collapsed state.
- Drag the sidebar edge wider for long filenames, or use the menu button to collapse the sidebar.
- Use **File** to preview one local supported document without changing the saved library.
- Use **New md.** to choose a destination folder, enter a filename, and confirm the full destination before creation. The library refreshes immediately and the new document opens directly in the editor. Choosing a folder outside the current library makes the selected folder the new library root. Existing files are never overwritten.

## Reading controls

- The reading-mode menu provides full-width **Vertical**, **Horizontal**, **Paged · Left / right**, and **Paged · Up / down** layouts.
- **Source** toggles the raw Markdown view.
- **Media** opens the media gallery for the current document.
- **Export PDF** opens the system save dialog and exports the rendered reading view as an A4 PDF with a subtle `Kainnne LumaReader` footer. Exit editing before exporting so the saved reading view is used.
- **Edit** opens the raw Markdown editor with the live preview visible by default. Save in place with **Command+S** on macOS or **Ctrl+S** on Windows, then exit editing when ready.
- **Preview** in the editing toolbar opens a live rendered comparison. Drag the thin divider to resize the source and preview. Scrolling either pane keeps the rendered preview aligned to the Markdown source; the shared scrollbar is shown at the far right.
- If the source reaches the end before a highly styled preview does, use **Show bottom** in the lower-right of the preview to reveal the remaining rendered content. Normal synchronized scrolling remains unchanged until that button is used.
- Selecting another file while editing shows a reminder to save or exit editing before switching documents.
- **Insert** adds common headings, emphasis, links, quotes, code, tasks, and tables while keeping the editor at the same reading position. Choose **Image** or drop PNG, JPEG, GIF, or WebP files into the editor to copy them beside the Markdown document and insert the matching relative syntax.
- Closing an edited document asks before discarding unsaved changes.
- **A−** and **A+** change reading, source, and editor text size. The keyboard shortcuts are **Command− / Command+** on macOS and **Ctrl− / Ctrl+** on Windows.
- The **Settings** gear contains twenty-two visual palettes, light and dark appearance, interface language, and switches for individual toolbar controls. The palette list remains open while you compare choices; selections and visibility preferences are remembered.
- Changing the language updates interface labels only. LumaReader may offer to move the language shortcut into Settings after the first manual change.
- Horizontal and vertical scrollbars are both draggable whenever content overflows.
- The persistent menu button collapses and restores the sidebar.

## File types

- Markdown is enabled by default: `.md`, `.markdown`, `.mkd`, `.mdx`.
- Plain text is optional: enable `.txt` and `.log` separately from the **Formats** menu.
- TXT and LOG remain read-only; Markdown files inside the selected library can be edited.

## Open Markdown from the operating system

The installed app registers `.md`, `.markdown`, `.mkd`, and `.mdx` documents without forcing itself to become the default.

- **macOS:** In Finder, select a Markdown file, choose **Get Info**, choose **Kainnne LumaReader** under **Open with**, then select **Change All…** if you want every file of that type to use LumaReader.
- **Windows:** Right-click a Markdown file, choose **Open with → Choose another app**, select **Kainnne LumaReader**, and enable **Always use this app**. The wording may vary slightly by Windows version.

## Supported content

The renderer supports standard Markdown, GitHub-style tables and task lists, fenced code, alerts, abbreviations, footnotes, emoji shortcodes, superscript, subscript, KaTeX delimiters, Mermaid diagrams, local media, and include directives.

Supported include forms:

```text
!INCLUDE "relative-file.md"
{{ include:relative-file.md }}
```

Includes cannot escape the selected library when reading a library document.

## Use LumaReader Web

Open [lumareader.kainnne.com/web/](https://lumareader.kainnne.com/web/) and select **Files** to choose Markdown or plain-text files, or drag the files directly onto the reader. The web edition can hold at most three documents at a time. Use the **×** beside a document name and confirm removal before opening another file.

Select **Share this Markdown** to share the open Markdown document. LumaReader shows a compact dialog with an eight-character short link and an explicit **Copy share link** action. The temporary shared copy expires after 30 days, and its link preview includes the document title, an excerpt, and LumaReader artwork. Anyone with the link can read that document. The unchanged built-in sample reuses the permanent `/web/` address and does not create a temporary copy. If the short-link service is unavailable, LumaReader provides a longer self-contained link instead.

The web edition keeps document content only in the current browser tab. Reloading or closing the tab clears every opened or newly created document. Editing, live preview, synchronized scrolling, Insert tools, image drop, Settings, reading modes, palettes, source view, media, outline, theme, and interface language remain available. A browser that grants a writable file handle may allow **Save** to update the selected original file; otherwise, the edit remains in the current session.

Folder libraries, cloud storage, document downloads, and PDF export are not available in the web edition. Use the macOS or Windows desktop app for those workflows.
