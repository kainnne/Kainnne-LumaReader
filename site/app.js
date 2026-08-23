const editions = {
  en: {
    "local-first-callout": "Local-first by design. Your documents stay on this computer—no account, cloud upload, analytics, or document telemetry.",
    "download-note": "Free and open source · Version 1.0.0 · macOS and Windows",
    "macos-action": "DOWNLOAD FOR",
    "macos-status": "Universal",
    "macos-notice": "The Universal macOS build supports Apple silicon and Intel Macs. It is signed with Developer ID and notarized by Apple for direct distribution.",
    "windows-notice": "The Windows build is unsigned. Microsoft Defender SmartScreen may show an “unrecognized app” notice because the publisher is not verified. Download only from this official site or GitHub Releases.",
    "overview-title": "A calmer way to live with Markdown.",
    "overview-lead": "LumaReader gives an ordinary folder the feel of a considered reading app: clear hierarchy, comfortable typography, and powerful rendering without an account or a complicated setup.",
    "feature-1-title": "Focused support for Markdown and text.",
    "format-documents-label": "Markdown · on by default",
    "format-documents-value": ".md, .markdown, .mkd, .mdx",
    "format-data-label": "Plain text · opt in",
    "format-data-value": ".txt, .log",
    "format-tables-label": "Format filter",
    "format-tables-value": "Enable TXT and LOG separately when needed",
    "feature-2-title": "A folder becomes a navigable reading library.",
    "feature-2-body": "Choose one root folder and scan its nested files with a visible elapsed-time counter. Search opens every parent folder needed to reveal a match, then restores your previous folder state when cleared; the sidebar can be widened for long names or collapsed for focus.",
    "feature-3-title": "Three reading modes, with room to breathe.",
    "feature-3-body": "Use a full-width vertical page, horizontal reading, or paged navigation with left/right or up/down page turns. Both axes have draggable scrollbars, and text-size or layout changes keep you close to the same reading position.",
    "feature-4-title": "Rich Markdown, without extra setup.",
    "feature-4-body": "Render tables, task lists, alerts, highlighted code, KaTeX mathematics, Mermaid diagrams, footnotes, emoji, abbreviations, superscript, subscript, and reusable local includes.",
    "feature-5-title": "Create, read, edit, and save in one place.",
    "feature-5-body": "Choose any destination folder for a new .md, confirm its name and location, and start writing immediately. Edit beside an optional live preview with a draggable split and synchronized scrolling; resize source and editor text with Command/Ctrl + or −, then save without leaving the editor.",
    "feature-6-title": "Local-first from start to finish.",
    "feature-6-body": "Your library stays on your computer: no account, upload, or automatic translation. LumaReader includes 11 interface languages, light and dark modes, 22 palettes with a neutral reading surface, saved preferences, and a short first-launch guide."
  },
  zh: {
    "local-first-callout": "本機優先設計。文件留在這台電腦：不需帳號、不上傳雲端，也不蒐集使用分析或文件內容。",
    "download-note": "免費開源 · 版本 1.0.0 · 支援 macOS 與 Windows",
    "macos-action": "下載版本",
    "macos-status": "Universal",
    "macos-notice": "macOS Universal 版本同時支援 Apple 晶片與 Intel Mac，並已完成 Developer ID 簽章與 Apple 公證，可供網站直接下載。",
    "windows-notice": "Windows 版本目前未簽章，因此第一次開啟時可能出現 SmartScreen 的「無法辨識」提醒。請只從 LumaReader 官方網站或 GitHub Releases 下載；若系統顯示明確的威脅名稱，請停止執行並回報。",
    "overview-title": "把普通資料夾，變成真正想打開的閱讀空間。",
    "overview-lead": "LumaReader 不要求你改變原本的整理方式。選好資料夾，就能在清楚的目錄、舒服的排版與安靜的介面裡閱讀；功能放在需要的位置，文件仍然是畫面的主角。",
    "feature-1-title": "聚焦支援 Markdown 與純文字。",
    "format-documents-label": "Markdown · 預設開啟",
    "format-documents-value": ".md、.markdown、.mkd、.mdx",
    "format-data-label": "純文字 · 自行勾選",
    "format-data-value": ".txt、.log",
    "format-tables-label": "格式篩選",
    "format-tables-value": "需要時可分別啟用 TXT 與 LOG",
    "feature-2-title": "選一個資料夾，就有清楚的閱讀資料庫。",
    "feature-2-body": "指定根目錄後，LumaReader 會掃描子資料夾並持續顯示已用秒數。搜尋時會自動展開結果所在的上層資料夾，清除關鍵字後還原原本收合狀態；側欄也能拖寬或整個收起。",
    "feature-3-title": "三種閱讀模式，都把畫面真正用滿。",
    "feature-3-body": "直式提供全寬頁面，也能切換橫向閱讀或逐頁瀏覽；翻頁可選左右或上下方向。水平、垂直方向都有可拖曳捲軸，調整字級或版面後也會盡量保留原本閱讀位置。",
    "feature-4-title": "內容再豐富，也能整理成好讀的頁面。",
    "feature-4-body": "表格、待辦清單、提示區塊、程式碼上色、KaTeX 數學公式、Mermaid 圖表、註腳、Emoji、縮寫、上下標與本機內容引用都能整理成好讀頁面。",
    "feature-5-title": "新增、閱讀、編輯與儲存都在同一個地方。",
    "feature-5-body": "新增 .md 時可先選擇任意目的資料夾，再確認名稱與位置並立刻開始編輯。編輯時可開啟即時對照預覽、拖曳調整兩邊寬度並同步捲動；原文與編輯字級也能用 Command／Ctrl 搭配 + 或 − 調整，儲存後仍留在編輯畫面。",
    "feature-6-title": "文件留在電腦，選擇權也留在你手上。",
    "feature-6-body": "不必建立帳號，也不會上傳或自動翻譯內容。LumaReader 提供 11 種介面語言、亮暗模式與 22 組配色，閱讀紙張維持清楚的中性色；偏好會被保存，第一次開啟也有簡短導覽。"
  }
};

const languageToggle = document.querySelector(".language-toggle");
const languageOptions = document.querySelectorAll("[data-language-option]");

function setEdition(language) {
  const nextCopy = editions[language];

  document.body.classList.add("is-switching");
  window.setTimeout(() => {
    document.querySelectorAll("[data-copy]").forEach((element) => {
      element.textContent = nextCopy[element.dataset.copy];
    });
    document.documentElement.lang = language === "zh" ? "zh-Hant" : "en";
    languageToggle.setAttribute("aria-pressed", String(language === "zh"));
    languageToggle.setAttribute(
      "aria-label",
      language === "zh" ? "顯示英文版本" : "Show the Traditional Chinese edition"
    );
    languageOptions.forEach((option) => {
      option.classList.toggle("is-active", option.dataset.languageOption === language);
    });
    document.body.classList.remove("is-switching");
  }, 150);
}

languageToggle.addEventListener("click", () => {
  const language = languageToggle.getAttribute("aria-pressed") === "true" ? "en" : "zh";
  setEdition(language);
});
