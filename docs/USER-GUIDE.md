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
- **Edit** opens the raw Markdown editor. Save in place with **Command+S** on macOS or **Ctrl+S** on Windows, then exit editing when ready.
- **Preview** in the editing toolbar opens a live rendered comparison. Drag the thin divider to resize the source and preview. Scrolling either pane keeps the rendered preview aligned to the Markdown source; the shared scrollbar is shown at the far right.
- **A−** and **A+** change reading, source, and editor text size. The keyboard shortcuts are **Command− / Command+** on macOS and **Ctrl− / Ctrl+** on Windows.
- The palette control contains twenty-two visual palettes. Dream Rose is the first-launch default; later choices are remembered.
- The language selector changes interface labels only.
- The half-moon button changes light or dark appearance.
- Horizontal and vertical scrollbars are both draggable whenever content overflows.
- The persistent menu button collapses and restores the sidebar.

## File types

- Markdown is enabled by default: `.md`, `.markdown`, `.mkd`, `.mdx`.
- Plain text is optional: enable `.txt` and `.log` separately from the **Formats** menu.
- TXT and LOG remain read-only; Markdown files inside the selected library can be edited.

## Supported content

The renderer supports standard Markdown, GitHub-style tables and task lists, fenced code, alerts, abbreviations, footnotes, emoji shortcodes, superscript, subscript, KaTeX delimiters, Mermaid diagrams, local media, and include directives.

Supported include forms:

```text
!INCLUDE "relative-file.md"
{{ include:relative-file.md }}
```

Includes cannot escape the selected library when reading a library document.
