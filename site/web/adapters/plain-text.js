(function (root, factory) {
  const core = typeof module === "object" && module.exports ? require("./core") : root.LumaDocumentAdapters;
  const api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LumaDocumentAdapters = Object.assign(root.LumaDocumentAdapters || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  const { BaseAdapter, element, extensionOf, findTextMatches, injectStyle, normalizeSource, pageForLogicalLine, paginateLogicalLines, sourceText } = core;
  const PLAIN_EXTENSIONS = new Set([".txt", ".log"]);
  const DEFAULT_BATCH = 300;

  function splitLines(text) {
    return String(text || "").replace(/\r\n?/g, "\n").split("\n");
  }

  function pageRanges(lines, pageSize = 70) {
    const ranges = [];
    for (let start = 0; start < lines.length; start += pageSize) ranges.push({ start, end: Math.min(lines.length, start + pageSize) });
    return ranges.length ? ranges : [{ start: 0, end: 0 }];
  }

  class PlainTextAdapter extends BaseAdapter {
    constructor(options = {}) {
      super(options);
      this.lines = [];
      this.pages = [];
      this.wrap = options.wrap !== false;
      this.renderedUntil = 0;
    }

    canOpen(source) {
      return ["text", "log"].includes(source.kind) || PLAIN_EXTENSIONS.has(source.extension || extensionOf(source.name)) || /^(text\/plain|text\/x-log)/i.test(source.mime || "");
    }

    async loadDocument(source) {
      const text = await sourceText(source);
      await super.loadDocument({ ...normalizeSource(source), text });
      this.document.text = text;
      this.lines = splitLines(text);
      this.pages = paginateLogicalLines(this.lines, this.options.initialViewport);
      return this.document;
    }

    async renderDocument(container, context = {}) {
      await super.renderDocument(container);
      injectStyle("luma-plain-adapter-style", `
        .luma-plain-shell{height:100%;min-width:0;display:grid;grid-template-rows:auto 1fr;background:var(--surface,#fff)}
        .luma-plain-toolbar{display:flex;gap:.5rem;align-items:center;padding:.55rem .8rem;border-bottom:1px solid var(--line,#ddd)}
        .luma-plain-viewport{overflow:auto;overscroll-behavior:contain;padding:1rem 0;scrollbar-gutter:stable}
        .luma-plain-lines{margin:0;font:var(--reader-size,16px)/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
        .luma-plain-lines[data-wrap=false]{white-space:pre;width:max-content;min-width:100%}
        .luma-log-line{display:grid;grid-template-columns:4.5rem 1fr;padding:0 .9rem;min-height:1.65em}
        .luma-log-line::before{content:attr(data-line);color:var(--muted,#777);text-align:right;padding-right:1rem;user-select:none}
        .luma-plain-sentinel{height:1px}
        .luma-text-page-preview{margin:0;width:100%;max-height:7.5rem;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:inherit}
      `);
      const shell = element("section", "luma-plain-shell");
      const toolbar = element("div", "luma-plain-toolbar");
      const wrapButton = element("button", "", this.wrap ? "No wrap" : "Wrap");
      wrapButton.type = "button";
      toolbar.append(wrapButton, element("span", "", `${this.lines.length.toLocaleString()} lines`));
      const viewport = element("div", "luma-plain-viewport");
      viewport.tabIndex = 0;
      const linesElement = element("div", "luma-plain-lines");
      const sentinel = element("div", "luma-plain-sentinel");
      linesElement.dataset.wrap = String(this.wrap);
      viewport.append(linesElement, sentinel);
      shell.append(toolbar, viewport);
      container.appendChild(shell);
      this.container = container;
      this.viewport = viewport;
      this.linesElement = linesElement;
      this.renderedUntil = 0;
      this.renderMore();
      this.disposables.listen(wrapButton, "click", () => {
        this.wrap = !this.wrap;
        linesElement.dataset.wrap = String(this.wrap);
        wrapButton.textContent = this.wrap ? "No wrap" : "Wrap";
        context.onLayoutChange?.();
      });
      if ("IntersectionObserver" in globalThis) {
        const observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) this.renderMore();
        }, { root: viewport, rootMargin: "600px" });
        observer.observe(sentinel);
        this.disposables.add(observer);
      } else {
        this.disposables.listen(viewport, "scroll", () => {
          if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 800) this.renderMore();
        }, { passive: true });
      }
      let scrollFrame = 0;
      this.disposables.listen(viewport, "scroll", () => {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(() => {
          const fontSize = parseFloat(getComputedStyle(linesElement).fontSize) || 16;
          const line = Math.max(0, Math.floor(viewport.scrollTop / (fontSize * 1.65)));
          this.currentPage = pageForLogicalLine(this.pages, line);
          context.onPageChange?.(this.currentPage);
        });
      }, { passive: true });
      this.disposables.add(() => cancelAnimationFrame(scrollFrame));
      if ("ResizeObserver" in globalThis) {
        let frame = 0;
        const reflow = new ResizeObserver(() => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const currentLine = Math.max(0, Math.floor(viewport.scrollTop / ((parseFloat(getComputedStyle(linesElement).fontSize) || 16) * 1.65)));
            this.pages = paginateLogicalLines(this.lines, { width: viewport.clientWidth, height: viewport.clientHeight, fontSize: parseFloat(getComputedStyle(linesElement).fontSize) || 16 });
            context.onPageModelChange?.({ count: this.pages.length, current: pageForLogicalLine(this.pages, currentLine), anchor: { type: "line", index: currentLine } });
          });
        });
        reflow.observe(viewport);
        this.disposables.add(() => { cancelAnimationFrame(frame); reflow.disconnect(); });
      }
      return shell;
    }

    renderMore() {
      if (!this.linesElement || this.renderedUntil >= this.lines.length) return;
      const fragment = document.createDocumentFragment();
      const end = Math.min(this.lines.length, this.renderedUntil + (this.options.batchSize || DEFAULT_BATCH));
      for (let index = this.renderedUntil; index < end; index += 1) {
        const row = element("div", "luma-log-line", this.lines[index]);
        row.dataset.line = String(index + 1);
        fragment.appendChild(row);
      }
      this.linesElement.appendChild(fragment);
      this.renderedUntil = end;
    }

    supportsPagedMode() { return true; }
    getPageCount() { return this.pages.length; }
    goToPage(pageNumber) {
      if (!this.viewport) return false;
      const page = Math.max(1, Math.min(this.pages.length, Number(pageNumber) || 1));
      this.currentPage = page;
      const line = this.pages[page - 1].start;
      while (this.renderedUntil <= line && this.renderedUntil < this.lines.length) this.renderMore();
      const target = this.linesElement.children[line];
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
      return Boolean(target);
    }
    renderPagePreview(pageNumber) {
      const page = this.pages[Math.max(0, Math.min(this.pages.length - 1, Number(pageNumber) - 1))];
      if (!page) return null;
      const label = `Lines ${page.start + 1}–${Math.max(page.start + 1, page.end)}`;
      const text = this.lines.slice(page.start, Math.min(page.end, page.start + 6)).join("\n");
      const preview = { page: Number(pageNumber), label, title: label, text };
      if (typeof document !== "undefined") preview.element = element("pre", "luma-text-page-preview", text || "Empty page");
      return preview;
    }
    search(query) { return findTextMatches(this.document?.text || "", query); }
  }

  return { PLAIN_EXTENSIONS, PlainTextAdapter, pageRanges, splitLines };
});
