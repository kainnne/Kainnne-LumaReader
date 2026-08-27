(function () {
  "use strict";

  const TEXT_EXTENSIONS = [".md", ".markdown", ".mkd", ".mdx", ".txt", ".log"];
  const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mkd", ".mdx"];
  const MAX_SESSION_DOCUMENTS = 3;
  const MAX_SHARE_TEXT_BYTES = 256 * 1024;
  const MAX_SHARE_URL_LENGTH = 100000;
  const documents = new Map();
  const assets = new Map();
  const objectUrls = new Set();
  const originalFetch = window.fetch.bind(window);
  const preferencesKey = "lumareader-web-preferences-v1";

  const sample = `# LumaReader Web

Turn a Markdown file into a calm, focused reading space—right in your browser.

> [!NOTE]
> Documents you open are read directly by your browser and are not uploaded. For folder libraries, downloads, and PDF export, use LumaReader Desktop.

## Read your way

- [x] Vertical, horizontal, and paged reading modes
- [x] Document search, format filters, and a live outline
- [x] 22 color palettes, dark mode, and 11 interface languages
- [x] Source view, media preview, and an image viewer

## Edit with context

Select **Edit** to open the source and rendered preview together. Resize the two panes, keep their scrolling synchronized, and use **Show bottom** when an elaborate layout makes the end of the preview difficult to reach.

| Feature | Web edition |
| --- | --- |
| Open documents | Up to three at a time |
| Create Markdown | Supported |
| Save changes | Writes back when the browser grants permission |
| Share Markdown | Creates a link containing the current document |
| Download and export | Available in LumaReader Desktop |

### Rich Markdown

Mathematics: $E = mc^2$

\`\`\`js
const edition = "LumaReader Web";
const parity = true;
\`\`\`

\`\`\`mermaid
flowchart LR
  A[Open a document] --> B[Read]
  B --> C[Edit with live preview]
\`\`\`

Footnotes[^web], abbreviations, and :sparkles: Emoji are supported too.

![LumaReader icon](../icon.png)

*[MD]: Markdown
[^web]: Ordinary reading and editing do not upload your document to a server.
`;

  function extensionOf(name) {
    const match = String(name || "").toLowerCase().match(/(\.[a-z0-9]+)$/);
    return match ? match[1] : "";
  }

  function uniquePath(name) {
    if (!documents.has(name) && !assets.has(name)) return name;
    const extension = extensionOf(name);
    const stem = extension ? name.slice(0, -extension.length) : name;
    let index = 2;
    let candidate = `${stem} ${index}${extension}`;
    while (documents.has(candidate) || assets.has(candidate)) candidate = `${stem} ${++index}${extension}`;
    return candidate;
  }

  function documentType(extension) {
    if (MARKDOWN_EXTENSIONS.includes(extension)) return { kind: "markdown", mime: "text/markdown", capabilities: { paged: true, source: true, media: true } };
    if (extension === ".txt") return { kind: "text", mime: "text/plain", capabilities: { paged: true, source: true, wrap: true } };
    return { kind: "log", mime: "text/plain", capabilities: { paged: true, source: true, wrap: true } };
  }

  function bytesToBase64Url(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(value) {
    const normalized = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function streamBytes(bytes, StreamType, maxBytes = Infinity) {
    const reader = new Blob([bytes]).stream().pipeThrough(new StreamType("gzip")).getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Shared document is too large");
      }
      chunks.push(value);
    }
    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return output;
  }

  async function encodeSharePayload(payload) {
    const source = new TextEncoder().encode(JSON.stringify(payload));
    if (typeof CompressionStream === "function") {
      return `g.${bytesToBase64Url(await streamBytes(source, CompressionStream))}`;
    }
    return `j.${bytesToBase64Url(source)}`;
  }

  async function decodeSharePayload(value) {
    if (String(value || "").length > MAX_SHARE_URL_LENGTH) throw new Error("Shared document is too large");
    const [format, encoded] = String(value || "").split(".", 2);
    if (!encoded || !["g", "j"].includes(format)) throw new Error("Invalid shared document");
    let bytes = base64UrlToBytes(encoded);
    if (format === "g") {
      if (typeof DecompressionStream !== "function") throw new Error("Shared document compression is not supported by this browser");
      bytes = await streamBytes(bytes, DecompressionStream, MAX_SHARE_TEXT_BYTES * 1.25);
    }
    if (bytes.byteLength > MAX_SHARE_TEXT_BYTES * 1.25) throw new Error("Shared document is too large");
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async function createShareUrl({ name, text }) {
    const safeName = String(name || "Shared Markdown.md").replace(/[\\/]/g, "-");
    const safeText = String(text || "");
    if (!MARKDOWN_EXTENSIONS.includes(extensionOf(safeName))) return { ok: false, code: "SHARE_MARKDOWN_ONLY" };
    if (new TextEncoder().encode(safeText).byteLength > MAX_SHARE_TEXT_BYTES) return { ok: false, code: "SHARE_TOO_LARGE" };
    const encoded = await encodeSharePayload({ version: 1, name: safeName, text: safeText });
    const url = `${location.origin}${location.pathname}#share=${encoded}`;
    if (url.length > MAX_SHARE_URL_LENGTH) return { ok: false, code: "SHARE_TOO_LARGE" };
    return { ok: true, url, name: safeName };
  }

  async function importSharedDocument() {
    const encoded = new URLSearchParams(String(location.hash || "").replace(/^#/, "")).get("share");
    if (!encoded) return { imported: false };
    try {
      const shared = await decodeSharePayload(encoded);
      if (shared?.version !== 1 || typeof shared.name !== "string" || typeof shared.text !== "string") throw new Error("Invalid shared document");
      const document = addDocument({ name: shared.name, text: shared.text });
      if (!document) throw new Error("Unable to open shared document");
      return { imported: true, path: document.path };
    } catch (error) {
      return { imported: false, error: error?.message || "Unable to open shared document" };
    }
  }

  function sessionDocuments() {
    return [...documents.values()].filter((document) => !document.sample);
  }

  function removeSampleDocuments() {
    for (const [path, document] of documents) {
      if (document.sample) documents.delete(path);
    }
  }

  function sessionInfo() {
    const files = sessionDocuments();
    return { count: files.length, limit: MAX_SESSION_DOCUMENTS, files: files.map(fileRecord) };
  }

  function fileRecord(document) {
    return {
      path: document.path,
      name: document.name,
      extension: document.extension,
      ext: document.extension,
      size: new TextEncoder().encode(document.text).length,
      modifiedNs: document.modifiedNs,
      webSample: Boolean(document.sample),
    };
  }

  function payload(document) {
    const type = documentType(document.extension);
    return {
      ...fileRecord(document),
      ...type,
      binary: false,
      sourceType: "project",
      base: location.href,
      text: document.text,
      renderText: document.text,
    };
  }

  function addDocument({ name, text, handle = null, path = "", sample = false }) {
    const safeName = String(name || "Untitled.md").replace(/[\\/]/g, "-");
    if (!sample && sessionDocuments().length >= MAX_SESSION_DOCUMENTS) return null;
    if (!sample) removeSampleDocuments();
    const finalPath = path || uniquePath(safeName);
    const extension = extensionOf(finalPath);
    if (!TEXT_EXTENSIONS.includes(extension)) return null;
    const document = { path: finalPath, name: finalPath.split("/").pop(), extension, text: String(text || ""), handle, sample, modifiedNs: String(Date.now() * 1000000) };
    documents.set(finalPath, document);
    return document;
  }

  function addAsset(file, path = "") {
    const finalPath = path || uniquePath(file.name);
    const url = URL.createObjectURL(file);
    objectUrls.add(url);
    assets.set(finalPath, { file, url });
    assets.set(file.name, { file, url });
  }

  async function importFiles(files, handles = []) {
    let lastDocument = "";
    const pendingFiles = [];
    let added = 0;
    const handleByName = new Map(handles.map((handle) => [handle.name, handle]));
    for (const file of Array.from(files || [])) {
      const extension = extensionOf(file.name);
      if (TEXT_EXTENSIONS.includes(extension)) {
        const document = addDocument({ name: file.name, text: await file.text(), handle: handleByName.get(file.name) || null });
        if (document) {
          added += 1;
          lastDocument = document.path;
        } else pendingFiles.push(file);
      } else if (/^(image|audio|video)\//.test(file.type)) {
        addAsset(file);
      }
    }
    return { path: lastDocument, added, pendingFiles, ...sessionInfo() };
  }

  async function chooseFiles() {
    if (typeof window.showOpenFilePicker !== "function") return { supported: false, path: "" };
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [
          { description: "Markdown and text", accept: { "text/plain": TEXT_EXTENSIONS } },
          { description: "Document media", accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"], "audio/*": [".mp3", ".wav", ".m4a", ".ogg"], "video/*": [".mp4", ".webm", ".mov"] } },
        ],
      });
      const files = await Promise.all(handles.map((handle) => handle.getFile()));
      return { supported: true, ...await importFiles(files, handles) };
    } catch (error) {
      if (error?.name === "AbortError") return { supported: true, path: "" };
      throw error;
    }
  }

  function mediaUrl(raw, from) {
    const value = String(raw || "").trim().replace(/^<|>$/g, "");
    if (!value) return "";
    if (/^(?:data:|blob:|https?:)/i.test(value)) return value;
    const clean = decodeURIComponent(value.split(/[?#]/)[0]).replace(/^\.\//, "");
    const baseParts = String(from || "").split("/");
    baseParts.pop();
    for (const part of clean.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") baseParts.pop();
      else baseParts.push(part);
    }
    const candidate = baseParts.join("/");
    const asset = assets.get(candidate) || assets.get(clean) || assets.get(clean.split("/").pop());
    if (asset) return asset.url;
    try { return new URL(value, location.href).href; } catch { return ""; }
  }

  async function saveDocument({ path, text }) {
    const document = documents.get(path);
    if (!document) return { ok: false, message: "Document is not available in LumaReader Web." };
    document.text = String(text || "");
    document.modifiedNs = String(Date.now() * 1000000);
    if (document.handle) {
      try {
        const permission = await document.handle.queryPermission?.({ mode: "readwrite" });
        if (permission === "granted" || await document.handle.requestPermission?.({ mode: "readwrite" }) === "granted") {
          const writable = await document.handle.createWritable();
          await writable.write(document.text);
          await writable.close();
          return { ok: true, modifiedNs: document.modifiedNs, document: payload(document) };
        }
      } catch (error) {
        console.warn("Unable to write the original file", error);
      }
    }
    return { ok: true, modifiedNs: document.modifiedNs, sessionOnly: true, document: payload(document) };
  }

  function removeDocument(path) {
    const document = documents.get(path);
    if (!document) return { ok: false, code: "DOCUMENT_NOT_FOUND" };
    documents.delete(path);
    const remaining = [...documents.values()];
    return { ok: true, removedPath: path, nextPath: remaining[0]?.path || "", ...sessionInfo() };
  }

  function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }

  window.fetch = async function webFetch(input, init) {
    const requestUrl = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (requestUrl.origin !== location.origin || !requestUrl.pathname.startsWith("/api/")) return originalFetch(input, init);
    if (requestUrl.pathname === "/api/files") {
      const types = TEXT_EXTENSIONS.map((extension) => ({ extension, ext: extension, ...documentType(extension), binary: false }));
      return json({ root: "LumaReader Web", files: [...documents.values()].map(fileRecord), types });
    }
    if (requestUrl.pathname === "/api/file") {
      const document = documents.get(requestUrl.searchParams.get("path") || "");
      return document ? json(payload(document)) : json({ error: "Document not found" }, 404);
    }
    if (requestUrl.pathname === "/api/meta") {
      const document = documents.get(requestUrl.searchParams.get("source") || "");
      return document ? json({ modifiedNs: document.modifiedNs }) : json({ error: "Document not found" }, 404);
    }
    if (requestUrl.pathname === "/api/open") {
      const source = requestUrl.searchParams.get("source") || "";
      try {
        const response = await originalFetch(source, { cache: "no-store" });
        if (!response.ok) return json({ error: `Unable to open source (${response.status})` }, response.status);
        const name = decodeURIComponent(new URL(source).pathname.split("/").pop() || "Remote.md");
        const document = addDocument({ name, text: await response.text() });
        return document ? json(payload(document)) : json({ error: "LumaReader Web document limit reached", code: "SESSION_DOCUMENT_LIMIT" }, 409);
      } catch (error) {
        return json({ error: error?.message || "Unable to open source" }, 400);
      }
    }
    return json({ error: "Unsupported web API" }, 404);
  };

  function loadPreferences() {
    try { return JSON.parse(localStorage.getItem(preferencesKey) || "{}"); } catch { return {}; }
  }

  const initialPreferences = loadPreferences();
  if (!localStorage.getItem("lumareader-language")) {
    const browserLanguage = navigator.language || "en";
    localStorage.setItem("lumareader-language", browserLanguage.startsWith("zh") ? "zh-Hant" : browserLanguage);
  }
  const ready = importSharedDocument().then((result) => {
    if (!result.imported) addDocument({ name: "LumaReader Web.md", text: sample, path: "LumaReader Web.md", sample: true });
    return result;
  });

  window.lumaWeb = { chooseFiles, importFiles, mediaUrl, removeDocument, sessionInfo, createShareUrl, ready, maxSessionDocuments: MAX_SESSION_DOCUMENTS };
  window.lumaDesktop = {
    isDesktop: false,
    platform: "web",
    getPreferences: async () => ({ readerDefaultsVersion: 3, ...initialPreferences }),
    setPreferences: async (patch) => {
      const next = { ...loadPreferences(), ...patch };
      localStorage.setItem(preferencesKey, JSON.stringify(next));
      return next;
    },
    chooseCreateDirectory: async () => ({ selected: true, canceled: false, directory: "", displayPath: "LumaReader Web", root: "LumaReader Web", destinationToken: "web-session" }),
    cancelCreateDocument: async () => ({ ok: true }),
    createDocument: async ({ name }) => {
      let normalized = String(name || "").trim();
      if (!normalized.toLowerCase().endsWith(".md")) normalized += ".md";
      normalized = normalized.replace(/[\\/]/g, "-");
      if (!normalized || normalized === ".md") return { ok: false, message: "Enter a document name." };
      if (documents.has(normalized)) return { ok: false, code: "DOCUMENT_ALREADY_EXISTS" };
      const document = addDocument({ name: normalized, text: `# ${normalized.replace(/\.md$/i, "")}\n\n` });
      if (!document) return { ok: false, code: "SESSION_DOCUMENT_LIMIT", message: "LumaReader Web document limit reached." };
      return { ok: true, root: "LumaReader Web", document: payload(document) };
    },
    saveDocument,
    onSaveRequested: () => () => {},
    onFontSizeRequested: () => () => {},
    onLibraryChanged: () => () => {},
  };

  window.addEventListener("beforeunload", () => {
    for (const url of objectUrls) URL.revokeObjectURL(url);
  });
})();
