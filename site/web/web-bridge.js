(function () {
  "use strict";

  const TEXT_EXTENSIONS = [".md", ".markdown", ".mkd", ".mdx", ".txt", ".log"];
  const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mkd", ".mdx"];
  const MAX_SESSION_DOCUMENTS = 3;
  const MAX_SHARE_TEXT_BYTES = 256 * 1024;
  const MAX_SHARE_URL_LENGTH = 100000;
  const SHARE_SERVICE_URL = "https://lumareader-share.chaos60649.workers.dev";
  const documents = new Map();
  const assets = new Map();
  const objectUrls = new Set();
  const originalFetch = window.fetch.bind(window);
  const preferencesKey = "lumareader-web-preferences-v1";

  const desktopDownloads = Object.freeze([
    { platform: "macos", label: "macOS", url: `${SHARE_SERVICE_URL}/d/macos` },
    { platform: "windows", label: "Windows", url: `${SHARE_SERVICE_URL}/d/windows` },
    { platform: "linux", label: "Linux", url: `${SHARE_SERVICE_URL}/d/linux` },
  ].map((entry) => Object.freeze(entry)));

  function detectDesktopPlatform() {
    const agent = String(navigator.userAgent || "");
    const platform = String(navigator.userAgentData?.platform || navigator.platform || "");
    const identity = `${platform} ${agent}`;
    if (navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod|CrOS|Mobile/i.test(identity)) return null;
    // iPadOS can advertise a desktop Mac user agent.
    if (/Mac/i.test(platform) && navigator.maxTouchPoints > 1) return null;
    if (/Windows|Win32|Win64/i.test(identity)) return "windows";
    if (/Macintosh|MacIntel|MacPPC|Mac OS|macOS/i.test(identity)) return "macos";
    if (/Linux/i.test(identity) && !/aarch64|arm|riscv|ppc|s390/i.test(identity)) return "linux";
    return null;
  }

  const preferredDesktopDownload = desktopDownloads.find((entry) => entry.platform === detectDesktopPlatform()) || null;
  const desktopDownloadMarkdown = desktopDownloads.map((entry) => `[${entry.label}](${entry.url})`).join(" · ");

  const sample = `# LumaReader Web

## Try the interface / 先體驗介面

Open a Markdown file or try editing this example. The Web edition holds up to three documents at a time.

開啟自己的 Markdown 檔案，或直接編輯這份示範文件。網頁版同時最多開啟 3 份文件。

## Read your way / 用喜歡的方式閱讀

- [x] Vertical, horizontal, and paged reading modes / 直式、橫式與翻頁閱讀模式
- [x] Document search, format filters, and a live outline / 文件搜尋、格式篩選與即時目錄
- [x] 22 color palettes, dark mode, and 11 interface languages / 22 組色系、深色模式與 11 種介面語言
- [x] Source view, media preview, and an image viewer / 原文檢視、媒體預覽與圖片瀏覽器

## Edit with context / 一邊編輯，一邊確認排版

Select **Edit** to open the source and rendered preview together. Resize the two panes, keep their scrolling synchronized, and use **Show bottom** when an elaborate layout makes the end of the preview difficult to reach.

按下 **Edit** 後，原文與排版預覽會同時開啟。你可以調整兩側寬度、同步捲動；遇到較複雜的版面時，也能用 **Show bottom** 查看預覽最末端。

| Feature / 功能 | Web edition / 網頁版 |
| --- | --- |
| Open documents / 開啟文件 | Up to three at a time / 同時最多三份 |
| Create Markdown / 建立 Markdown | Supported / 支援 |
| Save changes / 儲存修改 | Writes back when the browser grants permission / 瀏覽器授權後可寫回原始檔案 |
| Share Markdown / 分享 Markdown | Creates a temporary share link / 建立暫時分享連結 |
| Download and export / 下載與匯出 | Available in LumaReader Desktop / 請使用 LumaReader 桌面版 |

### Rich Markdown / 豐富的 Markdown 呈現

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

同時支援註腳[^web]、縮寫與 :sparkles: Emoji。

![LumaReader icon](../icon-content.webp)

*[MD]: Markdown
[^web]: Ordinary reading and editing do not upload your document to a server. 一般閱讀與編輯不會將文件上傳到伺服器。

## Download LumaReader Desktop / 下載 LumaReader 桌面版

Open complete project folders, search file and folder names, save edits locally, and export PDFs with a custom footer and page breaks. Reading and editing do not require an account or uploading your documents.

桌面版可直接開啟完整專案資料夾、搜尋檔名與資料夾、將修改儲存到本機，並匯出可自訂頁尾與分頁的 PDF。閱讀與編輯不需登入，也不必將文件上傳到伺服器。

Choose your operating system / 選擇你的作業系統：

${desktopDownloadMarkdown}

[LumaReader home / 返回 LumaReader 首頁](https://lumareader.kainnne.com/)
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
    if (safeName === "LumaReader Web.md" && safeText === sample) {
      return { ok: true, url: `${location.origin}${location.pathname}`, name: safeName, canonical: true };
    }
    const encoded = await encodeSharePayload({ version: 1, name: safeName, text: safeText });
    const url = `${location.origin}${location.pathname}#share=${encoded}`;
    if (url.length > MAX_SHARE_URL_LENGTH) return { ok: false, code: "SHARE_TOO_LARGE" };
    const metadata = shareMetadata(safeName, safeText);
    try {
      const response = await withTimeout(originalFetch(`${SHARE_SERVICE_URL}/api/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: url, ...metadata }),
      }), 5000);
      if (response.ok) {
        const share = await response.json();
        if (share?.ok && typeof share.url === "string") {
          return { ok: true, url: share.url, name: safeName, shortened: true, expiresAt: share.expiresAt || "" };
        }
      }
    } catch (error) {
      console.warn("Unable to create a short LumaReader share link", error);
    }
    return { ok: true, url, name: safeName, shortened: false };
  }

  function withTimeout(promise, milliseconds) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Share service timed out")), milliseconds);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function shareMetadata(name, text) {
    const plainName = String(name || "Shared Markdown.md").replace(/\.(?:md|markdown|mkd|mdx)$/i, "");
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trim());
    const heading = lines.find((line) => /^#\s+\S/.test(line));
    const title = cleanMarkdownText(heading ? heading.replace(/^#\s+/, "") : plainName).slice(0, 120) || "Shared Markdown";
    const descriptionLine = lines.find((line) => line && !/^(?:#{1,6}\s|```|~~~|[-*_]{3,}|\||>\s*\[!|!\[)/.test(line));
    const description = cleanMarkdownText(descriptionLine || "Open this Markdown document in LumaReader Web.").slice(0, 220);
    return { title, description };
  }

  function cleanMarkdownText(value) {
    return String(value || "")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .replace(/^>\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
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

  async function importImage({ path, name, bytes }) {
    const document = documents.get(path);
    if (!document || !MARKDOWN_EXTENSIONS.includes(document.extension)) return { ok: false, code: "DOCUMENT_NOT_FOUND" };
    const safeName = String(name || "image.png").replace(/[\\/]/g, "-").replace(/^\.+/, "") || "image.png";
    const extension = extensionOf(safeName);
    const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" }[extension];
    if (!mime) return { ok: false, code: "UNSUPPORTED_IMAGE" };
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    if (!data.length || data.byteLength > 32 * 1024 * 1024) return { ok: false, code: "INVALID_IMAGE" };
    const documentParts = document.path.split("/");
    const documentName = documentParts.pop() || "document.md";
    const folder = documentParts.join("/");
    const assetFolder = `${documentName.replace(/\.[^.]+$/, "")}.assets`;
    const requestedPath = [folder, assetFolder, safeName].filter(Boolean).join("/");
    const assetPath = uniquePath(requestedPath);
    const file = new File([data], assetPath.split("/").pop(), { type: mime });
    addAsset(file, assetPath);
    const markdownPath = assetPath.slice(folder ? folder.length + 1 : 0).split("/").map(encodeURIComponent).join("/");
    return { ok: true, image: { path: assetPath, markdownPath } };
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

  window.lumaWeb = { desktopDownloads, preferredDesktopDownload, chooseFiles, importFiles, mediaUrl, removeDocument, sessionInfo, createShareUrl, ready, maxSessionDocuments: MAX_SESSION_DOCUMENTS };
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
    importImage,
    onSaveRequested: () => () => {},
    onFontSizeRequested: () => () => {},
    onLibraryChanged: () => () => {},
  };

  window.addEventListener("beforeunload", () => {
    for (const url of objectUrls) URL.revokeObjectURL(url);
  });
})();
