const editions = {
  en: {
    "windows-notice": "Windows preview builds will initially be unsigned. Microsoft Defender SmartScreen may show an “unrecognized app” notice because the publisher is not yet verified. Download only from this official site or GitHub Releases.",
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
    "feature-2-body": "Choose one root folder, scan its nested files, search the resulting tree, and follow the current file outline. The scan shows elapsed time, while the resizable sidebar can be widened for long names or collapsed for focus.",
    "feature-3-title": "Three reading modes, with room to breathe.",
    "feature-3-body": "Use a full-width vertical page, horizontal reading, or paged navigation. Both scroll directions have draggable scrollbars, and text size or layout changes keep you close to the same reading position.",
    "feature-4-title": "Rich Markdown, without extra setup.",
    "feature-4-body": "Render tables, task lists, alerts, highlighted code, KaTeX mathematics, Mermaid diagrams, footnotes, emoji, abbreviations, superscript, subscript, and reusable local includes.",
    "feature-5-title": "Rendered reading and source stay one click apart.",
    "feature-5-body": "Switch between the rendered document and its original text, preview local images, audio, and video in context, and let the reader refresh when a file changes on disk.",
    "feature-6-title": "Local-first from start to finish.",
    "feature-6-body": "Your library stays on your computer: no account, upload, or automatic translation. The app supports macOS and Windows, 11 interface languages, light and dark modes, 20 palettes, saved preferences, and a short first-launch guide."
  },
  zh: {
    "windows-notice": "Windows 預覽版目前尚未取得程式碼簽章，第一次開啟時可能出現 SmartScreen 的「無法辨識」提醒。請只從 LumaReader 官方網站或 GitHub Releases 下載；若系統顯示明確的威脅名稱，請停止執行並回報。",
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
    "feature-2-body": "指定根目錄後，LumaReader 會掃描子資料夾、建立可搜尋的檔案樹，並顯示當前文件目錄。掃描時會持續計秒；側欄可以拖寬以閱讀長檔名，也能整個收起。",
    "feature-3-title": "三種閱讀模式，都把畫面真正用滿。",
    "feature-3-body": "直式提供全寬頁面，也能切換橫向閱讀與逐頁瀏覽。水平、垂直方向都有可拖曳捲軸，調整字級或版面後也會盡量保留原本閱讀位置。",
    "feature-4-title": "內容再豐富，也能整理成好讀的頁面。",
    "feature-4-body": "表格、待辦清單、提示區塊、程式碼上色、KaTeX 數學公式、Mermaid 圖表、註腳、Emoji、縮寫、上下標與本機內容引用都能整理成好讀頁面。",
    "feature-5-title": "閱讀畫面與原始文字，只差一次點選。",
    "feature-5-body": "可隨時切換渲染結果與原文，在文章脈絡裡預覽本機圖片、音訊與影片；檔案在磁碟中更新時，閱讀器也會跟著重新整理。",
    "feature-6-title": "文件留在電腦，選擇權也留在你手上。",
    "feature-6-body": "不必建立帳號，也不會上傳或自動翻譯內容。應用程式支援 macOS、Windows、11 種介面語言、亮暗模式與 20 組配色，並保存偏好設定、提供簡短的首次使用導覽。"
  }
};

const languageToggle = document.querySelector(".language-toggle");
const languageOptions = document.querySelectorAll("[data-language-option]");
const downloadNote = document.querySelector(".download-note");

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

document.querySelectorAll("[data-download]").forEach((button) => {
  button.addEventListener("click", () => {
    downloadNote.textContent = `${button.dataset.download} download is coming soon.`;
    downloadNote.classList.remove("is-notified");
    void downloadNote.offsetWidth;
    downloadNote.classList.add("is-notified");
  });
});
