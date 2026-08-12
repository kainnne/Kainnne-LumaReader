# Text adapters

LumaReader renders Markdown through its original reading pipeline. The adapter layer is intentionally limited to inert UTF-8 plain text:

- `.txt`
- `.log`

`core.js` provides safe text helpers and logical pagination. `plain-text.js` renders escaped text with line numbers, wrapping control, and draggable horizontal and vertical scrollbars. `index.js` exposes only the plain-text adapter.

PDF, images, structured data, tables, and workbooks are not registered or packaged.
