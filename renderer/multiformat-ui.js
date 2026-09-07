(function () {
  "use strict";

  const ALL_FORMATS = Object.freeze([".md", ".markdown", ".mkd", ".mdx", ".txt", ".log"]);
  const DEFAULT_FORMATS = Object.freeze([".md", ".markdown", ".mkd", ".mdx"]);
  const ONBOARDING_VERSION = 5;
  const STORAGE_FORMATS = "lumareader-text-formats-v2";
  const STORAGE_TOUR = "lumareader-onboarding-version";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const copy = {
    en: {
      fileTypes: "File types",
      selected: "selected",
      selectAll: "Select all",
      clearAll: "Clear all",
      close: "Close format selector",
      footnote: "Markdown types are selected by default. Enable .txt or .log when needed.",
      steps: [
        ["Choose your library", "Open a Markdown file to edit it in its own window with its folder in the sidebar, or choose a folder to browse."],
        ["Choose file types", "Markdown is on by default. Turn on .txt or .log only when you want them in the list."],
        ["Read your way", "Use vertical, horizontal, or paged reading. In vertical mode, text wraps to the available width, including while editing."],
        ["Make the toolbar yours", "Open Appearance & toolbar to switch light or dark mode, choose a palette, change language, or hide controls you do not use. Source, Media, and Export PDF start hidden; enable them here when needed."],
        ["Choose a default Markdown app", "Choose LumaReader in Finder’s Get Info → Open with → Change All, Windows Settings → Apps → Default apps, or your Linux file manager’s Open With / Properties settings. Linux options vary by desktop environment. This is optional; LumaReader does not change your defaults at launch."],
      ],
      step: "Step {current} of {total}",
      next: "Next",
      done: "Start reading",
      skip: "Skip tour",
    },
    "zh-Hant": {
      fileTypes: "檔案格式",
      selected: "個已選取",
      selectAll: "全部選取",
      clearAll: "全部清除",
      close: "關閉格式選單",
      footnote: "預設選取 Markdown 類型；需要時再啟用 .txt 或 .log。",
      steps: [
        ["選擇文件資料夾", "開啟 Markdown 後，可在獨立視窗編輯，左側會顯示檔案所在的資料夾；也能自行選取資料夾瀏覽。"],
        ["選擇檔案格式", "Markdown 預設開啟；需要時才將 .txt 或 .log 加入清單。"],
        ["選擇閱讀方式", "可使用直式、橫式或翻頁閱讀；直式內文與編輯文字會隨視窗寬度自動換行。"],
        ["調整成你習慣的工具列", "從「外觀與工具列」切換亮暗模式與色系，也能變更語言。Source、Media 與 Export PDF 預設收起，需要時可在這裡開啟。"],
        ["自行選擇 Markdown 預設程式", "Mac 請到 Finder「取得資訊 → 打開方式 → 全部更改」；Windows 請到「設定 → 應用程式 → 預設應用程式」；Linux 請到檔案管理員的「開啟方式／內容」設定，實際名稱依桌面環境而異。由你自行選擇，LumaReader 不會在啟動時更改預設值。"],
      ],
      step: "步驟 {current} / {total}",
      next: "下一步",
      done: "開始閱讀",
      skip: "略過導覽",
    },
  };

  const els = {
    filter: $("#format-filter"),
    toggle: $("#format-filter-toggle"),
    popover: $("#format-filter-popover"),
    close: $("#format-filter-close"),
    summary: $("#format-filter-summary"),
    count: $("#format-filter-count"),
    selectAll: $("#formats-select-all"),
    clearAll: $("#formats-clear-all"),
    picker: $("#file-picker"),
    language: $("#language"),
    onboarding: $("#onboarding"),
    spotlight: $(".onboarding-spotlight"),
    progress: $("#onboarding-progress"),
    kicker: $("#onboarding-kicker"),
    title: $("#onboarding-title"),
    body: $("#onboarding-copy"),
    skip: $("#onboarding-skip"),
    next: $("#onboarding-next"),
  };

  let selectedFormats = new Set(DEFAULT_FORMATS);
  let tourStep = -1;
  let autoTourTimer = null;
  let preferences = {};
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  function locale() {
    return copy[els.language?.value] ? els.language.value : "en";
  }

  function tr(key) {
    return copy[locale()][key];
  }

  function normalizeFormats(value) {
    if (!Array.isArray(value)) return [...DEFAULT_FORMATS];
    return ALL_FORMATS.filter((extension) => value.includes(extension));
  }

  async function loadPreferences() {
    try {
      preferences = await window.lumaDesktop?.getPreferences?.() || {};
    } catch {
      preferences = {};
    }
    const localFormats = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_FORMATS) || "null"); } catch { return null; }
    })();
    const savedFormats = preferences.textFormatSelections ?? localFormats;
    selectedFormats = new Set(savedFormats == null ? DEFAULT_FORMATS : normalizeFormats(savedFormats));
  }

  function persist(patch) {
    preferences = { ...preferences, ...patch };
    if (Object.hasOwn(patch, "textFormatSelections")) {
      localStorage.setItem(STORAGE_FORMATS, JSON.stringify(patch.textFormatSelections));
    }
    if (Object.hasOwn(patch, "onboardingVersion")) {
      localStorage.setItem(STORAGE_TOUR, String(patch.onboardingVersion));
    }
    window.lumaDesktop?.setPreferences?.(patch).catch(() => {});
  }

  function formatPayload() {
    return { extensions: ALL_FORMATS.filter((extension) => selectedFormats.has(extension)) };
  }

  function dispatchFormats() {
    document.dispatchEvent(new CustomEvent("luma:format-selection-change", { detail: formatPayload() }));
  }

  function updateFormatUi({ announce = false } = {}) {
    $$('[data-format]', els.popover).forEach((input) => { input.checked = selectedFormats.has(input.value); });
    const enabled = formatPayload().extensions;
    const suffixes = enabled.length ? enabled.join(", ") : "none";
    els.summary.textContent = `Formats (${suffixes})`;
    els.count.textContent = `${enabled.length} ${tr("selected")}`;
    els.picker.accept = enabled.length ? enabled.join(",") : ".lumareader-disabled";
    $("#format-filter-title").textContent = tr("fileTypes");
    els.selectAll.textContent = tr("selectAll");
    els.clearAll.textContent = tr("clearAll");
    els.close.setAttribute("aria-label", tr("close"));
    $(".format-filter-footer").textContent = tr("footnote");
    if (announce) dispatchFormats();
  }

  function setFormats(extensions, { save = true, announce = true } = {}) {
    selectedFormats = new Set(normalizeFormats(extensions));
    updateFormatUi({ announce });
    if (save) persist({ textFormatSelections: formatPayload().extensions });
    return formatPayload();
  }

  function openFormatMenu() {
    els.popover.hidden = false;
    els.toggle.setAttribute("aria-expanded", "true");
  }

  function closeFormatMenu({ restoreFocus = false } = {}) {
    els.popover.hidden = true;
    els.toggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) els.toggle.focus();
  }

  function savedTourVersion() {
    return Number(preferences.onboardingVersion ?? localStorage.getItem(STORAGE_TOUR) ?? 0);
  }

  const tourTargets = ["#change-library", "#format-filter-toggle", "#reading-mode-toggle", "#palette-toggle", "#choose-file"];

  function positionSpotlight(target) {
    if (!target || !els.spotlight) return;
    const rect = target.getBoundingClientRect();
    const padding = 8;
    els.spotlight.style.left = `${Math.max(4, rect.left - padding)}px`;
    els.spotlight.style.top = `${Math.max(4, rect.top - padding)}px`;
    els.spotlight.style.width = `${Math.min(innerWidth - 8, rect.width + padding * 2)}px`;
    els.spotlight.style.height = `${Math.min(innerHeight - 8, rect.height + padding * 2)}px`;
  }

  function renderTour() {
    if (tourStep < 0) return;
    const strings = copy[locale()];
    const [title, body] = strings.steps[tourStep];
    const total = strings.steps.length;
    els.kicker.textContent = strings.step.replace("{current}", String(tourStep + 1)).replace("{total}", String(total));
    els.title.textContent = title;
    els.body.textContent = body;
    els.skip.textContent = strings.skip;
    els.next.textContent = tourStep === total - 1 ? strings.done : strings.next;
    els.progress.replaceChildren(...strings.steps.map((_, index) => {
      const dot = document.createElement("span");
      dot.className = index <= tourStep ? "active" : "";
      return dot;
    }));
    const target = $(tourTargets[tourStep]);
    if (tourStep === 1) openFormatMenu();
    else closeFormatMenu();
    requestAnimationFrame(() => positionSpotlight(target));
  }

  function cancelAutoTour() {
    if (autoTourTimer !== null) clearTimeout(autoTourTimer);
    autoTourTimer = null;
  }

  function startTour({ step = 0 } = {}) {
    cancelAutoTour();
    tourStep = Math.max(0, Math.min(tourTargets.length - 1, Number(step) || 0));
    els.onboarding.hidden = false;
    document.body.classList.add("tour-active");
    renderTour();
  }

  function finishTour() {
    cancelAutoTour();
    tourStep = -1;
    els.onboarding.hidden = true;
    document.body.classList.remove("tour-active");
    closeFormatMenu();
    persist({ onboardingVersion: ONBOARDING_VERSION });
  }

  function bindEvents() {
    els.toggle.addEventListener("click", () => els.popover.hidden ? openFormatMenu() : closeFormatMenu());
    els.close.addEventListener("click", () => closeFormatMenu({ restoreFocus: true }));
    els.selectAll.addEventListener("click", () => setFormats(ALL_FORMATS));
    els.clearAll.addEventListener("click", () => setFormats([]));
    $$('[data-format]', els.popover).forEach((input) => input.addEventListener("change", () => {
      if (input.checked) selectedFormats.add(input.value);
      else selectedFormats.delete(input.value);
      setFormats([...selectedFormats]);
    }));
    document.addEventListener("click", (event) => {
      if (tourStep < 0 && !event.target.closest("#format-filter")) closeFormatMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (tourStep >= 0) finishTour();
      else closeFormatMenu({ restoreFocus: !els.popover.hidden });
    });
    els.language?.addEventListener("change", () => {
      updateFormatUi();
      if (tourStep >= 0) renderTour();
    });
    els.skip.addEventListener("click", finishTour);
    els.next.addEventListener("click", () => {
      if (tourStep >= tourTargets.length - 1) finishTour();
      else { tourStep += 1; renderTour(); }
    });
    window.addEventListener("resize", () => {
      if (tourStep >= 0) positionSpotlight($(tourTargets[tourStep]));
    });
  }

  async function initialize() {
    await loadPreferences();
    updateFormatUi();
    bindEvents();
    const detail = { formats: formatPayload() };
    document.dispatchEvent(new CustomEvent("luma:ui-ready", { detail }));
    resolveReady(detail);
    if (savedTourVersion() < ONBOARDING_VERSION && tourStep < 0) {
      autoTourTimer = setTimeout(() => {
        autoTourTimer = null;
        if (savedTourVersion() < ONBOARDING_VERSION && tourStep < 0) startTour();
      }, 280);
    }
    return detail;
  }

  window.LumaReaderUI = {
    ready,
    initialize,
    getFormatSelection: formatPayload,
    setFormatSelection: (extensions) => setFormats(extensions),
    openFormatMenu,
    closeFormatMenu,
    startTour,
    getState: () => ({ formats: formatPayload(), tourStep }),
  };

  initialize().catch((error) => {
    console.warn("LumaReader UI initialization failed", error);
    resolveReady({ formats: formatPayload() });
  });
})();
