(() => {
  "use strict";

  const sampleMarkdown = `# LumaReader Web

這是正在製作中的 LumaReader 網頁版。你可以直接開啟本機 Markdown，也可以在瀏覽器裡修改內容並同時查看預覽。

> [!NOTE]
> 目前檔案只存在這個分頁，不會上傳。分享連結會在下一階段加入，並預設自動過期。

## 目前可以做什麼

- [x] 開啟本機 Markdown
- [x] 閱讀與原文切換
- [x] 編輯時預設顯示即時預覽
- [x] 調整字級、閱讀方向、色系與深色模式
- [ ] 發布可分享連結

## 介面控制

| 功能 | 網頁版 Beta |
| --- | --- |
| 本機檔案 | 直接開啟，不上傳 |
| 編輯預覽 | 左側編輯、右側即時預覽 |
| PDF 匯出 | 引導至桌面版 |
| 分享連結 | 下一階段開放 |

\`\`\`js
const document = {
  source: "markdown",
  storage: "this browser tab",
  share: "coming next"
};
\`\`\`

## 閱讀應該保持簡單

原始檔案仍然是 Markdown；LumaReader 只負責把它整理成舒服、可控制的閱讀介面。`;

  const allowedTags = new Set(["A","BLOCKQUOTE","BR","CODE","DEL","EM","H1","H2","H3","H4","H5","H6","HR","INPUT","LI","OL","P","PRE","S","STRONG","TABLE","TBODY","TD","TH","THEAD","TR","UL"]);
  const allowedExtensions = [".md", ".markdown", ".mkd", ".mdx", ".txt"];
  const maxFileSize = 2 * 1024 * 1024;
  const state = {
    raw: sampleMarkdown,
    name: "LumaReader Web.md",
    editing: false,
    view: "rendered",
    fontSize: Number(localStorage.getItem("luma-web-font") || 18),
    mode: localStorage.getItem("luma-web-mode") || "vertical",
    palette: localStorage.getItem("luma-web-palette") || "dream-rose",
    dark: localStorage.getItem("luma-web-theme") === "dark",
  };

  const $ = (selector) => document.querySelector(selector);
  const content = $("#content");
  const source = $("#source");
  const editor = $("#editor");
  const stage = $("#document-stage");
  const shell = $(".reader-shell");
  const filePicker = $("#file-picker");
  const pdfDialog = $("#pdf-dialog");
  const shareDialog = $("#share-dialog");
  const toast = $("#toast");
  let toastTimer = null;

  function safeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.startsWith("#")) return raw;
    try {
      const url = new URL(raw, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function sanitizeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html;

    const clean = (parent) => {
      [...parent.children].forEach((element) => {
        if (!allowedTags.has(element.tagName)) {
          element.replaceWith(document.createTextNode(element.textContent || ""));
          return;
        }
        [...element.attributes].forEach((attribute) => {
          const name = attribute.name.toLowerCase();
          const keepCheckbox = element.tagName === "INPUT" && ["type", "checked", "disabled"].includes(name);
          if (name === "href" && element.tagName === "A") {
            const href = safeUrl(attribute.value);
            if (href) element.setAttribute("href", href);
            else element.removeAttribute(name);
            return;
          }
          if (name === "title" || keepCheckbox) return;
          element.removeAttribute(name);
        });
        if (element.tagName === "A") {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        }
        if (element.tagName === "INPUT") {
          element.setAttribute("type", "checkbox");
          element.setAttribute("disabled", "");
        }
        clean(element);
      });
    };

    clean(template.content);
    return template.innerHTML;
  }

  function enhanceCallouts() {
    content.querySelectorAll("blockquote").forEach((quote) => {
      const first = quote.querySelector("p:first-child");
      const match = first?.textContent?.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
      if (!match) return;
      first.innerHTML = `<strong>${match[1].toUpperCase()}</strong>${first.innerHTML.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, "")}`;
      quote.classList.add("callout");
    });
  }

  function renderMarkdown() {
    const html = window.marked.parse(state.raw, { gfm: true, breaks: false });
    content.innerHTML = sanitizeHtml(html);
    enhanceCallouts();
    source.querySelector("code").textContent = state.raw;
    if (editor.value !== state.raw && document.activeElement !== editor) editor.value = state.raw;
  }

  function updateDocumentLabels(status) {
    $("#file-name").textContent = state.name;
    $("#sidebar-file-name").textContent = state.name;
    $("#file-status").textContent = status || (state.editing ? "編輯中・即時預覽已開啟" : "內容只存在這個瀏覽器分頁");
  }

  function applyFontSize(value, save = true) {
    state.fontSize = Math.max(13, Math.min(30, value));
    document.documentElement.style.setProperty("--reader-size", `${state.fontSize}px`);
    if (save) {
      localStorage.setItem("luma-web-font", String(state.fontSize));
      showToast(`文字大小 ${state.fontSize}px`);
    }
  }

  function applyMode(mode) {
    state.mode = mode === "horizontal" ? "horizontal" : "vertical";
    shell.dataset.mode = state.mode;
    $("#reading-mode").value = state.mode;
    localStorage.setItem("luma-web-mode", state.mode);
  }

  function applyPalette(palette) {
    state.palette = ["dream-rose", "lavender", "mint", "studio"].includes(palette) ? palette : "dream-rose";
    document.documentElement.dataset.palette = state.palette;
    $("#palette").value = state.palette;
    localStorage.setItem("luma-web-palette", state.palette);
  }

  function applyTheme(dark) {
    state.dark = Boolean(dark);
    document.documentElement.classList.toggle("dark", state.dark);
    $("#theme").classList.toggle("active", state.dark);
    $("#theme").setAttribute("aria-label", state.dark ? "切換淺色模式" : "切換深色模式");
    localStorage.setItem("luma-web-theme", state.dark ? "dark" : "light");
  }

  function setView(view) {
    if (state.editing) setEditing(false);
    state.view = view === "source" ? "source" : "rendered";
    const sourceVisible = state.view === "source";
    content.hidden = sourceVisible;
    source.hidden = !sourceVisible;
    editor.hidden = true;
    $("#source-view").classList.toggle("active", sourceVisible);
    $("#source-view span:last-child").textContent = sourceVisible ? "閱讀" : "原文";
  }

  function setEditing(editing) {
    state.editing = Boolean(editing);
    state.view = "rendered";
    stage.classList.toggle("is-editing", state.editing);
    editor.hidden = !state.editing;
    source.hidden = true;
    content.hidden = false;
    $("#edit-view").classList.toggle("active", state.editing);
    $("#edit-view span:last-child").textContent = state.editing ? "結束編輯" : "編輯";
    $("#source-view").classList.remove("active");
    $("#source-view span:last-child").textContent = "原文";
    editor.value = state.raw;
    updateDocumentLabels();
    if (state.editing) requestAnimationFrame(() => editor.focus());
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  async function openFile(file) {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!allowedExtensions.some((extension) => lowerName.endsWith(extension))) {
      showToast("請選擇 Markdown 或純文字檔案。");
      return;
    }
    if (file.size > maxFileSize) {
      showToast("目前網頁版每個檔案上限為 2 MB。");
      return;
    }
    try {
      state.raw = await file.text();
      state.name = file.name;
      renderMarkdown();
      setView("rendered");
      updateDocumentLabels("本機檔案・未上傳");
      showToast("已在瀏覽器開啟，不會上傳。");
      filePicker.value = "";
      $("#sidebar").classList.remove("open");
    } catch {
      showToast("無法讀取這個檔案。");
    }
  }

  function updateProgress() {
    const maximum = Math.max(1, shell.scrollHeight - shell.clientHeight);
    $("#progress").style.width = `${Math.min(100, shell.scrollTop / maximum * 100)}%`;
  }

  $("#open-file").addEventListener("click", () => filePicker.click());
  filePicker.addEventListener("change", (event) => openFile(event.target.files?.[0]));
  $("#current-file").addEventListener("click", () => { setView("rendered"); shell.scrollTo({ top: 0, behavior: "smooth" }); });
  $("#edit-view").addEventListener("click", () => setEditing(!state.editing));
  $("#source-view").addEventListener("click", () => setView(state.view === "source" ? "rendered" : "source"));
  $("#reading-mode").addEventListener("change", (event) => applyMode(event.target.value));
  $("#palette").addEventListener("change", (event) => applyPalette(event.target.value));
  $("#font-down").addEventListener("click", () => applyFontSize(state.fontSize - 1));
  $("#font-up").addEventListener("click", () => applyFontSize(state.fontSize + 1));
  $("#theme").addEventListener("click", () => applyTheme(!state.dark));
  $("#share").addEventListener("click", () => openDialog(shareDialog));
  $("#export-pdf").addEventListener("click", () => openDialog(pdfDialog));
  $("#sidebar-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  editor.addEventListener("input", () => { state.raw = editor.value; renderMarkdown(); updateDocumentLabels(); });
  editor.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    const start = editor.selectionStart;
    editor.setRangeText("  ", start, editor.selectionEnd, "end");
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  shell.addEventListener("scroll", updateProgress, { passive: true });

  [pdfDialog, shareDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));

  document.addEventListener("dragover", (event) => { event.preventDefault(); document.body.classList.add("is-dragging"); });
  document.addEventListener("dragleave", (event) => { if (!event.relatedTarget) document.body.classList.remove("is-dragging"); });
  document.addEventListener("drop", (event) => {
    event.preventDefault();
    document.body.classList.remove("is-dragging");
    openFile(event.dataTransfer?.files?.[0]);
  });
  document.addEventListener("keydown", (event) => {
    const command = event.metaKey || event.ctrlKey;
    if (command && ["-", "_", "+", "=", "0"].includes(event.key)) {
      event.preventDefault();
      applyFontSize(event.key === "0" ? 18 : state.fontSize + (["-", "_"].includes(event.key) ? -1 : 1));
    }
    if (event.key === "Escape") $("#sidebar").classList.remove("open");
  });

  renderMarkdown();
  applyFontSize(state.fontSize, false);
  applyMode(state.mode);
  applyPalette(state.palette);
  applyTheme(state.dark);
  updateDocumentLabels("網頁版範例・可直接編輯");
})();
