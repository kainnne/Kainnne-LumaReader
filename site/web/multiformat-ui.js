(function () {
  "use strict";

  const ALL_FORMATS = Object.freeze([".md", ".markdown", ".mkd", ".mdx", ".txt", ".log"]);
  const DEFAULT_FORMATS = Object.freeze([".md", ".markdown", ".mkd", ".mdx"]);
  const ONBOARDING_VERSION = 3;
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
        ["Open your documents", "Choose one or more Markdown or text files. They stay in this browser session."],
        ["Choose file types", "Markdown is on by default. Turn on .txt or .log only when you want them in the list."],
        ["Read your way", "Use vertical, horizontal, or paged reading. Both scroll directions remain available when the content needs them."],
        ["Light or dark", "LumaReader starts bright with Dream Rose. Use this button whenever you want to switch between light and dark reading."],
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
        ["開啟文件", "一次選取一份或多份 Markdown／純文字檔案；內容只會留在目前的瀏覽器工作階段。"],
        ["選擇檔案格式", "Markdown 預設開啟；需要時才將 .txt 或 .log 加入清單。"],
        ["選擇閱讀方式", "可使用直式、橫式或翻頁閱讀；內容需要時仍可橫向與縱向捲動。"],
        ["亮色或暗色", "LumaReader 預設使用明亮的夢幻粉櫻；需要時可隨時使用這個按鈕切換亮色與暗色閱讀。"],
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
    const mediaTypes = window.lumaWeb ? ",image/*,audio/*,video/*" : "";
    els.picker.accept = enabled.length ? `${enabled.join(",")}${mediaTypes}` : `.lumareader-disabled${mediaTypes}`;
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

  const tourTargets = ["#choose-file", "#format-filter-toggle", "#reading-mode-control", "#theme"];

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

  function startTour({ step = 0 } = {}) {
    tourStep = Math.max(0, Math.min(tourTargets.length - 1, Number(step) || 0));
    els.onboarding.hidden = false;
    document.body.classList.add("tour-active");
    renderTour();
  }

  function finishTour() {
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
    if (savedTourVersion() < ONBOARDING_VERSION) setTimeout(() => startTour(), 280);
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
