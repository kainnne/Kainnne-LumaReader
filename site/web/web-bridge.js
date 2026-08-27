(function () {
  "use strict";

  const TEXT_EXTENSIONS = [".md", ".markdown", ".mkd", ".mdx", ".txt", ".log"];
  const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mkd", ".mdx"];
  const MAX_SESSION_DOCUMENTS = 3;
  const documents = new Map();
  const assets = new Map();
  const objectUrls = new Set();
  const originalFetch = window.fetch.bind(window);
  const preferencesKey = "lumareader-web-preferences-v1";

  const sample = `# LumaReader Web

正式網頁版保留桌面版的閱讀與編輯體驗。一次最多開啟三份 Markdown 或純文字文件；檔案只存在目前的瀏覽器工作階段。

> [!NOTE]
> 網頁版不提供資料夾匯入、下載與 PDF 匯出。需要長期保存或匯出時，請使用桌面版。

## 閱讀與導覽

- [x] 直式、橫式、左右翻頁、上下翻頁
- [x] 文件搜尋、檔案格式篩選、標題大綱
- [x] 22 組配色、深色模式、11 種介面語言
- [x] 原文、媒體預覽與圖片檢視器

## 編輯功能

按下「編輯」會直接開啟即時預覽。左右欄位可以拖曳調整，並保留同步捲動與「顯示最底部」按鈕。

| 功能 | 網頁版 |
| --- | --- |
| 開啟多份文件 | 最多三份，關閉分頁後清除 |
| 新增 Markdown | 支援 |
| 儲存修改 | 本次工作階段；瀏覽器允許時可直接寫回原檔 |
| 下載與匯出 | 請使用 LumaReader 桌面版 |

### 進階 Markdown

數學公式：$E = mc^2$

\`\`\`js
const edition = "LumaReader Web";
const parity = true;
\`\`\`

\`\`\`mermaid
flowchart LR
  A[開啟文件] --> B[閱讀]
  B --> C[編輯與即時預覽]
\`\`\`

也支援註腳[^web]、縮寫與 :sparkles: Emoji。

![LumaReader 圖示](../icon.png)

*[MD]: Markdown
[^web]: 一般閱讀與編輯不會將文件上傳到伺服器。
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
    if (!document) return { ok: false, message: "Document is not available in this browser session." };
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
      return json({ root: "Browser session", files: [...documents.values()].map(fileRecord), types });
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
        return document ? json(payload(document)) : json({ error: "Browser session document limit reached", code: "SESSION_DOCUMENT_LIMIT" }, 409);
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
  addDocument({ name: "LumaReader Web.md", text: sample, path: "LumaReader Web.md", sample: true });

  window.lumaWeb = { chooseFiles, importFiles, mediaUrl, removeDocument, sessionInfo, maxSessionDocuments: MAX_SESSION_DOCUMENTS };
  window.lumaDesktop = {
    isDesktop: false,
    platform: "web",
    getPreferences: async () => ({ readerDefaultsVersion: 3, ...initialPreferences }),
    setPreferences: async (patch) => {
      const next = { ...loadPreferences(), ...patch };
      localStorage.setItem(preferencesKey, JSON.stringify(next));
      return next;
    },
    chooseCreateDirectory: async () => ({ selected: true, canceled: false, directory: "", displayPath: "Browser session", root: "Browser session", destinationToken: "web-session" }),
    cancelCreateDocument: async () => ({ ok: true }),
    createDocument: async ({ name }) => {
      let normalized = String(name || "").trim();
      if (!normalized.toLowerCase().endsWith(".md")) normalized += ".md";
      normalized = normalized.replace(/[\\/]/g, "-");
      if (!normalized || normalized === ".md") return { ok: false, message: "Enter a document name." };
      if (documents.has(normalized)) return { ok: false, code: "DOCUMENT_ALREADY_EXISTS" };
      const document = addDocument({ name: normalized, text: `# ${normalized.replace(/\.md$/i, "")}\n\n` });
      if (!document) return { ok: false, code: "SESSION_DOCUMENT_LIMIT", message: "Browser session document limit reached." };
      return { ok: true, root: "Browser session", document: payload(document) };
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
