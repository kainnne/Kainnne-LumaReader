(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LumaDocumentAdapters = Object.assign(root.LumaDocumentAdapters || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TEXT_DECODER = typeof TextDecoder === "function" ? new TextDecoder("utf-8", { fatal: false }) : null;

  function extensionOf(name) {
    const match = String(name || "").toLowerCase().match(/(\.[a-z0-9]+)(?:[?#].*)?$/);
    return match ? match[1] : "";
  }

  function normalizeSource(source) {
    if (source == null) return { name: "Untitled", mime: "", text: "", data: null, url: "" };
    if (typeof source === "string") return { name: "Untitled", mime: "text/plain", text: source, data: null, url: "" };
    const content = source.content && typeof source.content === "object" ? source.content : null;
    return {
      name: String(source.name || source.path || "Untitled"),
      mime: String(source.mime || source.type || ""),
      text: typeof source.text === "string" ? source.text : (typeof source.renderText === "string" ? source.renderText : null),
      data: source.data || source.arrayBuffer || source.buffer || null,
      url: String(source.url || source.contentUrl || content?.url || ""),
      kind: String(source.kind || ""),
      extension: String(source.extension || source.ext || ""),
      binary: Boolean(source.binary),
      capabilities: source.capabilities || {},
      limits: source.limits || {},
      meta: { ...(source.meta || {}), preflight: source.preflight, experimental: source.experimental },
    };
  }

  async function sourceText(source) {
    const normalized = normalizeSource(source);
    if (normalized.text != null) return normalized.text;
    let data = normalized.data;
    if (typeof data === "function") data = await data();
    if (data && typeof data.text === "function") return data.text();
    if (typeof Blob !== "undefined" && data instanceof Blob) return data.text();
    if (ArrayBuffer.isView(data)) data = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    if (data instanceof ArrayBuffer && TEXT_DECODER) return TEXT_DECODER.decode(data);
    return String(data == null ? "" : data);
  }

  async function sourceArrayBuffer(source) {
    const normalized = normalizeSource(source);
    let data = normalized.data;
    if (typeof data === "function") data = await data();
    if (data && typeof data.arrayBuffer === "function") return data.arrayBuffer();
    if (ArrayBuffer.isView(data)) return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    if (data instanceof ArrayBuffer) return data;
    if (normalized.url && typeof fetch === "function") {
      const response = await fetch(normalized.url, { cache: "no-store" });
      if (!response.ok) {
        let message = `Unable to load binary content (${response.status}).`;
        try { message = (await response.json()).error || message; } catch {}
        throw new Error(message);
      }
      return response.arrayBuffer();
    }
    if (normalized.text != null && typeof TextEncoder === "function") return new TextEncoder().encode(normalized.text).buffer;
    throw new TypeError("This document requires binary data.");
  }

  function clearElement(element) {
    while (element && element.firstChild) element.removeChild(element.firstChild);
  }

  function element(tagName, className, text) {
    if (typeof document === "undefined") throw new Error("Rendering requires a DOM.");
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function normalizeQuery(query) {
    return String(query || "").trim().toLocaleLowerCase();
  }

  function findTextMatches(text, query, limit = 500) {
    const needle = normalizeQuery(query);
    if (!needle) return [];
    const haystack = String(text || "");
    const folded = haystack.toLocaleLowerCase();
    const matches = [];
    let from = 0;
    while (matches.length < limit) {
      const index = folded.indexOf(needle, from);
      if (index < 0) break;
      const before = haystack.slice(0, index);
      const line = before.split("\n").length;
      const lineStart = before.lastIndexOf("\n") + 1;
      matches.push({ index, length: needle.length, line, column: index - lineStart + 1, preview: haystack.slice(Math.max(0, index - 40), index + needle.length + 80) });
      from = index + Math.max(1, needle.length);
    }
    return matches;
  }

  function paginateLogicalLines(lines, metrics = {}) {
    const width = Math.max(240, Number(metrics.width) || 900);
    const height = Math.max(240, Number(metrics.height) || 700);
    const fontSize = Math.max(12, Number(metrics.fontSize) || 16);
    const columns = Math.max(20, Math.floor((width - 72) / (fontSize * 0.62)));
    const lineBudget = Math.max(10, Math.floor((height - 72) / (fontSize * 1.65)));
    const pages = [];
    let start = 0;
    let visualLines = 0;
    for (let index = 0; index < lines.length; index += 1) {
      const needed = Math.max(1, Math.ceil(String(lines[index] || "").length / columns));
      if (index > start && visualLines + needed > lineBudget) {
        pages.push({ start, end: index });
        start = index;
        visualLines = 0;
      }
      visualLines += needed;
    }
    pages.push({ start, end: lines.length });
    return pages;
  }

  function pageForLogicalLine(pages, lineIndex) {
    const line = Math.max(0, Number(lineIndex) || 0);
    const index = pages.findIndex((page) => line >= page.start && line < Math.max(page.start + 1, page.end));
    return index < 0 ? Math.max(1, pages.length) : index + 1;
  }

  class DisposableBag {
    constructor() { this.items = []; }
    add(disposable) {
      if (disposable) this.items.push(disposable);
      return disposable;
    }
    listen(target, event, listener, options) {
      target.addEventListener(event, listener, options);
      this.items.push(() => target.removeEventListener(event, listener, options));
      return listener;
    }
    timeout(callback, delay) {
      const id = setTimeout(callback, delay);
      this.items.push(() => clearTimeout(id));
      return id;
    }
    dispose() {
      this.items.splice(0).reverse().forEach((item) => {
        try {
          if (typeof item === "function") item();
          else item.abort?.();
          item.disconnect?.();
          item.cancel?.();
          item.destroy?.();
        } catch {}
      });
    }
  }

  class BaseAdapter {
    constructor(options = {}) {
      this.options = options;
      this.document = null;
      this.container = null;
      this.currentPage = 1;
      this.disposables = new DisposableBag();
    }
    canOpen() { return false; }
    async loadDocument(source) { this.document = normalizeSource(source); return this.document; }
    async renderDocument(container) { this.container = container; clearElement(container); return container; }
    supportsPagedMode() { return false; }
    getPageCount() { return 1; }
    goToPage() { return false; }
    async renderPagePreview() { return null; }
    search(query) { return findTextMatches(this.document?.text || "", query); }
    dispose() {
      this.disposables.dispose();
      this.disposables = new DisposableBag();
      clearElement(this.container);
      this.container = null;
      this.viewport = null;
      this.document = null;
    }
  }

  class AdapterRegistry {
    constructor(adapters = []) { this.adapters = []; adapters.forEach((adapter) => this.register(adapter)); }
    register(adapter) {
      if (!adapter || typeof adapter.canOpen !== "function") throw new TypeError("Adapter must implement canOpen().");
      this.adapters.push(adapter);
      return adapter;
    }
    createFor(source) {
      const normalized = normalizeSource(source);
      const entry = this.adapters.find((item) => item.canOpen(normalized));
      if (!entry) return null;
      if (typeof entry === "function") return new entry();
      if (typeof entry.create === "function") return entry.create();
      if (entry.constructor && entry.constructor !== Object) return new entry.constructor(entry.options || {});
      return entry;
    }
    dispose() { this.adapters.length = 0; }
  }

  function injectStyle(id, css) {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  return {
    AdapterRegistry,
    BaseAdapter,
    DisposableBag,
    clearElement,
    element,
    extensionOf,
    findTextMatches,
    injectStyle,
    normalizeQuery,
    normalizeSource,
    pageForLogicalLine,
    paginateLogicalLines,
    sourceArrayBuffer,
    sourceText,
  };
});
