# Kainnne LumaReader browser shortcut

This optional Chromium extension opens the current `.md`, `.mkd`, `.mdx`, or `.markdown` tab through the registered `kainnne-lumareader://` desktop protocol. It can launch the app when the reader is not already running.

1. Install or run **Kainnne LumaReader** once so the operating system registers its protocol.
2. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select this `browser-extension` folder.
4. Pin the extension, or press `Command + Shift + M` on macOS.

For `file://` documents, enable **Allow access to file URLs** in the extension details page. The browser may ask for confirmation before opening the desktop protocol. The extension does not upload document content.
