# User Guide

## Choose a library

The first launch opens a native folder picker at the operating system's Documents location. Choose the folder that should act as the root of the Markdown library. Kainnne LumaReader remembers the selection.

To change it later, select **Library** in the sidebar or use **File → Change Library Folder**. The new folder replaces the previous root; it does not copy, move, rename, or edit any document.

If the first dialog is canceled, the app remains usable. Select **Library** whenever you are ready.

## Permissions

macOS may request permission when a selected folder is inside Desktop, Documents, or Downloads. Windows normally grants access through the folder picker itself. The reader requests access only after the user chooses a location.

## Read documents

- Expand a folder in the sidebar and select a document.
- Use **Files** for the library tree and **Outline** for headings in the open document.
- Use the search field to filter the library by path.
- Use **File** to preview one local Markdown document without changing the saved library.
- Paste a `file://`, `http://`, or `https://` Markdown address into the source field.

## Reading controls

- **Vertical**, **Horizontal**, and **Paged** change the reading flow.
- **Source** toggles the raw Markdown view.
- **Media** opens the media gallery for the current document.
- **A−** and **A+** change reading size.
- The palette control contains twenty visual palettes.
- The language selector changes interface labels only.
- The half-moon button changes light or dark appearance.
- The persistent arrow or menu button collapses and restores the sidebar.

## Supported content

The renderer supports standard Markdown, GitHub-style tables and task lists, fenced code, alerts, abbreviations, footnotes, emoji shortcodes, superscript, subscript, KaTeX delimiters, Mermaid diagrams, local media, and include directives.

Supported include forms:

```text
!INCLUDE "relative-file.md"
{{ include:relative-file.md }}
```

Includes cannot escape the selected library when reading a library document.
