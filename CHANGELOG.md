# Changelog

## 1.0.0 — 2026-08-23

First public release of Kainnne LumaReader.

### Reading

- Folder-based Markdown library with nested search, automatic ancestor expansion, current-document outline, and a resizable or collapsible sidebar.
- Full-width Vertical reading by default, Horizontal reading, and Paged reading with left/right or up/down navigation.
- Draggable horizontal and vertical scrollbars, stable reading-position restoration, and compact responsive controls.
- Markdown rendering for tables, task lists, alerts, highlighted code, KaTeX, Mermaid, footnotes, emoji, abbreviations, superscript, subscript, includes, and local media.
- Correct rendering for CJK bold labels when `**…**` is immediately followed by Chinese, Japanese, or Korean text.

### Editing and preferences

- Create a new `.md` by choosing its destination folder first, confirm its name and location, refresh the library immediately, and enter editing without risking an overwrite.
- In-place raw Markdown editing with an explicit Edit action and `Command+S` / `Ctrl+S`.
- Saving confirms in place and keeps editing active until the user exits; stale-file conflict protection prevents silent overwrite.
- Optional live Markdown comparison preview with a draggable divider, source-led block-aware synchronized scrolling, and one scrollbar at the far right.
- Reader, source, and editor text share the same size setting and `Command` / `Ctrl` with `+` and `-` shortcuts.
- Twenty-two palettes, neutral reading paper, light and dark appearances, eleven interface languages, persisted preferences, and a first-launch guide.
- Dream Rose with the light appearance is the first-launch default.

### Formats and privacy

- Markdown is enabled by default: `.md`, `.markdown`, `.mkd`, `.mdx`.
- `.txt` and `.log` are separately opt-in and remain read-only.
- Libraries stay on the device. The internal document service binds only to `127.0.0.1`; no account, upload, analytics, or automatic document translation is required.

### Downloads

- Universal macOS DMG and ZIP for Apple silicon and Intel Macs, signed and notarized for direct distribution.
- Unsigned Windows x64 Setup and Portable executables. SmartScreen may show an unrecognized-publisher notice.
